import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { InstalledPlugin, MarketPlugin, MarketPluginDetail } from "../plugin-runtime/types";

interface PluginStore {
  installed: InstalledPlugin[];
  marketPlugins: MarketPlugin[];
  marketLoading: boolean;
  installing: Set<string>;
  installError: string | null;
  loadInstalled: () => Promise<void>;
  installFromMarket: (name: string) => Promise<void>;
  installFromFile: (path: string) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
  toggle: (id: string, enabled: boolean) => Promise<void>;
  searchMarket: (query: string) => Promise<void>;
  loadTopic: (topicId: number) => Promise<void>;
  getDetail: (name: string) => Promise<MarketPluginDetail>;
}

// Frontend cache: avoid re-fetching same topic/search within TTL
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day
const cache = new Map<string, { data: MarketPlugin[]; at: number }>();

function getCached(key: string): MarketPlugin[] | null {
  const e = cache.get(key);
  if (e && Date.now() - e.at < CACHE_TTL) return e.data;
  return null;
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  installed: [],
  marketPlugins: [],
  marketLoading: false,
  installing: new Set(),
  installError: null,

  loadInstalled: async () => {
    const installed = await invoke<InstalledPlugin[]>("plugin_list");
    set({ installed });
  },

  installFromMarket: async (name) => {
    set((s) => ({ installing: new Set(s.installing).add(name), installError: null }));
    try {
      await invoke("plugin_install_from_market", { name });
      await get().loadInstalled();
    } catch (e: any) {
      const msg = e.message || String(e);
      // If .upxs, remove from current list (backend already cached the blocklist)
      if (msg.includes(".upxs")) {
        set((s) => ({ marketPlugins: s.marketPlugins.filter((p) => p.name !== name) }));
        // Also purge frontend cache so next load uses backend's filtered result
        cache.clear();
      }
      set({ installError: `${name}: ${msg}` });
    } finally {
      set((s) => {
        const next = new Set(s.installing);
        next.delete(name);
        return { installing: next };
      });
    }
  },

  installFromFile: async (path) => {
    await invoke("plugin_install_from_file", { path });
    await get().loadInstalled();
  },

  uninstall: async (id) => {
    await invoke("plugin_uninstall", { id });
    await get().loadInstalled();
  },

  toggle: async (id, enabled) => {
    await invoke("plugin_toggle", { id, enabled });
    await get().loadInstalled();
  },

  searchMarket: async (query) => {
    const key = `search:${query}`;
    const cached = getCached(key);
    if (cached) { set({ marketPlugins: cached }); return; }

    set({ marketLoading: true });
    try {
      const marketPlugins = await invoke<MarketPlugin[]>("marketplace_search", { query });
      cache.set(key, { data: marketPlugins, at: Date.now() });
      set({ marketPlugins });
    } finally {
      set({ marketLoading: false });
    }
  },

  loadTopic: async (topicId) => {
    const key = `topic:${topicId}`;
    const cached = getCached(key);
    if (cached) { set({ marketPlugins: cached }); return; }

    set({ marketLoading: true });
    try {
      const marketPlugins = await invoke<MarketPlugin[]>("marketplace_topic", { topicId });
      cache.set(key, { data: marketPlugins, at: Date.now() });
      set({ marketPlugins });
    } finally {
      set({ marketLoading: false });
    }
  },

  getDetail: async (name) => invoke<MarketPluginDetail>("marketplace_detail", { name }),
}));
