import { DockviewReact, type DockviewReadyEvent, type IDockviewPanelProps } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { getPanel, getAllPanels } from "./panels";
import { useLayoutStore } from "@/stores/layout";

function PanelRenderer(props: IDockviewPanelProps) {
  const panelId = props.params.panelId as string;
  const panel = getPanel(panelId);
  if (!panel) return <div className="p-4 text-muted-foreground">Unknown panel: {panelId}</div>;
  const Component = panel.component;
  return <Component {...props} />;
}

const components = { default: PanelRenderer };

export function DockLayout() {
  const { saveLayout } = useLayoutStore();

  const onReady = (event: DockviewReadyEvent) => {
    const saved = useLayoutStore.getState().serializedLayout;
    if (saved) {
      try {
        event.api.fromJSON(saved as Parameters<typeof event.api.fromJSON>[0]);
        event.api.onDidLayoutChange(() => saveLayout(event.api.toJSON()));
        return;
      } catch { /* fallback to default */ }
    }
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
  };

  return (
    <DockviewReact
      className="h-full w-full"
      components={components}
      onReady={onReady}
    />
  );
}