import { useState } from "react";
import { useT } from "@/i18n";
import { diffLines, type Change } from "diff";
import { ActionButton } from "../components/ActionBar";

export function DiffTool() {
  const t = useT();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [result, setResult] = useState<Change[]>([]);

  const compare = () => setResult(diffLines(left, right));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <textarea className="w-full h-48 p-3 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          value={left} onChange={e => setLeft(e.target.value)} placeholder={t("toolkit.diffTool.original")} />
        <textarea className="w-full h-48 p-3 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring"
          value={right} onChange={e => setRight(e.target.value)} placeholder={t("toolkit.diffTool.modified")} />
      </div>
      <ActionButton onClick={compare}>{t("toolkit.diffTool.compare")}</ActionButton>
      {result.length > 0 && (
        <pre className="p-3 border border-border rounded-lg bg-muted/30 font-mono text-sm overflow-auto max-h-96">
          {result.map((c, i) => (
            <span key={i} className={c.added ? "bg-green-500/20 text-green-400" : c.removed ? "bg-red-500/20 text-red-400" : "text-muted-foreground"}>
              {c.value.split("\n").filter((_, j, a) => j < a.length - 1 || _).map((line, j) => (
                <div key={j}>{c.added ? "+ " : c.removed ? "- " : "  "}{line}</div>
              ))}
            </span>
          ))}
        </pre>
      )}
    </div>
  );
}
