import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

export function HexStringTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [sep, setSep] = useState(" ");

  const toHex = () => setOutput(Array.from(new TextEncoder().encode(input)).map(b => b.toString(16).padStart(2, "0")).join(sep));
  const fromHex = () => {
    try {
      const bytes = input.replace(/[^0-9a-fA-F]/g, "").match(/.{1,2}/g)?.map(h => parseInt(h, 16)) || [];
      setOutput(new TextDecoder().decode(new Uint8Array(bytes)));
    } catch { setOutput("Error"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <ActionButton onClick={toHex}>{t("toolkit.hexStringTool.toHex")}</ActionButton>
        <ActionButton onClick={fromHex} variant="secondary">{t("toolkit.hexStringTool.toString")}</ActionButton>
        <select value={sep} onChange={e => setSep(e.target.value)}
          className="px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm ml-auto">
          <option value=" ">{t("toolkit.hexStringTool.sepSpace")}</option>
          <option value="">{t("toolkit.hexStringTool.sepNone")}</option>
          <option value=":">{t("toolkit.hexStringTool.sepColon")}</option>
        </select>
      </div>
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.hexStringTool.inputPlaceholder")} />
      <TextOutput value={output} />
    </div>
  );
}
