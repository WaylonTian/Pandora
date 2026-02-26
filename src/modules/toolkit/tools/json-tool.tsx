import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

function queryJsonPath(obj: unknown, path: string): unknown {
  const parts = path.replace(/^\$\.?/, "").split(/\.|\[(\d+)\]/).filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function JsonTool() {
  const t = useT();
  const [tab, setTab] = useState<"format" | "escape" | "jsonpath">("format");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [jsonpath, setJsonpath] = useState("");

  const format = () => { try { setOutput(JSON.stringify(JSON.parse(input), null, 2)); } catch (e) { setOutput(`Error: ${e}`); } };
  const compress = () => { try { setOutput(JSON.stringify(JSON.parse(input))); } catch (e) { setOutput(`Error: ${e}`); } };
  const validate = () => { try { JSON.parse(input); setOutput(t("toolkit.jsonTool.validJson")); } catch (e) { setOutput(`${t("toolkit.jsonTool.invalidJson")}: ${e instanceof Error ? e.message : e}`); } };
  const escape = () => setOutput(JSON.stringify(input));
  const unescape = () => { try { setOutput(JSON.parse(input)); } catch (e) { setOutput(`Error: ${e}`); } };
  const query = () => {
    try {
      const obj = JSON.parse(input);
      const result = queryJsonPath(obj, jsonpath);
      setOutput(typeof result === "object" ? JSON.stringify(result, null, 2) : String(result ?? "undefined"));
    } catch (e) { setOutput(`Error: ${e}`); }
  };

  const Tab = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => setTab(id)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Tab id="format" label={t("toolkit.jsonTool.formatTab")} />
        <Tab id="escape" label={t("toolkit.jsonTool.escapeTab")} />
        <Tab id="jsonpath" label={t("toolkit.jsonTool.jsonpathTab")} />
      </div>
      {tab === "format" && (
        <div className="flex gap-2">
          <ActionButton onClick={format}>{t("toolkit.jsonTool.format")}</ActionButton>
          <ActionButton onClick={compress} variant="secondary">{t("toolkit.jsonTool.compress")}</ActionButton>
          <ActionButton onClick={validate} variant="secondary">{t("toolkit.jsonTool.validate")}</ActionButton>
        </div>
      )}
      {tab === "escape" && (
        <div className="flex gap-2">
          <ActionButton onClick={escape}>{t("toolkit.jsonTool.escape")}</ActionButton>
          <ActionButton onClick={unescape} variant="secondary">{t("toolkit.jsonTool.unescape")}</ActionButton>
        </div>
      )}
      {tab === "jsonpath" && (
        <div className="flex gap-2 items-center">
          <input className="flex-1 p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={jsonpath} onChange={(e) => setJsonpath(e.target.value)} placeholder={t("toolkit.jsonTool.jsonpathPlaceholder")} />
          <ActionButton onClick={query}>{t("toolkit.jsonTool.query")}</ActionButton>
        </div>
      )}
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.jsonTool.inputPlaceholder")} />
      <TextOutput value={output} placeholder={t("toolkit.jsonTool.outputPlaceholder")} />
    </div>
  );
}
