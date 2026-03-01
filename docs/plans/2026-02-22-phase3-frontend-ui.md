# Phase 3: Frontend — Marketplace + Plugin UI

## Task 9: Plugin Store (Zustand state management)

**Files:**
- Create: `src/modules/toolkit/stores/plugin-store.ts`

**Step 1: Create plugin state store**

```typescript
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { InstalledPlugin, MarketPlugin, MarketPluginDetail } from '../plugin-runtime/types';

interface PluginStore {
  installed: InstalledPlugin[];
  marketPlugins: MarketPlugin[];
  marketLoading: boolean;
  installing: Set<string>;

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

  loadInstalled: async () => {
    const installed = await invoke<InstalledPlugin[]>('plugin_list');
    set({ installed });
  },

  installFromMarket: async (name) => {
    set(s => ({ installing: new Set(s.installing).add(name) }));
    try {
      await invoke('plugin_install_from_market', { name });
      await get().loadInstalled();
    } finally {
      set(s => {
        const next = new Set(s.installing);
        next.delete(name);
        return { installing: next };
      });
    }
  },

  installFromFile: async (path) => {
    await invoke('plugin_install_from_file', { path });
    await get().loadInstalled();
  },

  uninstall: async (id) => {
    await invoke('plugin_uninstall', { id });
    await get().loadInstalled();
  },

  toggle: async (id, enabled) => {
    await invoke('plugin_toggle', { id, enabled });
    await get().loadInstalled();
  },

  searchMarket: async (query) => {
    set({ marketLoading: true });
    try {
      const marketPlugins = await invoke<MarketPlugin[]>('marketplace_search', { query });
      set({ marketPlugins });
    } finally {
      set({ marketLoading: false });
    }
  },

  loadTopic: async (topicId) => {
    set({ marketLoading: true });
    try {
      const marketPlugins = await invoke<MarketPlugin[]>('marketplace_topic', { topicId });
      set({ marketPlugins });
    } finally {
      set({ marketLoading: false });
    }
  },

  getDetail: async (name) => {
    return invoke<MarketPluginDetail>('marketplace_detail', { name });
  },
}));
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(plugin): add plugin zustand store"
```

---

## Task 10: Marketplace UI Component

**Files:**
- Create: `src/modules/toolkit/components/Marketplace.tsx`

**Step 1: Build marketplace browse/search/install UI**

```tsx
import { useState, useEffect } from 'react';
import { useT } from '@/i18n';
import { usePluginStore } from '../stores/plugin-store';

const TOPICS = [
  { id: 17, label: 'popular' },
  { id: 6, label: 'developer' },
  { id: 2, label: 'productivity' },
  { id: 7, label: 'ai' },
  { id: 9, label: 'media' },
  { id: 13, label: 'system' },
];

export function Marketplace() {
  const t = useT();
  const { marketPlugins, marketLoading, installing, installed, searchMarket, loadTopic, installFromMarket } = usePluginStore();
  const [query, setQuery] = useState('');
  const [activeTopic, setActiveTopic] = useState(17);

  useEffect(() => { loadTopic(activeTopic); }, [activeTopic]);

  const handleSearch = () => {
    if (query.trim()) searchMarket(query.trim());
    else loadTopic(activeTopic);
  };

  const isInstalled = (name: string) => installed.some(p => p.name === name);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border rounded bg-background text-foreground text-sm"
          placeholder={t('toolkit.marketplace.searchPlaceholder') || 'Search plugins...'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">
          {t('toolkit.marketplace.search') || 'Search'}
        </button>
      </div>

      {/* Topics */}
      <div className="flex gap-2 flex-wrap">
        {TOPICS.map(topic => (
          <button
            key={topic.id}
            onClick={() => { setActiveTopic(topic.id); setQuery(''); }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTopic === topic.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {t(`toolkit.marketplace.topic.${topic.label}`) || topic.label}
          </button>
        ))}
      </div>

      {/* Plugin list */}
      {marketLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {marketPlugins.map(plugin => (
            <div key={plugin.name} className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
                📦
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{plugin.name}</div>
                <div className="text-xs text-muted-foreground truncate">{plugin.description || plugin.name}</div>
              </div>
              <button
                onClick={() => installFromMarket(plugin.name)}
                disabled={isInstalled(plugin.name) || installing.has(plugin.name)}
                className="px-3 py-1 rounded text-xs font-medium shrink-0 disabled:opacity-50 bg-primary text-primary-foreground"
              >
                {isInstalled(plugin.name) ? (t('toolkit.marketplace.installed') || 'Installed')
                  : installing.has(plugin.name) ? (t('toolkit.marketplace.installing') || 'Installing...')
                  : (t('toolkit.marketplace.install') || 'Install')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(plugin): add marketplace UI component"
```

