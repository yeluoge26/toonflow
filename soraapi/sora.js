/**
 * sora.js
 * Playwright 核心模块：操控 Sora 网页提交 prompt，等待生成完成，返回视频链接
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'session.json');
const PROXY_SERVER = process.env.PROXY_SERVER || '';

// 超时配置（毫秒）
const TIMEOUTS = {
  navigation: 30000,       // 页面导航
  submitButton: 15000,     // 等待提交按钮
  videoGenerate: 300000,   // 视频生成最长等待 5 分钟
  pollInterval: 3000,      // 轮询间隔
};

let browser = null;
let context = null;

// ─── 初始化浏览器（单例，复用 session）───────────────────────────────────────
async function initBrowser() {
  if (browser && browser.isConnected()) return;

  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error('未找到 session.json，请先运行 node login.js 完成登录');
  }

  console.log('🌐 启动 Playwright 浏览器...');

  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };

  if (PROXY_SERVER) {
    launchOptions.proxy = { server: PROXY_SERVER };
    console.log(`🔌 使用代理: ${PROXY_SERVER}`);
  }

  browser = await chromium.launch(launchOptions);
  context = await browser.newContext({
    storageState: SESSION_FILE,
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  // 监听 context 关闭事件，自动重置
  context.on('close', () => {
    browser = null;
    context = null;
  });

  console.log('✅ 浏览器已启动');
}

// ─── 提交 Prompt 并等待视频链接 ───────────────────────────────────────────────
async function generateVideo(prompt, options = {}) {
  await initBrowser();

  const page = await context.newPage();

  // 拦截视频 URL（抓取生成完成后的 blob/cdn 链接）
  const videoUrls = [];
  page.on('response', async (response) => {
    const url = response.url();
    // Sora 视频通常走 cdn / storage 链接
    if (
      url.includes('.mp4') ||
      url.includes('storage.') ||
      url.includes('cdn.') ||
      url.includes('video') && url.includes('openai')
    ) {
      videoUrls.push(url);
    }
  });

  try {
    console.log(`📝 [${prompt.slice(0, 40)}...] 正在提交...`);

    // 1. 打开 Sora（真实域名）
    await page.goto('https://sora.chatgpt.com/explore', {
      waitUntil: 'networkidle',
      timeout: TIMEOUTS.navigation,
    });

    // 2. 检查登录状态：底部输入框
    const inputSelector = 'textarea[placeholder="Describe your video..."]';
    const isLoggedIn = await page.$(inputSelector).catch(() => null);
    if (!isLoggedIn) {
      throw new Error('Session 已过期，请重新运行 node login.js');
    }

    // 3. 点击并输入 prompt（fill 后触发 input 事件让按钮激活）
    await page.waitForSelector(inputSelector, { timeout: TIMEOUTS.submitButton });
    await page.click(inputSelector);
    await page.fill(inputSelector, prompt);
    await page.dispatchEvent(inputSelector, 'input');

    // 4. 处理可选参数（分辨率、时长等）
    if (options.duration) {
      await setOption(page, 'duration', options.duration);
    }
    if (options.resolution) {
      await setOption(page, 'resolution', options.resolution);
    }

    // 5. 点击生成按钮（Enter 键 或 提交按钮）
    // 等待提交按钮变为可用（输入内容后 data-disabled 变为 false）
    const submitBtnSelector = 'button[data-disabled="false"]:has(.sr-only)';
    await page.waitForFunction(() => {
      const btns = document.querySelectorAll('button[data-disabled]');
      return Array.from(btns).some(b =>
        b.getAttribute('data-disabled') === 'false' &&
        b.querySelector('.sr-only')?.textContent?.includes('Create video')
      );
    }, { timeout: TIMEOUTS.submitButton });

    // 点击 Create video 按钮
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button[data-disabled]')).find(b =>
        b.getAttribute('data-disabled') === 'false' &&
        b.querySelector('.sr-only')?.textContent?.includes('Create video')
      );
      if (btn) btn.click();
    });

    console.log(`⏳ [${prompt.slice(0, 40)}...] 已提交，等待生成...`);

    // 6. 等待视频生成完成
    const videoUrl = await waitForVideo(page, videoUrls);

    console.log(`✅ [${prompt.slice(0, 40)}...] 生成完成: ${videoUrl}`);
    return { success: true, videoUrl, prompt };

  } catch (err) {
    console.error(`❌ 生成失败: ${err.message}`);
    // 保存截图用于调试
    await page.screenshot({ path: `error-${Date.now()}.png` }).catch(() => {});
    throw err;
  } finally {
    await page.close();
  }
}

// ─── 等待视频生成完成 ─────────────────────────────────────────────────────────
async function waitForVideo(page, videoUrls) {
  const deadline = Date.now() + TIMEOUTS.videoGenerate;

  while (Date.now() < deadline) {
    // 方式 1：通过网络拦截到视频 URL
    if (videoUrls.length > 0) {
      return videoUrls[videoUrls.length - 1];
    }

    // 方式 2：页面上出现 <video> 标签
    const videoSrc = await page.evaluate(() => {
      const video = document.querySelector('video[src], video source[src]');
      return video ? (video.src || video.getAttribute('src')) : null;
    });
    if (videoSrc && videoSrc.startsWith('http')) {
      return videoSrc;
    }

    // 方式 3：出现下载按钮，提取链接
    const downloadHref = await page.evaluate(() => {
      const link = document.querySelector('a[download], a[href*=".mp4"], a[href*="storage"]');
      return link ? link.href : null;
    });
    if (downloadHref) return downloadHref;

    // 方式 4：检查是否报错
    const errorEl = await page.$('[class*="error" i], [class*="fail" i]');
    if (errorEl) {
      const errorText = await errorEl.textContent();
      throw new Error(`Sora 报错: ${errorText}`);
    }

    await page.waitForTimeout(TIMEOUTS.pollInterval);
  }

  throw new Error('视频生成超时（5分钟）');
}

// ─── 设置生成参数（分辨率/时长）────────────────────────────────────────────
async function setOption(page, type, value) {
  try {
    // 尝试找到对应的下拉/按钮
    const selector = `[aria-label*="${type}" i], button:has-text("${value}")`;
    const el = await page.$(selector);
    if (el) await el.click();
  } catch {
    // 参数设置失败不影响主流程
  }
}

// ─── 关闭浏览器（优雅退出）──────────────────────────────────────────────────
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
  }
}

module.exports = { generateVideo, closeBrowser };
