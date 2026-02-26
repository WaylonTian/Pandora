import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

const TEMPLATES = [
  { key: "email", pattern: "[\\w.-]+@[\\w.-]+\\.\\w+" },
  { key: "phone", pattern: "1[3-9]\\d{9}" },
  { key: "url", pattern: "https?://[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+" },
  { key: "ip", pattern: "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}" },
  { key: "date", pattern: "\\d{4}-\\d{2}-\\d{2}" },
];

export function RegexTool() {
  const t = useT();
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState("g");
  const [input, setInput] = useState("");
  const [replacement, setReplacement] = useState("");
  const [replaceResult, setReplaceResult] = useState("");

  let matches: { text: string; index: number; groups: string[] }[] = [];
  let error = "";
  try {
    if (pattern) {
      const re = new RegExp(pattern, flags);
      let m;
      while ((m = re.exec(input)) !== null) {
        matches.push({ text: m[0], index: m.index, groups: m.slice(1) });
        if (!re.global) break;
      }
    }
  } catch (e) { error = e instanceof Error ? e.message : "Invalid regex"; }

  const doReplace = () => {
    try { setReplaceResult(input.replace(new RegExp(pattern, flags), replacement)); }
    catch (e) { setReplaceResult(`Error: ${e}`); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <span className="text-muted-foreground">/</span>
        <input className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="pattern" />
        <span className="text-muted-foreground">/</span>
        <input className="w-16 px-2 py-2 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={flags} onChange={(e) => setFlags(e.target.value)} placeholder="flags" />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <span className="text-xs text-muted-foreground self-center mr-1">{t("toolkit.regexTool.templates")}:</span>
        {TEMPLATES.map((tpl) => (
          <button key={tpl.key} onClick={() => setPattern(tpl.pattern)}
            className="px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 transition-colors">{t(`toolkit.regexTool.template.${tpl.key}`)}</button>
        ))}
      </div>

      {error && <div className="text-destructive text-sm">{error}</div>}
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.regexTool.inputPlaceholder")} />

      <div className="text-sm font-medium">{matches.length} {t("toolkit.regexTool.matches")}</div>
      {matches.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {matches.map((m, i) => (
            <div key={i} className="p-2 border border-border rounded-lg bg-muted/30 font-mono text-sm">
              <span className="text-primary">{m.text}</span>
              <span className="text-muted-foreground ml-2">@{m.index}</span>
              {m.groups.length > 0 && m.groups.map((g, j) => (
                <span key={j} className="ml-2 text-xs text-muted-foreground">{t("toolkit.regexTool.group")} {j + 1}: {g}</span>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-center pt-2 border-t border-border">
        <input className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder={t("toolkit.regexTool.replacePlaceholder")} />
        <ActionButton onClick={doReplace}>{t("toolkit.regexTool.replace")}</ActionButton>
      </div>
      {replaceResult && <TextOutput value={replaceResult} rows={3} />}
    </div>
  );
}
