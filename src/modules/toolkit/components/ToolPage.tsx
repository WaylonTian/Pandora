import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function ToolPage({ title, onBack, children, noPadding }: { title: string; onBack: () => void; children: ReactNode; noPadding?: boolean }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /></button>
        <h2 className="text-base font-semibold flex-1">{title}</h2>
      </div>
      <div className={`flex-1 min-h-0 ${noPadding ? "flex flex-col" : "overflow-y-auto p-6"}`}>{children}</div>
    </div>
  );
}