---

## Task 11: Installed Plugins Manager UI

**Files:**
- Create: `src/modules/toolkit/components/InstalledPlugins.tsx`

**Step 1: Build installed plugins management UI**

```tsx
import { usePluginStore } from '../stores/plugin-store';
import { useT } from '@/i18n';

export function InstalledPlugins() {
  const t = useT();
  const { installed, uninstall, toggle } = usePluginStore();

  if (installed.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {t('toolkit.installed.empty') || 'No plugins installed. Browse the marketplace to get started.'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {installed.map(plugin => (
        <div key={plugin.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
            📦
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{plugin.name}</div>
            <div className="text-xs text-muted-foreground">v{plugin.version}</div>
          </div>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={plugin.enabled}
              onChange={e => toggle(plugin.id, e.target.checked)}
              className="rounded"
            />
            <span className="text-xs">{t('toolkit.installed.enabled') || 'Enabled'}</span>
          </label>
          <button
            onClick={() => uninstall(plugin.id)}
            className="px-2 py-1 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            {t('toolkit.installed.uninstall') || 'Uninstall'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(plugin): add installed plugins manager UI"
```

---

## Task 12: Revamp ToolkitLayout — Unified Sidebar

**Files:**
- Modify: `src/modules/toolkit/ToolkitLayout.tsx`
- Modify: `src/modules/toolkit/plugin-interface.ts`

**Step 1: Rewrite ToolkitLayout with search, favorites, recent, plugins, marketplace sections**

Replace `src/modules/toolkit/ToolkitLayout.tsx` entirely:

