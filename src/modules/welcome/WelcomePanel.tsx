import type { IDockviewPanelProps } from "dockview-react";

export function WelcomePanel(_props: IDockviewPanelProps) {
  return (
    <div className="h-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Pandora</h1>
        <p className="text-muted-foreground">Developer Toolbox</p>
      </div>
    </div>
  );
}