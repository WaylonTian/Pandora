import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

export function EncryptTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  const [output, setOutput] = useState("");

  const padKey = (k: string) => { const b = new TextEncoder().encode(k); const p = new Uint8Array(16); p.set(b.slice(0, 16)); return p; };

  const encrypt = async () => {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(16));
      const ck = await crypto.subtle.importKey("raw", padKey(key), "AES-CBC", false, ["encrypt"]);
      const enc = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, ck, new TextEncoder().encode(input));
      const combined = new Uint8Array(iv.length + enc.byteLength);
      combined.set(iv); combined.set(new Uint8Array(enc), iv.length);
      setOutput(btoa(String.fromCharCode(...combined)));
    } catch (e) { setOutput(`Error: ${e}`); }
  };

  const decrypt = async () => {
    try {
      const data = Uint8Array.from(atob(input), c => c.charCodeAt(0));
      const iv = data.slice(0, 16);
      const ck = await crypto.subtle.importKey("raw", padKey(key), "AES-CBC", false, ["decrypt"]);
      const dec = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, ck, data.slice(16));
      setOutput(new TextDecoder().decode(dec));
    } catch (e) { setOutput(`Error: ${e}`); }
  };

  return (
    <div className="space-y-4">
      <input className="w-full p-2.5 border border-border rounded-lg bg-muted/30 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        value={key} onChange={(e) => setKey(e.target.value)} placeholder={t("toolkit.encryptTool.keyPlaceholder")} />
      <div className="flex gap-2">
        <ActionButton onClick={encrypt}>{t("toolkit.encryptTool.encrypt")}</ActionButton>
        <ActionButton onClick={decrypt} variant="secondary">{t("toolkit.encryptTool.decrypt")}</ActionButton>
      </div>
      <TextInput value={input} onChange={setInput} />
      <TextOutput value={output} />
    </div>
  );
}
