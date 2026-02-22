import { useState } from "react";
import { useT } from '@/i18n';
import { getToolsByCategory, getTools } from "./plugin-interface";

export function ToolkitLayout() {
  const t = useT();
  const [activeToolId, setActiveToolId] = useState<string>(getTools()[0]?.id || "");
  const grouped = getToolsByCategory();
  const activeTool = getTools().find(item => item.id === activeToolId);
  const ActiveComponent = activeTool?.component;

  const categoryLabels: Record<string, string> = {
    encoding: t("toolkit.encoding"),
    crypto: t("toolkit.crypto"),
    network: t("toolkit.network"),
    text: t("toolkit.text"),
    other: t("toolkit.other"),
  };

  return (
    <div className="flex h-full bg-background text-foreground">
      <div className="w-52 bg-card border-r border-border overflow-y-auto p-4 shrink-0">
        {Array.from(grouped.entries()).map(([category, tools]) => (
          <div key={category} className="mb-4">
            <div className="text-[10px] font-medium text-muted-foreground px-3 py-2 uppercase tracking-wider">
              {categoryLabels[category] || category}
            </div>
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveToolId(tool.id)}
                className={`w-full text-left rounded-md py-2 px-3 font-medium text-sm flex items-center gap-3 transition-colors duration-150 cursor-pointer focus:outline-none ${
                  activeToolId === tool.id
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="w-7 h-7 flex items-center justify-center rounded bg-muted text-xs font-mono">
                  {tool.icon}
                </div>
                <span>{t(tool.name)}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl">
          {ActiveComponent ? <ActiveComponent /> : <div className="text-muted-foreground">{t('toolkit.selectTool')}</div>}
        </div>
      </div>
    </div>
  );
}