import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { CopyButton } from "../components/CopyButton";

const CTRL_NAMES = ["NUL","SOH","STX","ETX","EOT","ENQ","ACK","BEL","BS","TAB","LF","VT","FF","CR","SO","SI","DLE","DC1","DC2","DC3","DC4","NAK","SYN","ETB","CAN","EM","SUB","ESC","FS","GS","RS","US"];

export function AsciiTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [tab, setTab] = useState<"convert" | "table">("convert");
  const chars = [...input];

  const Tab = ({ id, label }: { id: typeof tab; label: string }) => (
    <button onClick={() => setTab(id)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{label}</button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Tab id="convert" label={t("toolkit.asciiTool.convert")} />
        <Tab id="table" label={t("toolkit.asciiTool.table")} />
      </div>
      {tab === "convert" ? (
        <>
          <TextInput value={input} onChange={setInput} placeholder={t("toolkit.asciiTool.inputPlaceholder")} rows={2} />
          {chars.length > 0 && (
            <div className="border border-border rounded-lg overflow-auto max-h-72">
              <table className="w-full text-sm font-mono">
                <thead><tr className="bg-muted/50 text-xs">
                  <th className="p-2 text-left">Char</th><th className="p-2">Dec</th><th className="p-2">Hex</th><th className="p-2">Oct</th><th className="p-2">Bin</th>
                </tr></thead>
                <tbody>{chars.map((c, i) => {
                  const code = c.codePointAt(0)!;
                  return (<tr key={i} className="border-t border-border">
                    <td className="p-2 font-semibold">{c}</td><td className="p-2 text-center">{code}</td>
                    <td className="p-2 text-center">{code.toString(16).toUpperCase()}</td>
                    <td className="p-2 text-center">{code.toString(8)}</td><td className="p-2 text-center">{code.toString(2).padStart(8, "0")}</td>
                  </tr>);
                })}</tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="border border-border rounded-lg overflow-auto max-h-[500px]">
          <table className="w-full text-xs font-mono">
            <thead><tr className="bg-muted/50 sticky top-0">
              <th className="p-1.5">Dec</th><th className="p-1.5">Hex</th><th className="p-1.5">Char</th>
              <th className="p-1.5 border-l border-border">Dec</th><th className="p-1.5">Hex</th><th className="p-1.5">Char</th>
              <th className="p-1.5 border-l border-border">Dec</th><th className="p-1.5">Hex</th><th className="p-1.5">Char</th>
            </tr></thead>
            <tbody>{Array.from({ length: 43 }, (_, i) => {
              const cols = [i, i + 43, i + 86].filter(c => c < 128);
              return (<tr key={i} className="border-t border-border">{cols.map(c => (
                <><td className={`p-1.5 text-center ${c > 0 && c % 43 === 0 ? "border-l border-border" : ""}`}>{c}</td>
                  <td className="p-1.5 text-center">{c.toString(16).toUpperCase().padStart(2, "0")}</td>
                  <td className="p-1.5 text-center font-semibold">
                    <span className="inline-flex items-center gap-0.5">
                      {c < 32 ? CTRL_NAMES[c] : c === 32 ? "SP" : c === 127 ? "DEL" : String.fromCharCode(c)}
                      <CopyButton text={String.fromCharCode(c)} />
                    </span>
                  </td></>
              ))}</tr>);
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
