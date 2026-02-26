import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { CopyButton } from "../components/CopyButton";

function parseCsv(text: string, sep: string) {
  return text.trim().split("\n").map(line => line.split(sep));
}

function toMarkdown(rows: string[][]) {
  if (rows.length === 0) return "";
  const header = `| ${rows[0].join(" | ")} |`;
  const divider = `| ${rows[0].map(() => "---").join(" | ")} |`;
  const body = rows.slice(1).map(r => `| ${r.join(" | ")} |`).join("\n");
  return `${header}\n${divider}\n${body}`;
}

export function CsvTableTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [sep, setSep] = useState(",");
  const rows = input.trim() ? parseCsv(input, sep) : [];
  const md = toMarkdown(rows);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <select value={sep} onChange={e => setSep(e.target.value)}
          className="px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm">
          <option value=",">{t("toolkit.csvTableTool.comma")}</option>
          <option value={"\t"}>Tab</option>
          <option value="|">Pipe</option>
          <option value=";">Semicolon</option>
        </select>
        {md && <CopyButton text={md} />}
        {md && <span className="text-xs text-muted-foreground">{t("toolkit.csvTableTool.copyMarkdown")}</span>}
      </div>
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.csvTableTool.inputPlaceholder")} rows={6} />
      {rows.length > 0 && (
        <div className="border border-border rounded-lg overflow-auto max-h-72">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50">{rows[0].map((h, i) => <th key={i} className="p-2 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((r, i) => (
              <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="p-2">{c}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
