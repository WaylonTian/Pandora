import { useState } from "react";
import { Search, Pin, Star, ClipboardList, Store, Plug } from "lucide-react";
import { useT } from "@/i18n";
import { getTools, getToolsByCategory, type Category } from "../plugin-interface";
import { useToolkitStore } from "../stores/toolkit-store";
import { usePluginStore, getPluginLogoUrl } from "../stores/plugin-store";
import type { InstalledPlugin } from "../plugin-runtime";

const CATEGORY_ORDER: Category[] = ["encoding", "text", "generator", "network"];

export function ToolkitSidebar({ selectedId, onSelect }: {
  selectedId: string | null;
  onSelect: (type: "tool" | "plugin" | "marketplace" | "installed", id?: string) => void;
}) {
  const t = useT();
  const [search, setSearch] = useState("");
  const { favorites, pinnedTools, toggleFavorite, togglePin } = useToolkitStore();
  const { installed, serverPort } = usePluginStore();
  const enabledPlugins = installed.filter(p => p.enabled);
  const allTools = getTools();
  const grouped = getToolsByCategory();

  const pluginLogoUrl = (p: InstalledPlugin) => getPluginLogoUrl(p, serverPort);

  const catLabels: Record<string, string> = {
    encoding: t("toolkit.cat.encoding"), text: t("toolkit.cat.text"),
    generator: t("toolkit.cat.generator"), network: t("toolkit.cat.network"),
  };

  const filtered = search ? allTools.filter(tl => t(tl.name).toLowerCase().includes(search.toLowerCase()) || tl.id.includes(search.toLowerCase())) : null;
  const filteredPlugins = search ? enabledPlugins.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : null;
  const favTools = allTools.filter(tl => favorites.includes(tl.id));
  const favPlugins = enabledPlugins.filter(p => favorites.includes(p.id));
  const pinned = allTools.filter(tl => pinnedTools.includes(tl.id));

  const ToolRow = ({ tool }: { tool: typeof allTools[0] }) => {
    const Icon = tool.icon;
    const active = tool.id === selectedId;
    const isFav = favorites.includes(tool.id);
    return (
      <div onClick={() => onSelect("tool", tool.id)}
        onContextMenu={e => { e.preventDefault(); togglePin(tool.id); }}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md cursor-pointer text-sm transition-colors group ${active ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground"}`}>
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1">{t(tool.name)}</span>
        <button onClick={e => { e.stopPropagation(); toggleFavorite(tool.id); }}
          className={`p-0.5 rounded transition-opacity ${isFav ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <Star className={`w-3 h-3 ${isFav ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
        {pinnedTools.includes(tool.id) && <Pin className="w-3 h-3 text-muted-foreground shrink-0" />}
      </div>
    );
  };

  const PluginRow = ({ plugin }: { plugin: InstalledPlugin }) => {
    const active = plugin.id === selectedId;
    const logo = pluginLogoUrl(plugin);
    const isFav = favorites.includes(plugin.id);
    return (
      <div onClick={() => onSelect("plugin", plugin.id)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md cursor-pointer text-sm transition-colors group ${active ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground"}`}>
        {logo
          ? <img src={logo} alt="" className="w-4 h-4 shrink-0 rounded" />
          : <Plug className="w-4 h-4 shrink-0 text-muted-foreground" />}
        <span className="truncate flex-1">{plugin.name}</span>
        <button onClick={e => { e.stopPropagation(); toggleFavorite(plugin.id); }}
          className={`p-0.5 rounded transition-opacity ${isFav ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <Star className={`w-3 h-3 ${isFav ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border shrink-0 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input className="w-full pl-8 pr-3 py-1.5 border border-border rounded-md bg-muted/30 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={t("toolkit.search")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          <button onClick={() => onSelect("installed")} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title={t("toolkit.managedPlugins")}><ClipboardList className="w-3.5 h-3.5" /></button>
          <button onClick={() => onSelect("marketplace")} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title={t("toolkit.marketplace.title")}><Store className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {filtered ? (
          <div className="space-y-0.5">
            {filtered.map(tl => <ToolRow key={tl.id} tool={tl} />)}
            {filteredPlugins?.map(p => <PluginRow key={p.id} plugin={p} />)}
            {filtered.length === 0 && (!filteredPlugins || filteredPlugins.length === 0) && <div className="text-muted-foreground text-xs text-center py-4">{t("toolkit.noResults")}</div>}
          </div>
        ) : (
          <>
            {(favTools.length > 0 || favPlugins.length > 0) && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">{t("toolkit.favorites")}</div>
                <div className="space-y-0.5">
                  {favTools.map(tl => <ToolRow key={tl.id} tool={tl} />)}
                  {favPlugins.map(p => <PluginRow key={p.id} plugin={p} />)}
                </div>
              </div>
            )}
            {pinned.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">{t("toolkit.pinned")}</div>
                <div className="space-y-0.5">{pinned.map(tl => <ToolRow key={tl.id} tool={tl} />)}</div>
              </div>
            )}
            {CATEGORY_ORDER.map(cat => {
              const tools = grouped.get(cat);
              if (!tools?.length) return null;
              return (
                <div key={cat}>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">{catLabels[cat]}</div>
                  <div className="space-y-0.5">{tools.map(tl => <ToolRow key={tl.id} tool={tl} />)}</div>
                </div>
              );
            })}
            {enabledPlugins.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-3 mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("toolkit.plugins")}</span>
                  <span className="text-[9px] px-1 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 font-medium">Beta</span>
                </div>
                <div className="space-y-0.5">{enabledPlugins.map(p => <PluginRow key={p.id} plugin={p} />)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
