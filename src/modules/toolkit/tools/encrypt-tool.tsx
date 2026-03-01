import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

type Algo = "AES-CBC" | "AES-GCM";
type Fmt = "base64" | "hex";

const toHex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
const fromHex = (s: string) => new Uint8Array(s.match(/.{2}/g)!.map(h => parseInt(h, 16)));
const encode = (buf: ArrayBuffer, fmt: Fmt) => fmt === "hex" ? toHex(buf) : btoa(String.fromCharCode(...new Uint8Array(buf)));
const decode = (s: string, fmt: Fmt) => fmt === "hex" ? fromHex(s) : Uint8Array.from(atob(s), c => c.charCodeAt(0));

function padKey(k: string, len: 16 | 32) {
  const b = new TextEncoder().encode(k);
  const p = new Uint8Array(len);
  p.set(b.slice(0, len));
  return p;
}

export function EncryptTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  const [output, setOutput] = useState("");
  const [algo, setAlgo] = useState<Algo>("AES-CBC");
  const [fmt, setFmt] = useState<Fmt>("base64");
  const [keyLen, setKeyLen] = useState<16 | 32>(16);

  const ivLen = algo === "AES-GCM" ? 12 : 16;

  const encrypt = async () => {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(ivLen));
      const ck = await crypto.subtle.importKey("raw", padKey(key, keyLen), algo.split("-")[0] + "-" + algo.split("-")[1], false, ["encrypt"]);
      const enc = await crypto.subtle.encrypt({ name: algo, iv }, ck, new TextEncoder().encode(input));
      const combined = new Uint8Array(ivLen + enc.byteLength);
      combined.set(iv); combined.set(new Uint8Array(enc), ivLen);
      setOutput(encode(combined.buffer, fmt));
    } catch (e) { setOutput(`Error: ${e}`); }
  };

  const decrypt = async () => {
    try {
      const data = decode(input, fmt);
      const iv = data.slice(0, ivLen);
      const ck = await crypto.subtle.importKey("raw", padKey(key, keyLen), algo.split("-")[0] + "-" + algo.split("-")[1], false, ["decrypt"]);
      const dec = await crypto.subtle.decrypt({ name: algo, iv }, ck, data.slice(ivLen));
      setOutput(new TextDecoder().decode(dec));
    } catch (e) { setOutput(`Error: ${e}`); }
  };

  const sel = "px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm";

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center flex-wrap">
        <select value={algo} onChange={e => setAlgo(e.target.value as Algo)} className={sel}>
          <option value="AES-CBC">AES-CBC</option>
          <option value="AES-GCM">AES-GCM</option>
        </select>
        <select value={keyLen} onChange={e => setKeyLen(+e.target.value as 16 | 32)} className={sel}>
          <option value={16}>128-bit</option>
          <option value={32}>256-bit</option>
        </select>
        <select value={fmt} onChange={e => setFmt(e.target.value as Fmt)} className={sel}>
          <option value="base64">Base64</option>
          <option value="hex">Hex</option>
        </select>
      </div>
      <input className="w-full p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        value={key} onChange={e => setKey(e.target.value)} placeholder={t("toolkit.encryptTool.keyPlaceholder")} />
      <div className="flex gap-2">
        <ActionButton onClick={encrypt}>{t("toolkit.encryptTool.encrypt")}</ActionButton>
        <ActionButton onClick={decrypt} variant="secondary">{t("toolkit.encryptTool.decrypt")}</ActionButton>
      </div>
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.encryptTool.inputPlaceholder")} />
      <TextOutput value={output} />
    </div>
  );
}
