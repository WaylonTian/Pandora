import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

export function UnicodeTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const toUnicode = () => setOutput(input.split("").map(c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")).join(""));
  const fromUnicode = () => {
    try { setOutput(input.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))); }
    catch { setOutput("Error: Invalid Unicode"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <ActionButton onClick={toUnicode}>{t("toolkit.unicodeTool.toUnicode")}</ActionButton>
        <ActionButton onClick={fromUnicode} variant="secondary">{t("toolkit.unicodeTool.fromUnicode")}</ActionButton>
      </div>
      <TextInput value={input} onChange={setInput} placeholder="Hello 你好" />
      <TextOutput value={output} />
    </div>
  );
}
