const { chromium } = require('playwright');
(async () => {
  const PORT = process.argv[2];
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
  const page = await browser.newPage();
  const failed = [];
  page.on('response', r => { if (r.status() >= 400) failed.push(r.url()); });
  const url = `http://127.0.0.1:${PORT}/${encodeURIComponent('备忘快贴')}/index.html?__inject__=1`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 }).catch(()=>{});
  console.log('404 URLs:', failed);
  await browser.close();
})().catch(e => console.error(e.message));
