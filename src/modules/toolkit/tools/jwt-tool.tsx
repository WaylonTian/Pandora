import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { CopyButton } from "../components/CopyButton";

export function JwtTool() {
  const t = useT();
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
  } catch (e) { error = e instanceof Error ? e.message : "Invalid JWT"; }

  const Section = ({ title, content }: { title: string; content: string }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{title}</span>
        {content && <CopyButton text={content} />}
      </div>
      <pre className="p-3 border border-border rounded-lg bg-muted/30 font-mono text-xs overflow-auto max-h-48">{content || "-"}</pre>
    </div>
  );

  return (
    <div className="space-y-4">
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.jwtTool.placeholder")} rows={3} />
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
