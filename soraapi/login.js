/**
 * login.js
 * 首次运行：打开浏览器让你手动登录 Sora，完成后自动保存 session
 * 之后 server.js 会复用这个 session，无需重复登录
 *
 * 运行方式：node login.js
 * 代理配置：设置环境变量 PROXY_SERVER=http://127.0.0.1:7890
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'session.json');
const PROXY_SERVER = process.env.PROXY_SERVER || ''; // 例: http://127.0.0.1:7890

async function login() {
  console.log('🚀 启动浏览器，请手动完成登录...');
  console.log('   登录成功后脚本会自动保存 session 并关闭');

  const launchOptions = {
    headless: false, // 显示浏览器窗口，方便手动登录
    args: ['--no-sandbox'],
  };

  if (PROXY_SERVER) {
    launchOptions.proxy = { server: PROXY_SERVER };
    console.log(`🔌 使用代理: ${PROXY_SERVER}`);
  }

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://sora.com', { waitUntil: 'domcontentloaded' });

  console.log('\n⏳ 等待你完成登录...');
  console.log('   登录后请停留在 Sora 主页，脚本检测到登录状态后自动保存\n');

  // 等待登录成功标志：出现视频生成输入框
  await page.waitForSelector('textarea, [contenteditable="true"], input[placeholder]', {
    timeout: 120000,
  }).catch(() => {
    console.log('⚠️  超时，尝试直接保存当前 session...');
  });

  // 额外等待 2 秒确保 cookie 全部写入
  await page.waitForTimeout(2000);

  // 保存 storage state（包含 cookies + localStorage）
  const storageState = await context.storageState();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(storageState, null, 2));

  console.log(`✅ Session 已保存到 ${SESSION_FILE}`);
  console.log('   现在可以运行 node server.js 启动服务了');

  await browser.close();
}

login().catch(err => {
  console.error('❌ 登录失败:', err.message);
  process.exit(1);
});
