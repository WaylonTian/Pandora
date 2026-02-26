import { useState } from "react";
import { useT } from "@/i18n";
import { ResultCard } from "../components/ResultCard";

function toWords(s: string): string[] {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

export function NamingTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const words = toWords(input);
  const results = input ? [
    ["camelCase", words.map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join("")],
    ["PascalCase", words.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("")],
    ["snake_case", words.map(w => w.toLowerCase()).join("_")],
    ["kebab-case", words.map(w => w.toLowerCase()).join("-")],
    ["UPPER_CASE", words.map(w => w.toUpperCase()).join("_")],
  ] : [];

  return (
    <div className="space-y-4">
      <input className="w-full p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("toolkit.namingTool.placeholder")} />
      <div className="space-y-2">{results.map(([label, val]) => <ResultCard key={label} label={label} value={val} />)}</div>
    </div>
  );
}
