import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { ResultCard } from "../components/ResultCard";

export function LineCountTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const lines = input ? input.split("\n") : [];
  const total = lines.length;
  const code = lines.filter(l => l.trim() && !l.trim().startsWith("//") && !l.trim().startsWith("#") && !l.trim().startsWith("--")).length;
  const empty = lines.filter(l => !l.trim()).length;
  const comment = total - code - empty;
  const chars = [...input].length;
  const bytes = new TextEncoder().encode(input).length;

  return (
    <div className="space-y-4">
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.lineCountTool.placeholder")} rows={12} />
      {input && (
        <div className="grid grid-cols-2 gap-2">
          <ResultCard label={t("toolkit.lineCountTool.total")} value={`${total}`} />
          <ResultCard label={t("toolkit.lineCountTool.code")} value={`${code}`} />
          <ResultCard label={t("toolkit.lineCountTool.empty")} value={`${empty}`} />
          <ResultCard label={t("toolkit.lineCountTool.comment")} value={`${comment}`} />
          <ResultCard label={t("toolkit.lineCountTool.chars")} value={`${chars}`} />
          <ResultCard label={t("toolkit.lineCountTool.bytes")} value={`${bytes}`} />
        </div>
      )}
    </div>
  );
}
