import { useState } from "react";
import { useT } from "@/i18n";
import { ActionButton } from "../components/ActionBar";
import { CopyButton } from "../components/CopyButton";

const CHARSETS = { upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", lower: "abcdefghijklmnopqrstuvwxyz", digits: "0123456789", special: "!@#$%^&*()_+-=[]{}|;:,.<>?" };
const NANOID_ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

function rndStr(len: number, pool: string) {
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => pool[v % pool.length]).join("");
}

export function GeneratorTool() {
  const t = useT();
  const [tab, setTab] = useState<"uuid" | "random" | "nanoid">("uuid");
  const [results, setResults] = useState<string[]>([]);
  const [len, setLen] = useState(32);
  const [count, setCount] = useState(5);
  const [sets, setSets] = useState({ upper: true, lower: true, digits: true, special: false });
  const [nanoLen, setNanoLen] = useState(21);

  const genUuid = () => setResults(prev => [crypto.randomUUID(), ...prev]);
  const genRandom = () => {
    let pool = "";
    for (const [k, v] of Object.entries(CHARSETS)) if (sets[k as keyof typeof sets]) pool += v;
    if (!pool) pool = CHARSETS.lower + CHARSETS.digits;
    setResults(Array.from({ length: count }, () => rndStr(len, pool)));
  };
  const genNanoid = () => setResults(prev => [rndStr(nanoLen, NANOID_ALPHA), ...prev]);

  const Tab = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => { setTab(id); setResults([]); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Tab id="uuid" label="UUID" />
        <Tab id="random" label={t("toolkit.generatorTool.randomTab")} />
        <Tab id="nanoid" label="NanoID" />
      </div>
      {tab === "uuid" && (
        <div className="flex gap-2">
          <ActionButton onClick={genUuid}>{t("toolkit.generatorTool.generate")}</ActionButton>
          <ActionButton onClick={() => setResults([])} variant="secondary">{t("toolkit.generatorTool.clear")}</ActionButton>
        </div>
      )}
      {tab === "random" && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center flex-wrap">
            <label className="text-sm">{t("toolkit.generatorTool.length")}:</label>
            <input type="number" min={1} max={256} value={len} onChange={e => setLen(+e.target.value)} className="w-20 px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm" />
            <label className="text-sm">{t("toolkit.generatorTool.count")}:</label>
            <input type="number" min={1} max={50} value={count} onChange={e => setCount(+e.target.value)} className="w-20 px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm" />
            <ActionButton onClick={genRandom}>{t("toolkit.generatorTool.generate")}</ActionButton>
          </div>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(CHARSETS).map(key => (
              <label key={key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="checkbox" checked={sets[key as keyof typeof sets]} onChange={() => setSets(p => ({ ...p, [key]: !p[key as keyof typeof p] }))} className="rounded" />{key}
              </label>
            ))}
          </div>
        </div>
      )}
      {tab === "nanoid" && (
        <div className="flex gap-2 items-center">
          <label className="text-sm">{t("toolkit.generatorTool.length")}:</label>
          <input type="number" min={1} max={256} value={nanoLen} onChange={e => setNanoLen(+e.target.value)} className="w-20 px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm" />
          <ActionButton onClick={genNanoid}>{t("toolkit.generatorTool.generate")}</ActionButton>
          <ActionButton onClick={() => setResults([])} variant="secondary">{t("toolkit.generatorTool.clear")}</ActionButton>
        </div>
      )}
      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {results.length === 0 ? (
          <div className="text-muted-foreground text-sm">{t("toolkit.generatorTool.hint")}</div>
        ) : results.map((r, i) => (
          <div key={i} className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/30">
            <code className="flex-1 font-mono text-sm truncate">{r}</code>
            <CopyButton text={r} />
          </div>
        ))}
      </div>
    </div>
  );
}