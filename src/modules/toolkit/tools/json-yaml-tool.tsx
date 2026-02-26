import { useState } from "react";
import { useT } from "@/i18n";
import YAML from "yaml";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

export function JsonYamlTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const toYaml = () => { try { setOutput(YAML.stringify(JSON.parse(input))); } catch (e) { setOutput(`Error: ${e}`); } };
  const toJson = () => { try { setOutput(JSON.stringify(YAML.parse(input), null, 2)); } catch (e) { setOutput(`Error: ${e}`); } };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <ActionButton onClick={toYaml}>JSON → YAML</ActionButton>
        <ActionButton onClick={toJson} variant="secondary">YAML → JSON</ActionButton>
      </div>
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.jsonYamlTool.inputPlaceholder")} rows={10} />
      <TextOutput value={output} rows={10} />
    </div>
  );
}
