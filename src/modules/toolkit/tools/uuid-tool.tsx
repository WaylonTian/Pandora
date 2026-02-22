import { useState } from "react";
import { useT } from '@/i18n';

export function UuidTool() {
  const t = useT();
  const [uuids, setUuids] = useState<string[]>([]);

  const generateUuid = () => {
    const uuid = crypto.randomUUID();
    setUuids(prev => [uuid, ...prev]);
  };

  const copyToClipboard = (uuid: string) => {
    navigator.clipboard.writeText(uuid);
  };

  const clearAll = () => {
    setUuids([]);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("toolkit.uuidTool.title")}</h2>
      <div className="flex gap-2">
        <button onClick={generateUuid} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.uuidTool.generateUuid")}
        </button>
        <button onClick={clearAll} className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm">
          {t("toolkit.uuidTool.clearAll")}
        </button>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {uuids.length === 0 ? (
          <div className="text-muted-foreground text-sm">{t("toolkit.uuidTool.clickToGenerate")}</div>
        ) : (
          uuids.map((uuid, index) => (
            <div key={index} className="flex items-center gap-2 p-2 border rounded bg-muted">
              <code className="flex-1 font-mono text-sm">{uuid}</code>
              <button
                onClick={() => copyToClipboard(uuid)}
                className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs"
              >
                {t("toolkit.uuidTool.copy")}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}