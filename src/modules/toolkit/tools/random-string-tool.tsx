import { useState } from "react";
import { useT } from "@/i18n";
import { ActionButton } from "../components/ActionBar";
import { CopyButton } from "../components/CopyButton";

const CHARSETS = { upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", lower: "abcdefghijklmnopqrstuvwxyz", digits: "0123456789", special: "!@#$%^&*()_+-=[]{}|;:,.<>?" };

function generate(len: number, sets: Record<string, boolean>) {
  let pool = "";
  if (sets.upper) pool += CHARSETS.upper;
  if (sets.lower) pool += CHARSETS.lower;
  if (sets.digits) pool += CHARSETS.digits;
  if (sets.special) pool += CHARSETS.special;
  if (!pool) pool = CHARSETS.lower + CHARSETS.digits;
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => pool[v % pool.length]).join("");
}

export function RandomStringTool() {
  const t = useT();
  const [len, setLen] = useState(32);
  const [count, setCount] = useState(5);
  const [sets, setSets] = useState({ upper: true, lower: true, digits: true, special: false });
  const [results, setResults] = useState<string[]>([]);

  const gen = () => setResults(Array.from({ length: count }, () => generate(len, sets)));
  const toggle = (key: string) => setSets(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <label className="text-sm">{t("toolkit.randomStringTool.length")}:</label>
        <input type="number" min={1} max={256} value={len} onChange={e => setLen(+e.target.value)}
          className="w-20 px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm" />
        <label className="text-sm">{t("toolkit.randomStringTool.count")}:</label>
        <input type="number" min={1} max={50} value={count} onChange={e => setCount(+e.target.value)}
          className="w-20 px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm" />
        <ActionButton onClick={gen}>{t("toolkit.randomStringTool.generate")}</ActionButton>
      </div>
      <div className="flex gap-2 flex-wrap">
        {Object.keys(CHARSETS).map((key) => (
          <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={sets[key as keyof typeof sets]} onChange={() => toggle(key)} className="rounded" />
            {key === "upper" ? "A-Z" : key === "lower" ? "a-z" : key === "digits" ? "0-9" : "!@#"}
          </label>
        ))}
      </div>
      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {results.map((r, i) => (
          <div key={i} className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/30">
            <code className="flex-1 font-mono text-sm break-all">{r}</code>
            <CopyButton text={r} />
          </div>
        ))}
      </div>
    </div>
  );
}
