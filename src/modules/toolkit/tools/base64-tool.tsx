import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";
import { FileDropZone } from "../components/FileDropZone";

export function Base64Tool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"text" | "file">("text");

  const encode = () => {
    try {
      const bytes = new TextEncoder().encode(input);
      setOutput(btoa(String.fromCharCode(...bytes)));
    } catch (e) { setOutput(`${t("toolkit.base64Tool.encodeError")}: ${e}`); }
  };

  const decode = () => {
    try {
      const bin = atob(input);
      setOutput(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    } catch (e) { setOutput(`${t("toolkit.base64Tool.decodeError")}: ${e}`); }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1] || "";
      setOutput(base64);
    };
    reader.readAsDataURL(file);
  };

  const Tab = ({ id, label }: { id: "text" | "file"; label: string }) => (
    <button onClick={() => setMode(id)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Tab id="text" label={t("toolkit.base64Tool.title")} />
        <Tab id="file" label={t("toolkit.base64Tool.fileMode")} />
      </div>
      {mode === "text" ? (
        <>
          <div className="flex gap-2">
            <ActionButton onClick={encode}>{t("toolkit.base64Tool.encode")}</ActionButton>
            <ActionButton onClick={decode} variant="secondary">{t("toolkit.base64Tool.decode")}</ActionButton>
          </div>
          <TextInput value={input} onChange={setInput} placeholder={t("toolkit.base64Tool.inputPlaceholder")} />
          <TextOutput value={output} placeholder={t("toolkit.base64Tool.outputPlaceholder")} />
        </>
      ) : (
        <>
          <FileDropZone onFile={handleFile} />
          <TextOutput value={output} placeholder="Base64..." rows={4} />
        </>
      )}
    </div>
  );
}
