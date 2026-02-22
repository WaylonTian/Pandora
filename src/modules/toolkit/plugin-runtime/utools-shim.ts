// This file is converted to a string and injected into plugin iframes.
// All utools.* API calls are bridged to the host via postMessage.

export function generateShimScript(pluginId: string): string {
  return `
(function() {
  let _callId = 0;
  const _pending = new Map();
  const _listeners = { pluginEnter: [], pluginOut: [], dbPull: [] };

  function callHost(method, args) {
    return new Promise((resolve, reject) => {
      const id = ++_callId;
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

  const dbSync = {};
  for (const key of Object.keys(dbPromises)) {
    dbSync[key] = (...args) => {
      console.warn('utools.db.' + key + ' sync — use utools.db.promises.' + key);
      let result; dbPromises[key](...args).then(r => { result = r; }); return result;
    };
  }
  dbSync.promises = dbPromises;

  const dbStorage = {
    setItem: (key, value) => callHost('dbStorage.setItem', [key, value]),
    getItem: (key) => { let r; callHost('dbStorage.getItem', [key]).then(v => r = v); return r; },
    removeItem: (key) => callHost('dbStorage.removeItem', [key]),
  };

  window.utools = {
    onPluginEnter: (cb) => _listeners.pluginEnter.push(cb),
    onPluginOut: (cb) => _listeners.pluginOut.push(cb),
    onPluginDetach: () => {},
    onDbPull: (cb) => _listeners.dbPull.push(cb),
    onMainPush: () => {},

    db: Object.assign(dbSync, { promises: dbPromises }),
    dbStorage,
    dbCryptoStorage: dbStorage,

    copyText: (text) => callHost('copyText', [text]),
    copyImage: (img) => callHost('copyImage', [img]),
    copyFile: (file) => callHost('copyFile', [file]),

    hideMainWindow: () => {},
    showMainWindow: () => {},
    setExpendHeight: (h) => window.parent.postMessage({ type: 'utools-resize', height: h, pluginId: '${pluginId}' }, '*'),
    hideMainWindowPasteText: () => {},
    hideMainWindowTypeString: () => {},
    setSubInput: () => {},
    removeSubInput: () => {},
    setSubInputValue: () => {},

    shellOpenExternal: (url) => callHost('shellOpenExternal', [url]),
    shellOpenPath: (path) => callHost('shellOpenPath', [path]),
    shellShowItemInFolder: (path) => callHost('shellShowItemInFolder', [path]),

    showNotification: (text) => callHost('showNotification', [text]),
    getPath: (name) => callHost('getPath', [name]),
    getUser: () => ({ avatar: '', nickname: 'Pandora User', type: 'member' }),
    isDarkColors: () => document.documentElement.classList.contains('dark'),
    getAppVersion: () => '0.1.0',
    isMacOS: () => navigator.platform.includes('Mac'),
    isWindows: () => navigator.platform.includes('Win'),
    isLinux: () => navigator.platform.includes('Linux'),

    redirect: (code, payload) => callHost('redirect', [code, payload]),
    getIdleUBrowsers: () => [],
    ubrowser: { goto: () => ({ run: () => {} }) },
    getFeatures: () => [],
    setFeature: () => {},
    removeFeature: () => {},
  };

  window.parent.postMessage({ type: 'utools-ready', pluginId: '${pluginId}' }, '*');
})();
`;
}
