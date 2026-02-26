import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";
import { CopyButton } from "../components/CopyButton";

type Mode = "unicode" | "html" | "info";

export function UnicodeTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<Mode>("unicode");

  const toUnicode = () => setOutput([...input].map(c => c.codePointAt(0)! > 0xffff ? `\\u{${c.codePointAt(0)!.toString(16)}}` : `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`).join(""));
  const fromUnicode = () => {
    try { setOutput(input.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_, a, b) => String.fromCodePoint(parseInt(a || b, 16)))); }
    catch { setOutput("Error"); }
  };
  const toHtmlEntity = () => setOutput([...input].map(c => `&#${c.codePointAt(0)};`).join(""));
  const fromHtmlEntity = () => {
    try { setOutput(input.replace(/&#(\d+);|&#x([0-9a-fA-F]+);/g, (_, d, h) => String.fromCodePoint(d ? +d : parseInt(h, 16)))); }
    catch { setOutput("Error"); }
  };

  const Tab = ({ id, label }: { id: Mode; label: string }) => (
    <button onClick={() => setMode(id)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  const chars = [...input];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Tab id="unicode" label="Unicode" />
        <Tab id="html" label="HTML Entity" />
        <Tab id="info" label={t("toolkit.unicodeTool.charInfo")} />
      </div>
      <TextInput value={input} onChange={setInput} placeholder="Hello 你好 🎉" />
      {mode === "unicode" && (
        <>
          <div className="flex gap-2">
            <ActionButton onClick={toUnicode}>{t("toolkit.unicodeTool.toUnicode")}</ActionButton>
            <ActionButton onClick={fromUnicode} variant="secondary">{t("toolkit.unicodeTool.fromUnicode")}</ActionButton>
          </div>
          <TextOutput value={output} />
        </>
      )}
      {mode === "html" && (
        <>
          <div className="flex gap-2">
            <ActionButton onClick={toHtmlEntity}>{t("toolkit.unicodeTool.toEntity")}</ActionButton>
            <ActionButton onClick={fromHtmlEntity} variant="secondary">{t("toolkit.unicodeTool.fromEntity")}</ActionButton>
          </div>
          <TextOutput value={output} />
        </>
      )}
      {mode === "info" && chars.length > 0 && (
        <div className="border border-border rounded-lg overflow-auto max-h-72">
          <table className="w-full text-sm font-mono">
            <thead><tr className="bg-muted/50 text-xs">
              <th className="p-2 text-left">{t("toolkit.unicodeTool.char")}</th>
              <th className="p-2">Codepoint</th><th className="p-2">UTF-8</th><th className="p-2">HTML</th>
            </tr></thead>
            <tbody>{chars.map((c, i) => {
              const cp = c.codePointAt(0)!;
              const utf8 = new TextEncoder().encode(c);
              const hex = Array.from(utf8).map(b => b.toString(16).padStart(2, "0")).join(" ");
              return (
                <tr key={i} className="border-t border-border">
                  <td className="p-2 text-lg">{c}</td>
                  <td className="p-2 text-center">U+{cp.toString(16).toUpperCase().padStart(4, "0")}</td>
                  <td className="p-2 text-center">{hex}</td>
                  <td className="p-2 text-center flex items-center justify-center gap-1">
                    <span>{`&#${cp};`}</span><CopyButton text={`&#${cp};`} />
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
