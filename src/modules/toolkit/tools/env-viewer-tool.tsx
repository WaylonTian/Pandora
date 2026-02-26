import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { invoke } from "@tauri-apps/api/core";
import { ActionButton } from "../components/ActionBar";
import { CopyButton } from "../components/CopyButton";

interface EnvVar { key: string; value: string; }

export function EnvViewerTool() {
  const t = useT();
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setVars(await invoke<EnvVar[]>("toolkit_get_env_vars")); }
    catch (e) { alert(`Error: ${e}`); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = vars.filter(v => !filter || v.key.toLowerCase().includes(filter.toLowerCase()) || v.value.toLowerCase().includes(filter.toLowerCase()));
  const pathVar = vars.find(v => v.key.toLowerCase() === "path");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <input className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted/30 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={filter} onChange={e => setFilter(e.target.value)} placeholder={t("toolkit.envViewerTool.filterPlaceholder")} />
        <ActionButton onClick={load} disabled={loading} variant="secondary">{t("toolkit.envViewerTool.refresh")}</ActionButton>
      </div>
      {pathVar && !filter && (
        <details className="border border-border rounded-lg">
          <summary className="p-2 cursor-pointer text-sm font-medium bg-muted/30 rounded-t-lg">PATH ({pathVar.value.split(";").length} {t("toolkit.envViewerTool.dirs")})</summary>
          <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
            {pathVar.value.split(";").filter(Boolean).map((d, i) => (
              <div key={i} className="font-mono text-xs p-1 bg-muted/20 rounded">{d}</div>
            ))}
          </div>
        </details>
      )}
      <div className="border border-border rounded-lg overflow-auto max-h-[400px]">
        <table className="w-full text-sm">
          <thead><tr className="bg-muted/50 sticky top-0">
            <th className="p-2 text-left w-1/3">{t("toolkit.envViewerTool.key")}</th>
            <th className="p-2 text-left">{t("toolkit.envViewerTool.value")}</th>
          </tr></thead>
          <tbody>{filtered.map((v, i) => (
            <tr key={i} className="border-t border-border hover:bg-muted/30">
              <td className="p-2 font-mono font-semibold text-xs">{v.key}</td>
              <td className="p-2 font-mono text-xs break-all">
                <span className="flex items-center gap-1">{v.value.length > 100 ? v.value.slice(0, 100) + "..." : v.value}<CopyButton text={v.value} /></span>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="text-xs text-muted-foreground">{filtered.length} / {vars.length}</div>
    </div>
  );
}
