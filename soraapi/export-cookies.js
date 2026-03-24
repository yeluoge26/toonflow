/**
 * 导出 Sora Cookie 工具
 * 
 * 使用方法：
 *   node export-cookies.js
 * 
 * 会打开一个 Chrome 窗口，你手动登录 sora.com 后按回车，
 * 自动保存 cookies.json
 */

const { chromium } = require('playwright');
const fs = require('fs');
const readline = require('readline');

async function exportCookies() {
  console.log('启动浏览器，请手动登录 sora.com...');

  const browser = await chromium.launch({
    headless: false, // 显示窗口，方便你登录
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  await page.goto('https://sora.com');

  // 等待用户手动登录
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => {
    rl.question('\n✅ 请在浏览器中登录 sora.com，登录完成后按回车键保存 Cookie...\n', resolve);
  });
  rl.close();

  const cookies = await context.cookies();
  fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, 2));
  console.log(`✅ 已保存 ${cookies.length} 个 Cookie 到 cookies.json`);

  await browser.close();
}

exportCookies().catch(console.error);
