import { useState } from "react";
import { useT } from "@/i18n";
import { ActionButton } from "../components/ActionBar";
import { CopyButton } from "../components/CopyButton";

export function UuidTool() {
  const t = useT();
  const [uuids, setUuids] = useState<string[]>([]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <ActionButton onClick={() => setUuids(prev => [crypto.randomUUID(), ...prev])}>{t("toolkit.uuidTool.generateUuid")}</ActionButton>
        <ActionButton onClick={() => setUuids([])} variant="secondary">{t("toolkit.uuidTool.clearAll")}</ActionButton>
      </div>
      <div className="space-y-1.5 max-h-96 overflow-y-auto">
        {uuids.length === 0 ? (
          <div className="text-muted-foreground text-sm">{t("toolkit.uuidTool.clickToGenerate")}</div>
        ) : uuids.map((uuid, i) => (
          <div key={i} className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/30">
            <code className="flex-1 font-mono text-sm">{uuid}</code>
            <CopyButton text={uuid} />
          </div>
        ))}
      </div>
    </div>
  );
}
