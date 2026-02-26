import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

export function TextProcessTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const ops: [string, (s: string) => string][] = [
    [t("toolkit.textProcessTool.uppercase"), s => s.toUpperCase()],
    [t("toolkit.textProcessTool.lowercase"), s => s.toLowerCase()],
    [t("toolkit.textProcessTool.capitalize"), s => s.replace(/\b\w/g, c => c.toUpperCase())],
    [t("toolkit.textProcessTool.dedup"), s => [...new Set(s.split("\n"))].join("\n")],
    [t("toolkit.textProcessTool.sortAsc"), s => s.split("\n").sort().join("\n")],
    [t("toolkit.textProcessTool.sortDesc"), s => s.split("\n").sort().reverse().join("\n")],
    [t("toolkit.textProcessTool.lineNumbers"), s => s.split("\n").map((l, i) => `${i + 1}  ${l}`).join("\n")],
    [t("toolkit.textProcessTool.removeEmpty"), s => s.split("\n").filter(l => l.trim()).join("\n")],
  ];

  const lines = input.split("\n").length;
  const chars = input.length;
  const words = input.trim() ? input.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {ops.map(([label, fn]) => <ActionButton key={label} onClick={() => setOutput(fn(input))} variant="secondary">{label}</ActionButton>)}
      </div>
      <TextInput value={input} onChange={setInput} />
      <TextOutput value={output} />
      <div className="text-xs text-muted-foreground">{chars} chars · {words} words · {lines} lines</div>
    </div>
  );
}
