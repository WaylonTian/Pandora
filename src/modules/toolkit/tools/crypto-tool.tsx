import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";
import { FileDropZone } from "../components/FileDropZone";

const ALGOS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];

async function hashData(algo: string, data: ArrayBuffer): Promise<string> {
  const buf = await crypto.subtle.digest(algo, data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function CryptoTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [algo, setAlgo] = useState("SHA-256");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"text" | "file">("text");
  const [fileResult, setFileResult] = useState("");

  const handleHash = async () => {
    if (!input) return;
    try { setOutput(await hashData(algo, new TextEncoder().encode(input))); }
    catch (e) { setOutput(`${t("toolkit.cryptoTool.hashError")}: ${e}`); }
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const results = await Promise.all(ALGOS.map(async (a) => `${a}: ${await hashData(a, buf)}`));
      setFileResult(`${file.name}\n${results.join("\n")}`);
    } catch (e) { setFileResult(`Error: ${e}`); }
  };

  const Tab = ({ id, label }: { id: typeof mode; label: string }) => (
    <button onClick={() => setMode(id)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Tab id="text" label={t("toolkit.cryptoTool.textMode")} />
        <Tab id="file" label={t("toolkit.cryptoTool.fileMode")} />
      </div>
      {mode === "text" ? (
        <>
          <div className="flex gap-2 items-center">
            <select value={algo} onChange={(e) => setAlgo(e.target.value)}
              className="px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm">
              {ALGOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <ActionButton onClick={handleHash}>{t("toolkit.cryptoTool.generateHash")}</ActionButton>
          </div>
          <TextInput value={input} onChange={setInput} placeholder={t("toolkit.cryptoTool.inputPlaceholder")} />
          <TextOutput value={output} placeholder={t("toolkit.cryptoTool.outputPlaceholder")} rows={3} />
        </>
      ) : (
        <>
          <FileDropZone onFile={handleFile} />
          {fileResult && <pre className="p-3 border border-border rounded-lg bg-muted/30 font-mono text-sm whitespace-pre-wrap">{fileResult}</pre>}
        </>
      )}
    </div>
  );
}
