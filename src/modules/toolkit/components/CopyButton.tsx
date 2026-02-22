import { useState } from "react";

export function CopyButton({ text, label = "📋" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="px-2 py-1 rounded text-xs bg-muted hover:bg-muted/80 transition-colors"
      title="Copy"
    >
      {copied ? "✓" : label}
    </button>
  );
}
