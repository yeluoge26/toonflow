# Sora Proxy Server

用 Playwright 模拟浏览器操作 Sora 网页，对外暴露标准 HTTP API，支持多任务自动排队串行处理。

## 快速开始

### 1. 安装依赖

```bash
npm install
npx playwright install chromium
```

### 2. 导出 Sora Cookie（首次必做）

```bash
node export-cookies.js
```

会自动弹出浏览器窗口，你在浏览器里登录 sora.com，登录成功后回到终端按回车，Cookie 自动保存为 `cookies.json`。

> Cookie 有效期内无需重新导出（通常几天到几周）

### 3. 启动服务

```bash
node server.js
```

服务默认监听 `http://localhost:3000`

---

## API 文档

### POST /generate — 提交生成任务

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A cat walking on the moon, cinematic"}'
```

**响应：**
```json
{
  "taskId": "uuid-xxxx",
  "status": "queued",
  "queuePosition": 1,
  "message": "任务已加入队列，请用 /status/:taskId 轮询结果"
}
```

---

### GET /status/:taskId — 查询任务状态

```bash
curl http://localhost:3000/status/uuid-xxxx
```

**状态流转：** `queued` → `processing` → `done` / `failed`

**成功响应：**
```json
{
  "id": "uuid-xxxx",
  "prompt": "A cat walking on the moon",
  "status": "done",
  "createdAt": "2025-01-01T00:00:00Z",
  "completedAt": "2025-01-01T00:03:00Z",
  "result": {
    "videoUrl": "https://cdn.openai.com/sora/videos/xxxx.mp4",
    "screenshotPath": "./screenshots/uuid-xxxx.png"
  }
}
```

---

### GET /tasks — 查看所有任务

```bash
curl http://localhost:3000/tasks
```

---

### GET /health — 健康检查

```bash
curl http://localhost:3000/health
```

---

## 在你的项目中调用

```javascript
// 提交任务
const res = await fetch('http://localhost:3000/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'A sunset over the ocean' }),
});
const { taskId } = await res.json();

// 轮询等待结果
async function waitForResult(taskId) {
  while (true) {
    const r = await fetch(`http://localhost:3000/status/${taskId}`).then(r => r.json());
    if (r.status === 'done') return r.result.videoUrl;
    if (r.status === 'failed') throw new Error(r.error);
    await new Promise(resolve => setTimeout(resolve, 5000)); // 每5秒查一次
  }
}

const videoUrl = await waitForResult(taskId);
console.log('视频地址：', videoUrl);
```

---

## 注意事项

- **串行队列**：所有请求自动排队，一次只处理一个，避免 Sora 并发限制
- **Cookie 失效**：如果收到"未登录"错误，重新运行 `node export-cookies.js`
- **视频 URL**：Sora 生成的视频 URL 可能有时效性，请及时下载
- **截图备用**：每次任务完成都会在 `./screenshots/` 保存截图，方便调试

## 配置修改

编辑 `server.js` 顶部的 `CONFIG` 对象：

```js
const CONFIG = {
  PORT: 3000,              // 监听端口
  CONCURRENCY: 1,          // 并发数（建议保持1）
  TASK_TIMEOUT: 300000,    // 超时时间（毫秒）
  HEADLESS: true,          // true=无头模式，false=显示浏览器窗口
};
```
