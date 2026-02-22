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
      set({ installError: `Failed to install ${name}: ${e.message || e}` });
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
    set({ marketLoading: true });
    try {
      const marketPlugins = await invoke<MarketPlugin[]>("marketplace_search", { query });
      set({ marketPlugins });
    } finally {
      set({ marketLoading: false });
    }
  },

  loadTopic: async (topicId) => {
    set({ marketLoading: true });
    try {
      const marketPlugins = await invoke<MarketPlugin[]>("marketplace_topic", { topicId });
      set({ marketPlugins });
    } finally {
      set({ marketLoading: false });
    }
  },

  getDetail: async (name) => invoke<MarketPluginDetail>("marketplace_detail", { name }),
}));
