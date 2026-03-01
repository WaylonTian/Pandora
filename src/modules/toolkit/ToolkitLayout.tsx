import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { getTools } from "./plugin-interface";
import { usePluginStore } from "./stores/plugin-store";
import { useToolkitStore } from "./stores/toolkit-store";
import { PluginContainer } from "./plugin-runtime";
import { Marketplace } from "./components/Marketplace";
import { InstalledPlugins } from "./components/InstalledPlugins";
import { ToolkitHome } from "./components/ToolkitHome";
import { ToolPage } from "./components/ToolPage";

type View = { type: "home" } | { type: "tool"; id: string } | { type: "plugin"; id: string } | { type: "marketplace" } | { type: "installed" };

export function ToolkitLayout() {
  const t = useT();
  const [view, setView] = useState<View>({ type: "home" });
  const { installed, loadInstalled } = usePluginStore();
  const { addRecent } = useToolkitStore();

  useEffect(() => { loadInstalled(); }, []);

  const allTools = getTools();
  const activeTool = view.type === "tool" ? allTools.find((tl) => tl.id === view.id) : null;
  const activePlugin = view.type === "plugin" ? installed.find((p) => p.id === view.id) : null;
  const ActiveComponent = activeTool?.component;
  const goHome = () => setView({ type: "home" });

  const handleNavigate = (target: Exclude<View, { type: "home" }>) => {
    if (target.type === "tool") addRecent(target.id);
    setView(target);
  };

  if (view.type === "home") return <ToolkitHome onNavigate={handleNavigate} />;
  if (view.type === "tool" && ActiveComponent) return <ToolPage toolId={view.id} title={t(activeTool!.name)} onBack={goHome}><ActiveComponent /></ToolPage>;
  if (view.type === "plugin" && activePlugin) return <ToolPage toolId={activePlugin.id} title={activePlugin.name} onBack={goHome} noPadding><PluginContainer plugin={activePlugin} /></ToolPage>;
  if (view.type === "marketplace") return <ToolPage toolId="__marketplace" title={t("toolkit.marketplace.title")} onBack={goHome}><Marketplace /></ToolPage>;
  if (view.type === "installed") return <ToolPage toolId="__installed" title={t("toolkit.managedPlugins")} onBack={goHome}><InstalledPlugins /></ToolPage>;
  return <ToolkitHome onNavigate={handleNavigate} />;
}
