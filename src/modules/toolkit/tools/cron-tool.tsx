import { useState } from "react";
import { useT } from "@/i18n";
import { ActionButton } from "../components/ActionBar";

const TEMPLATES = [
  { label: "Every minute", cron: "* * * * *" },
  { label: "Every 5 min", cron: "*/5 * * * *" },
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every day 00:00", cron: "0 0 * * *" },
  { label: "Every Monday", cron: "0 0 * * 1" },
  { label: "Every month 1st", cron: "0 0 1 * *" },
];

const FIELDS = ["Minute (0-59)", "Hour (0-23)", "Day (1-31)", "Month (1-12)", "Weekday (0-6)"];

export function CronTool() {
  const t = useT();
  const [input, setInput] = useState("*/5 * * * *");
  const parts = input.trim().split(/\s+/);

  return (
    <div className="space-y-4">
      <input className="w-full p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("toolkit.cronTool.placeholder")} />
      {parts.length === 5 && (
        <div className="grid grid-cols-5 gap-2">
          {parts.map((p, i) => (
            <div key={i} className="p-2 border border-border rounded-lg bg-muted/30 text-center">
              <div className="font-mono text-lg font-semibold">{p}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{FIELDS[i]}</div>
            </div>
          ))}
        </div>
      )}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">{t("toolkit.cronTool.templates")}</div>
        <div className="flex gap-1.5 flex-wrap">
          {TEMPLATES.map((tpl) => <ActionButton key={tpl.cron} onClick={() => setInput(tpl.cron)} variant="secondary">{tpl.label}</ActionButton>)}
        </div>
      </div>
    </div>
  );
}
