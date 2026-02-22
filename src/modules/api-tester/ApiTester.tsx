import { useEffect, useState, useRef } from 'react';
import { useT } from '@/i18n';
import { useStore, Request } from './store';
import { useTabsStore, Tab } from './stores/tabs';
import { ResizableLayout } from '@/components/ResizableLayout';
import { ResizableSplit } from '@/components/ResizableSplit';
import { KeyValueEditor } from './components/KeyValueEditor';
import { BodyEditor } from './components/BodyEditor';
import { ToolsPanel } from './components/ToolsPanel';
import { CodeGenModal } from './components/CodeGenModal';
import { SettingsModal } from './components/SettingsModal';
import { ImportCurlModal } from './components/ImportCurlModal';
import { WebSocketPanel } from './components/WebSocketPanel';
import { EnvironmentManager } from './components/EnvironmentManager';
import { JsonTreeView } from './components/JsonTreeView';
import { ScriptEditor } from './components/ScriptEditor';
import { DiffViewer } from './components/DiffViewer';
import { TimingChart } from './components/TimingChart';
import { ImportApiModal } from './components/ImportApiModal';
import { CollectionRunner } from './components/CollectionRunner';
import { CollectionTree } from './components/CollectionTree';
import { CookieManager } from './components/CookieManager';
import { Icons } from './components/Icons';
import { generateCurl } from './utils/codegen';
import { executeScript, ScriptContext, TestResult } from './utils/scripting';
import { ParsedCollection } from './utils/openapi';
import { resolveTemplate, resolveHeaders } from './utils/template';

const isTauri = !!(window as any).__TAURI_INTERNALS__;
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  return [] as unknown as T;
}

interface CookieRecord { id: number; domain: string; name: string; value: string; path: string; expires: string | null; http_only: boolean; secure: boolean; }
import './styles/api-tester.css';
import './styles/components.css';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface KVItem { key: string; value: string; description?: string; enabled: boolean; }
interface FormDataItem { key: string; value: string; type: 'text' | 'file'; enabled: boolean; }
type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';

