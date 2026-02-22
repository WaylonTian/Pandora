import { useState } from "react";
import { useT } from '@/i18n';

export function CryptoTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const [output, setOutput] = useState("");

  const handleHash = async () => {
    if (!input) {
      setOutput(t("toolkit.cryptoTool.pleaseInputText"));
      return;
    }

    try {
      if (algorithm === "MD5") {
        setOutput(t("toolkit.cryptoTool.md5NotSupported"));
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      setOutput(hashHex);
    } catch (e) {
      setOutput(`${t("toolkit.cryptoTool.hashError")}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("toolkit.cryptoTool.title")}</h2>
      <div className="flex gap-2 items-center">
        <select
          value={algorithm}
          onChange={e => setAlgorithm(e.target.value)}
          className="px-2 py-1 border rounded bg-background text-foreground"
        >
          <option value="SHA-1">SHA-1</option>
          <option value="SHA-256">SHA-256</option>
          <option value="SHA-384">SHA-384</option>
          <option value="SHA-512">SHA-512</option>
          <option value="MD5">{t('toolkit.cryptoTool.md5NotSupportedOption')}</option>
        </select>
        <button onClick={handleHash} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.cryptoTool.generateHash")}
        </button>
      </div>
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={t("toolkit.cryptoTool.inputPlaceholder")}
      />
      <textarea
        className="w-full h-20 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={output}
        readOnly
        placeholder={t("toolkit.cryptoTool.outputPlaceholder")}
      />
    </div>
  );
}