import { useState } from "react";
import { Search, ClipboardList, Store, ChevronDown, ChevronRight, Star, Clock } from "lucide-react";
import { useT } from "@/i18n";
import { getTools, getToolsByCategory, type Category } from "../plugin-interface";
import { useToolkitStore } from "../stores/toolkit-store";
import { usePluginStore } from "../stores/plugin-store";
import { ToolCard } from "./ToolCard";

type ViewTarget = { type: "tool"; id: string } | { type: "plugin"; id: string } | { type: "marketplace" } | { type: "installed" };
const CATEGORY_ORDER: Category[] = ["encoding", "crypto", "text", "generator", "datetime", "number", "network", "system"];

export function ToolkitHome({ onNavigate }: { onNavigate: (target: ViewTarget) => void }) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [favCollapsed, setFavCollapsed] = useState(false);
  const [recentCollapsed, setRecentCollapsed] = useState(false);
  const { favorites, recentUsed, toggleFavorite } = useToolkitStore();
  const { installed } = usePluginStore();
  const allTools = getTools();
  const grouped = getToolsByCategory();
  const filteredTools = search ? allTools.filter((tl) => t(tl.name).toLowerCase().includes(search.toLowerCase()) || tl.id.includes(search.toLowerCase())) : null;
  const favTools = allTools.filter((tl) => favorites.includes(tl.id));
  const recentTools = recentUsed.map((id) => allTools.find((tl) => tl.id === id)).filter(Boolean) as typeof allTools;
  const enabledPlugins = installed.filter((p) => p.enabled);
  const catLabels: Record<string, string> = {
    encoding: t("toolkit.cat.encoding"), crypto: t("toolkit.cat.crypto"), text: t("toolkit.cat.text"),
    generator: t("toolkit.cat.generator"), datetime: t("toolkit.cat.datetime"), number: t("toolkit.cat.number"),
    network: t("toolkit.cat.network"), system: t("toolkit.cat.system"),
  };
  const renderCard = (tl: typeof allTools[0]) => (
    <ToolCard key={tl.id} tool={tl} isFavorite={favorites.includes(tl.id)} onToggleFavorite={() => toggleFavorite(tl.id)} onClick={() => onNavigate({ type: "tool", id: tl.id })} />
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-muted/30 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder={t("toolkit.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => onNavigate({ type: "installed" })} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title={t("toolkit.managedPlugins")}><ClipboardList className="w-4 h-4" /></button>
        <button onClick={() => onNavigate({ type: "marketplace" })} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title={t("toolkit.marketplace.title")}><Store className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredTools ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {filteredTools.map(renderCard)}
            {filteredTools.length === 0 && <div className="text-muted-foreground text-sm col-span-full py-8 text-center">{t("toolkit.noResults")}</div>}
          </div>
        ) : (
          <>
            {favTools.length > 0 && (
              <div className="mb-4">
                <button onClick={() => setFavCollapsed(!favCollapsed)} className="flex items-center gap-1.5 mb-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {favCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}<Star className="w-3.5 h-3.5" /><span>{t("toolkit.favorites")}</span>
                </button>
                {!favCollapsed && <div className="flex gap-2 overflow-x-auto pb-1">{favTools.map(renderCard)}</div>}
              </div>
            )}
            {recentTools.length > 0 && (
              <div className="mb-4">
                <button onClick={() => setRecentCollapsed(!recentCollapsed)} className="flex items-center gap-1.5 mb-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {recentCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}<Clock className="w-3.5 h-3.5" /><span>{t("toolkit.recent")}</span>
                </button>
                {!recentCollapsed && <div className="flex gap-2 overflow-x-auto pb-1">{recentTools.map(renderCard)}</div>}
              </div>
            )}
            {CATEGORY_ORDER.map((cat) => {
              const tools = grouped.get(cat);
              if (!tools?.length) return null;
              return (
                <div key={cat} className="mb-6">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{catLabels[cat] || cat}</div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">{tools.map(renderCard)}</div>
                </div>
              );
            })}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("toolkit.plugins")}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 font-medium">Beta</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                {enabledPlugins.map((plugin) => (
                  <div key={plugin.id} onClick={() => onNavigate({ type: "plugin", id: plugin.id })}
                    className="group relative flex items-start gap-3 p-3 border border-border rounded-xl bg-card hover:bg-accent/50 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-lg">🔌</div>
                    <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{plugin.name}</div><div className="text-xs text-muted-foreground truncate mt-0.5">{plugin.description}</div></div>
                    <span className="absolute bottom-1.5 left-3 text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{t("toolkit.pluginLabel")}</span>
                  </div>
                ))}
                {enabledPlugins.length === 0 && (
                  <div onClick={() => onNavigate({ type: "marketplace" })} className="flex items-center gap-3 p-3 border border-dashed border-border rounded-xl hover:bg-accent/50 transition-colors cursor-pointer">
                    <Store className="w-5 h-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">{t("toolkit.exploreMarketplace")}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
