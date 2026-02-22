const { chromium } = require('playwright');
(async () => {
  const PORT = process.argv[2] || '59850';
  const URL = `http://127.0.0.1:${PORT}/${encodeURIComponent('备忘快贴')}/index.html?__inject__=1`;
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
  const page = await browser.newPage();
  
  const failed = [];
  page.on('response', resp => {
    if (resp.status() >= 400) failed.push(`${resp.status()} ${resp.url()}`);
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(2000);
  
  console.log('Failed requests:');
  failed.forEach(f => console.log(' ', f));
  
  await browser.close();
})().catch(e => console.error('FATAL:', e));
