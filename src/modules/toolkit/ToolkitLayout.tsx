import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { ResizableLayout } from "@/components/ResizableLayout";
import { getTools } from "./plugin-interface";
import { usePluginStore, getPluginLogoUrl } from "./stores/plugin-store";
import { useToolkitStore } from "./stores/toolkit-store";
import { PluginContainer } from "./plugin-runtime";
import { Marketplace } from "./components/Marketplace";
import { InstalledPlugins } from "./components/InstalledPlugins";
import { ToolkitSidebar } from "./components/ToolkitSidebar";

type Selection = { type: "tool"; id: string } | { type: "plugin"; id: string } | { type: "marketplace" } | { type: "installed" } | null;

export function ToolkitLayout() {
  const t = useT();
  const [selection, setSelection] = useState<Selection>(null);
  const { installed, serverPort, loadInstalled } = usePluginStore();
  const { addRecent } = useToolkitStore();

  useEffect(() => { loadInstalled(); }, []);

  const allTools = getTools();

  const handleSelect = (type: "tool" | "plugin" | "marketplace" | "installed", id?: string) => {
    if (type === "tool" && id) { addRecent(id); setSelection({ type: "tool", id }); }
    else if (type === "plugin" && id) setSelection({ type: "plugin", id });
    else if (type === "marketplace") setSelection({ type: "marketplace" });
    else if (type === "installed") setSelection({ type: "installed" });
  };

  const selectedId = selection?.type === "tool" ? selection.id : selection?.type === "plugin" ? selection.id : null;

  // Track if marketplace/installed have ever been selected (lazy mount)
  const [mountedViews, setMountedViews] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (selection?.type === "marketplace" || selection?.type === "installed") {
      setMountedViews(prev => { const next = new Set(prev); next.add(selection.type); return next; });
    }
  }, [selection]);

  const renderMain = () => {
    if (!selection) return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{t("toolkit.selectTool")}</div>;

    if (selection.type === "tool") {
      const tool = allTools.find(tl => tl.id === selection.id);
      if (!tool) return null;
      const C = tool.component;
      return (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold flex-1">{t(tool.name)}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4"><C /></div>
        </div>
      );
    }

    if (selection.type === "plugin") {
      const plugin = installed.find(p => p.id === selection.id);
      if (!plugin) return null;
      const logo = getPluginLogoUrl(plugin, serverPort);
      return (
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
            {logo
              ? <img src={logo} alt="" className="w-5 h-5 rounded" />
              : null}
            <h2 className="text-sm font-semibold flex-1">{plugin.name}</h2>
          </div>
          <div className="flex-1 min-h-0 flex flex-col"><PluginContainer plugin={plugin} /></div>
        </div>
      );
    }

    return null;
  };

  const mainContent = renderMain();

  const renderWithCachedViews = () => (
    <div className="h-full relative">
      {/* Marketplace - stays mounted once opened */}
      {mountedViews.has("marketplace") && (
        <div className={`h-full flex flex-col absolute inset-0 ${selection?.type === "marketplace" ? "" : "hidden"}`}>
          <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold">{t("toolkit.marketplace.title")}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4"><Marketplace /></div>
        </div>
      )}
      {/* Installed - stays mounted once opened */}
      {mountedViews.has("installed") && (
        <div className={`h-full flex flex-col absolute inset-0 ${selection?.type === "installed" ? "" : "hidden"}`}>
          <div className="flex items-center px-4 py-2.5 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold">{t("toolkit.managedPlugins")}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4"><InstalledPlugins /></div>
        </div>
      )}
      {/* Other content */}
      {selection?.type !== "marketplace" && selection?.type !== "installed" && mainContent && (
        <div className="h-full">{mainContent}</div>
      )}
      {!selection && mainContent}
    </div>
  );

  return (
    <ResizableLayout
      defaultSidebarWidth={240}
      minSidebarWidth={200}
      maxSidebarWidth={360}
      sidebar={<ToolkitSidebar selectedId={selectedId} onSelect={handleSelect} />}
      main={renderWithCachedViews()}
    />
  );
}
