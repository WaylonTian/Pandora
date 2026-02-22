import { useState } from "react";
import { useT } from "@/i18n";

export function RegexTool() {
  const t = useT();
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [input, setInput] = useState("");

  let matches: { text: string; index: number }[] = [];
  let error = "";
  try {
    if (pattern) {
      const re = new RegExp(pattern, flags);
      let m;
      while ((m = re.exec(input)) !== null) {
        matches.push({ text: m[0], index: m.index });
        if (!re.global) break;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid regex";
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("toolkit.regexTool.title")}</h2>
      <div className="flex gap-2 items-center">
        <span className="text-muted-foreground">/</span>
        <input className="flex-1 px-3 py-2 border rounded bg-background text-foreground font-mono text-sm"
          value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="pattern" />
        <span className="text-muted-foreground">/</span>
        <input className="w-16 px-2 py-2 border rounded bg-background text-foreground font-mono text-sm"
          value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="flags" />
      </div>
      {error && <div className="text-destructive text-sm">{error}</div>}
      <textarea className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("toolkit.regexTool.inputPlaceholder")} />
      <div className="space-y-1">
        <div className="text-sm font-medium">{matches.length} match{matches.length !== 1 ? "es" : ""}</div>
        {matches.map((m, i) => (
          <div key={i} className="p-2 border rounded bg-muted font-mono text-sm">
            <span className="text-primary">{m.text}</span>
            <span className="text-muted-foreground ml-2">at index {m.index}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
