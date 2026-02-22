import { useState } from "react";
import { useT } from '@/i18n';

export function UrlCodecTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const handleEncode = () => {
    try {
      setOutput(encodeURIComponent(input));
    } catch (e) {
      setOutput(`${t("toolkit.urlCodecTool.encodeError")}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDecode = () => {
    try {
      setOutput(decodeURIComponent(input));
    } catch (e) {
      setOutput(`${t("toolkit.urlCodecTool.decodeError")}: ${e instanceof Error ? e.message : 'Invalid URL encoding'}`);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("toolkit.urlCodecTool.title")}</h2>
      <div className="flex gap-2">
        <button onClick={handleEncode} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.urlCodecTool.encode")}
        </button>
        <button onClick={handleDecode} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.urlCodecTool.decode")}
        </button>
      </div>
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={t("toolkit.urlCodecTool.inputPlaceholder")}
      />
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={output}
        readOnly
        placeholder={t("toolkit.urlCodecTool.outputPlaceholder")}
      />
    </div>
  );
}