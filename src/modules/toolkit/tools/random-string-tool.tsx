import { useState } from "react";
import { useT } from "@/i18n";
import { ActionButton } from "../components/ActionBar";
import { CopyButton } from "../components/CopyButton";

export function RandomStringTool() {
  const t = useT();
  const [length, setLength] = useState(16);
  const [count, setCount] = useState(5);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [digits, setDigits] = useState(true);
  const [special, setSpecial] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const generate = () => {
    let chars = "";
    if (upper) chars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (lower) chars += "abcdefghijklmnopqrstuvwxyz";
    if (digits) chars += "0123456789";
    if (special) chars += "!@#$%^&*()_+-=";
    if (!chars) return;
    const arr = Array.from(crypto.getRandomValues(new Uint32Array(length * count)));
    const res: string[] = [];
    for (let i = 0; i < count; i++) res.push(Array.from({ length }, (_, j) => chars[arr[i * length + j] % chars.length]).join(""));
    setResults(res);
  };

  const Cb = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <label className="text-sm">{t("toolkit.randomStringTool.length")}: <input type="number" value={length} onChange={(e) => setLength(+e.target.value)} className="w-16 px-2 py-1 border border-border rounded bg-muted/30 text-sm" /></label>
        <label className="text-sm">{t("toolkit.randomStringTool.count")}: <input type="number" value={count} onChange={(e) => setCount(+e.target.value)} className="w-16 px-2 py-1 border border-border rounded bg-muted/30 text-sm" /></label>
        <Cb label="A-Z" checked={upper} onChange={setUpper} />
        <Cb label="a-z" checked={lower} onChange={setLower} />
        <Cb label="0-9" checked={digits} onChange={setDigits} />
        <Cb label="!@#$" checked={special} onChange={setSpecial} />
        <ActionButton onClick={generate}>{t("toolkit.randomStringTool.generate")}</ActionButton>
      </div>
      <div className="space-y-1.5">{results.map((r, i) => (
        <div key={i} className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/30">
          <code className="flex-1 font-mono text-sm break-all">{r}</code><CopyButton text={r} />
        </div>
      ))}</div>
    </div>
  );
}
