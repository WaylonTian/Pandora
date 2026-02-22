import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { getToolsByCategory, getTools } from "./plugin-interface";
import { usePluginStore } from "./stores/plugin-store";
import { PluginContainer } from "./plugin-runtime";
import { Marketplace } from "./components/Marketplace";
import { InstalledPlugins } from "./components/InstalledPlugins";

type ActiveItem =
  | { type: "tool"; id: string }
  | { type: "plugin"; id: string }
  | { type: "marketplace" }
  | { type: "installed" };

export function ToolkitLayout() {
  const t = useT();
  const [active, setActive] = useState<ActiveItem>({ type: "tool", id: getTools()[0]?.id || "" });
  const [search, setSearch] = useState("");
  const { installed, loadInstalled } = usePluginStore();

  useEffect(() => { loadInstalled(); }, []);

  const grouped = getToolsByCategory();
  const allTools = getTools();
  const filteredTools = search
    ? allTools.filter((tool) => t(tool.name).toLowerCase().includes(search.toLowerCase()) || tool.id.includes(search.toLowerCase()))
    : null;

  const activeTool = active.type === "tool" ? allTools.find((tool) => tool.id === active.id) : null;
  const activePlugin = active.type === "plugin" ? installed.find((p) => p.id === active.id) : null;
  const ActiveComponent = activeTool?.component;

  const categoryLabels: Record<string, string> = {
    encoding: t("toolkit.encoding"), crypto: t("toolkit.crypto"),
    network: t("toolkit.network"), text: t("toolkit.text"), other: t("toolkit.other"),
  };

  const SidebarBtn = ({ isActive, onClick, icon, label }: { isActive: boolean; onClick: () => void; icon: string; label: string }) => (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-md py-2 px-3 font-medium text-sm flex items-center gap-3 transition-colors duration-150 cursor-pointer focus:outline-none ${
        isActive ? "bg-primary/10 text-primary border-l-2 border-primary" : "hover:bg-muted/50"
      }`}
    >
      <div className="w-7 h-7 flex items-center justify-center rounded bg-muted text-xs font-mono">{icon}</div>
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="flex h-full bg-background text-foreground">
      <div className="w-56 bg-card border-r border-border overflow-y-auto p-3 shrink-0 flex flex-col gap-1">
        <input
          className="w-full px-3 py-2 mb-2 border rounded bg-background text-foreground text-sm"
          placeholder={t("toolkit.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filteredTools ? (
          filteredTools.map((tool) => (
            <SidebarBtn key={tool.id} isActive={active.type === "tool" && active.id === tool.id}
              onClick={() => setActive({ type: "tool", id: tool.id })} icon={tool.icon} label={t(tool.name)} />
          ))
        ) : (
          <>
            {Array.from(grouped.entries()).map(([category, tools]) => (
              <div key={category} className="mb-2">
                <div className="text-[10px] font-medium text-muted-foreground px-3 py-1 uppercase tracking-wider">
                  {categoryLabels[category] || category}
                </div>
                {tools.map((tool) => (
                  <SidebarBtn key={tool.id} isActive={active.type === "tool" && active.id === tool.id}
                    onClick={() => setActive({ type: "tool", id: tool.id })} icon={tool.icon} label={t(tool.name)} />
                ))}
              </div>
            ))}

            {installed.filter((p) => p.enabled).length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-medium text-muted-foreground px-3 py-1 uppercase tracking-wider">
                  {t("toolkit.plugins")}
                </div>
                {installed.filter((p) => p.enabled).map((plugin) => (
                  <SidebarBtn key={plugin.id} isActive={active.type === "plugin" && active.id === plugin.id}
                    onClick={() => setActive({ type: "plugin", id: plugin.id })} icon="🔌" label={plugin.name} />
                ))}
              </div>
            )}

            <div className="mt-auto pt-2 border-t border-border">
              <SidebarBtn isActive={active.type === "installed"} onClick={() => setActive({ type: "installed" })}
                icon="📋" label={t("toolkit.managedPlugins")} />
              <SidebarBtn isActive={active.type === "marketplace"} onClick={() => setActive({ type: "marketplace" })}
                icon="🏪" label={t("toolkit.marketplace.title")} />
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl">
          {active.type === "tool" && ActiveComponent && <ActiveComponent />}
          {active.type === "plugin" && activePlugin && <PluginContainer plugin={activePlugin} />}
          {active.type === "marketplace" && <Marketplace />}
          {active.type === "installed" && <InstalledPlugins />}
          {active.type === "tool" && !ActiveComponent && (
            <div className="text-muted-foreground">{t("toolkit.selectTool")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
