import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { ActionButton } from "../components/ActionBar";
import { ResultCard } from "../components/ResultCard";

const TIMEZONES = [
  { label: "Local", offset: null },
  { label: "UTC", offset: 0 }, { label: "UTC+8", offset: 8 }, { label: "UTC+9", offset: 9 },
  { label: "UTC-5 (EST)", offset: -5 }, { label: "UTC-8 (PST)", offset: -8 }, { label: "UTC+1 (CET)", offset: 1 },
];

export function TimestampTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [now, setNow] = useState(Date.now());
  const [unit, setUnit] = useState<"s" | "ms">("s");
  const [tz, setTz] = useState<number | null>(null);

  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const formatDate = (d: Date) => {
    if (tz === null) return d.toLocaleString();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utc + tz * 3600000).toLocaleString();
  };

  const toDate = () => {
    const n = parseInt(input);
    if (isNaN(n)) { setOutput(t("toolkit.timestampTool.invalidTimestamp")); return; }
    setOutput(formatDate(new Date(input.length <= 10 ? n * 1000 : n)));
  };

  const toTimestamp = () => {
    const d = new Date(input);
    if (isNaN(d.getTime())) { setOutput(t("toolkit.timestampTool.invalidDate")); return; }
    setOutput(unit === "s" ? Math.floor(d.getTime() / 1000).toString() : d.getTime().toString());
  };

  const nowTs = unit === "s" ? Math.floor(now / 1000) : now;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex gap-1">
          {(["s", "ms"] as const).map((u) => (
            <button key={u} onClick={() => setUnit(u)} className={`px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${unit === u ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {u === "s" ? t("toolkit.timestampTool.seconds") : t("toolkit.timestampTool.milliseconds")}
            </button>
          ))}
        </div>
        <select value={tz === null ? "local" : String(tz)} onChange={(e) => setTz(e.target.value === "local" ? null : Number(e.target.value))}
          className="px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm">
          {TIMEZONES.map((z) => <option key={z.label} value={z.offset === null ? "local" : z.offset}>{z.label}</option>)}
        </select>
      </div>

      <ResultCard label={t("toolkit.timestampTool.now")} value={`${nowTs}  →  ${formatDate(new Date(now))}`} />

      <div className="flex gap-2 items-center">
        <input className="flex-1 p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("toolkit.timestampTool.inputPlaceholder")} />
        <ActionButton onClick={toDate}>{t("toolkit.timestampTool.toDate")}</ActionButton>
        <ActionButton onClick={toTimestamp} variant="secondary">{t("toolkit.timestampTool.toTimestamp")}</ActionButton>
      </div>

      {output && <div className="p-3 border border-border rounded-lg bg-muted/30 font-mono text-sm">{output}</div>}
    </div>
  );
}
