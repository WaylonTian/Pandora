import type { ComponentType } from "react";

export type Category = "encoding" | "crypto" | "text" | "generator" | "datetime" | "number" | "network" | "system";

export interface ToolPlugin {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  category: Category;
  component: ComponentType;
}

const tools: ToolPlugin[] = [];

export function registerTool(tool: ToolPlugin) {
  tools.push(tool);
}

export function getTools() {
  return tools;
}

export function getToolsByCategory() {
  const grouped = new Map<string, ToolPlugin[]>();
  for (const tool of tools) {
    const list = grouped.get(tool.category) || [];
    list.push(tool);
    grouped.set(tool.category, list);
  }
  return grouped;
}
