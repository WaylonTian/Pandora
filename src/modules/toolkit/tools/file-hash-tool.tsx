import { useState } from "react";
import { useT } from "@/i18n";
import { md5 } from "js-md5";
import { FileDropZone } from "../components/FileDropZone";
import { ResultCard } from "../components/ResultCard";

const SHA_ALGOS = ["SHA-1", "SHA-256", "SHA-512"];

async function hashBuf(algo: string, buf: ArrayBuffer) {
  const h = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function FileHashTool() {
  const t = useT();
  const [results, setResults] = useState<{ algo: string; hash: string }[]>([]);
  const [fileName, setFileName] = useState("");
  const [verify, setVerify] = useState("");

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const hashes = await Promise.all([
      { algo: "MD5", hash: md5(buf) },
      ...await Promise.all(SHA_ALGOS.map(async a => ({ algo: a, hash: await hashBuf(a, buf) }))),
    ]);
    setResults(hashes);
  };

  const match = verify.trim() && results.some(r => r.hash.toLowerCase() === verify.trim().toLowerCase());

  return (
    <div className="space-y-4">
      <FileDropZone onFile={handleFile} />
      {fileName && <div className="text-sm font-medium">{fileName}</div>}
      {results.length > 0 && (
        <>
          <div className="space-y-2">
            {results.map(r => <ResultCard key={r.algo} label={r.algo} value={r.hash} />)}
          </div>
          <div className="pt-3 border-t border-border">
            <div className="text-sm font-medium mb-2">{t("toolkit.fileHashTool.verify")}</div>
            <input className="w-full p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={verify} onChange={e => setVerify(e.target.value)} placeholder={t("toolkit.fileHashTool.verifyPlaceholder")} />
            {verify.trim() && (
              <div className={`mt-2 p-2 rounded-lg text-sm font-medium ${match ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
                {match ? "✅ " + t("toolkit.fileHashTool.match") : "❌ " + t("toolkit.fileHashTool.noMatch")}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
