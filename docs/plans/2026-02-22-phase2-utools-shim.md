# Phase 2: uTools API Shim + Plugin Runtime

## Task 6: uTools API Shim (iframe injection script)

**Files:**
- Create: `src/modules/toolkit/plugin-runtime/utools-shim.ts`

**Step 1: Create the shim that gets injected into plugin iframes**

This script is serialized and injected into the iframe via srcdoc. It creates `window.utools` and bridges all calls to the host via postMessage.

```typescript
// This file is converted to a string and injected into plugin iframes.
// All utools.* API calls are bridged to the host via postMessage.

export function generateShimScript(pluginId: string): string {
  return `
(function() {
  let _callId = 0;
  const _pending = new Map();
  const _listeners = {
    pluginEnter: [],
    pluginOut: [],
    dbPull: [],
  };

  function callHost(method, args) {
    return new Promise((resolve, reject) => {
      const id = ++_callId;
      _pending.set(id, { resolve, reject });
      window.parent.postMessage({ type: 'utools-call', id, method, args, pluginId: '${pluginId}' }, '*');
    });
  }

  function callHostSync(method, args) {
    // For sync APIs, we use async internally but return immediately for fire-and-forget
    callHost(method, args);
  }

  // Listen for responses from host
  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg.type === 'utools-response' && _pending.has(msg.id)) {
      const { resolve, reject } = _pending.get(msg.id);
      _pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error));
      else resolve(msg.result);
    }
    if (msg.type === 'utools-event') {
      const handlers = _listeners[msg.event] || [];
      handlers.forEach(fn => fn(msg.data));
    }
  });

  // Build the utools global object
  const dbPromises = {
    put: (doc) => callHost('db.put', [doc]),
    get: (id) => callHost('db.get', [id]),
    remove: (docOrId) => callHost('db.remove', [typeof docOrId === 'string' ? docOrId : docOrId._id]),
    bulkDocs: (docs) => callHost('db.bulkDocs', [docs]),
    allDocs: (arg) => callHost('db.allDocs', [arg]),
    postAttachment: (id, data, type) => callHost('db.postAttachment', [id, Array.from(data), type]),
    getAttachment: (id) => callHost('db.getAttachment', [id]).then(r => r ? new Uint8Array(r) : null),
    getAttachmentType: (id) => callHost('db.getAttachmentType', [id]),
    replicateStateFromCloud: () => Promise.resolve(0),
  };

  // Sync wrappers (call async, return placeholder — most plugins use promises anyway)
  const dbSync = {};
  for (const key of Object.keys(dbPromises)) {
    dbSync[key] = (...args) => {
      console.warn('utools.db.' + key + ' sync version called — use utools.db.promises.' + key + ' for reliable results');
      let result = undefined;
      dbPromises[key](...args).then(r => { result = r; });
      return result;
    };
  }
  dbSync.promises = dbPromises;

  const dbStorage = {
    setItem: (key, value) => callHostSync('dbStorage.setItem', [key, value]),
    getItem: (key) => { let r; callHost('dbStorage.getItem', [key]).then(v => r = v); return r; },
    removeItem: (key) => callHostSync('dbStorage.removeItem', [key]),
  };

  window.utools = {
    // Events
    onPluginEnter: (cb) => _listeners.pluginEnter.push(cb),
    onPluginOut: (cb) => _listeners.pluginOut.push(cb),
    onPluginDetach: (cb) => {},
    onDbPull: (cb) => _listeners.dbPull.push(cb),
    onMainPush: (cb, onSelect) => {},

    // Database
    db: Object.assign(dbSync, { promises: dbPromises }),
    dbStorage: dbStorage,
    dbCryptoStorage: dbStorage, // alias, no encryption in our impl

    // Clipboard
    copyText: (text) => callHostSync('copyText', [text]),
    copyImage: (img) => callHostSync('copyImage', [img]),
    copyFile: (file) => callHostSync('copyFile', [file]),

    // Window
    hideMainWindow: () => callHostSync('hideMainWindow', []),
    showMainWindow: () => callHostSync('showMainWindow', []),
    setExpendHeight: (h) => window.parent.postMessage({ type: 'utools-resize', height: h, pluginId: '${pluginId}' }, '*'),
    hideMainWindowPasteText: (text) => callHostSync('hideMainWindowPasteText', [text]),
    hideMainWindowTypeString: (text) => callHostSync('hideMainWindowPasteText', [text]),
    setSubInput: (onChange, placeholder) => {},
    removeSubInput: () => {},
    setSubInputValue: (val) => {},

    // Shell
    shellOpenExternal: (url) => callHostSync('shellOpenExternal', [url]),
    shellOpenPath: (path) => callHostSync('shellOpenPath', [path]),
    shellShowItemInFolder: (path) => callHostSync('shellShowItemInFolder', [path]),

    // System
    showNotification: (text) => callHostSync('showNotification', [text]),
    getPath: (name) => callHost('getPath', [name]),
    getUser: () => ({ avatar: '', nickname: 'Pandora User', type: 'member' }),
    isDarkColors: () => document.documentElement.classList.contains('dark'),
    getAppVersion: () => '0.1.0',
    isMacOS: () => navigator.platform.includes('Mac'),
    isWindows: () => navigator.platform.includes('Win'),
    isLinux: () => navigator.platform.includes('Linux'),

    // Navigation
    redirect: (code, payload) => callHostSync('redirect', [code, payload]),
    getIdleUBrowsers: () => [],
    ubrowser: { goto: () => ({ run: () => {} }) },

    // Feature
    getFeatures: () => [],
    setFeature: () => {},
    removeFeature: () => {},
  };

  // Notify host that shim is ready
  window.parent.postMessage({ type: 'utools-ready', pluginId: '${pluginId}' }, '*');
})();
`;
}
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(plugin): add uTools API shim for iframe injection"
```

