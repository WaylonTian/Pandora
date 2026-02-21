import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Tab {
  id: string;
  requestId?: number;
  name: string;
  method: string;
  url: string;
  headers: string;
  body: string;
  bodyType: string;
  response?: any;
  isDirty: boolean;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab?: Partial<Tab>) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  getActiveTab: () => Tab | undefined;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (tab) => {
        const id = `tab-${Date.now()}`;
        const newTab: Tab = {
          id,
          name: tab?.name || 'New Request',
          method: tab?.method || 'GET',
          url: tab?.url || '',
          headers: tab?.headers || '{}',
          body: tab?.body || '',
          bodyType: tab?.bodyType || 'none',
          isDirty: false,
          ...tab,
        };
        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id,
        }));
        return id;
      },

      closeTab: (id) => {
        set(state => {
          const idx = state.tabs.findIndex(t => t.id === id);
          const newTabs = state.tabs.filter(t => t.id !== id);
          let newActiveId = state.activeTabId;
          if (state.activeTabId === id) {
            newActiveId = newTabs[Math.min(idx, newTabs.length - 1)]?.id || null;
          }
          return { tabs: newTabs, activeTabId: newActiveId };
        });
      },

      setActiveTab: (id) => set({ activeTabId: id }),

      updateTab: (id, updates) => {
        set(state => ({
          tabs: state.tabs.map(t => t.id === id ? { ...t, ...updates, isDirty: true } : t),
        }));
      },

      getActiveTab: () => {
        const state = get();
        return state.tabs.find(t => t.id === state.activeTabId);
      },
    }),
    { name: 'getman-tabs' }
  )
);
