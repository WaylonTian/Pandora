import { useState } from "react";
import { useT } from "@/i18n";
import bcrypt from "bcryptjs";
import { ActionButton } from "../components/ActionBar";
import { ResultCard } from "../components/ResultCard";

export function BcryptTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [rounds, setRounds] = useState(10);
  const [hash, setHash] = useState("");
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  const generate = () => { if (input) setHash(bcrypt.hashSync(input, rounds)); };
  const verify = () => { if (input && verifyHash) setVerifyResult(bcrypt.compareSync(input, verifyHash)); };

  const inputCls = "w-full p-2.5 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="space-y-4">
      <input className={inputCls} value={input} onChange={e => setInput(e.target.value)} placeholder={t("toolkit.bcryptTool.inputPlaceholder")} />

      <div className="flex gap-2 items-center">
        <span className="text-sm text-muted-foreground">Rounds:</span>
        <input type="number" min={4} max={16} value={rounds} onChange={e => setRounds(+e.target.value)}
          className="w-20 px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm" />
        <ActionButton onClick={generate}>{t("toolkit.bcryptTool.generate")}</ActionButton>
      </div>
      {hash && <ResultCard label="Bcrypt Hash" value={hash} />}

      <div className="pt-3 border-t border-border space-y-3">
        <div className="text-sm font-medium">{t("toolkit.bcryptTool.verify")}</div>
        <input className={inputCls} value={verifyHash} onChange={e => { setVerifyHash(e.target.value); setVerifyResult(null); }} placeholder={t("toolkit.bcryptTool.hashPlaceholder")} />
        <ActionButton onClick={verify} variant="secondary">{t("toolkit.bcryptTool.verify")}</ActionButton>
        {verifyResult !== null && (
          <div className={`p-3 rounded-lg text-sm font-medium ${verifyResult ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"}`}>
            {verifyResult ? "✅ " + t("toolkit.bcryptTool.match") : "❌ " + t("toolkit.bcryptTool.noMatch")}
          </div>
        )}
      </div>
    </div>
  );
}
