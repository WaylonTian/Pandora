import { useState } from "react";
import { useT } from "@/i18n";
import { ResultCard } from "../components/ResultCard";

function splitWords(s: string): string[] {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_\-./\\]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

const formats = (words: string[]) => {
  const lower = words.map(w => w.toLowerCase());
  return [
    { label: "camelCase", value: lower.map((w, i) => i === 0 ? w : w[0].toUpperCase() + w.slice(1)).join("") },
    { label: "PascalCase", value: lower.map(w => w[0].toUpperCase() + w.slice(1)).join("") },
    { label: "snake_case", value: lower.join("_") },
    { label: "UPPER_SNAKE", value: lower.join("_").toUpperCase() },
    { label: "kebab-case", value: lower.join("-") },
    { label: "dot.case", value: lower.join(".") },
    { label: "path/case", value: lower.join("/") },
    { label: "Title Case", value: lower.map(w => w[0].toUpperCase() + w.slice(1)).join(" ") },
  ];
};

export function NamingTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const words = splitWords(input);

  return (
    <div className="space-y-4">
      <input className="w-full p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        value={input} onChange={e => setInput(e.target.value)} placeholder={t("toolkit.namingTool.placeholder")} />
      {words.length > 0 && (
        <div className="space-y-2">
          {formats(words).map(f => <ResultCard key={f.label} label={f.label} value={f.value} />)}
        </div>
      )}
    </div>
  );
}
