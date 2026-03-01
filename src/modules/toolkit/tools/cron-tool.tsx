import { useState } from "react";
import { useT } from "@/i18n";
import { CronExpressionParser } from "cron-parser";
import { ResultCard } from "../components/ResultCard";

const TEMPLATES = [
  { label: "Every minute", cron: "* * * * *" },
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every day 00:00", cron: "0 0 * * *" },
  { label: "Every Monday 09:00", cron: "0 9 * * 1" },
  { label: "Every month 1st", cron: "0 0 1 * *" },
  { label: "Weekdays 09:00", cron: "0 9 * * 1-5" },
];

export function CronTool() {
  const t = useT();
  const [input, setInput] = useState("0 9 * * 1-5");

  let nextTimes: string[] = [];
  let error = "";
  try {
    if (input.trim()) {
      const interval = CronExpressionParser.parse(input);
      for (let i = 0; i < 10; i++) nextTimes.push(interval.next().toDate().toLocaleString());
    }
  } catch (e) { error = e instanceof Error ? e.message : "Invalid cron"; }

  return (
    <div className="space-y-4">
      <input className="w-full p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        value={input} onChange={e => setInput(e.target.value)} placeholder="* * * * *" />
      <div className="flex gap-1.5 flex-wrap">
        {TEMPLATES.map(tpl => (
          <button key={tpl.cron} onClick={() => setInput(tpl.cron)}
            className="px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 transition-colors">{tpl.label}</button>
        ))}
      </div>
      <ResultCard label={t("toolkit.cronTool.format")} value="┌─ min (0-59)\n│ ┌─ hour (0-23)\n│ │ ┌─ day (1-31)\n│ │ │ ┌─ month (1-12)\n│ │ │ │ ┌─ weekday (0-7)" />
      {error && <div className="text-destructive text-sm">{error}</div>}
      {nextTimes.length > 0 && (
        <div>
          <div className="text-sm font-medium mb-2">{t("toolkit.cronTool.nextRuns")}</div>
          <div className="space-y-1">
            {nextTimes.map((t, i) => (
              <div key={i} className="px-3 py-1.5 border border-border rounded-lg bg-muted/30 font-mono text-sm">
                {i + 1}. {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
