import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  extension: string | null;
  children: FileEntry[] | null;
}

export interface ScriptConfig {
  last_args: string | null;
  args_mode: string | null;       // "text" | "json"
  args_json: string | null;
  working_dir: string | null;
  env: Record<string, string>;
  runtime_override: string | null;
}

export interface ScriptMeta {
  scripts_dir: string;
  scripts: Record<string, ScriptConfig>;
  global_env: Record<string, string>;
}

export interface RuntimeInfo {
  name: string;
  command: string;
  available: boolean;
  version: string;
}

export interface ExecutionRecord {
  id: string;
  scriptPath: string;
  scriptName: string;
  timestamp: number;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
}

export interface RunningProcess {
  pid: number;
  scriptPath: string;
  startTime: number;
  stdout: string;
  stderr: string;
}

interface ScriptRunnerState {
  scriptsDir: string;
  fileTree: FileEntry[];
  activeFilePath: string | null;
  openFileContent: string | null;
  meta: ScriptMeta;
  runtimes: RuntimeInfo[];
  runningProcess: RunningProcess | null;
  executionHistory: ExecutionRecord[];
  searchQuery: string;
  initialized: boolean;
  _unlisteners: UnlistenFn[];

  init: () => Promise<void>;
  loadFileTree: () => Promise<void>;
  openFile: (path: string) => Promise<void>;
  saveFile: (path: string, content: string) => Promise<void>;
  createFile: (dir: string, name: string, content?: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  createFolder: (path: string) => Promise<void>;
  updateMeta: (scriptPath: string, config: Partial<ScriptConfig>) => Promise<void>;
  setGlobalEnv: (env: Record<string, string>) => Promise<void>;
  startScript: () => Promise<void>;
  stopScript: () => Promise<void>;
  setScriptsDir: (path: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setOpenFileContent: (content: string) => void;
  clearOutput: () => void;
  loadRuntimes: () => Promise<void>;
}

function getRelativePath(absPath: string, scriptsDir: string): string {
  const normalized = absPath.replace(/\\/g, '/');
  const normalizedDir = scriptsDir.replace(/\\/g, '/');
  if (normalized.startsWith(normalizedDir)) {
    return normalized.slice(normalizedDir.length).replace(/^\//, '');
  }
  return normalized;
}

function inferRuntime(ext: string | null): string {
  switch (ext) {
    case 'js': case 'mjs': case 'cjs': return 'node';
    case 'py': return 'python';
    case 'sh': return 'bash';
    case 'ps1': return 'powershell';
    default: return 'python';
  }
}

function loadHistory(): ExecutionRecord[] {
  try {
    return JSON.parse(localStorage.getItem('pandora-script-history') || '[]');
  } catch { return []; }
}

function saveHistory(history: ExecutionRecord[]) {
  localStorage.setItem('pandora-script-history', JSON.stringify(history.slice(0, 50)));
}

export const useScriptRunnerStore = create<ScriptRunnerState>((set, get) => ({
  scriptsDir: '',
  fileTree: [],
  activeFilePath: null,
  openFileContent: null,
  meta: { scripts_dir: '', scripts: {}, global_env: {} },
  runtimes: [],
  runningProcess: null,
  executionHistory: loadHistory(),
  searchQuery: '',
  initialized: false,
  _unlisteners: [],

  init: async () => {
    if (get().initialized) return;
    let dir = localStorage.getItem('pandora-scripts-dir');
    if (!dir) {
      try { dir = await invoke<string>('get_scripts_dir'); } catch { dir = ''; }
    }
    if (!dir) return;

    set({ scriptsDir: dir, initialized: true });

    try {
      const [meta, runtimes] = await Promise.all([
        invoke<ScriptMeta>('read_script_meta', { dir }),
        invoke<RuntimeInfo[]>('list_runtimes'),
      ]);
      set({ meta, runtimes });
    } catch { /* ok */ }

    await get().loadFileTree();

    // Listen for streaming events
    const unlisteners: UnlistenFn[] = [];
    unlisteners.push(await listen<{ pid: number; line: string }>('script-stdout', (e) => {
      const rp = get().runningProcess;
      if (rp && rp.pid === e.payload.pid) {
        set({ runningProcess: { ...rp, stdout: rp.stdout + e.payload.line + '\n' } });
      }
    }));
    unlisteners.push(await listen<{ pid: number; line: string }>('script-stderr', (e) => {
      const rp = get().runningProcess;
      if (rp && rp.pid === e.payload.pid) {
        set({ runningProcess: { ...rp, stderr: rp.stderr + e.payload.line + '\n' } });
      }
    }));
    unlisteners.push(await listen<{ pid: number; exit_code: number | null; duration_ms: number }>('script-exit', (e) => {
      const rp = get().runningProcess;
      if (rp && rp.pid === e.payload.pid) {
        const record: ExecutionRecord = {
          id: crypto.randomUUID(),
          scriptPath: rp.scriptPath,
          scriptName: rp.scriptPath.split('/').pop() || '',
          timestamp: Date.now(),
          exitCode: e.payload.exit_code,
          durationMs: e.payload.duration_ms,
          stdout: rp.stdout,
          stderr: rp.stderr,
        };
        const history = [record, ...get().executionHistory].slice(0, 50);
        saveHistory(history);
        set({ runningProcess: null, executionHistory: history });
      }
    }));
    set({ _unlisteners: unlisteners });
  },

  loadFileTree: async () => {
    const dir = get().scriptsDir;
    if (!dir) return;
    try {
      const tree = await invoke<FileEntry[]>('list_script_files', { dir });
      set({ fileTree: tree });
    } catch { /* ok */ }
  },

  openFile: async (path: string) => {
    try {
      const content = await invoke<string>('read_script_file', { path });
      set({ activeFilePath: path, openFileContent: content });
    } catch { /* ok */ }
  },

  saveFile: async (path: string, content: string) => {
    try { await invoke('write_script_file', { path, content }); } catch { /* ok */ }
  },

  createFile: async (dir: string, name: string, content?: string) => {
    try {
      const path = await invoke<string>('create_script_file', { dir, name });
      if (content) await invoke('write_script_file', { path, content });
      await get().loadFileTree();
      await get().openFile(path);
    } catch { /* ok */ }
  },

  deleteFile: async (path: string) => {
    try {
      await invoke('delete_script_file', { path });
      if (get().activeFilePath === path) set({ activeFilePath: null, openFileContent: null });
      await get().loadFileTree();
    } catch { /* ok */ }
  },

  renameFile: async (oldPath: string, newPath: string) => {
    try {
      await invoke('rename_script_file', { oldPath, newPath });
      if (get().activeFilePath === oldPath) set({ activeFilePath: newPath });
      await get().loadFileTree();
    } catch { /* ok */ }
  },

  createFolder: async (path: string) => {
    try {
      await invoke('create_script_folder', { path });
      await get().loadFileTree();
    } catch { /* ok */ }
  },

  updateMeta: async (scriptPath: string, config: Partial<ScriptConfig>) => {
    const { meta, scriptsDir } = get();
    const key = getRelativePath(scriptPath, scriptsDir);
    const existing = meta.scripts[key] || { last_args: null, args_mode: null, args_json: null, working_dir: null, env: {}, runtime_override: null };
    const updated = { ...meta, scripts: { ...meta.scripts, [key]: { ...existing, ...config } } };
    set({ meta: updated });
    try { await invoke('write_script_meta', { dir: scriptsDir, meta: updated }); } catch { /* ok */ }
  },

  setGlobalEnv: async (env: Record<string, string>) => {
    const { meta, scriptsDir } = get();
    const updated = { ...meta, global_env: env };
    set({ meta: updated });
    try { await invoke('write_script_meta', { dir: scriptsDir, meta: updated }); } catch { /* ok */ }
  },

  startScript: async () => {
    const { activeFilePath, meta, scriptsDir } = get();
    if (!activeFilePath) return;

    // Save current content first
    const content = get().openFileContent;
    if (content !== null) await get().saveFile(activeFilePath, content);

    const key = getRelativePath(activeFilePath, scriptsDir);
    const config = meta.scripts[key];
    const ext = activeFilePath.split('.').pop() || '';
    const runtime = config?.runtime_override || inferRuntime(ext);
    const argsJson = config?.args_json || null;
    const args: string[] = [];
    const argsMode = 'json';
    const workingDir = config?.working_dir || null;
    const env = { ...meta.global_env, ...(config?.env || {}) };

    set({ runningProcess: { pid: 0, scriptPath: activeFilePath, startTime: Date.now(), stdout: '', stderr: '' } });

    try {
      const pid = await invoke<number>('start_script', {
        runtime, scriptPath: activeFilePath, args, argsMode, argsJson, workingDir, env,
      });
      set(s => s.runningProcess ? { runningProcess: { ...s.runningProcess, pid } } : {});
    } catch (e) {
      const record: ExecutionRecord = {
        id: crypto.randomUUID(),
        scriptPath: activeFilePath,
        scriptName: activeFilePath.split('/').pop() || '',
        timestamp: Date.now(),
        exitCode: -1,
        durationMs: 0,
        stdout: '',
        stderr: String(e),
      };
      const history = [record, ...get().executionHistory].slice(0, 50);
      saveHistory(history);
      set({ runningProcess: null, executionHistory: history });
    }
  },

  stopScript: async () => {
    const rp = get().runningProcess;
    if (!rp || !rp.pid) return;
    try { await invoke('kill_script', { pid: rp.pid }); } catch { /* ok */ }
  },

  setScriptsDir: async (path: string) => {
    localStorage.setItem('pandora-scripts-dir', path);
    set({ scriptsDir: path, activeFilePath: null, openFileContent: null });
    try {
      const meta = await invoke<ScriptMeta>('read_script_meta', { dir: path });
      set({ meta });
    } catch { /* ok */ }
    await get().loadFileTree();
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setOpenFileContent: (content) => set({ openFileContent: content }),
  clearOutput: () => {
    const rp = get().runningProcess;
    if (rp) set({ runningProcess: { ...rp, stdout: '', stderr: '' } });
  },

  loadRuntimes: async () => {
    try {
      const runtimes = await invoke<RuntimeInfo[]>('list_runtimes');
      set({ runtimes });
    } catch { /* ok */ }
  },
}));
