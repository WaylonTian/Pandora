import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { ActionButton } from "../components/ActionBar";

export function DiffTool() {
  const t = useT();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [result, setResult] = useState<{ type: "same" | "add" | "del"; text: string }[]>([]);

  const compare = () => {
    const a = left.split("\n"), b = right.split("\n");
    const res: typeof result = [];
    const max = Math.max(a.length, b.length);
    for (let i = 0; i < max; i++) {
      if (i >= a.length) res.push({ type: "add", text: b[i] });
      else if (i >= b.length) res.push({ type: "del", text: a[i] });
      else if (a[i] === b[i]) res.push({ type: "same", text: a[i] });
      else { res.push({ type: "del", text: a[i] }); res.push({ type: "add", text: b[i] }); }
    }
    setResult(res);
  };

  const colors = { same: "", add: "bg-green-500/10 text-green-700 dark:text-green-400", del: "bg-red-500/10 text-red-700 dark:text-red-400" };
  const prefix = { same: " ", add: "+", del: "-" };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><div className="text-xs text-muted-foreground mb-1">{t("toolkit.diffTool.original")}</div><TextInput value={left} onChange={setLeft} rows={8} /></div>
        <div><div className="text-xs text-muted-foreground mb-1">{t("toolkit.diffTool.modified")}</div><TextInput value={right} onChange={setRight} rows={8} /></div>
      </div>
      <ActionButton onClick={compare}>{t("toolkit.diffTool.compare")}</ActionButton>
      {result.length > 0 && (
        <div className="border border-border rounded-lg overflow-auto font-mono text-sm">
          {result.map((r, i) => <div key={i} className={`px-3 py-0.5 ${colors[r.type]}`}>{prefix[r.type]} {r.text}</div>)}
        </div>
      )}
    </div>
  );
}
