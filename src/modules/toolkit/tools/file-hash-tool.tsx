import { useState } from "react";
import { useT } from "@/i18n";
import { FileDropZone } from "../components/FileDropZone";
import { ResultCard } from "../components/ResultCard";

export function FileHashTool() {
  const t = useT();
  const [hashes, setHashes] = useState<[string, string][]>([]);
  const [verify, setVerify] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = async (file: File) => {
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    const algos: [string, string][] = [["SHA-1", "SHA-1"], ["SHA-256", "SHA-256"], ["SHA-512", "SHA-512"]];
    const results: [string, string][] = [];
    for (const [name, algo] of algos) {
      const hash = await crypto.subtle.digest(algo, buf);
      results.push([name, Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("")]);
    }
    setHashes(results);
  };

  const match = verify.trim() ? hashes.some(([, h]) => h.toLowerCase() === verify.trim().toLowerCase()) : null;

  return (
    <div className="space-y-4">
      <FileDropZone onFile={handleFile} />
      {fileName && <div className="text-sm font-medium">{fileName}</div>}
      <div className="space-y-2">{hashes.map(([name, hash]) => <ResultCard key={name} label={name} value={hash} />)}</div>
      {hashes.length > 0 && (
        <div>
          <input className="w-full p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={verify} onChange={(e) => setVerify(e.target.value)} placeholder={t("toolkit.fileHashTool.verifyPlaceholder")} />
          {match !== null && <div className={`mt-2 text-sm font-medium ${match ? "text-green-500" : "text-red-500"}`}>{match ? "✓ Match!" : "✗ No match"}</div>}
        </div>
      )}
    </div>
  );
}
