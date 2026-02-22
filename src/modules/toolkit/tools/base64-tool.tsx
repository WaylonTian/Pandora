import { useState } from "react";
import { useT } from '@/i18n';

export function Base64Tool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const handleEncode = () => {
    try {
      setOutput(btoa(input));
    } catch (e) {
      setOutput(`${t("toolkit.base64Tool.encodeError")}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDecode = () => {
    try {
      setOutput(atob(input));
    } catch (e) {
      setOutput(`${t("toolkit.base64Tool.decodeError")}: ${e instanceof Error ? e.message : 'Invalid Base64'}`);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("toolkit.base64Tool.title")}</h2>
      <div className="flex gap-2">
        <button onClick={handleEncode} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.base64Tool.encode")}
        </button>
        <button onClick={handleDecode} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.base64Tool.decode")}
        </button>
      </div>
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={t("toolkit.base64Tool.inputPlaceholder")}
      />
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={output}
        readOnly
        placeholder={t("toolkit.base64Tool.outputPlaceholder")}
      />
    </div>
  );
}