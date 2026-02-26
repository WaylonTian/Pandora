import { useState } from "react";
import { useT } from "@/i18n";
import { format as sqlFormat } from "sql-formatter";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

export function SqlFormatTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [lang, setLang] = useState<"sql" | "mysql" | "postgresql">("sql");

  const doFormat = () => { try { setOutput(sqlFormat(input, { language: lang })); } catch (e) { setOutput(`Error: ${e}`); } };
  const doMinify = () => { try { setOutput(sqlFormat(input, { language: lang }).replace(/\s+/g, " ").trim()); } catch (e) { setOutput(`Error: ${e}`); } };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <select value={lang} onChange={e => setLang(e.target.value as typeof lang)}
          className="px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm">
          <option value="sql">SQL</option><option value="mysql">MySQL</option><option value="postgresql">PostgreSQL</option>
        </select>
        <ActionButton onClick={doFormat}>{t("toolkit.sqlFormatTool.format")}</ActionButton>
        <ActionButton onClick={doMinify} variant="secondary">{t("toolkit.sqlFormatTool.minify")}</ActionButton>
      </div>
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.sqlFormatTool.inputPlaceholder")} rows={8} />
      <TextOutput value={output} rows={8} />
    </div>
  );
}
