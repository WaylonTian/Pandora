# Plugin System Optimization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix bugs, improve robustness, and enhance UX of the Pandora uTools-compatible plugin system.

**Architecture:** Incremental fixes across Rust backend and TypeScript frontend. Each task is independent and can be committed separately. No new modules — only improving existing code.

**Tech Stack:** Rust (Tauri v2), TypeScript/React, SQLite (rusqlite), reqwest

---

## Task 1: Fix local plugin install — read name/version from plugin.json

Currently `plugin_install_from_file` hardcodes name as `"local-plugin"` and version as `"0.0.0"`. Should read from the extracted `plugin.json`.

**Files:**
- Modify: `src-tauri/src/plugin/manager.rs` — `install_plugin` function
- Modify: `src-tauri/src/plugin/commands.rs` — `plugin_install_from_file` function

**Step 1: Change `install_plugin` to auto-read name/version from plugin.json when not provided**

In `manager.rs`, after extracting the package and reading `plugin.json`, use the manifest's data to fill in empty name/version/description. The `plugin.json` has fields like `"pluginName"`, `"version"`, `"description"` at the top level (standard uTools plugin.json format).

```rust
// In install_plugin, after reading manifest_str and parsing manifest:
// Read the raw JSON to get pluginName, version, description
let raw: serde_json::Value = serde_json::from_str(&manifest_str).unwrap_or_default();
let final_name = if name.is_empty() || name == "local-plugin" {
    raw.get("pluginName").or(raw.get("plugin_name"))
        .and_then(|v| v.as_str()).unwrap_or(name)
} else { name };
let final_version = if version.is_empty() || version == "0.0.0" {
    raw.get("version").and_then(|v| v.as_str()).unwrap_or(version)
} else { version };
let final_desc = if description.is_empty() {
    raw.get("description").and_then(|v| v.as_str()).unwrap_or(description)
} else { description };
```

**Step 2: Update `plugin_install_from_file` to pass empty strings**

```rust
pub async fn plugin_install_from_file(path: String) -> Result<manager::InstalledPlugin, String> {
    manager::install_plugin(&PathBuf::from(&path), "", "", "")
}
```

**Step 3: Build and verify**

Run: `powershell.exe -Command "cd D:\workspace\pandora\.worktrees\toolkit-plugin; cargo check -p pandora"`
Expected: compiles without errors

**Step 4: Commit**

```bash
git add src-tauri/src/plugin/manager.rs src-tauri/src/plugin/commands.rs
git commit -m "fix(plugin): read name/version from plugin.json for local installs"
```

---

## Task 2: Show plugin logos in InstalledPlugins list

Currently `InstalledPlugins.tsx` always shows 📦. Should show the actual plugin logo like the sidebar does.

**Files:**
- Modify: `src/modules/toolkit/components/InstalledPlugins.tsx`

**Step 1: Import PluginIcon or inline the logo loading logic**

Reuse the same approach as `ToolkitLayout.tsx` — invoke `plugin_read_file` to load the logo bytes, create a blob URL.

```tsx
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePluginStore } from "../stores/plugin-store";
import { useT } from "@/i18n";

function PluginLogo({ pluginId, logo }: { pluginId: string; logo?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!logo) return;
    invoke<number[]>("plugin_read_file", { pluginId, path: logo })
      .then((bytes) => {
        const blob = new Blob([new Uint8Array(bytes)], { type: "image/png" });
        setSrc(URL.createObjectURL(blob));
      })
      .catch(() => {});
    return () => { if (src) URL.revokeObjectURL(src); };
  }, [pluginId, logo]);
  if (!src) return <span className="text-lg">📦</span>;
  return <img src={src} alt="" className="w-10 h-10 rounded-lg object-cover" />;
}
```

**Step 2: Replace the hardcoded 📦 in the plugin list**

Replace:
```tsx
<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">📦</div>
```
With:
```tsx
<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
  <PluginLogo pluginId={plugin.id} logo={plugin.logo} />
</div>
```

**Step 3: Commit**

```bash
git add src/modules/toolkit/components/InstalledPlugins.tsx
git commit -m "fix(plugin): show actual plugin logos in installed plugins list"
```

---

## Task 3: Fix marketplace download_url detection — support .upx URLs

`parse_next_data_detail` fallback only scans for `.upxs`. Should also detect `.upx`.

**Files:**
- Modify: `src-tauri/src/plugin/marketplace.rs` — `parse_next_data_detail` function

**Step 1: Fix the fallback URL scan**

Replace the fallback block:
```rust
// Fallback: scan for download URL in HTML (.upx or .upxs)
if download_url.is_none() {
    if let Some(pos) = html.find("res.u-tools.cn/plugins/") {
        let start = html[..pos].rfind("https://").unwrap_or(pos);
        // Find the end of the URL (look for .upxs or .upx followed by non-alphanumeric)
        let rest = &html[start..];
        if let Some(end_offset) = rest.find(".upxs") {
            download_url = Some(rest[..end_offset + 5].to_string());
        } else if let Some(end_offset) = rest.find(".upx") {
            download_url = Some(rest[..end_offset + 4].to_string());
        }
    }
}
```