export function ApiTester() {
  const t = useT();
  const store = useStore();
  const tabs = useTabsStore();
  
  const [sidebarTab, setSidebarTab] = useState<'collections' | 'history'>('collections');
  const [requestTab, setRequestTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'scripts'>('params');
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'cookies' | 'timing' | 'diff'>('body');
  const [responseView, setResponseView] = useState<'pretty' | 'raw' | 'tree'>('pretty');
  const [searchTerm, setSearchTerm] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'collection' | 'request'; id: number } | null>(null);
  const [authType, setAuthType] = useState<'none' | 'basic' | 'bearer'>('none');
  const [authData, setAuthData] = useState({ username: '', password: '', token: '' });

  const [showTools, setShowTools] = useState(false);
  const [showCodeGen, setShowCodeGen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showImportCurl, setShowImportCurl] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showWebSocket, setShowWebSocket] = useState(false);
  const [showEnvManager, setShowEnvManager] = useState(false);
  const [showImportApi, setShowImportApi] = useState(false);
  const [showRunner, setShowRunner] = useState(false);
  const [showCookieManager, setShowCookieManager] = useState(false);

  // Request state
  const [params, setParams] = useState<KVItem[]>([{ key: '', value: '', enabled: true }]);
  const [headers, setHeaders] = useState<KVItem[]>([{ key: '', value: '', enabled: true }]);
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [bodyContent, setBodyContent] = useState('');
  const [formData, setFormData] = useState<FormDataItem[]>([]);
  
  // Script & Test state
  const [preScript, setPreScript] = useState('');
  const [testScript, setTestScript] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [scriptLogs, setScriptLogs] = useState<string[]>([]);
  
  // Diff state
  const [snapshots, setSnapshots] = useState<{ id: string; name: string; timestamp: number; body: string; status: number }[]>([]);

  const activeTab = tabs.getActiveTab();
  const saveTimeoutRef = useRef<number | null>(null);

  // 防抖自动保存
  const autoSave = (requestId: number, data: any) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => {
      store.saveRequest({ id: requestId, ...data });
    }, 500);
  };

  // Initialize
  useEffect(() => {
    store.loadCollections();
    store.loadRequests();
    store.loadEnvironments();
    store.loadHistory();
    document.addEventListener('click', () => setContextMenu(null));
    
    // Create initial tab if none
    if (tabs.tabs.length === 0) {
      tabs.addTab();
    }
    
    return () => document.removeEventListener('click', () => setContextMenu(null));
  }, []);

  // Theme is controlled globally by Pandora sidebar

  // Sync tab with request state
  useEffect(() => {
    if (activeTab) {
      try {
        const url = new URL(activeTab.url || 'http://example.com');
        const p: KVItem[] = [];
        url.searchParams.forEach((v, k) => p.push({ key: k, value: v, enabled: true }));
        setParams(p.length ? p : [{ key: '', value: '', enabled: true }]);
      } catch {
        setParams([{ key: '', value: '', enabled: true }]);
      }
      try {
        const h = JSON.parse(activeTab.headers || '{}');
        const items: KVItem[] = Object.entries(h).map(([k, v]) => ({ key: k, value: String(v), enabled: true }));
        setHeaders(items.length ? items : [{ key: '', value: '', enabled: true }]);
      } catch {
        setHeaders([{ key: '', value: '', enabled: true }]);
      }
      setBodyType((activeTab.bodyType as BodyType) || 'none');
      setBodyContent(activeTab.body || '');
    }
  }, [activeTab?.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter': e.preventDefault(); handleSend(); break;
          case 's': e.preventDefault(); handleSaveRequest(); break;
          case 'n': e.preventDefault(); handleNewTab(); break;
          case 't': e.preventDefault(); handleNewTab(); break;
          case 'w': e.preventDefault(); activeTab && tabs.closeTab(activeTab.id); break;
          case 'l': e.preventDefault(); document.querySelector<HTMLInputElement>('.url-input')?.focus(); break;
          case ',': e.preventDefault(); setShowSettings(true); break;
          case '/': e.preventDefault(); setShowShortcuts(true); break;
          case 'e': e.preventDefault(); break;
        }
      }
      if (e.key === 'Escape') {
        setShowTools(false);
        setShowCodeGen(false);
        setShowSettings(false);
        setShowImportCurl(false);
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const handleNewTab = () => {
    tabs.addTab();
  };

  const updateTab = (updates: Partial<Tab>) => {
    if (activeTab) {
      tabs.updateTab(activeTab.id, updates);
      // 自动保存到数据库（如果有 requestId，防抖 500ms）
      if (activeTab.requestId) {
        const updated = { ...activeTab, ...updates };
        autoSave(activeTab.requestId, {
          name: updated.name,
          method: updated.method,
          url: updated.url,
          headers: updated.headers,
          body: updated.body,
          body_type: updated.bodyType,
        });
      }
    }
  };

  const updateUrlFromParams = (newParams: KVItem[]) => {
    setParams(newParams);
    if (!activeTab) return;
    try {
      const url = new URL(activeTab.url || 'http://example.com');
      url.search = '';
      newParams.filter(p => p.enabled && p.key).forEach(p => url.searchParams.append(p.key, p.value));
      updateTab({ url: url.toString() });
    } catch {}
  };

  const updateHeadersInRequest = (newHeaders: KVItem[]) => {
    setHeaders(newHeaders);
    const obj: Record<string, string> = {};
    newHeaders.filter(h => h.enabled && h.key).forEach(h => obj[h.key] = h.value);
    updateTab({ headers: JSON.stringify(obj) });
  };

  const handleSend = async () => {
    if (!activeTab?.url) return;
    
    let finalHeaders = [...headers];
    let finalBody = bodyContent;
    let finalUrl = activeTab.url;
    
    // Pre-request script
    if (preScript) {
      const ctx: ScriptContext = {
        request: {
          url: activeTab.url,
          method: activeTab.method,
          headers: Object.fromEntries(headers.filter(h => h.enabled && h.key).map(h => [h.key, h.value])),
          body: bodyContent,
        },
        environment: store.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {}),
        variables: {},
      };
      const preResult = executeScript(preScript, ctx, true);
      if (preResult.modifiedRequest) {
        finalUrl = preResult.modifiedRequest.url;
        finalBody = preResult.modifiedRequest.body;
        finalHeaders = Object.entries(preResult.modifiedRequest.headers).map(([k, v]) => ({ key: k, value: v, enabled: true }));
      }
    }
    
    if (authType === 'basic') {
      const encoded = btoa(`${authData.username}:${authData.password}`);
      finalHeaders = finalHeaders.filter(h => h.key.toLowerCase() !== 'authorization');
      finalHeaders.push({ key: 'Authorization', value: `Basic ${encoded}`, enabled: true });
    } else if (authType === 'bearer') {
      finalHeaders = finalHeaders.filter(h => h.key.toLowerCase() !== 'authorization');
      finalHeaders.push({ key: 'Authorization', value: `Bearer ${authData.token}`, enabled: true });
    }
    if (bodyType === 'json') {
      finalHeaders = finalHeaders.filter(h => h.key.toLowerCase() !== 'content-type');
      finalHeaders.push({ key: 'Content-Type', value: 'application/json', enabled: true });
    }

    const headersObj: Record<string, string> = {};
    finalHeaders.filter(h => h.enabled && h.key).forEach(h => headersObj[h.key] = h.value);

    let body = finalBody;
    if (bodyType === 'x-www-form-urlencoded') {
      body = formData.filter(f => f.enabled && f.key).map(f => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`).join('&');
    }

    // Resolve {{variable}} templates
    const envVars = store.variables.reduce((acc, v) => {
      if (v.enabled) acc[v.key] = v.value;
      return acc;
    }, {} as Record<string, string>);
    finalUrl = resolveTemplate(finalUrl, envVars);
    body = resolveTemplate(body, envVars);
    const resolvedHeaders = resolveHeaders(headersObj, envVars);

    // Auto-attach cookies
    try {
      const domain = new URL(finalUrl).hostname;
      const cookies = await safeInvoke<CookieRecord[]>('get_cookies', { domain });
      if (cookies.length > 0) {
        resolvedHeaders['Cookie'] = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      }
    } catch { /* invalid URL, skip */ }

    // Use store to send request
    store.setActiveRequest({
      name: activeTab.name,
      method: activeTab.method,
      url: finalUrl,
      headers: JSON.stringify(resolvedHeaders),
      body,
      body_type: bodyType,
    });
    
    await store.sendRequest();
    
    if (store.response) {
      updateTab({ response: store.response });

      // Auto-save Set-Cookie headers
      try {
        const domain = new URL(finalUrl).hostname;
        const sc = store.response.headers['set-cookie'] || store.response.headers['Set-Cookie'];
        if (sc) {
          for (const raw of sc.split(/,(?=\s*\w+=)/)) {
            const parts = raw.trim().split(';');
            const [nv, ...attrs] = parts;
            const eqIdx = nv.indexOf('=');
            if (eqIdx < 0) continue;
            const name = nv.substring(0, eqIdx).trim();
            const value = nv.substring(eqIdx + 1).trim();
            let path = '/';
            let expires: string | null = null;
            let httpOnly = false;
            let secure = false;
            for (const attr of attrs) {
              const a = attr.trim().toLowerCase();
              if (a.startsWith('path=')) path = attr.trim().substring(5);
              else if (a.startsWith('expires=')) expires = attr.trim().substring(8);
              else if (a === 'httponly') httpOnly = true;
              else if (a === 'secure') secure = true;
            }
            await safeInvoke('set_cookie', { cookie: { id: null, domain, name, value, path, expires, http_only: httpOnly, secure } });
          }
        }
      } catch { /* skip */ }
      
      // Test script
      if (testScript) {
        const ctx: ScriptContext = {
          request: { url: finalUrl, method: activeTab.method, headers: headersObj, body },
          response: { status: store.response.status, body: store.response.body, headers: store.response.headers, time: store.response.time },
          environment: store.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {}),
          variables: {},
        };
        const testResult = executeScript(testScript, ctx, false);
        setTestResults(testResult.tests);
        setScriptLogs(testResult.logs);
      }
    }
  };

  const handleSaveRequest = async () => {
    if (!activeTab) return;
    const req: Request = {
      id: activeTab.requestId,
      name: activeTab.name,
      method: activeTab.method,
      url: activeTab.url,
      headers: activeTab.headers,
      body: bodyContent,
      body_type: bodyType,
    };
    const id = await store.saveRequest(req);
    updateTab({ requestId: id, isDirty: false });
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'collection' | 'request', id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id });
  };

  const openRequestInTab = (req: Request) => {
    tabs.addTab({
      requestId: req.id,
      name: req.name,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      bodyType: req.body_type,
    });
  };

  const handleImportCurl = (data: { method: string; url: string; headers: Record<string, string>; body: string }) => {
    tabs.addTab({
      name: t('apiTester.importedRequest'),
      method: data.method,
      url: data.url,
      headers: JSON.stringify(data.headers),
      body: data.body,
      bodyType: data.body ? 'raw' : 'none',
    });
  };

  const copyCurl = () => {
    if (!activeTab) return;
    const headersObj: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key).forEach(h => headersObj[h.key] = h.value);
    const curl = generateCurl(activeTab.method, activeTab.url, headersObj, bodyContent);
    navigator.clipboard.writeText(curl);
  };

  const handleImportApi = async (collection: ParsedCollection) => {
    const colId = await store.createCollection(collection.name);
    for (const folder of collection.folders) {
      for (const req of folder.requests) {
        await store.saveRequest({
          name: req.name,
          method: req.method,
          url: req.path,
          headers: JSON.stringify(Object.fromEntries(req.headers.filter(h => h.enabled).map(h => [h.key, h.value]))),
          body: req.body,
          body_type: req.bodyType,
          collection_id: colId,
        });
      }
    }
    setShowImportApi(false);
  };

  const saveSnapshot = (name: string) => {
    if (!store.response) return;
    setSnapshots(prev => [...prev, {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      body: store.response!.body,
      status: store.response!.status,
    }]);
  };

  const deleteSnapshot = (id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  };

  const getMethodClass = (method: string) => `method-${method.toLowerCase()}`;

  const getCollectionDepth = (id: number): number => {
    let depth = 0;
    let current = store.collections.find(c => c.id === id);
    while (current?.parent_id) {
      depth++;
      current = store.collections.find(c => c.id === current!.parent_id);
    }
    return depth;
  };

  const formatJson = (str: string) => {
    try { return JSON.stringify(JSON.parse(str), null, 2); } catch { return str; }
  };

  const parseCookies = () => {
    const c = store.response?.headers['set-cookie'] || store.response?.headers['Set-Cookie'];
    if (!c) return [];
    return c.split(',').map(s => { const [p] = s.split(';'); const [n, ...r] = p.split('='); return { name: n.trim(), value: r.join('=').trim() }; });
  };

  const responseBody = store.response ? formatJson(store.response.body) : '';

  const sidebarContent = (
    <div className="sidebar-inner">
        <div className="sidebar-tabs">
          <button className={`sidebar-tab ${sidebarTab === 'collections' ? 'active' : ''}`} onClick={() => setSidebarTab('collections')}>{t('apiTester.collections')}</button>
          <button className={`sidebar-tab ${sidebarTab === 'history' ? 'active' : ''}`} onClick={() => setSidebarTab('history')}>{t('apiTester.history')}</button>
        </div>
        <div className="sidebar-content">
          {sidebarTab === 'collections' ? (
            <CollectionTree onOpenRequest={openRequestInTab} onContextMenu={handleContextMenu} />
          ) : (
            <>
              <div className="sidebar-header">
                <span className="sidebar-title">{t('apiTester.history')}</span>
                <button className="icon-btn" onClick={() => store.clearHistory()}>{t('apiTester.clear')}</button>
              </div>
              {store.history.map(item => (
                <div key={item.id} className="history-item" onClick={() => tabs.addTab({ name: t('apiTester.history'), method: item.method, url: item.url })}>
                  <span className={`history-method ${getMethodClass(item.method)}`}>{item.method}</span>
                  <span className="history-url">{item.url}</span>
                  {item.status_code && <span className={`history-status ${item.status_code < 400 ? 'success' : 'error'}`}>{item.status_code}</span>}
                </div>
              ))}
            </>
          )}
        </div>
    </div>
  );

  const mainContent = (
    <div className="main-content">
        {/* Toolbar */}
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button className="icon-btn" onClick={() => setShowImportCurl(true)} title={t('apiTester.importCurl')}>{Icons.import}</button>
            <button className="icon-btn" onClick={() => setShowImportApi(true)} title={t('apiTester.importOpenApi')}>{Icons.folder}</button>
            <button className="icon-btn" onClick={copyCurl} title={t('apiTester.copyAsCurl')}>{Icons.export}</button>
            <button className="icon-btn" onClick={() => setShowCodeGen(true)} title={t('apiTester.generateCode')}>{Icons.code}</button>
            <button className="icon-btn" onClick={() => setShowTools(true)} title={t('apiTester.tools')}>{Icons.tools}</button>
            <button className="icon-btn" onClick={() => setShowWebSocket(!showWebSocket)} title={t('apiTester.webSocket')}>{Icons.websocket}</button>
            <button className="icon-btn" onClick={() => setShowRunner(true)} title={t('apiTester.collectionRunner')}>{Icons.play}</button>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <select className="env-select" value={store.activeEnvId ?? ''} onChange={e => e.target.value && store.setActiveEnvironment(Number(e.target.value))}>
              <option value="">{t('apiTester.noEnvironment')}</option>
              {store.environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
            </select>
            <button className="icon-btn" onClick={() => setShowEnvManager(true)} title={t('apiTester.manageEnvironments')}>{Icons.env}</button>
            <button className="icon-btn" onClick={() => setShowSettings(true)} title={t('apiTester.settings')}>{Icons.settings}</button>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="tabs-bar-wrapper">
          <button className="tabs-scroll-btn" onClick={() => { const el = document.querySelector('.tabs-bar'); if (el) el.scrollBy({ left: -150, behavior: 'smooth' }); }}>‹</button>
          <div className="tabs-bar">
            {tabs.tabs.map(tab => (
              <div key={tab.id} className={`tab-item ${tab.id === tabs.activeTabId ? 'active' : ''}`} onClick={() => tabs.setActiveTab(tab.id)}>
                <span className={`tab-method ${getMethodClass(tab.method)}`}>{tab.method}</span>
                <span className="tab-name">{tab.name}{tab.isDirty ? ' •' : ''}</span>
                <button className="tab-close icon-btn" onClick={e => { e.stopPropagation(); tabs.closeTab(tab.id); }}>×</button>
              </div>
            ))}
          </div>
          <button className="tabs-scroll-btn" onClick={() => { const el = document.querySelector('.tabs-bar'); if (el) el.scrollBy({ left: 150, behavior: 'smooth' }); }}>›</button>
          <div className="tab-add" onClick={handleNewTab}>+</div>
        </div>

        {showWebSocket ? (
          <WebSocketPanel />
        ) : activeTab ? (
          <>
            {/* Request Bar */}
            <div className="request-bar">
              <select className="method-select" value={activeTab.method} onChange={e => updateTab({ method: e.target.value })}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div className="url-input-wrapper">
                <div className="url-highlight" aria-hidden="true">
                  {(activeTab.url || '').split(/(\{\{\w+\}\})/g).map((part, i) =>
                    part.match(/^\{\{\w+\}\}$/)
                      ? <span key={i} className="url-var">{part}</span>
                      : <span key={i} className="url-text">{part}</span>
                  )}
                </div>
                <input className="url-input" placeholder={t('apiTester.enterUrl')} value={activeTab.url}
                  onChange={e => updateTab({ url: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleSend()} />
              </div>
              <button className="send-btn" onClick={handleSend} disabled={store.loading}>{store.loading ? t('apiTester.sending') : t('apiTester.send')}</button>
              <button className="icon-btn" onClick={handleSaveRequest} title={t('apiTester.save')}>{Icons.save}</button>
              <button className="icon-btn" onClick={() => setShowCookieManager(true)} title="Cookies">🍪</button>
            </div>

            <ResizableSplit
              top={
                <div className="request-panel">
                <div className="tabs">
                  <button className={`tab ${requestTab === 'params' ? 'active' : ''}`} onClick={() => setRequestTab('params')}>{t('apiTester.params')}</button>
                  <button className={`tab ${requestTab === 'headers' ? 'active' : ''}`} onClick={() => setRequestTab('headers')}>{t('apiTester.headers')}</button>
                  <button className={`tab ${requestTab === 'body' ? 'active' : ''}`} onClick={() => setRequestTab('body')}>{t('apiTester.body')}</button>
                  <button className={`tab ${requestTab === 'auth' ? 'active' : ''}`} onClick={() => setRequestTab('auth')}>{t('apiTester.auth')}</button>
                  <button className={`tab ${requestTab === 'scripts' ? 'active' : ''}`} onClick={() => setRequestTab('scripts')}>{t('apiTester.scripts')}</button>
                </div>
                <div className="panel-content">
                  {requestTab === 'params' && (
                    <div>
                      <input className="kv-input" style={{ width: '100%', marginBottom: 12 }} placeholder={t('apiTester.requestName')}
                        value={activeTab.name} onChange={e => updateTab({ name: e.target.value })} />
                      <div className="section-title">{t('apiTester.queryParams')}</div>
                      <KeyValueEditor items={params} onChange={updateUrlFromParams} placeholder={{ key: 'Key', value: 'Value' }} />
                    </div>
                  )}
                  {requestTab === 'headers' && <KeyValueEditor items={headers} onChange={updateHeadersInRequest} placeholder={{ key: 'Header', value: 'Value' }} />}
                  {requestTab === 'body' && <BodyEditor bodyType={bodyType} body={bodyContent} formData={formData} onBodyTypeChange={setBodyType} onBodyChange={setBodyContent} onFormDataChange={setFormData} />}
                  {requestTab === 'auth' && (
                    <div className="auth-panel">
                      <div className="section-title">{t('apiTester.authorizationType')}</div>
                      <select className="kv-input" style={{ marginBottom: 16, width: 200 }} value={authType} onChange={e => setAuthType(e.target.value as any)}>
                        <option value="none">{t('apiTester.noAuth')}</option>
                        <option value="basic">{t('apiTester.basicAuth')}</option>
                        <option value="bearer">{t('apiTester.bearerToken')}</option>
                      </select>
                      {authType === 'basic' && (
                        <div className="auth-fields">
                          <div className="auth-field"><label>{t('apiTester.username')}</label><input className="kv-input" value={authData.username} onChange={e => setAuthData({ ...authData, username: e.target.value })} /></div>
                          <div className="auth-field"><label>{t('apiTester.password')}</label><input className="kv-input" type="password" value={authData.password} onChange={e => setAuthData({ ...authData, password: e.target.value })} /></div>
                        </div>
                      )}
                      {authType === 'bearer' && (
                        <div className="auth-fields">
                          <div className="auth-field"><label>{t('apiTester.token')}</label><input className="kv-input" value={authData.token} onChange={e => setAuthData({ ...authData, token: e.target.value })} /></div>
                        </div>
                      )}
                    </div>
                  )}
                  {requestTab === 'scripts' && (
                    <ScriptEditor
                      preScript={preScript}
                      testScript={testScript}
                      onPreScriptChange={setPreScript}
                      onTestScriptChange={setTestScript}
                      lastTestResults={testResults}
                      logs={scriptLogs}
                    />
                  )}
                </div>
              </div>
              }
              bottom={
              <div className="response-panel">
                {store.response ? (
                  <>
                    <div className="response-status">
                      <span className={`status-code ${store.response.status >= 200 && store.response.status < 400 ? 'success' : 'error'}`}>{store.response.status || 'Error'}</span>
                      <span className="status-info">{store.response.time}ms</span>
                      <span className="status-info">{(store.response.size / 1024).toFixed(2)} KB</span>
                      <button className="icon-btn" onClick={() => navigator.clipboard.writeText(store.response?.body || '')} title={t('apiTester.copy2')}>{Icons.copy}</button>
                    </div>
                    <div className="tabs">
                      <button className={`tab ${responseTab === 'body' ? 'active' : ''}`} onClick={() => setResponseTab('body')}>{t('apiTester.body')}</button>
                      <button className={`tab ${responseTab === 'headers' ? 'active' : ''}`} onClick={() => setResponseTab('headers')}>{t('apiTester.headers')}</button>
                      <button className={`tab ${responseTab === 'cookies' ? 'active' : ''}`} onClick={() => setResponseTab('cookies')}>{t('apiTester.cookies')}</button>
                      <button className={`tab ${responseTab === 'timing' ? 'active' : ''}`} onClick={() => setResponseTab('timing')}>{t('apiTester.timing')}</button>
                      <button className={`tab ${responseTab === 'diff' ? 'active' : ''}`} onClick={() => setResponseTab('diff')}>{t('apiTester.diff')}</button>
                      {responseTab === 'body' && (
                        <div className="response-view-toggle">
                          <button className={`view-btn ${responseView === 'pretty' ? 'active' : ''}`} onClick={() => setResponseView('pretty')}>{t('apiTester.pretty')}</button>
                          <button className={`view-btn ${responseView === 'raw' ? 'active' : ''}`} onClick={() => setResponseView('raw')}>{t('apiTester.raw')}</button>
                          <button className={`view-btn ${responseView === 'tree' ? 'active' : ''}`} onClick={() => setResponseView('tree')}>{t('apiTester.tree')}</button>
                        </div>
                      )}
                      <input className="search-input" placeholder={t('apiTester.search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ marginLeft: 'auto' }} />
                    </div>
                    {responseTab === 'body' ? (
                      responseView === 'tree' ? (
                        <div className="panel-content"><JsonTreeView data={store.response.body} /></div>
                      ) : (
                        <div className="response-body">{responseView === 'raw' ? store.response.body : responseBody}</div>
                      )
                    ) : responseTab === 'headers' ? (
                      <div className="panel-content">
                        {Object.entries(store.response.headers).map(([k, v]) => (
                          <div key={k} style={{ marginBottom: 4 }}><span style={{ color: 'var(--gm-accent)' }}>{k}:</span> {v}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="panel-content">
                        {parseCookies().length > 0 ? parseCookies().map((c, i) => (
                          <div key={i} style={{ marginBottom: 4 }}><span style={{ color: 'var(--gm-accent)' }}>{c.name}:</span> {c.value}</div>
                        )) : <div className="empty-state">{t('apiTester.noCookies')}</div>}
                      </div>
                    )}
                    {responseTab === 'timing' && (
                      <TimingChart totalTime={store.response.time} />
                    )}
                    {responseTab === 'diff' && (
                      <DiffViewer
                        currentResponse={{ body: store.response.body, status: store.response.status }}
                        snapshots={snapshots}
                        onSaveSnapshot={saveSnapshot}
                        onDeleteSnapshot={deleteSnapshot}
                      />
                    )}
                  </>
                ) : (
                  <div className="empty-state"><span>{t('apiTester.sendRequest')}</span></div>
                )}
              </div>
              }
            />
          </>
        ) : (
          <div className="empty-state"><span>{t('apiTester.openOrCreate')}</span></div>
        )}
      </div>
  );

  return (
    <>
      {/* Context Menu */}
      {contextMenu && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {contextMenu.type === 'collection' ? (
            <>
              <div className="context-item" onClick={() => { tabs.addTab({ name: t('apiTester.newRequest') }); setContextMenu(null); }}>{t('apiTester.newRequest')}</div>
              {(() => { const depth = getCollectionDepth(contextMenu.id); return depth < 3 ? <div className="context-item" onClick={() => { const n = prompt(t('apiTester.newSubfolder')); if (n) store.createCollection(n, contextMenu.id); setContextMenu(null); }}>{t('apiTester.newSubfolder')}</div> : null; })()}
              <div className="context-item" onClick={() => { const n = prompt(t('apiTester.renamePrompt')); if (n) store.renameCollection(contextMenu.id, n); setContextMenu(null); }}>{t('apiTester.rename')}</div>
              <div className="context-item danger" onClick={() => { store.deleteCollection(contextMenu.id); setContextMenu(null); }}>{t('apiTester.delete')}</div>
            </>
          ) : (
            <>
              <div className="context-item" onClick={() => { const r = store.requests.find(x => x.id === contextMenu.id); if (r) openRequestInTab(r); setContextMenu(null); }}>{t('apiTester.openInNewTab')}</div>
              <div className="context-item" onClick={() => { const r = store.requests.find(x => x.id === contextMenu.id); if (r) store.saveRequest({ ...r, id: undefined, name: r.name + ' ' + t('apiTester.copy') }); setContextMenu(null); }}>{t('apiTester.duplicate')}</div>
              <div className="context-item danger" onClick={() => { store.deleteRequest(contextMenu.id); setContextMenu(null); }}>{t('apiTester.delete')}</div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showCodeGen && activeTab && (
        <CodeGenModal method={activeTab.method} url={activeTab.url}
          headers={Object.fromEntries(headers.filter(h => h.enabled && h.key).map(h => [h.key, h.value]))}
          body={bodyContent} onClose={() => setShowCodeGen(false)} />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showImportCurl && <ImportCurlModal onImport={handleImportCurl} onClose={() => setShowImportCurl(false)} />}
      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="modal shortcuts-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span>{t('apiTester.keyboardShortcuts')}</span><button className="icon-btn" onClick={() => setShowShortcuts(false)}>×</button></div>
            <div className="modal-body">
              {[
                ['Ctrl + Enter', t('apiTester.shortcut.sendRequest')],
                ['Ctrl + S', t('apiTester.shortcut.saveRequest')],
                ['Ctrl + N / T', t('apiTester.shortcut.newTab')],
                ['Ctrl + W', t('apiTester.shortcut.closeTab')],
                ['Ctrl + L', t('apiTester.shortcut.focusUrl')],
                ['Ctrl + ,', t('apiTester.shortcut.settings')],
                ['Ctrl + /', t('apiTester.shortcut.shortcuts')],
                ['Esc', t('apiTester.shortcut.closeModal')],
              ].map(([key, desc]) => (
                <div key={key} className="shortcut-row">
                  <span>{desc}</span>
                  <span className="shortcut-key">{key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {showTools && <ToolsPanel onClose={() => setShowTools(false)} />}
      {showEnvManager && <EnvironmentManager onClose={() => setShowEnvManager(false)} />}
      {showImportApi && <ImportApiModal onClose={() => setShowImportApi(false)} onImport={handleImportApi} />}
      {showRunner && <CollectionRunner collections={store.collections} onClose={() => setShowRunner(false)} environment={store.variables.reduce((acc, v) => ({ ...acc, [v.key]: v.value }), {})} />}
      {showCookieManager && <CookieManager onClose={() => setShowCookieManager(false)} />}

      <ResizableLayout sidebar={sidebarContent} main={mainContent} className="app" />
    </>
  );
}


