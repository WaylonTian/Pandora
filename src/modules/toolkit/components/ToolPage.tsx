import type { ReactNode } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { useToolkitStore } from "../stores/toolkit-store";

export function ToolPage({ toolId, title, onBack, children, noPadding }: { toolId: string; title: string; onBack: () => void; children: ReactNode; noPadding?: boolean }) {
  const { favorites, toggleFavorite } = useToolkitStore();
  const isFav = favorites.includes(toolId);
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /></button>
        <h2 className="text-base font-semibold flex-1">{title}</h2>
        <button onClick={() => toggleFavorite(toolId)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <Star className={`w-4 h-4 ${isFav ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </button>
      </div>
      <div className={`flex-1 min-h-0 ${noPadding ? "flex flex-col" : "overflow-y-auto p-6"}`}>{children}</div>
    </div>
  );
}