---

## Task 7: Plugin Host Bridge (React side message handler)

**Files:**
- Create: `src/modules/toolkit/plugin-runtime/bridge.ts`

**Step 1: Create the host-side message bridge**

This listens for postMessage from plugin iframes and routes calls to Tauri backend.

```typescript
import { invoke } from '@tauri-apps/api/core';

type PendingResize = (height: number) => void;

interface BridgeOptions {
  pluginId: string;
  onReady?: () => void;
  onResize?: PendingResize;
}

export function createPluginBridge(options: BridgeOptions) {
  const { pluginId, onReady, onResize } = options;

  const handler = async (e: MessageEvent) => {
    const msg = e.data;
    if (!msg || msg.pluginId !== pluginId) return;

    if (msg.type === 'utools-ready') {
      onReady?.();
      return;
    }

    if (msg.type === 'utools-resize') {
      onResize?.(msg.height);
      return;
    }

    if (msg.type === 'utools-call') {
      const { id, method, args } = msg;
      try {
        const result = await routeCall(pluginId, method, args);
        e.source?.postMessage({ type: 'utools-response', id, result }, { targetOrigin: '*' });
      } catch (err: any) {
        e.source?.postMessage({ type: 'utools-response', id, error: err.message || String(err) }, { targetOrigin: '*' });
      }
    }
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

async function routeCall(pluginId: string, method: string, args: any[]): Promise<any> {
  switch (method) {
    // DB
    case 'db.put': return invoke('plugin_db_put', { pluginId, doc: args[0] });
    case 'db.get': return invoke('plugin_db_get', { pluginId, id: args[0] });
    case 'db.remove': return invoke('plugin_db_remove', { pluginId, id: args[0] });
    case 'db.bulkDocs': {
      const results = [];
      for (const doc of args[0]) {
        results.push(await invoke('plugin_db_put', { pluginId, doc }));
      }
      return results;
    }
    case 'db.allDocs': {
      const arg = args[0];
      if (typeof arg === 'string') return invoke('plugin_db_all', { pluginId, prefix: arg });
      if (Array.isArray(arg)) {
        const results = [];
        for (const id of arg) {
          const doc = await invoke('plugin_db_get', { pluginId, id });
          if (doc) results.push(doc);
        }
        return results;
      }
      return invoke('plugin_db_all', { pluginId, prefix: null });
    }
    case 'db.postAttachment': return invoke('plugin_db_put_attachment', { pluginId, id: args[0], data: args[1], mime: args[2] });
    case 'db.getAttachment': return invoke('plugin_db_get_attachment', { pluginId, id: args[0] });

    // dbStorage
    case 'dbStorage.setItem': return invoke('plugin_db_put', { pluginId, doc: { _id: `_storage/${args[0]}`, value: args[1] } });
    case 'dbStorage.getItem': {
      const doc = await invoke('plugin_db_get', { pluginId, id: `_storage/${args[0]}` }) as any;
      return doc?.value ?? null;
    }
    case 'dbStorage.removeItem': return invoke('plugin_db_remove', { pluginId, id: `_storage/${args[0]}` });

    // Clipboard
    case 'copyText': return navigator.clipboard.writeText(args[0]);
    case 'copyImage': return; // TODO: Tauri clipboard image

    // Shell
    case 'shellOpenExternal': return invoke('plugin_open_url', { url: args[0] }).catch(() => window.open(args[0]));
    case 'shellOpenPath': return invoke('plugin_open_path', { path: args[0] });

    // Window
    case 'showNotification': return; // TODO: Tauri notification
    case 'getPath': return invoke('plugin_get_path', { name: args[0] });

    default:
      console.warn(`[plugin-bridge] Unhandled method: ${method}`);
      return null;
  }
}

export function sendPluginEvent(iframe: HTMLIFrameElement, event: string, data: any, pluginId: string) {
  iframe.contentWindow?.postMessage({ type: 'utools-event', event, data, pluginId }, '*');
}
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(plugin): add host-side plugin bridge"
```

