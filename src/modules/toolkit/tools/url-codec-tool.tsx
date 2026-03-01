import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

export function UrlCodecTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const encode = () => { try { setOutput(encodeURIComponent(input)); } catch (e) { setOutput(`${t("toolkit.urlCodecTool.encodeError")}: ${e}`); } };
  const decode = () => { try { setOutput(decodeURIComponent(input)); } catch (e) { setOutput(`${t("toolkit.urlCodecTool.decodeError")}: ${e}`); } };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <ActionButton onClick={encode}>{t("toolkit.urlCodecTool.encode")}</ActionButton>
        <ActionButton onClick={decode} variant="secondary">{t("toolkit.urlCodecTool.decode")}</ActionButton>
      </div>
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.urlCodecTool.inputPlaceholder")} />
      <TextOutput value={output} placeholder={t("toolkit.urlCodecTool.outputPlaceholder")} />
    </div>
  );
}
