import { useState } from "react";
import { useT } from "@/i18n";
import * as OpenCC from "opencc-js";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

const s2t = OpenCC.Converter({ from: "cn", to: "tw" });
const t2s = OpenCC.Converter({ from: "tw", to: "cn" });

export function ChineseConvertTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <ActionButton onClick={() => setOutput(s2t(input))}>{t("toolkit.chineseConvertTool.toTraditional")}</ActionButton>
        <ActionButton onClick={() => setOutput(t2s(input))} variant="secondary">{t("toolkit.chineseConvertTool.toSimplified")}</ActionButton>
      </div>
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.chineseConvertTool.inputPlaceholder")} rows={6} />
      <TextOutput value={output} rows={6} />
    </div>
  );
}