```tsx
import { useState, useEffect } from 'react';
import { useT } from '@/i18n';
import { getToolsByCategory, getTools } from './plugin-interface';
import { usePluginStore } from './stores/plugin-store';
import { PluginContainer } from './plugin-runtime';
import { Marketplace } from './components/Marketplace';
import { InstalledPlugins } from './components/InstalledPlugins';

type ActiveItem =
  | { type: 'tool'; id: string }
  | { type: 'plugin'; id: string }
  | { type: 'marketplace' }
  | { type: 'installed' };

export function ToolkitLayout() {
  const t = useT();
  const [active, setActive] = useState<ActiveItem>({ type: 'tool', id: getTools()[0]?.id || '' });
  const [search, setSearch] = useState('');
  const { installed, loadInstalled } = usePluginStore();

  useEffect(() => { loadInstalled(); }, []);

  const grouped = getToolsByCategory();
  const allTools = getTools();
  const filteredTools = search
    ? allTools.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search.toLowerCase()))
    : null;

  const activeTool = active.type === 'tool' ? allTools.find(t => t.id === active.id) : null;
  const activePlugin = active.type === 'plugin' ? installed.find(p => p.id === active.id) : null;
  const ActiveComponent = activeTool?.component;

  const categoryLabels: Record<string, string> = {
    encoding: t('toolkit.encoding'), crypto: t('toolkit.crypto'),
    network: t('toolkit.network'), text: t('toolkit.text'), other: t('toolkit.other'),
  };

  const SidebarButton = ({ isActive, onClick, icon, label }: { isActive: boolean; onClick: () => void; icon: string; label: string }) => (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-md py-2 px-3 font-medium text-sm flex items-center gap-3 transition-colors duration-150 cursor-pointer focus:outline-none ${
        isActive ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'hover:bg-muted/50'
      }`}
    >
      <div className="w-7 h-7 flex items-center justify-center rounded bg-muted text-xs font-mono">{icon}</div>
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="flex h-full bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-56 bg-card border-r border-border overflow-y-auto p-3 shrink-0 flex flex-col gap-1">
        {/* Search */}
        <input
          className="w-full px-3 py-2 mb-2 border rounded bg-background text-foreground text-sm"
          placeholder={t('toolkit.search') || 'Search tools...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Filtered results or categorized list */}
        {filteredTools ? (
          filteredTools.map(tool => (
            <SidebarButton key={tool.id} isActive={active.type === 'tool' && active.id === tool.id}
              onClick={() => setActive({ type: 'tool', id: tool.id })} icon={tool.icon} label={tool.name} />
          ))
        ) : (
          <>
            {/* Built-in tools by category */}
            {Array.from(grouped.entries()).map(([category, tools]) => (
              <div key={category} className="mb-2">
                <div className="text-[10px] font-medium text-muted-foreground px-3 py-1 uppercase tracking-wider">
                  {categoryLabels[category] || category}
                </div>
                {tools.map(tool => (
                  <SidebarButton key={tool.id} isActive={active.type === 'tool' && active.id === tool.id}
                    onClick={() => setActive({ type: 'tool', id: tool.id })} icon={tool.icon} label={tool.name} />
                ))}
              </div>
            ))}

            {/* Installed plugins */}
            {installed.filter(p => p.enabled).length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-medium text-muted-foreground px-3 py-1 uppercase tracking-wider">
                  {t('toolkit.plugins') || 'Plugins'}
                </div>
                {installed.filter(p => p.enabled).map(plugin => (
                  <SidebarButton key={plugin.id} isActive={active.type === 'plugin' && active.id === plugin.id}
                    onClick={() => setActive({ type: 'plugin', id: plugin.id })} icon="🔌" label={plugin.name} />
                ))}
              </div>
            )}

            {/* Management */}
            <div className="mt-auto pt-2 border-t border-border">
              <SidebarButton isActive={active.type === 'installed'} onClick={() => setActive({ type: 'installed' })}
                icon="📋" label={t('toolkit.managedPlugins') || 'Manage Plugins'} />
              <SidebarButton isActive={active.type === 'marketplace'} onClick={() => setActive({ type: 'marketplace' })}
                icon="🏪" label={t('toolkit.marketplace.title') || 'Marketplace'} />
            </div>
          </>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl">
          {active.type === 'tool' && ActiveComponent && <ActiveComponent />}
          {active.type === 'plugin' && activePlugin && <PluginContainer plugin={activePlugin} />}
          {active.type === 'marketplace' && <Marketplace />}
          {active.type === 'installed' && <InstalledPlugins />}
          {active.type === 'tool' && !ActiveComponent && (
            <div className="text-muted-foreground">{t('toolkit.selectTool') || 'Select a tool'}</div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(plugin): revamp ToolkitLayout with plugin support and marketplace"
```

---

## Task 13: Add i18n keys for plugin system

**Files:**
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/en.ts`

**Step 1: Add Chinese translations**

Add to the `toolkit` section in `zh.ts`:
```typescript
'toolkit.search': '搜索工具...',
'toolkit.plugins': '已安装插件',
'toolkit.managedPlugins': '管理插件',
'toolkit.selectTool': '请选择一个工具',
'toolkit.marketplace.title': '插件市场',
'toolkit.marketplace.search': '搜索',
'toolkit.marketplace.searchPlaceholder': '搜索插件...',
'toolkit.marketplace.install': '安装',
'toolkit.marketplace.installing': '安装中...',
'toolkit.marketplace.installed': '已安装',
'toolkit.marketplace.topic.popular': '最受欢迎',
'toolkit.marketplace.topic.developer': '程序员必备',
'toolkit.marketplace.topic.productivity': '高效办公',
'toolkit.marketplace.topic.ai': 'AI',
'toolkit.marketplace.topic.media': '图像视频',
'toolkit.marketplace.topic.system': '系统工具',
'toolkit.installed.empty': '暂无已安装插件，去插件市场看看吧',
'toolkit.installed.enabled': '启用',
'toolkit.installed.uninstall': '卸载',
```

**Step 2: Add English translations**

Add corresponding keys to `en.ts`:
```typescript
'toolkit.search': 'Search tools...',
'toolkit.plugins': 'Plugins',
'toolkit.managedPlugins': 'Manage Plugins',
'toolkit.selectTool': 'Select a tool',
'toolkit.marketplace.title': 'Marketplace',
'toolkit.marketplace.search': 'Search',
'toolkit.marketplace.searchPlaceholder': 'Search plugins...',
'toolkit.marketplace.install': 'Install',
'toolkit.marketplace.installing': 'Installing...',
'toolkit.marketplace.installed': 'Installed',
'toolkit.marketplace.topic.popular': 'Popular',
'toolkit.marketplace.topic.developer': 'Developer',
'toolkit.marketplace.topic.productivity': 'Productivity',
'toolkit.marketplace.topic.ai': 'AI',
'toolkit.marketplace.topic.media': 'Media',
'toolkit.marketplace.topic.system': 'System',
'toolkit.installed.empty': 'No plugins installed. Browse the marketplace to get started.',
'toolkit.installed.enabled': 'Enabled',
'toolkit.installed.uninstall': 'Uninstall',
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(i18n): add plugin system translations"
```
