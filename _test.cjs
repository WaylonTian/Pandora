const { chromium } = require('playwright');
(async () => {
  const PORT = process.argv[2];
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });

  const plugins = [
    { name: '备忘快贴', main: 'index.html', feature: 'collection' },
    { name: 'ocr-文字识别', main: 'index.html', feature: 'ocr' },
    { name: '悬浮', main: 'index.html', feature: 'suspend' },
    { name: '计算稿纸', main: 'index.html', feature: 'calc' },
  ];

  for (const p of plugins) {
    const page = await browser.newPage();
    const url = `http://127.0.0.1:${PORT}/${encodeURIComponent(p.name)}/${p.main}?__inject__=1`;
    const errors = [];
    const logs = [];
    const failedReqs = [];

    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('response', resp => { if (resp.status() >= 400) failedReqs.push(`${resp.status()} ${resp.url()}`); });

    try { await page.goto(url, { waitUntil: 'load', timeout: 10000 }); } catch(e) { errors.push('nav:'+e.message); }
    
    // Simulate pluginEnter event via postMessage (like the bridge would)
    await page.evaluate((data) => {
      window.postMessage({ type: 'utools-event', event: 'pluginEnter', data }, '*');
    }, { code: p.feature, type: 'text', payload: '' });
    
    await page.waitForTimeout(3000);

    const r = await page.evaluate(() => {
      const root = document.getElementById('root') || document.getElementById('app');
      return {
        children: root ? root.childElementCount : -1,
        rootHTML: root ? root.innerHTML.substring(0, 300) : '',
        bodyLen: document.body.innerHTML.length,
        hasUtools: typeof window.utools !== 'undefined',
        hasExports: typeof window.exports !== 'undefined',
        exportsKeys: window.exports ? Object.keys(window.exports) : [],
      };
    });

    const status = r.children > 0 ? 'PASS' : 'FAIL';
    console.log(`\n[${status}] ${p.name}`);
    console.log(`  root=${r.children} bodyLen=${r.bodyLen} exports=${JSON.stringify(r.exportsKeys)}`);
    console.log(`  rootHTML: ${r.rootHTML.substring(0, 200)}`);
    if (errors.length) { console.log('  ERRORS:'); errors.forEach(e => console.log('    ' + e)); }
    if (failedReqs.length) { console.log('  404s:'); failedReqs.forEach(f => console.log('    ' + f)); }
    // Show relevant console logs (warnings/errors only)
    const relevant = logs.filter(l => l.includes('error') || l.includes('Error') || l.includes('warn') || l.includes('not'));
    if (relevant.length) { console.log('  Console:'); relevant.slice(0,10).forEach(l => console.log('    ' + l)); }
    
    await page.close();
  }
  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
