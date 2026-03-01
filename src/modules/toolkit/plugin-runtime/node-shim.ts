export function generateNodeShimScript(pluginId: string, serverPort?: number): string {
  return `
(function() {
  window.__pluginServerPort = ${serverPort || 0};
  function nodeCall(module, method, args) {
    return new Promise((resolve, reject) => {
      const id = ++window._utoolsCallId;
      window._utoolsPending.set(id, { resolve, reject });
      window.parent.postMessage({ type: 'utools-call', id, pluginId: '${pluginId}', method: 'node.' + module + '.' + method, args }, '*');
    });
  }

  const modules = {
    fs: {
      readFileSync: (p, o) => {
        try {
          const xhr = new XMLHttpRequest();
          const port = window.__pluginServerPort || 0;
          xhr.open('GET', 'http://127.0.0.1:' + port + '/__raw__?path=' + encodeURIComponent(p), false);
          if (o === 'utf8' || o === 'utf-8' || (o && o.encoding)) { xhr.send(); return xhr.responseText; }
          xhr.overrideMimeType('text/plain; charset=x-user-defined');
          xhr.send();
          const raw = xhr.responseText;
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i) & 0xff;
          bytes.toString = function(enc) {
            if (enc === 'base64') {
              let b = ''; const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
              for (let i = 0; i < this.length; i += 3) {
                const a0 = this[i], a1 = this[i+1] || 0, a2 = this[i+2] || 0;
                b += c[a0>>2] + c[((a0&3)<<4)|(a1>>4)] + (i+1<this.length ? c[((a1&15)<<2)|(a2>>6)] : '=') + (i+2<this.length ? c[a2&63] : '=');
              }
              return b;
            }
            return new TextDecoder().decode(this);
          };
          return bytes;
        } catch { return ''; }
      },
      writeFileSync: (p, d, o) => { nodeCall('fs', 'writeFile', [p, typeof d === 'string' ? d : Array.from(d)]); },
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
      clipboard: {
        writeText: (t) => navigator.clipboard.writeText(t),
        readText: () => navigator.clipboard.readText(),
        readImage: () => {
          // Return a NativeImage-like object; actual image comes from screenCapture
          return { isEmpty: () => true, toDataURL: () => '' };
        },
        writeHTML: (h) => {
          try { navigator.clipboard.write([new ClipboardItem({'text/html': new Blob([h], {type:'text/html'})})]) } catch {}
        },
      },
      shell: { openExternal: (u) => window.utools?.shellOpenExternal(u), openPath: (p) => window.utools?.shellOpenPath(p) },
    },
    sharp: (() => {
      function s(input) {
        const c = { _input: input };
        c.metadata = () => nodeCall('sharp', 'metadata', [c._input]);
        c.resize = (w, h) => { c._ops = [...(c._ops||[]), ['resize',w,h]]; return c; };
        c.rotate = (d) => { c._ops = [...(c._ops||[]), ['rotate',d]]; return c; };
        c.flip = () => { c._ops = [...(c._ops||[]), ['flip','vertical']]; return c; };
        c.flop = () => { c._ops = [...(c._ops||[]), ['flip','horizontal']]; return c; };
        c.blur = (sigma) => { c._ops = [...(c._ops||[]), ['blur',sigma||1]]; return c; };
        c.grayscale = () => { c._ops = [...(c._ops||[]), ['grayscale']]; return c; };
        c.greyscale = c.grayscale;
        c.toFormat = (fmt) => { c._fmt = fmt; return c; };
        c.png = () => c.toFormat('png');
        c.jpeg = () => c.toFormat('jpeg');
        c.webp = () => c.toFormat('webp');
        c.toFile = (out) => nodeCall('sharp', 'toFormat', [c._input, c._fmt||'png', out]);
        c.toBuffer = () => nodeCall('sharp', 'toBase64', [c._input, c._fmt||'png']);
        return c;
      }
      return s;
    })(),
    ffmpeg: {
      isAvailable: () => nodeCall('ffmpeg', 'isAvailable', []),
      run: (args) => nodeCall('ffmpeg', 'run', [args]),
      probe: (input) => nodeCall('ffmpeg', 'probe', [input]),
    },
    crypto: {
      createHash: (alg) => {
        let _data = '';
        return {
          update: (d) => { _data += (typeof d === 'string' ? d : String(d)); return { digest: (enc) => {
            // Simple hash via Web Crypto is async; fallback to a sync djb2 for md5/hex
            let h = 0;
            for (let i = 0; i < _data.length; i++) { h = ((h << 5) - h + _data.charCodeAt(i)) | 0; }
            const hex = (h >>> 0).toString(16).padStart(8, '0');
            return hex + hex + hex + hex; // 32-char pseudo-hash
          }};
          }
        };
      },
      randomBytes: (n) => {
        const arr = new Uint8Array(n);
        crypto.getRandomValues(arr);
        return arr;
      },
    },
    url: {
      pathToFileURL: (p) => ({ href: 'file:///' + p.replace(/\\\\\\\\/g, '/').replace(/^\\//,'') }),
      fileURLToPath: (u) => u.replace(/^file:\\/\\/\\//, '/').replace(/^file:\\/\\//, ''),
    },
  };

  window.require = function(name) {
    const clean = name.replace(/^node:/, '');
    if (modules[clean]) return modules[clean];
    console.warn('require("' + name + '") not available in Pandora');
    return {};
  };

  window.process = { platform: modules.os.platform(), env: {}, versions: { node: '16.0.0' }, once: () => {} };
  window.Buffer = window.Buffer || function BufferShim(d, e) {
    if (!(this instanceof BufferShim)) return BufferShim.from(d, e);
    const arr = BufferShim.from(d, e);
    Object.setPrototypeOf(arr, BufferShim.prototype);
    return arr;
  };
  window.Buffer.from = (d, e) => {
    if (typeof d === 'string' && e === 'base64') {
      const bin = atob(d);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      arr.toString = function(enc) {
        if (enc === 'hex') return Array.from(this).map(b => b.toString(16).padStart(2,'0')).join('');
        return new TextDecoder().decode(this);
      };
      return arr;
    }
    if (d instanceof ArrayBuffer || d instanceof Uint8Array) {
      const arr = d instanceof Uint8Array ? d : new Uint8Array(d);
      arr.toString = function(enc) {
        if (enc === 'hex') return Array.from(this).map(b => b.toString(16).padStart(2,'0')).join('');
        if (enc === 'base64') {
          let b = ''; const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
          for (let i = 0; i < this.length; i += 3) {
            const a0 = this[i], a1 = this[i+1] || 0, a2 = this[i+2] || 0;
            b += c[a0>>2] + c[((a0&3)<<4)|(a1>>4)] + (i+1<this.length ? c[((a1&15)<<2)|(a2>>6)] : '=') + (i+2<this.length ? c[a2&63] : '=');
          }
          return b;
        }
        return new TextDecoder().decode(this);
      };
      return arr;
    }
    if (typeof d === 'number') return new Uint8Array(d);
    return d;
  };
  window.Buffer.isBuffer = (o) => o instanceof Uint8Array;
  window.Buffer.alloc = (n) => new Uint8Array(n);
  window.Buffer.concat = (list) => {
    const total = list.reduce((s, b) => s + b.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const b of list) { result.set(b, offset); offset += b.length; }
    return result;
  };
})();
`;
}
