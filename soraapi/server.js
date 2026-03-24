/**
 * Sora Proxy Server
 * 模拟 API 接口 → Playwright 自动操控 Sora 网页 → 返回视频 URL
 *
 * POST /generate        提交任务
 * GET  /status/:id      查询任务状态
 * GET  /tasks           查看所有任务
 * GET  /health          健康检查
 */

const express = require('express');
const { chromium } = require('playwright');
const { PQueue } = require('p-queue');
const { randomUUID } = require('crypto');

// ─── 配置 ────────────────────────────────────────────────────────────────────
const CONFIG = {
  PORT: 3000,
  // 你的 Sora 已登录 Cookie（见下方说明如何获取）
  COOKIES_FILE: './cookies.json',
  // 串行队列，concurrency=1 保证不并发
  CONCURRENCY: 1,
  // 单个任务超时（毫秒）
  TASK_TIMEOUT: 5 * 60 * 1000,
  // 是否显示浏览器窗口（调试时改为 false）
  HEADLESS: true,
};

// ─── 状态存储 ─────────────────────────────────────────────────────────────────
const tasks = new Map(); // taskId -> task object

// ─── 队列 ─────────────────────────────────────────────────────────────────────
const queue = new PQueue({ concurrency: CONFIG.CONCURRENCY });

// ─── Playwright 浏览器实例（单例复用）────────────────────────────────────────
let browser = null;
let browserContext = null;

