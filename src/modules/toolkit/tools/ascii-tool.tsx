import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";

export function AsciiTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const chars = Array.from(input);

  return (
    <div className="space-y-4">
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.asciiTool.inputPlaceholder")} rows={2} />
      {chars.length > 0 && (
        <div className="border border-border rounded-lg overflow-auto">
          <table className="w-full text-sm font-mono">
            <thead><tr className="bg-muted/50 text-xs">
              <th className="p-2 text-left">Char</th><th className="p-2">Dec</th><th className="p-2">Hex</th><th className="p-2">Oct</th><th className="p-2">Bin</th>
            </tr></thead>
            <tbody>{chars.map((c, i) => {
              const code = c.charCodeAt(0);
              return (<tr key={i} className="border-t border-border">
                <td className="p-2 font-semibold">{c}</td><td className="p-2 text-center">{code}</td>
                <td className="p-2 text-center">{code.toString(16).toUpperCase()}</td>
                <td className="p-2 text-center">{code.toString(8)}</td><td className="p-2 text-center">{code.toString(2).padStart(8, "0")}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
