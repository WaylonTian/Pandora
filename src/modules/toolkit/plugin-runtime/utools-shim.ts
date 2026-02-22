// This file is converted to a string and injected into plugin iframes.
// All utools.* API calls are bridged to the host via postMessage.

import { generateNodeShimScript } from "./node-shim";

export function generateShimScript(pluginId: string, serverPort?: number): string {
  const nodeShim = generateNodeShimScript(pluginId, serverPort);
  const utoolsShim = `
(function() {
  let _callId = 0;
  const _pending = new Map();
  window._utoolsCallId = 0;
  window._utoolsPending = _pending;
  const _listeners = { pluginEnter: [], pluginOut: [], dbPull: [] };

  function callHost(method, args) {
    return new Promise((resolve, reject) => {
      const id = ++_callId;
      window._utoolsCallId = _callId;
      _pending.set(id, { resolve, reject });
      window.parent.postMessage({ type: 'utools-call', id, method, args, pluginId: '${pluginId}' }, '*');
    });
  }

  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg.type === 'utools-response' && _pending.has(msg.id)) {
      const { resolve, reject } = _pending.get(msg.id);
      _pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error));
      else resolve(msg.result);
    }
    if (msg.type === 'utools-event') {
      (_listeners[msg.event] || []).forEach(fn => fn(msg.data));
    }
  });

  // In-memory cache for sync db API — populated before pluginEnter fires
  const _dbCache = new Map();
  let _dbReady = false;

  // Pre-load all docs into cache, then signal ready
  callHost('db.allDocs', [null]).then(docs => {
    if (Array.isArray(docs)) docs.forEach(doc => { if (doc && doc._id) _dbCache.set(doc._id, doc); });
    _dbReady = true;
    window.parent.postMessage({ type: 'utools-ready', pluginId: '${pluginId}' }, '*');
  });

  function _rev() { return String(Date.now()); }

  const dbPromises = {
    put: (doc) => { if (doc && doc._id) { doc._rev = _rev(); _dbCache.set(doc._id, doc); } return callHost('db.put', [doc]); },
    get: (id) => callHost('db.get', [id]),
    remove: (docOrId) => { const id = typeof docOrId === 'string' ? docOrId : docOrId._id; _dbCache.delete(id); return callHost('db.remove', [id]); },
    bulkDocs: (docs) => callHost('db.bulkDocs', [docs]),
    allDocs: (arg) => callHost('db.allDocs', [arg]),
    postAttachment: (id, data, type) => callHost('db.postAttachment', [id, Array.from(data), type]),
    getAttachment: (id) => callHost('db.getAttachment', [id]).then(r => r ? new Uint8Array(r) : null),
    getAttachmentType: (id) => callHost('db.getAttachmentType', [id]),
    replicateStateFromCloud: () => Promise.resolve(0),
  };

  // Sync API reads from cache, writes update cache + async persist
  const db = {
    put: (doc) => { if (doc && doc._id) { doc._rev = _rev(); _dbCache.set(doc._id, doc); } callHost('db.put', [doc]); return { id: doc._id, rev: doc._rev, ok: true }; },
    get: (id) => _dbCache.get(id) || null,
    remove: (docOrId) => { const id = typeof docOrId === 'string' ? docOrId : docOrId._id; _dbCache.delete(id); callHost('db.remove', [id]); return { id, ok: true }; },
    bulkDocs: (docs) => docs.map(d => db.put(d)),
    allDocs: (prefix) => {
      const results = [];
      for (const [k, v] of _dbCache) {
        if (!prefix || k.startsWith(prefix)) results.push(v);
      }
      return results;
    },
    postAttachment: (id, data, type) => { callHost('db.postAttachment', [id, Array.from(data), type]); return { id, ok: true }; },
    getAttachment: (id) => null,
    getAttachmentType: (id) => null,
    replicateStateFromCloud: () => 0,
    promises: dbPromises,
  };

  const dbStorage = {
    setItem: (key, value) => { _dbCache.set('_storage/' + key, { _id: '_storage/' + key, value }); callHost('dbStorage.setItem', [key, value]); },
    getItem: (key) => { const d = _dbCache.get('_storage/' + key); return d ? d.value : null; },
    removeItem: (key) => { _dbCache.delete('_storage/' + key); callHost('dbStorage.removeItem', [key]); },
  };

  window.utools = {
    onPluginEnter: (cb) => _listeners.pluginEnter.push(cb),
    onPluginOut: (cb) => _listeners.pluginOut.push(cb),
    onPluginDetach: () => {},
    onDbPull: (cb) => _listeners.dbPull.push(cb),
    onMainPush: () => {},

    db: db,
    dbStorage,
    dbCryptoStorage: dbStorage,

    copyText: (text) => callHost('copyText', [text]),
    copyImage: (img) => callHost('copyImage', [img]),
    copyFile: (file) => callHost('copyFile', [file]),

    hideMainWindow: () => {},
    showMainWindow: () => {},
    setExpendHeight: (h) => window.parent.postMessage({ type: 'utools-resize', height: h, pluginId: '${pluginId}' }, '*'),
    hideMainWindowPasteText: (text) => { callHost('copyText', [text]); callHost('hideMainWindowPasteFile', []); },
    hideMainWindowPasteFile: (file) => callHost('hideMainWindowPasteFile', [file]),
    hideMainWindowPasteImage: (img) => callHost('hideMainWindowPasteImage', [img]),
    hideMainWindowTypeString: () => {},
    setSubInput: () => {},
    removeSubInput: () => {},
    setSubInputValue: () => {},

    shellOpenExternal: (url) => callHost('shellOpenExternal', [url]),
    shellOpenPath: (path) => callHost('shellOpenPath', [path]),
    shellShowItemInFolder: (path) => callHost('shellShowItemInFolder', [path]),

    showNotification: (text) => callHost('showNotification', [text]),
    getPath: (name) => {
      const paths = window.__utoolsPaths || {};
      return paths[name] || '';
    },
    getUser: () => ({ avatar: '', nickname: 'Pandora User', type: 'member' }),
    isDarkColors: () => document.documentElement.classList.contains('dark'),
    getAppVersion: () => '0.1.0',
    isMacOS: () => navigator.platform.includes('Mac'),
    isWindows: () => navigator.platform.includes('Win'),
    isLinux: () => navigator.platform.includes('Linux'),

    redirect: (code, payload) => callHost('redirect', [code, payload]),
    screenCapture: (cb) => callHost('screenCapture').then(r => cb && cb(r)),
    showOpenDialog: (options) => callHost('showOpenDialog', [options]),
    getCopyedFiles: () => { let r = []; callHost('getCopyedFiles').then(v => r = v); return r; },
    fetchUserServerTemporaryToken: () => callHost('fetchUserServerTemporaryToken'),
    getIdleUBrowsers: () => [],
    ubrowser: { goto: () => ({ run: () => {} }) },
    getFeatures: () => callHost('getFeatures'),
    setFeature: (feature) => callHost('setFeature', [feature]),
    removeFeature: (code) => callHost('removeFeature', [code]),
    showSaveDialog: (options) => callHost('showSaveDialog', [options]),
    findInPage: (text, opts) => callHost('findInPage', [text, opts]),
    stopFindInPage: () => callHost('stopFindInPage'),
    outPlugin: () => callHost('outPlugin'),
    subInputFocus: () => callHost('subInputFocus'),
    subInputBlur: () => callHost('subInputBlur'),
    subInputSelect: () => callHost('subInputSelect'),
    startDrag: (file) => callHost('startDrag', [file]),
    createBrowserWindow: (url, opts) => callHost('createBrowserWindow', [url, opts]),
    sendToParent: (data) => callHost('sendToParent', [data]),
    getWindowType: () => 'main',
    shellTrashItem: (path) => callHost('shellTrashItem', [path]),
    shellBeep: () => callHost('shellBeep'),
    getNativeId: () => callHost('getNativeId'),
    getAppName: () => 'Pandora',
    isDev: () => false,
    getFileIcon: (path) => callHost('getFileIcon', [path]),
    readCurrentFolderPath: () => callHost('readCurrentFolderPath'),
    readCurrentBrowserUrl: () => callHost('readCurrentBrowserUrl'),
    isPurchasedUser: () => true,
    openPurchase: () => {},
    openPayment: (opts) => {},
    fetchUserPayments: () => Promise.resolve([]),
  };
})();
`;
  return utoolsShim + '\n' + nodeShim;
}