async function getBrowserContext() {
  if (browserContext) return browserContext;

  console.log('[Browser] 启动 Chromium...');
  browser = await chromium.launch({
    headless: CONFIG.HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // 加载 Cookie（保持登录态）
  const fs = require('fs');
  let cookies = [];
  if (fs.existsSync(CONFIG.COOKIES_FILE)) {
    cookies = JSON.parse(fs.readFileSync(CONFIG.COOKIES_FILE, 'utf-8'));
    console.log(`[Browser] 已加载 ${cookies.length} 个 Cookie`);
  } else {
    console.warn('[Browser] ⚠️  未找到 cookies.json，Sora 可能需要登录');
  }

  browserContext = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  if (cookies.length > 0) {
    await browserContext.addCookies(cookies);
  }

  return browserContext;
}

// ─── 核心：Playwright 提交 Sora 任务 ─────────────────────────────────────────
async function submitToSora(task) {
  const ctx = await getBrowserContext();
  const page = await ctx.newPage();

  try {
    console.log(`[Sora][${task.id}] 打开 sora.com...`);
    await page.goto('https://sora.com', { waitUntil: 'networkidle', timeout: 30000 });

    // ── 检查是否已登录 ──
    const loginBtn = page.locator('text=Log in').first();
    if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new Error('未登录，请先配置 cookies.json');
    }

    // ── 找到输入框并输入 prompt ──
    console.log(`[Sora][${task.id}] 输入 prompt: ${task.prompt.slice(0, 50)}...`);

    // Sora 的 prompt 输入框
    const promptInput = page.locator('textarea, [contenteditable="true"], [placeholder*="prompt"], [placeholder*="Describe"]').first();
    await promptInput.waitFor({ timeout: 10000 });
    await promptInput.click();
    await promptInput.fill(task.prompt);

    // ── 设置参数（如果有） ──
    if (task.options?.resolution) {
      // 尝试找分辨率/比例选择器（Sora 界面可能有）
      try {
        await page.selectOption('select[name="resolution"]', task.options.resolution, { timeout: 2000 });
      } catch {}
    }

    // ── 点击生成按钮 ──
    const generateBtn = page.locator('button[type="submit"], button:has-text("Generate"), button:has-text("Create")').first();
    await generateBtn.waitFor({ timeout: 5000 });
    await generateBtn.click();
    console.log(`[Sora][${task.id}] 已提交，等待生成...`);

    // ── 等待视频生成完成 ──
    // 监听网络响应，捕获视频 URL
    let videoUrl = null;

    // 方式1：监听包含视频 URL 的 API 响应
    const responsePromise = page.waitForResponse(
      (res) => {
        const url = res.url();
        return (
          (url.includes('/api/') || url.includes('sora')) &&
          res.status() === 200
        );
      },
      { timeout: CONFIG.TASK_TIMEOUT }
    );

    // 方式2：等待页面出现 video 元素
    const videoElementPromise = page.waitForSelector('video[src], video source', {
      timeout: CONFIG.TASK_TIMEOUT,
    });

    // 任意一个完成即可
    try {
      const result = await Promise.race([
        videoElementPromise.then(async (el) => {
          const src = await el.getAttribute('src') || await page.$eval('video source', e => e.src).catch(() => null);
          return { type: 'element', src };
        }),
        responsePromise.then(async (res) => {
          try {
            const json = await res.json();
            // 从响应中提取视频 URL（根据实际接口结构调整）
            const url = findVideoUrl(json);
            return { type: 'api', src: url };
          } catch {
            return null;
          }
        }),
      ]);

      if (result?.src) {
        videoUrl = result.src;
      }
    } catch (e) {
      console.warn(`[Sora][${task.id}] 等待视频超时，尝试截图...`);
    }

    // 方式3：截图作为备用结果
    const screenshotPath = `./screenshots/${task.id}.png`;
    require('fs').mkdirSync('./screenshots', { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // 最终尝试从页面找到所有 video src
    if (!videoUrl) {
      videoUrl = await page.evaluate(() => {
        const videos = document.querySelectorAll('video');
        for (const v of videos) {
          if (v.src) return v.src;
          const src = v.querySelector('source')?.src;
          if (src) return src;
        }
        return null;
      });
    }

    console.log(`[Sora][${task.id}] 完成! videoUrl=${videoUrl}`);
    return { videoUrl, screenshotPath };
  } finally {
    await page.close();
  }
}

// 从 API 响应 JSON 中递归找视频 URL
function findVideoUrl(obj, depth = 0) {
  if (depth > 5 || !obj) return null;
  if (typeof obj === 'string' && (obj.includes('.mp4') || obj.includes('cdn') || obj.includes('video'))) {
    return obj;
  }
  if (typeof obj === 'object') {
    for (const val of Object.values(obj)) {
      const found = findVideoUrl(val, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// ─── 任务处理函数 ─────────────────────────────────────────────────────────────
async function processTask(taskId) {
  const task = tasks.get(taskId);
  if (!task) return;

  task.status = 'processing';
  task.startedAt = new Date().toISOString();
  console.log(`[Queue] 开始处理任务 ${taskId}`);

  try {
    const result = await submitToSora(task);
    task.status = 'done';
    task.result = result;
    task.completedAt = new Date().toISOString();
    console.log(`[Queue] 任务完成 ${taskId}`);
  } catch (err) {
    task.status = 'failed';
    task.error = err.message;
    task.completedAt = new Date().toISOString();
    console.error(`[Queue] 任务失败 ${taskId}: ${err.message}`);
  }
}

// ─── Express API ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// 允许跨域
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

/**
 * POST /generate
 * Body: { prompt: string, options?: { resolution?: string } }
 * Returns: { taskId, status, queuePosition }
 */
app.post('/generate', (req, res) => {
  const { prompt, options } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt 不能为空' });

  const taskId = randomUUID();
  const task = {
    id: taskId,
    prompt,
    options: options || {},
    status: 'queued',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
  };

  tasks.set(taskId, task);

  // 加入串行队列
  queue.add(() => processTask(taskId));

  const queuePosition = queue.size;
  console.log(`[API] 新任务入队 ${taskId} (队列长度: ${queuePosition})`);

  res.json({
    taskId,
    status: 'queued',
    queuePosition,
    message: '任务已加入队列，请用 /status/:taskId 轮询结果',
  });
});

/**
 * GET /status/:taskId
 * Returns: 任务详情（含 result.videoUrl）
 */
app.get('/status/:taskId', (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task) return res.status(404).json({ error: '任务不存在' });
  res.json(task);
});

/**
 * GET /tasks
 * Returns: 所有任务列表
 */
app.get('/tasks', (req, res) => {
  res.json({
    total: tasks.size,
    queuePending: queue.size,
    queueRunning: queue.pending,
    tasks: Array.from(tasks.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    ),
  });
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', queueSize: queue.size, taskCount: tasks.size });
});

// ─── 启动 ─────────────────────────────────────────────────────────────────────
app.listen(CONFIG.PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║        Sora Proxy Server 已启动          ║
╠══════════════════════════════════════════╣
║  http://localhost:${CONFIG.PORT}                   ║
║                                          ║
║  POST /generate    提交生成任务          ║
║  GET  /status/:id  查询任务状态          ║
║  GET  /tasks       查看所有任务          ║
║  GET  /health      健康检查              ║
╚══════════════════════════════════════════╝

⚠️  首次运行前请先配置 cookies.json（见 README）
  `);

  // 预热浏览器
  getBrowserContext().catch(console.error);
});

// 退出时关闭浏览器
process.on('SIGINT', async () => {
  console.log('\n正在关闭...');
  if (browser) await browser.close();
  process.exit(0);
});
