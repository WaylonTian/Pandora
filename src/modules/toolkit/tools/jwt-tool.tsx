import { useState } from "react";
import { CopyButton } from "../components/CopyButton";

export function JwtTool() {
  const [input, setInput] = useState("");

  let header = "", payload = "", signature = "", error = "";
  try {
    if (input.trim()) {
      const parts = input.trim().split(".");
      if (parts.length !== 3) throw new Error("JWT must have 3 parts");
      header = JSON.stringify(JSON.parse(atob(parts[0])), null, 2);
      payload = JSON.stringify(JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))), null, 2);
      signature = parts[2];
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid JWT";
  }

  const Section = ({ title, content }: { title: string; content: string }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{title}</span>
        {content && <CopyButton text={content} />}
      </div>
      <pre className="p-2 border rounded bg-muted font-mono text-xs overflow-auto max-h-48">{content || "-"}</pre>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">JWT Decoder</h2>
      <textarea className="w-full h-24 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste JWT token..." />
      {error && <div className="text-destructive text-sm">{error}</div>}
      {!error && input && (
        <div className="space-y-3">
          <Section title="Header" content={header} />
          <Section title="Payload" content={payload} />
          <Section title="Signature" content={signature} />
        </div>
      )}
    </div>
  );
}
