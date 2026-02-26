import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

type Op = "upper" | "lower" | "capitalize" | "dedup" | "sort" | "lineNum" | "trimEmpty" | "stats" | "punctuation";

export function TextProcessTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const apply = (op: Op) => {
    const lines = input.split("\n");
    switch (op) {
      case "upper": return setOutput(input.toUpperCase());
      case "lower": return setOutput(input.toLowerCase());
      case "capitalize": return setOutput(input.replace(/\b\w/g, c => c.toUpperCase()));
      case "dedup": return setOutput([...new Set(lines)].join("\n"));
      case "sort": return setOutput([...lines].sort().join("\n"));
      case "lineNum": return setOutput(lines.map((l, i) => `${i + 1}  ${l}`).join("\n"));
      case "trimEmpty": return setOutput(lines.filter(l => l.trim()).join("\n"));
      case "punctuation": {
        const map: Record<string, string> = { "，": ",", "。": ".", "！": "!", "？": "?", "；": ";", "：": ":", "\u201c": '"', "\u201d": '"', "\u2018": "'", "\u2019": "'", "（": "(", "）": ")", "【": "[", "】": "]" };
        return setOutput([...input].map(c => map[c] || c).join(""));
      }
      case "stats": {
        const chars = [...input].length, bytes = new TextEncoder().encode(input).length;
        const words = input.trim().split(/\s+/).filter(Boolean).length;
        const ln = lines.length, empty = lines.filter(l => !l.trim()).length;
        return setOutput(`${t("toolkit.textProcessTool.chars")}: ${chars}\n${t("toolkit.textProcessTool.bytes")}: ${bytes}\n${t("toolkit.textProcessTool.words")}: ${words}\n${t("toolkit.textProcessTool.lines")}: ${ln}\n${t("toolkit.textProcessTool.emptyLines")}: ${empty}`);
      }
    }
  };

  const ops: { id: Op; label: string }[] = [
    { id: "upper", label: "ABC" }, { id: "lower", label: "abc" }, { id: "capitalize", label: "Abc" },
    { id: "dedup", label: t("toolkit.textProcessTool.dedup") }, { id: "sort", label: t("toolkit.textProcessTool.sort") },
    { id: "lineNum", label: t("toolkit.textProcessTool.lineNum") }, { id: "trimEmpty", label: t("toolkit.textProcessTool.trimEmpty") },
    { id: "punctuation", label: t("toolkit.textProcessTool.punctuation") }, { id: "stats", label: t("toolkit.textProcessTool.stats") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {ops.map(o => <ActionButton key={o.id} onClick={() => apply(o.id)} variant="secondary">{o.label}</ActionButton>)}
      </div>
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.textProcessTool.inputPlaceholder")} rows={8} />
      <TextOutput value={output} rows={8} />
    </div>
  );
}
