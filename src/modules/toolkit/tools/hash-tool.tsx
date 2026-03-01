import { useState } from "react";
import { useT } from "@/i18n";
import { md5 } from "js-md5";
import { TextInput } from "../components/TextInput";
import { FileDropZone } from "../components/FileDropZone";
import { ResultCard } from "../components/ResultCard";

const ALGOS = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"];

async function hashBuf(algo: string, buf: ArrayBuffer) {
  if (algo === "MD5") return md5(buf);
  const h = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function HashTool() {
  const t = useT();
  const [mode, setMode] = useState<"text" | "file">("text");
  const [input, setInput] = useState("");
  const [results, setResults] = useState<{ algo: string; hash: string }[]>([]);
  const [fileName, setFileName] = useState("");
  const [verify, setVerify] = useState("");

  const doHash = async (buf: ArrayBuffer) => {
    setResults(await Promise.all(ALGOS.map(async a => ({ algo: a, hash: await hashBuf(a, buf) }))));
  };

  const match = verify.trim() && results.some(r => r.hash.toLowerCase() === verify.trim().toLowerCase());

  const Tab = ({ id, label }: { id: typeof mode; label: string }) => (
    <button onClick={() => { setMode(id); setResults([]); }} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Tab id="text" label={t("toolkit.hashTool.textMode")} />
        <Tab id="file" label={t("toolkit.hashTool.fileMode")} />
      </div>
      {mode === "text" ? (
        <TextInput value={input} onChange={v => { setInput(v); if (v) doHash(new TextEncoder().encode(v)); else setResults([]); }} placeholder={t("toolkit.hashTool.inputPlaceholder")} />
      ) : (
        <>
          <FileDropZone onFile={async f => { setFileName(f.name); doHash(await f.arrayBuffer()); }} />
          {fileName && <div className="text-sm font-medium">{fileName}</div>}
        </>
      )}
      {results.length > 0 && (
        <>
          <div className="space-y-2">{results.map(r => <ResultCard key={r.algo} label={r.algo} value={r.hash} />)}</div>
          <div className="pt-3 border-t border-border">
            <input className="w-full p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={verify} onChange={e => setVerify(e.target.value)} placeholder={t("toolkit.hashTool.verifyPlaceholder")} />
            {verify.trim() && (
              <div className={`mt-2 p-2 rounded-lg text-sm font-medium ${match ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                {match ? "✅ " + t("toolkit.hashTool.match") : "❌ " + t("toolkit.hashTool.noMatch")}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
