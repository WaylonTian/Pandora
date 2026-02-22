import { useState } from "react";
import { useT } from '@/i18n';

export function JsonTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (e) {
      setOutput(`Error: ${e instanceof Error ? e.message : 'Invalid JSON'}`);
    }
  };

  const handleCompress = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
    } catch (e) {
      setOutput(`Error: ${e instanceof Error ? e.message : 'Invalid JSON'}`);
    }
  };

  const handleValidate = () => {
    try {
      JSON.parse(input);
      setOutput(t("toolkit.jsonTool.validJson"));
    } catch (e) {
      setOutput(`${t("toolkit.jsonTool.invalidJson")}: ${e instanceof Error ? e.message : 'Parse error'}`);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("toolkit.jsonTool.title")}</h2>
      <div className="flex gap-2">
        <button onClick={handleFormat} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.jsonTool.format")}
        </button>
        <button onClick={handleCompress} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.jsonTool.compress")}
        </button>
        <button onClick={handleValidate} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.jsonTool.validate")}
        </button>
      </div>
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={t("toolkit.jsonTool.inputPlaceholder")}
      />
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={output}
        readOnly
        placeholder={t("toolkit.jsonTool.outputPlaceholder")}
      />
    </div>
  );
}