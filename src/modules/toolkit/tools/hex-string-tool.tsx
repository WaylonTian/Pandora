import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

export function HexStringTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const toHex = () => setOutput(Array.from(input).map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" "));
  const toString = () => {
    try { setOutput(input.replace(/\s/g, "").match(/.{1,2}/g)?.map(h => String.fromCharCode(parseInt(h, 16))).join("") || ""); }
    catch { setOutput("Error"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <ActionButton onClick={toHex}>{t("toolkit.hexStringTool.toHex")}</ActionButton>
        <ActionButton onClick={toString} variant="secondary">{t("toolkit.hexStringTool.toString")}</ActionButton>
      </div>
      <TextInput value={input} onChange={setInput} />
      <TextOutput value={output} />
    </div>
  );
}
