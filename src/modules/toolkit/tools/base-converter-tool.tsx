import { useState } from "react";
import { CopyButton } from "../components/CopyButton";

const BASES = [
  { label: "BIN (2)", base: 2 },
  { label: "OCT (8)", base: 8 },
  { label: "DEC (10)", base: 10 },
  { label: "HEX (16)", base: 16 },
];

export function BaseConverterTool() {
  const [input, setInput] = useState("");
  const [fromBase, setFromBase] = useState(10);

  const dec = parseInt(input, fromBase);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Base Converter</h2>
      <div className="flex gap-2 items-center">
        <select value={fromBase} onChange={(e) => setFromBase(Number(e.target.value))}
          className="px-2 py-2 border rounded bg-background text-foreground text-sm">
          {BASES.map((b) => <option key={b.base} value={b.base}>{b.label}</option>)}
        </select>
        <input className="flex-1 px-3 py-2 border rounded bg-background text-foreground font-mono text-sm"
          value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter number..." />
      </div>
      {!isNaN(dec) && input && (
        <div className="space-y-2">
          {BASES.map((b) => {
            const val = dec.toString(b.base).toUpperCase();
            return (
              <div key={b.base} className="flex items-center gap-2 p-2 border rounded bg-muted font-mono text-sm">
                <span className="w-16 text-muted-foreground text-xs">{b.label}</span>
                <span className="flex-1">{val}</span>
                <CopyButton text={val} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
