const { chromium } = require('playwright');

(async () => {
  const PORT = process.argv[2] || '59850';
  const PLUGIN_ID = encodeURIComponent('备忘快贴');
  const URL = `http://127.0.0.1:${PORT}/${PLUGIN_ID}/index.html?__inject__=1`;
  console.log('Testing:', URL);

  // Use system Chrome/Edge if playwright browser not available
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch(e) {
    console.log('Trying Edge...');
    browser = await chromium.launch({ 
      headless: true,
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    });
  }
  
  const page = await browser.newPage();
  const errors = [];
  const logs = [];

  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(err.message));

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
  } catch(e) {
    errors.push('Navigation: ' + e.message);
  }

  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      title: document.title,
      rootExists: !!root,
      rootChildren: root ? root.childElementCount : -1,
      rootHTML: root ? root.innerHTML.substring(0, 500) : '',
      bodyLen: document.body.innerHTML.length,
      hasUtools: typeof window.utools !== 'undefined',
      hasExports: typeof window.exports !== 'undefined',
      exportsKeys: window.exports ? Object.keys(window.exports) : [],
    };
  });

  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(result, null, 2));
  console.log('\nConsole logs (' + logs.length + '):');
  logs.forEach(l => console.log(' ', l));
  console.log('\nPage errors (' + errors.length + '):');
  errors.forEach(e => console.log('  ERROR:', e));

  await browser.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
