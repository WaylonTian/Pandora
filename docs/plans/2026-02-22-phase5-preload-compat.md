# Phase 5: Preload.js Compatibility

## Task 20: Node.js Module Shim — fs, path, os

**Files:**
- Create: `src/modules/toolkit/plugin-runtime/node-shim.ts`
- Modify: `src/modules/toolkit/plugin-runtime/utools-shim.ts`

**Step 1: Create Node.js module shims**

These are injected into the iframe alongside the utools shim. They provide a `require()` function that returns shimmed versions of common Node.js modules, bridged to Tauri backend.

```typescript
export function generateNodeShimScript(pluginId: string): string {
  return `
(function() {
  // Async call to host (reuse utools bridge)
  function nodeCall(module, method, args) {
    return new Promise((resolve, reject) => {
      const id = ++window._utoolsCallId;
      window._utoolsPending.set(id, { resolve, reject });
      window.parent.postMessage({
        type: 'utools-call', id, pluginId: '${pluginId}',
        method: 'node.' + module + '.' + method, args
      }, '*');
    });
  }

  const modules = {
    fs: {
      readFileSync: (path, opts) => { console.warn('fs.readFileSync is async in Pandora'); return ''; },
      writeFileSync: (path, data) => { nodeCall('fs', 'writeFile', [path, data]); },
      existsSync: (path) => { console.warn('fs.existsSync is async in Pandora'); return true; },
      readFile: (path, opts, cb) => {
        if (typeof opts === 'function') { cb = opts; opts = 'utf8'; }
        nodeCall('fs', 'readFile', [path, opts]).then(d => cb(null, d)).catch(e => cb(e));
      },
      writeFile: (path, data, opts, cb) => {
        if (typeof opts === 'function') { cb = opts; opts = {}; }
        nodeCall('fs', 'writeFile', [path, data]).then(() => cb?.(null)).catch(e => cb?.(e));
      },
      promises: {
        readFile: (path, opts) => nodeCall('fs', 'readFile', [path, opts || 'utf8']),
        writeFile: (path, data) => nodeCall('fs', 'writeFile', [path, data]),
        mkdir: (path, opts) => nodeCall('fs', 'mkdir', [path, opts]),
        readdir: (path) => nodeCall('fs', 'readdir', [path]),
        stat: (path) => nodeCall('fs', 'stat', [path]),
        unlink: (path) => nodeCall('fs', 'unlink', [path]),
      },
    },
    path: {
      join: (...args) => args.join('/').replace(/\\/\//g, '/'),
      dirname: (p) => p.split('/').slice(0, -1).join('/') || '.',
      basename: (p, ext) => { const b = p.split('/').pop() || ''; return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; },
      extname: (p) => { const m = p.match(/\\.[^.]+$/); return m ? m[0] : ''; },
      resolve: (...args) => args.join('/'),
      sep: '/',
    },
    os: {
      platform: () => navigator.platform.includes('Win') ? 'win32' : navigator.platform.includes('Mac') ? 'darwin' : 'linux',
      homedir: () => nodeCall('os', 'homedir', []),
      tmpdir: () => nodeCall('os', 'tmpdir', []),
      arch: () => 'x64',
      cpus: () => [{ model: 'unknown', speed: 0 }],
      hostname: () => 'pandora',
    },
    child_process: {
      execSync: (cmd) => { console.warn('execSync not supported in Pandora sandbox'); return ''; },
      exec: (cmd, opts, cb) => {
        if (typeof opts === 'function') { cb = opts; opts = {}; }
        nodeCall('child_process', 'exec', [cmd]).then(r => cb?.(null, r, '')).catch(e => cb?.(e));
      },
    },
    crypto: {
      createHash: (alg) => ({
        _alg: alg, _data: '',
        update(data) { this._data += data; return this; },
        digest(enc) { console.warn('crypto.createHash is async in Pandora, returning placeholder'); return ''; },
      }),
      randomBytes: (size) => {
        const arr = new Uint8Array(size);
        crypto.getRandomValues(arr);
        return { toString: (enc) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('') };
      },
    },
    electron: {
      clipboard: {
        writeText: (text) => navigator.clipboard.writeText(text),
        readText: () => navigator.clipboard.readText(),
        writeImage: () => {},
      },
      nativeImage: {
        createFromPath: (path) => ({ toDataURL: () => '', toPNG: () => new Uint8Array() }),
        createFromDataURL: (url) => ({ toDataURL: () => url, toPNG: () => new Uint8Array() }),
      },
      shell: {
        openExternal: (url) => window.utools?.shellOpenExternal(url),
        openPath: (path) => window.utools?.shellOpenPath(path),
      },
    },
  };

  // Provide require()
  window.require = function(name) {
    const clean = name.replace(/^node:/, '');
    if (modules[clean]) return modules[clean];
    console.warn('require("' + name + '") not available in Pandora plugin runtime');
    return {};
  };

  // Also expose on window for preload scripts that use destructuring
  window.process = {
    platform: modules.os.platform(),
    env: {},
    versions: { node: '16.0.0', electron: '0.0.0' },
    once: () => {},
  };
})();
`;
}
```

**Step 2: Integrate into utools-shim.ts**

Modify `generateShimScript` to also include the node shim:
```typescript
import { generateNodeShimScript } from './node-shim';

export function generateShimScript(pluginId: string): string {
  const nodeShim = generateNodeShimScript(pluginId);
  const utoolsShim = `...existing utools shim code...`;
  return nodeShim + '\n' + utoolsShim;
}
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(plugin): add Node.js module shims for preload.js compatibility"
```

---

## Task 21: Tauri Commands for Node.js Bridge

**Files:**
- Create: `src-tauri/src/plugin/node_bridge.rs`
- Modify: `src-tauri/src/plugin/mod.rs`
- Modify: `src-tauri/src/plugin/commands.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Implement Rust-side Node.js API handlers**

```rust
use std::path::PathBuf;

#[tauri::command]
pub fn node_fs_read_file(path: String, _encoding: Option<String>) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn node_fs_write_file(path: String, data: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn node_fs_mkdir(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn node_fs_readdir(path: String) -> Result<Vec<String>, String> {
    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    Ok(entries.filter_map(|e| e.ok().map(|e| e.file_name().to_string_lossy().to_string())).collect())
}

#[tauri::command]
pub fn node_fs_unlink(path: String) -> Result<(), String> {
    std::fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn node_os_homedir() -> String {
    dirs::home_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default()
}

#[tauri::command]
pub fn node_os_tmpdir() -> String {
    std::env::temp_dir().to_string_lossy().to_string()
}

#[tauri::command]
pub async fn node_exec(cmd: String) -> Result<String, String> {
    let output = tokio::process::Command::new(if cfg!(windows) { "cmd" } else { "sh" })
        .args(if cfg!(windows) { vec!["/C", &cmd] } else { vec!["-c", &cmd] })
        .output()
        .await
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
```

**Step 2: Add to mod.rs**
```rust
pub mod node_bridge;
```

**Step 3: Register commands in lib.rs**

Add to `invoke_handler`:
```rust
plugin::node_bridge::node_fs_read_file,
plugin::node_bridge::node_fs_write_file,
plugin::node_bridge::node_fs_mkdir,
plugin::node_bridge::node_fs_readdir,
plugin::node_bridge::node_fs_unlink,
plugin::node_bridge::node_os_homedir,
plugin::node_bridge::node_os_tmpdir,
plugin::node_bridge::node_exec,
```

**Step 4: Update bridge.ts to route node.* calls**

Add cases to `routeCall` in `bridge.ts`:
```typescript
case 'node.fs.readFile': return invoke('node_fs_read_file', { path: args[0], encoding: args[1] });
case 'node.fs.writeFile': return invoke('node_fs_write_file', { path: args[0], data: args[1] });
case 'node.fs.mkdir': return invoke('node_fs_mkdir', { path: args[0] });
case 'node.fs.readdir': return invoke('node_fs_readdir', { path: args[0] });
case 'node.fs.unlink': return invoke('node_fs_unlink', { path: args[0] });
case 'node.os.homedir': return invoke('node_os_homedir');
case 'node.os.tmpdir': return invoke('node_os_tmpdir');
case 'node.child_process.exec': return invoke('node_exec', { cmd: args[0] });
```

**Step 5: Verify compilation**
```bash
cd src-tauri && cargo check
npx tsc --noEmit
```

**Step 6: Commit**
```bash
git add -A && git commit -m "feat(plugin): add Tauri node bridge commands for preload.js compat"
```

---

## Task 22: Integration Test — End to End

**Step 1: Verify full build**
```bash
cd /mnt/d/workspace/pandora/.worktrees/toolkit-plugin
npm run build
cd src-tauri && cargo build
```

**Step 2: Manual smoke test checklist**
- [ ] Toolkit sidebar shows built-in tools + marketplace + manage plugins
- [ ] Search filters tools
- [ ] New tools (Regex, JWT, Color, Base Converter) render correctly
- [ ] Copy buttons work on all tools
- [ ] Marketplace loads plugin list from uTools
- [ ] Can install a simple plugin (e.g. "时间戳转换")
- [ ] Installed plugin appears in sidebar
- [ ] Plugin renders in iframe
- [ ] Plugin's utools.db API works (put/get)
- [ ] Can uninstall plugin

**Step 3: Final commit**
```bash
git add -A && git commit -m "feat: complete toolkit plugin system v1"
```
