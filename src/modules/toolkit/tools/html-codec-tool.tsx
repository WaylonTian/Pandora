import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

export function HtmlCodecTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const encode = () => {
    const el = document.createElement("div");
    el.textContent = input;
    setOutput(el.innerHTML);
  };
  const decode = () => {
    const el = document.createElement("div");
    el.innerHTML = input;
    setOutput(el.textContent || "");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <ActionButton onClick={encode}>{t("toolkit.htmlCodecTool.encode")}</ActionButton>
        <ActionButton onClick={decode} variant="secondary">{t("toolkit.htmlCodecTool.decode")}</ActionButton>
      </div>
      <TextInput value={input} onChange={setInput} />
      <TextOutput value={output} />
    </div>
  );
}
