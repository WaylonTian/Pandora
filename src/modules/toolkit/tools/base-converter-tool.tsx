import { useState } from "react";
import { useT } from "@/i18n";
import { ResultCard } from "../components/ResultCard";

const BASES = [
  { label: "BIN (2)", base: 2 },
  { label: "OCT (8)", base: 8 },
  { label: "DEC (10)", base: 10 },
  { label: "HEX (16)", base: 16 },
];

export function BaseConverterTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [fromBase, setFromBase] = useState(10);
  const dec = parseInt(input, fromBase);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <select value={fromBase} onChange={(e) => setFromBase(Number(e.target.value))}
          className="px-2 py-2 border border-border rounded-lg bg-background text-foreground text-sm">
          {BASES.map((b) => <option key={b.base} value={b.base}>{b.label}</option>)}
        </select>
        <input className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("toolkit.baseConverterTool.placeholder")} />
      </div>
      {!isNaN(dec) && input && (
        <div className="space-y-2">
          {BASES.map((b) => <ResultCard key={b.base} label={b.label} value={dec.toString(b.base).toUpperCase()} />)}
        </div>
      )}
    </div>
  );
}
