import { create } from 'zustand';

// 检测是否在 Tauri 环境中
const isTauri = !!(window as any).__TAURI_INTERNALS__;

// 安全的 invoke 封装，浏览器环境返回默认值
async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
  }
  const defaults: Record<string, unknown> = {
    get_collections: [],
    get_requests: [],
    get_environments: [],
    get_history: [],
    get_variables: [],
    create_collection: 1,
    save_request: 1,
  };
  return (defaults[cmd] ?? null) as T;
}

// 浏览器环境下用 fetch 发送 HTTP 请求
async function browserFetch(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string | null,
): Promise<HttpResponse> {
  const start = performance.now();
  const res = await fetch(url, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method) ? undefined : body,
  });
  const time = Math.round(performance.now() - start);
  const resBody = await res.text();
  const resHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => { resHeaders[k] = v; });
  return {
    status: res.status,
    headers: resHeaders,
    body: resBody,
    time,
    size: new Blob([resBody]).size,
  };
}

export interface Collection {
  id?: number;
  name: string;
  parent_id?: number;
  sort_order: number;
}

export interface Request {
  id?: number;
  collection_id?: number;
  name: string;
  method: string;
  url: string;
  headers: string;
  body: string;
  body_type: string;
}

export interface Environment {
  id?: number;
  name: string;
  is_active: boolean;
}

export interface Variable {
  id?: number;
  environment_id: number;
  key: string;
  value: string;
  enabled: boolean;
}

export interface HistoryItem {
  id?: number;
  method: string;
  url: string;
  status_code?: number;
  response_time?: number;
  created_at?: string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

interface AppState {
  collections: Collection[];
  requests: Request[];
  environments: Environment[];
  history: HistoryItem[];
  activeRequest: Request | null;
  response: HttpResponse | null;
  loading: boolean;
  activeEnvId: number | null;
  variables: Variable[];

  loadCollections: () => Promise<void>;
  loadRequests: (collectionId?: number) => Promise<void>;
  loadEnvironments: () => Promise<void>;
  loadHistory: () => Promise<void>;
  loadVariables: (envId: number) => Promise<void>;

  createCollection: (name: string, parentId?: number) => Promise<number>;
  deleteCollection: (id: number) => Promise<void>;
  renameCollection: (id: number, name: string) => Promise<void>;

  setActiveRequest: (req: Request | null) => void;
  saveRequest: (req: Request) => Promise<number>;
  deleteRequest: (id: number) => Promise<void>;

  createEnvironment: (name: string) => Promise<void>;
  setActiveEnvironment: (id: number) => Promise<void>;
  deleteEnvironment: (id: number) => Promise<void>;

  saveVariable: (variable: Variable) => Promise<void>;
  deleteVariable: (id: number) => Promise<void>;

  sendRequest: () => Promise<void>;
  clearHistory: () => Promise<void>;
  restoreFromHistory: (item: HistoryItem) => void;
}

export const useStore = create<AppState>((set, get) => ({
  collections: [],
  requests: [],
  environments: [],
  history: [],
  activeRequest: null,
  response: null,
  loading: false,
  activeEnvId: null,
  variables: [],

  loadCollections: async () => {
    try {
      const collections = await safeInvoke<Collection[]>('get_collections');
      set({ collections });
    } catch { /* 浏览器环境忽略 */ }
  },

  loadRequests: async (collectionId?: number) => {
    try {
      const requests = await safeInvoke<Request[]>('get_requests', { collectionId });
      set({ requests });
    } catch { /* 浏览器环境忽略 */ }
  },

  loadEnvironments: async () => {
    try {
      const environments = await safeInvoke<Environment[]>('get_environments');
      const active = environments.find(e => e.is_active);
      set({ environments, activeEnvId: active?.id ?? null });
      if (active?.id) {
        get().loadVariables(active.id);
      }
    } catch { /* 浏览器环境忽略 */ }
  },

  loadHistory: async () => {
    try {
      const history = await safeInvoke<HistoryItem[]>('get_history');
      set({ history });
    } catch { /* 浏览器环境忽略 */ }
  },

  loadVariables: async (envId: number) => {
    try {
      const variables = await safeInvoke<Variable[]>('get_variables', { environmentId: envId });
      set({ variables });
    } catch { /* 浏览器环境忽略 */ }
  },

  createCollection: async (name: string, parentId?: number) => {
    const id = await safeInvoke<number>('create_collection', { name, parentId });
    get().loadCollections();
    return id;
  },

  deleteCollection: async (id: number) => {
    await safeInvoke('delete_collection', { id });
    get().loadCollections();
    get().loadRequests();
  },

  renameCollection: async (id: number, name: string) => {
    await safeInvoke('rename_collection', { id, name });
    get().loadCollections();
  },

  setActiveRequest: (req: Request | null) => {
    set({ activeRequest: req, response: null });
  },

  saveRequest: async (req: Request) => {
    const id = await safeInvoke<number>('save_request', { request: req });
    get().loadRequests();
    return id;
  },

  deleteRequest: async (id: number) => {
    await safeInvoke('delete_request', { id });
    const { activeRequest } = get();
    if (activeRequest?.id === id) {
      set({ activeRequest: null });
    }
    get().loadRequests();
  },

  createEnvironment: async (name: string) => {
    await safeInvoke('create_environment', { name });
    get().loadEnvironments();
  },

  setActiveEnvironment: async (id: number) => {
    await safeInvoke('set_active_environment', { id });
    set({ activeEnvId: id });
    get().loadEnvironments();
  },

  deleteEnvironment: async (id: number) => {
    await safeInvoke('delete_environment', { id });
    get().loadEnvironments();
  },

  saveVariable: async (variable: Variable) => {
    await safeInvoke('save_variable', { variable });
    const { activeEnvId } = get();
    if (activeEnvId) get().loadVariables(activeEnvId);
  },

  deleteVariable: async (id: number) => {
    await safeInvoke('delete_variable', { id });
    const { activeEnvId } = get();
    if (activeEnvId) get().loadVariables(activeEnvId);
  },

  sendRequest: async () => {
    const { activeRequest, variables } = get();
    if (!activeRequest?.url) return;

    set({ loading: true, response: null });

    let url = activeRequest.url;
    let headersStr = activeRequest.headers;
    let body = activeRequest.body;

    for (const v of variables.filter(v => v.enabled)) {
      const pattern = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
      url = url.replace(pattern, v.value);
      headersStr = headersStr.replace(pattern, v.value);
      body = body.replace(pattern, v.value);
    }

    let headers: Record<string, string> = {};
    try {
      if (headersStr) headers = JSON.parse(headersStr);
    } catch { /* 忽略解析错误 */ }

    try {
      let response: HttpResponse;
      if (isTauri) {
        response = await safeInvoke<HttpResponse>('send_http_request', {
          method: activeRequest.method,
          url,
          headers,
          body: body || null,
        });
      } else {
        response = await browserFetch(activeRequest.method, url, headers, body || null);
      }
      set({ response });
      if (isTauri) get().loadHistory();
    } catch (e) {
      set({ response: { status: 0, headers: {}, body: String(e), time: 0, size: 0 } });
    } finally {
      set({ loading: false });
    }
  },

  clearHistory: async () => {
    await safeInvoke('clear_history');
    set({ history: [] });
  },

  restoreFromHistory: (item: HistoryItem) => {
    set({
      activeRequest: {
        name: 'From History',
        method: item.method,
        url: item.url,
        headers: '',
        body: '',
        body_type: 'none',
      },
      response: null,
    });
  },
}));
