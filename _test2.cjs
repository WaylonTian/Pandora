const { chromium } = require('playwright');
(async () => {
  const PORT = process.argv[2];
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' });
  const page = await browser.newPage();
  const errors = [];
  const logs = [];
  
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  // Before navigating, inject a script that intercepts postMessage to parent
  // and responds to db.allDocs
  await page.addInitScript(() => {
    // Override parent.postMessage to simulate bridge responses
    const origPostMessage = window.postMessage.bind(window);
    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (msg && msg.type === 'utools-call') {
        // Respond to the call
        setTimeout(() => {
          let result = null;
          if (msg.method === 'db.allDocs') result = [];
          window.postMessage({ type: 'utools-response', id: msg.id, result }, '*');
        }, 10);
      }
      if (msg && msg.type === 'utools-ready') {
        console.log('>>> utools-ready received!');
        // Send pluginEnter
        setTimeout(() => {
          window.postMessage({ type: 'utools-event', event: 'pluginEnter', data: { code: 'collection', type: 'text', payload: '' }, pluginId: msg.pluginId }, '*');
        }, 100);
      }
    });
  });

  const url = `http://127.0.0.1:${PORT}/${encodeURIComponent('备忘快贴')}/index.html?__inject__=1`;
  try { await page.goto(url, { waitUntil: 'load', timeout: 10000 }); } catch(e) { errors.push('nav:'+e.message); }
  
  await page.waitForTimeout(5000);

  const r = await page.evaluate(() => {
    const root = document.getElementById('root');
    return {
      children: root ? root.childElementCount : -1,
      rootHTML: root ? root.innerHTML.substring(0, 500) : '',
    };
  });

  console.log('Result:', JSON.stringify(r, null, 2));
  console.log('Errors:', errors);
  console.log('Logs:');
  logs.forEach(l => console.log(' ', l));
  
  await browser.close();
})().catch(e => console.error('FATAL:', e.message));
