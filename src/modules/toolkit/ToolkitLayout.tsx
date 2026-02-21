import { useState } from "react";
import { getToolsByCategory, getTools } from "./plugin-interface";

export function ToolkitLayout() {
  const [activeToolId, setActiveToolId] = useState<string>(getTools()[0]?.id || "");
  const grouped = getToolsByCategory();
  const activeTool = getTools().find(t => t.id === activeToolId);
  const ActiveComponent = activeTool?.component;

  const categoryLabels: Record<string, string> = {
    encoding: "编码/解码",
    crypto: "加密/解密",
    network: "网络工具",
    text: "文本工具",
    other: "其他",
  };

  return (
    <div className="flex h-full bg-background text-foreground">
      <div className="w-48 border-r border-border overflow-y-auto p-2 shrink-0">
        {Array.from(grouped.entries()).map(([category, tools]) => (
          <div key={category} className="mb-3">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase">
              {categoryLabels[category] || category}
            </div>
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveToolId(tool.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                  activeToolId === tool.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                }`}
              >
                <span>{tool.icon}</span>
                <span>{tool.name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {ActiveComponent ? <ActiveComponent /> : <div className="text-muted-foreground">Select a tool</div>}
      </div>
    </div>
  );
}