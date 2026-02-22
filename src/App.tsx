import { useRef, useCallback, useState, useEffect } from "react";
import { DockviewReact, type DockviewReadyEvent, type DockviewApi, type IDockviewPanelProps } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { getPanel, getAllPanels } from "@/layouts/panels";
import { useLayoutStore } from "@/stores/layout";
import { useThemeStore } from "@/stores/theme";
import { Sidebar } from "@/components/Sidebar";
import { useT } from '@/i18n';

function PanelRenderer(props: IDockviewPanelProps) {
  const t = useT();
  const panelId = props.params.panelId as string;
  const panel = getPanel(panelId);
  if (!panel) return <div className="p-4 text-muted-foreground">{t('app.unknownPanel', { panelId })}</div>;
  const Component = panel.component;
  return <Component {...props} />;
}

const components = { default: PanelRenderer };

export default function App() {
  const { saveLayout } = useLayoutStore();
  const { isDark, toggle } = useThemeStore();
  const apiRef = useRef<DockviewApi | null>(null);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const onReady = useCallback((event: DockviewReadyEvent) => {
    apiRef.current = event.api;
    const saved = useLayoutStore.getState().serializedLayout;
    if (saved) {
      try {
        event.api.fromJSON(saved as Parameters<typeof event.api.fromJSON>[0]);
        event.api.onDidLayoutChange(() => saveLayout(event.api.toJSON()));
        return;
      } catch { /* fallback */ }
    }
    // Default layout
    const panels = getAllPanels();
    panels.forEach((p) => {
      event.api.addPanel({
        id: p.id,
        title: p.title,
        component: "default",
        params: { panelId: p.id },
      });
    });
    event.api.onDidLayoutChange(() => saveLayout(event.api.toJSON()));
  }, [saveLayout]);

  const handlePanelSelect = useCallback((panelId: string) => {
    if (!apiRef.current) return;
    const existing = apiRef.current.panels.find(p => p.id === panelId);
    if (existing) {
      existing.api.setActive();
    } else {
      const def = getPanel(panelId);
      if (def) {
        apiRef.current.addPanel({
          id: panelId,
          title: def.title,
          component: "default",
          params: { panelId },
        });
      }
    }
    setActivePanel(panelId);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "1": e.preventDefault(); handlePanelSelect("api-tester"); break;
          case "2": e.preventDefault(); handlePanelSelect("db-manager"); break;
          case "3": e.preventDefault(); handlePanelSelect("toolkit"); break;
          case "4": e.preventDefault(); handlePanelSelect("script-runner"); break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlePanelSelect]);

  return (
    <div className="h-screen w-screen flex bg-background text-foreground">
      <Sidebar
        onPanelSelect={handlePanelSelect}
        activePanel={activePanel}
        onThemeToggle={toggle}
        isDark={isDark}
      />
      <div className="flex-1">
        <DockviewReact
          className={`h-full w-full ${isDark ? 'dockview-theme-dark' : 'dockview-theme-light'}`}
          components={components}
          onReady={onReady}
        />
      </div>
    </div>
  );
}