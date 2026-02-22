export function generateNodeShimScript(pluginId: string): string {
  return `
(function() {
  function nodeCall(module, method, args) {
    return new Promise((resolve, reject) => {
      const id = ++window._utoolsCallId;
      window._utoolsPending.set(id, { resolve, reject });
      window.parent.postMessage({ type: 'utools-call', id, pluginId: '${pluginId}', method: 'node.' + module + '.' + method, args }, '*');
    });
  }

  const modules = {
    fs: {
      readFileSync: () => { console.warn('fs.readFileSync is async in Pandora'); return ''; },
      writeFileSync: (p, d) => { nodeCall('fs', 'writeFile', [p, d]); },
      existsSync: () => true,
      readFile: (p, o, cb) => { if (typeof o === 'function') { cb = o; o = 'utf8'; } nodeCall('fs', 'readFile', [p, o]).then(d => cb(null, d)).catch(e => cb(e)); },
      writeFile: (p, d, o, cb) => { if (typeof o === 'function') { cb = o; } nodeCall('fs', 'writeFile', [p, d]).then(() => cb?.(null)).catch(e => cb?.(e)); },
      promises: {
        readFile: (p, o) => nodeCall('fs', 'readFile', [p, o || 'utf8']),
        writeFile: (p, d) => nodeCall('fs', 'writeFile', [p, d]),
        mkdir: (p) => nodeCall('fs', 'mkdir', [p]),
        readdir: (p) => nodeCall('fs', 'readdir', [p]),
        unlink: (p) => nodeCall('fs', 'unlink', [p]),
      },
    },
    path: {
      join: (...a) => a.join('/').replace(/\\/\\//g, '/'),
      dirname: (p) => p.split('/').slice(0, -1).join('/') || '.',
      basename: (p, e) => { const b = p.split('/').pop() || ''; return e && b.endsWith(e) ? b.slice(0, -e.length) : b; },
      extname: (p) => { const m = p.match(/\\.[^.]+$/); return m ? m[0] : ''; },
      resolve: (...a) => a.join('/'),
      sep: '/',
    },
    os: {
      platform: () => navigator.platform.includes('Win') ? 'win32' : navigator.platform.includes('Mac') ? 'darwin' : 'linux',
      homedir: () => nodeCall('os', 'homedir', []),
      tmpdir: () => nodeCall('os', 'tmpdir', []),
      arch: () => 'x64',
      hostname: () => 'pandora',
    },
    child_process: {
      execSync: () => { console.warn('execSync not supported'); return ''; },
      exec: (cmd, o, cb) => { if (typeof o === 'function') { cb = o; } nodeCall('child_process', 'exec', [cmd]).then(r => cb?.(null, r, '')).catch(e => cb?.(e)); },
    },
    electron: {
      clipboard: { writeText: (t) => navigator.clipboard.writeText(t), readText: () => navigator.clipboard.readText() },
      shell: { openExternal: (u) => window.utools?.shellOpenExternal(u), openPath: (p) => window.utools?.shellOpenPath(p) },
    },
  };

  window.require = function(name) {
    const clean = name.replace(/^node:/, '');
    if (modules[clean]) return modules[clean];
    console.warn('require("' + name + '") not available in Pandora');
    return {};
  };

  window.process = { platform: modules.os.platform(), env: {}, versions: { node: '16.0.0' }, once: () => {} };
})();
`;
}