---

## Task 8: Plugin Container Component

**Files:**
- Create: `src/modules/toolkit/plugin-runtime/PluginContainer.tsx`

**Step 1: Create the iframe-based plugin renderer**

```tsx
import { useEffect, useRef, useState } from 'react';
import { createPluginBridge, sendPluginEvent } from './bridge';
import { generateShimScript } from './utools-shim';
import type { InstalledPlugin } from './types';

interface Props {
  plugin: InstalledPlugin;
  featureCode?: string;
}

export function PluginContainer({ plugin, featureCode }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cleanup = createPluginBridge({
      pluginId: plugin.id,
      onReady: () => {
        setReady(true);
        // Fire onPluginEnter
        if (iframeRef.current) {
          sendPluginEvent(iframeRef.current, 'pluginEnter', {
            code: featureCode || plugin.manifest.features[0]?.code || '',
            type: 'text',
            payload: '',
          }, plugin.id);
        }
      },
      onResize: (h) => setHeight(h),
    });
    return cleanup;
  }, [plugin.id, featureCode]);

  // Build srcdoc: inject shim + load plugin's index.html
  const shimScript = generateShimScript(plugin.id);
  const mainFile = plugin.manifest.main || 'index.html';
  const pluginBaseUrl = `asset://localhost/plugins/${plugin.id}/`;

  const srcdoc = `
<!DOCTYPE html>
<html>
<head>
  <base href="${pluginBaseUrl}">
  <script>${shimScript}</script>
</head>
<body>
  <script>
    fetch("${pluginBaseUrl}${mainFile}")
      .then(r => r.text())
      .then(html => {
        // Extract body content and scripts
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Copy styles
        doc.querySelectorAll('link[rel="stylesheet"], style').forEach(el => {
          document.head.appendChild(el.cloneNode(true));
        });
        // Set body
        document.body.innerHTML = doc.body.innerHTML;
        // Execute scripts
        doc.querySelectorAll('script').forEach(el => {
          const s = document.createElement('script');
          if (el.src) s.src = el.src;
          else s.textContent = el.textContent;
          document.body.appendChild(s);
        });
      });
  </script>
</body>
</html>`;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      className="w-full border-0"
      style={{ height: height ? `${height}px` : '100%', minHeight: '200px' }}
    />
  );
}
```

**Step 2: Create shared types**

Create `src/modules/toolkit/plugin-runtime/types.ts`:
```typescript
export interface PluginFeature {
  code: string;
  explain?: string;
  icon?: string;
  cmds: any[];
}

export interface PluginManifest {
  main?: string;
  logo?: string;
  preload?: string;
  features: PluginFeature[];
  pluginSetting?: any;
}

export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  logo?: string;
  path: string;
  manifest: PluginManifest;
  enabled: boolean;
  installed_at: string;
}

export interface MarketPlugin {
  name: string;
  description: string;
  url: string;
  detail_url: string;
}

export interface MarketPluginDetail {
  name: string;
  description: string;
  version: string;
  size: string;
  download_url?: string;
  developer: string;
  rating: string;
  users: string;
  detail_html: string;
}
```

**Step 3: Create index barrel**

Create `src/modules/toolkit/plugin-runtime/index.ts`:
```typescript
export { PluginContainer } from './PluginContainer';
export { generateShimScript } from './utools-shim';
export { createPluginBridge, sendPluginEvent } from './bridge';
export type { InstalledPlugin, MarketPlugin, MarketPluginDetail, PluginManifest } from './types';
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(plugin): add PluginContainer iframe renderer"
```