**Step 2: Build and verify**

Run: `powershell.exe -Command "cd D:\workspace\pandora\.worktrees\toolkit-plugin; cargo check -p pandora"`

**Step 3: Commit**

```bash
git add src-tauri/src/plugin/marketplace.rs
git commit -m "fix(marketplace): detect .upx download URLs in fallback scan"
```

---

## Task 4: Mark uninstallable .upxs plugins in marketplace UI

Users can't tell which plugins are encrypted until they try to install. Add a visual indicator.

**Files:**
- Modify: `src/modules/toolkit/stores/plugin-store.ts` — add `getDetail` usage for pre-check
- Modify: `src/modules/toolkit/components/Marketplace.tsx` — show badge/disable button

**Step 1: In `installFromMarket`, the error already surfaces. Improve the UX by showing the error inline per-plugin**

Change `installError` from a single string to a Map keyed by plugin name:

In `plugin-store.ts`:
```typescript
// Change installError type
installError: Map<string, string>;
// Initialize as
installError: new Map(),
```

In `installFromMarket`:
```typescript
} catch (e: any) {
  set((s) => {
    const errors = new Map(s.installError);
    errors.set(name, e.message || String(e));
    return { installError: errors };
  });
}
```

**Step 2: In Marketplace.tsx, show per-plugin error**

Replace the single error banner with per-plugin inline error. In the plugin card:
```tsx
{installError.get(plugin.name) && (
  <div className="text-xs text-destructive truncate">{installError.get(plugin.name)}</div>
)}
```

**Step 3: Auto-clear error after 5 seconds**

In `installFromMarket` catch block, add:
```typescript
setTimeout(() => {
  set((s) => {
    const errors = new Map(s.installError);
    errors.delete(name);
    return { installError: errors };
  });
}, 5000);
```

**Step 4: Commit**

```bash
git add src/modules/toolkit/stores/plugin-store.ts src/modules/toolkit/components/Marketplace.tsx
git commit -m "feat(marketplace): show per-plugin install errors with auto-dismiss"
```

---

## Task 5: Add error UI to PluginContainer

Currently plugin load failures only go to console.error. Show a user-visible error state.

**Files:**
- Modify: `src/modules/toolkit/plugin-runtime/PluginContainer.tsx`

**Step 1: Add error state**

```tsx
const [error, setError] = useState<string | null>(null);

// In the async IIFE catch:
}).catch((e) => {
  console.error("Plugin load error:", e);
  setError(String(e.message || e));
});

// Before the iframe return:
if (error) return (
  <div className="p-4 text-destructive bg-destructive/10 rounded">
    <div className="font-medium text-sm">插件加载失败</div>
    <div className="text-xs mt-1">{error}</div>
  </div>
);
```

**Step 2: Commit**

```bash
git add src/modules/toolkit/plugin-runtime/PluginContainer.tsx
git commit -m "fix(plugin): show error UI when plugin fails to load"
```

---

## Task 6: Increase HTTP server buffer and add timeout

`server.rs` uses a 4096-byte buffer which truncates large HTTP requests (e.g., long query strings or headers). Also no read timeout.

**Files:**
- Modify: `src-tauri/src/plugin/server.rs`

**Step 1: Increase buffer to 8KB and add read timeout**

```rust
fn handle(mut stream: std::net::TcpStream, plugins_dir: &PathBuf) {
    stream.set_read_timeout(Some(std::time::Duration::from_secs(5))).ok();
    let mut buf = [0u8; 8192];
    // ... rest unchanged
```

**Step 2: Build and verify**

Run: `powershell.exe -Command "cd D:\workspace\pandora\.worktrees\toolkit-plugin; cargo check -p pandora"`

**Step 3: Commit**

```bash
git add src-tauri/src/plugin/server.rs
git commit -m "fix(server): increase buffer to 8KB and add 5s read timeout"
```

---

## Task 7: Cache SQLite connections per plugin

Every DB operation opens a new SQLite connection. Add a simple connection cache.

**Files:**
- Modify: `src-tauri/src/plugin/db.rs`

**Step 1: Add a static connection cache using Mutex<HashMap>**

```rust
use std::sync::Mutex;
use std::collections::HashMap;

static DB_CACHE: std::sync::LazyLock<Mutex<HashMap<String, Connection>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

fn open_db(plugin_id: &str) -> Result<std::sync::MutexGuard<'static, HashMap<String, Connection>>, String> {
    let mut cache = DB_CACHE.lock().map_err(|e| e.to_string())?;
    if !cache.contains_key(plugin_id) {
        let dir = db_path(plugin_id);
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let conn = Connection::open(dir.join("docs.db")).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS docs (id TEXT PRIMARY KEY, rev INTEGER DEFAULT 1, data TEXT NOT NULL);
             CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, data BLOB NOT NULL, mime TEXT NOT NULL);"
        ).map_err(|e| e.to_string())?;
        cache.insert(plugin_id.to_string(), conn);
    }
    Ok(cache)
}
```

