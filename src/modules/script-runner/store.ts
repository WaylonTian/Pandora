import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface Script {
  id: string;
  name: string;
  runtime: string;
  content: string;
  filePath?: string;
}

export interface RuntimeInfo {
  name: string;
  command: string;
  available: boolean;
  version: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exit_code: number | null;
  duration_ms: number;
}

interface ScriptRunnerState {
  scripts: Script[];
  activeScriptId: string | null;
  runtimes: RuntimeInfo[];
  isRunning: boolean;
  lastResult: ExecutionResult | null;
  addScript: (script: Omit<Script, "id">) => void;
  removeScript: (id: string) => void;
  updateScript: (id: string, updates: Partial<Script>) => void;
  setActiveScript: (id: string | null) => void;
  loadRuntimes: () => Promise<void>;
  runScript: (script: Script) => Promise<void>;
}

export const useScriptRunnerStore = create<ScriptRunnerState>((set, get) => ({
  scripts: JSON.parse(localStorage.getItem("pandora-scripts") || "[]"),
  activeScriptId: null,
  runtimes: [],
  isRunning: false,
  lastResult: null,

  addScript: (script) => {
    const id = crypto.randomUUID();
    const newScript = { ...script, id };
    const scripts = [...get().scripts, newScript];
    localStorage.setItem("pandora-scripts", JSON.stringify(scripts));
    set({ scripts, activeScriptId: id });
  },

  removeScript: (id) => {
    const scripts = get().scripts.filter(s => s.id !== id);
    localStorage.setItem("pandora-scripts", JSON.stringify(scripts));
    set({ scripts, activeScriptId: get().activeScriptId === id ? null : get().activeScriptId });
  },

  updateScript: (id, updates) => {
    const scripts = get().scripts.map(s => s.id === id ? { ...s, ...updates } : s);
    localStorage.setItem("pandora-scripts", JSON.stringify(scripts));
    set({ scripts });
  },

  setActiveScript: (id) => set({ activeScriptId: id }),

  loadRuntimes: async () => {
    try {
      const runtimes = await invoke<RuntimeInfo[]>("list_runtimes");
      set({ runtimes });
    } catch {
      set({ runtimes: [] });
    }
  },

  runScript: async (script) => {
    set({ isRunning: true, lastResult: null });
    try {
      const result = await invoke<ExecutionResult>("run_script", {
        runtime: script.runtime,
        scriptPath: script.filePath || "",
        args: [],
        workingDir: null,
      });
      set({ lastResult: result, isRunning: false });
    } catch (e) {
      set({
        lastResult: { stdout: "", stderr: String(e), exit_code: -1, duration_ms: 0 },
        isRunning: false,
      });
    }
  },
}));