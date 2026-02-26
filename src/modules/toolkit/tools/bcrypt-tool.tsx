import { useState } from "react";
import { useT } from "@/i18n";
import { TextInput } from "../components/TextInput";
import { ActionButton } from "../components/ActionBar";

export function BcryptTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");

  return (
    <div className="space-y-4">
      <TextInput value={input} onChange={setInput} rows={2} />
      <ActionButton onClick={() => setMsg(t("toolkit.bcryptTool.comingSoon"))}>{t("toolkit.bcryptTool.title")}</ActionButton>
      {msg && <div className="p-3 border border-border rounded-lg bg-muted/30 text-sm text-muted-foreground">{msg}</div>}
    </div>
  );
}