Then update all callers to use `let cache = open_db(plugin_id)?; let conn = cache.get(plugin_id).unwrap();`

Note: rusqlite `Connection` is `Send` but not `Sync`. Since we hold the Mutex lock for the duration of each operation, this is safe. An alternative simpler approach: just use `thread_local!` or accept the current overhead if it's not a bottleneck. **Evaluate during implementation — if the Mutex approach is too complex, skip this task.**

**Step 2: Build and verify**

**Step 3: Commit**

```bash
git add src-tauri/src/plugin/db.rs
git commit -m "perf(db): cache SQLite connections per plugin"
```

---

## Task 8: Fix node-shim path.join for Windows

`path.join` in `node-shim.ts` uses `/` separator. On Windows, plugins may expect `\`.

**Files:**
- Modify: `src/modules/toolkit/plugin-runtime/node-shim.ts`

**Step 1: Fix path.join to use platform separator**

```javascript
path: {
  join: (...a) => {
    const sep = navigator.platform.includes('Win') ? '\\\\' : '/';
    return a.join(sep).replace(/[\\/]+/g, sep);
  },
  // ... keep dirname/basename/extname but also handle backslash
  dirname: (p) => { const parts = p.replace(/\\\\/g, '/').split('/'); parts.pop(); return parts.join('/') || '.'; },
  basename: (p, e) => { const b = p.replace(/\\\\/g, '/').split('/').pop() || ''; return e && b.endsWith(e) ? b.slice(0, -e.length) : b; },
  extname: (p) => { const m = p.match(/\\.[^.\\\\/]+$/); return m ? m[0] : ''; },
  resolve: (...a) => a.join('/'),
  sep: navigator.platform.includes('Win') ? '\\\\' : '/',
},
```

**Step 2: Commit**

```bash
git add src/modules/toolkit/plugin-runtime/node-shim.ts
git commit -m "fix(node-shim): handle Windows path separators in path.join"
```

---

## Task 9: Improve marketplace install_from_market — use description from detail

Currently `install_plugin` is called with `detail.size` as the description parameter (bug). Should use `detail.description`.

**Files:**
- Modify: `src-tauri/src/plugin/commands.rs` — `plugin_install_from_market`

**Step 1: Fix the description parameter**

Change:
```rust
let result = manager::install_plugin(&tmp, &name, &detail.version, &detail.size);
```
To:
```rust
let result = manager::install_plugin(&tmp, &name, &detail.version, &detail.description);
```

**Step 2: Build and verify**

**Step 3: Commit**

```bash
git add src-tauri/src/plugin/commands.rs
git commit -m "fix(marketplace): pass description instead of size to install_plugin"
```

---

## Task 10: Add plugin update detection

When browsing marketplace, if a plugin is already installed, show its installed version vs. available version.

**Files:**
- Modify: `src/modules/toolkit/components/Marketplace.tsx`
- Modify: `src/modules/toolkit/plugin-runtime/types.ts` (if needed)

**Step 1: Compare installed version with marketplace version**

In `Marketplace.tsx`, the `installed` array has version info. When rendering each marketplace plugin, check if installed and compare versions:

```tsx
const getInstalled = (name: string) => installed.find((p) => p.name === name);

// In the card:
const inst = getInstalled(plugin.name);
const buttonLabel = inst
  ? (inst.version !== plugin.version && plugin.version ? t("toolkit.marketplace.update") : t("toolkit.marketplace.installed"))
  : installing.has(plugin.name) ? t("toolkit.marketplace.installing")
  : t("toolkit.marketplace.install");
```

Note: `MarketPlugin` doesn't currently have `version`. We'd need to either:
- (a) Add version to the list scraping (if available in the HTML), or
- (b) Only show "update available" after user clicks a detail/check button

**Evaluate during implementation.** If version isn't in the list data, just skip this task or add a simple "reinstall" button for already-installed plugins.

**Step 2: Commit**

```bash
git add src/modules/toolkit/components/Marketplace.tsx
git commit -m "feat(marketplace): show update indicator for installed plugins"
```

---

## Summary

| Task | Type | Priority | Complexity |
|------|------|----------|------------|
| 1. Fix local install name/version | Bug fix | High | Low |
| 2. Plugin logos in installed list | UX | Medium | Low |
| 3. Fix .upx URL detection | Bug fix | High | Low |
| 4. Per-plugin install errors | UX | Medium | Low |
| 5. Plugin load error UI | UX | Medium | Low |
| 6. Server buffer + timeout | Robustness | Medium | Low |
| 7. DB connection cache | Performance | Low | Medium |
| 8. Windows path fix | Bug fix | High | Low |
| 9. Fix description parameter | Bug fix | High | Trivial |
| 10. Update detection | Feature | Low | Medium |

**Recommended execution order:** 9 → 1 → 3 → 8 → 6 → 5 → 2 → 4 → 7 → 10
(Trivial bug fixes first, then high-priority bugs, then UX, then optional perf/features)
