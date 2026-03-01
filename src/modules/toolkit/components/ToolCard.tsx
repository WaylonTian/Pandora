import { Star } from "lucide-react";
import type { ToolPlugin } from "../plugin-interface";
import { useT } from "@/i18n";

export function ToolCard({ tool, isFavorite, onToggleFavorite, onClick }: {
  tool: ToolPlugin; isFavorite: boolean; onToggleFavorite: () => void; onClick: () => void;
}) {
  const t = useT();
  const Icon = tool.icon;
  return (
    <div onClick={onClick} className="group relative flex items-start gap-3 p-3 border border-border rounded-xl bg-card hover:bg-accent/50 hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="w-[18px] h-[18px]" /></div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{t(tool.name)}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{t(tool.description)}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={`absolute top-2 right-2 p-1 rounded-md transition-opacity ${isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100"} hover:bg-muted`}>
        <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
      </button>
    </div>
  );
}
