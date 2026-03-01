import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { ResizableLayout } from "@/components/ResizableLayout";
import { getTools } from "./plugin-interface";
import { usePluginStore } from "./stores/plugin-store";
import { useToolkitStore } from "./stores/toolkit-store";
import { PluginContainer } from "./plugin-runtime";
import { Marketplace } from "./components/Marketplace";
import { InstalledPlugins } from "./components/InstalledPlugins";
import { ToolkitSidebar } from "./components/ToolkitSidebar";
import { ToolPage } from "./components/ToolPage";

type OverlayView = { type: "plugin"; id: string } | { type: "marketplace" } | { type: "installed" } | null;

export function ToolkitLayout() {
  const t = useT();
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayView>(null);
  const { installed, loadInstalled } = usePluginStore();
  const { addRecent } = useToolkitStore();

  useEffect(() => { loadInstalled(); }, []);

  const allTools = getTools();
  const activeTool = selectedToolId ? allTools.find(tl => tl.id === selectedToolId) : null;
  const ActiveComponent = activeTool?.component;

  const handleSelectTool = (id: string) => { setSelectedToolId(id); addRecent(id); };
  const goHome = () => setOverlay(null);

  if (overlay?.type === "plugin") {
    const plugin = installed.find(p => p.id === overlay.id);
    if (plugin) return <ToolPage title={plugin.name} onBack={goHome} noPadding><PluginContainer plugin={plugin} /></ToolPage>;
  }
  if (overlay?.type === "marketplace") return <ToolPage title={t("toolkit.marketplace.title")} onBack={goHome}><Marketplace /></ToolPage>;
  if (overlay?.type === "installed") return <ToolPage title={t("toolkit.managedPlugins")} onBack={goHome}><InstalledPlugins /></ToolPage>;

  return (
    <ResizableLayout
      defaultSidebarWidth={240}
      minSidebarWidth={200}
      maxSidebarWidth={360}
      sidebar={<ToolkitSidebar selectedId={selectedToolId} onSelectTool={handleSelectTool} onNavigate={setOverlay} />}
      main={
        ActiveComponent ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
              <h2 className="text-sm font-semibold flex-1">{t(activeTool!.name)}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4"><ActiveComponent /></div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{t("toolkit.selectTool")}</div>
        )
      }
    />
  );
}
