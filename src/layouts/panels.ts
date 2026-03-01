import type { IDockviewPanelProps } from "dockview-react";
import type { ComponentType } from "react";

export interface PanelDefinition {
  id: string;
  title: string;
  component: ComponentType<IDockviewPanelProps>;
}

const registry = new Map<string, PanelDefinition>();

export function registerPanel(def: PanelDefinition) {
  registry.set(def.id, def);
}

export function getPanel(id: string) {
  return registry.get(id);
}

export function getAllPanels() {
  return Array.from(registry.values());
}