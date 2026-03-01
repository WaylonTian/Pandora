import { create } from "zustand";

interface ToolkitState {
  favorites: string[];
  recentUsed: string[];
  pinnedTools: string[];
  toolStates: Record<string, unknown>;
  toggleFavorite: (id: string) => void;
  addRecent: (id: string) => void;
  togglePin: (id: string) => void;
  getToolState: <T>(id: string) => T | undefined;
  setToolState: <T>(id: string, state: T) => void;
}

const STORAGE_KEY = "pandora-toolkit";

function loadState() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
}

function savePersistedState(s: ToolkitState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    favorites: s.favorites, recentUsed: s.recentUsed, pinnedTools: s.pinnedTools,
  }));
}

export const useToolkitStore = create<ToolkitState>((set, get) => {
  const saved = loadState();
  return {
    favorites: saved.favorites || [],
    recentUsed: saved.recentUsed || [],
    pinnedTools: saved.pinnedTools || [],
    toolStates: {},
    toggleFavorite: (id) => set(s => {
      const next = s.favorites.includes(id) ? { favorites: s.favorites.filter(f => f !== id) } : { favorites: [...s.favorites, id] };
      savePersistedState({ ...s, ...next } as ToolkitState);
      return next;
    }),
    addRecent: (id) => set(s => {
      const next = { recentUsed: [id, ...s.recentUsed.filter(r => r !== id)].slice(0, 5) };
      savePersistedState({ ...s, ...next } as ToolkitState);
      return next;
    }),
    togglePin: (id) => set(s => {
      const next = s.pinnedTools.includes(id) ? { pinnedTools: s.pinnedTools.filter(p => p !== id) } : { pinnedTools: [...s.pinnedTools, id] };
      savePersistedState({ ...s, ...next } as ToolkitState);
      return next;
    }),
    getToolState: <T,>(id: string) => get().toolStates[id] as T | undefined,
    setToolState: <T,>(id: string, state: T) => set(s => ({ toolStates: { ...s.toolStates, [id]: state } })),
  };
});
