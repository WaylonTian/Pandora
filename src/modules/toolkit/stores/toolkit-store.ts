import { create } from "zustand";

interface ToolkitState {
  favorites: string[];
  recentUsed: string[];
  toolStates: Record<string, unknown>;
  toggleFavorite: (id: string) => void;
  addRecent: (id: string) => void;
  getToolState: <T>(id: string) => T | undefined;
  setToolState: <T>(id: string, state: T) => void;
}

const STORAGE_KEY = "pandora-toolkit";

function loadState(): Partial<ToolkitState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveState(state: ToolkitState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    favorites: state.favorites,
    recentUsed: state.recentUsed,
    toolStates: state.toolStates,
  }));
}

export const useToolkitStore = create<ToolkitState>((set, get) => {
  const saved = loadState();
  return {
    favorites: saved.favorites || [],
    recentUsed: saved.recentUsed || [],
    toolStates: saved.toolStates || {},
    toggleFavorite: (id) => set((s) => {
      const next = s.favorites.includes(id)
        ? { favorites: s.favorites.filter((f) => f !== id) }
        : { favorites: [...s.favorites, id] };
      const ns = { ...s, ...next };
      saveState(ns as ToolkitState);
      return next;
    }),
    addRecent: (id) => set((s) => {
      const next = { recentUsed: [id, ...s.recentUsed.filter((r) => r !== id)].slice(0, 5) };
      const ns = { ...s, ...next };
      saveState(ns as ToolkitState);
      return next;
    }),
    getToolState: <T,>(id: string) => get().toolStates[id] as T | undefined,
    setToolState: <T,>(id: string, state: T) => set((s) => {
      const next = { toolStates: { ...s.toolStates, [id]: state } };
      const ns = { ...s, ...next };
      saveState(ns as ToolkitState);
      return next;
    }),
  };
});
