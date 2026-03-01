import { useState } from "react";
import { useT } from "@/i18n";
import { invoke } from "@tauri-apps/api/core";
import { ActionButton } from "../components/ActionBar";

interface PortInfo { port: number; pid: number; process_name: string; protocol: string; }

export function PortTool() {
  const t = useT();
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setPorts(await invoke<PortInfo[]>("toolkit_list_ports")); }
    catch (e) { alert(`${t("toolkit.portTool.loadFailed")}: ${e}`); }
    finally { setLoading(false); }
  };

  const kill = async (pid: number) => {
    if (!confirm(t("toolkit.portTool.confirmKill") + ` PID: ${pid}?`)) return;
    try { await invoke("toolkit_kill_process", { pid }); load(); }
    catch (e) { alert(`${t("toolkit.portTool.killFailed")}: ${e}`); }
  };

  const filtered = ports.filter(p =>
    !filter || p.port.toString().includes(filter) || p.process_name.toLowerCase().includes(filter.toLowerCase()) || p.pid.toString().includes(filter)
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <ActionButton onClick={load} disabled={loading}>{loading ? t("toolkit.portTool.scanning") : t("toolkit.portTool.scan")}</ActionButton>
        <input className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted/30 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={filter} onChange={e => setFilter(e.target.value)} placeholder={t("toolkit.portTool.filterPlaceholder")} />
      </div>
      {filtered.length > 0 && (
        <div className="border border-border rounded-lg overflow-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50 sticky top-0">
              <th className="p-2 text-left">{t("toolkit.portTool.port")}</th>
              <th className="p-2 text-left">{t("toolkit.portTool.protocol")}</th>
              <th className="p-2 text-left">PID</th>
              <th className="p-2 text-left">{t("toolkit.portTool.process")}</th>
              <th className="p-2 text-right">{t("toolkit.portTool.action")}</th>
            </tr></thead>
            <tbody>{filtered.map((p, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/30">
                <td className="p-2 font-mono font-semibold">{p.port}</td>
                <td className="p-2 text-muted-foreground">{p.protocol}</td>
                <td className="p-2 font-mono">{p.pid}</td>
                <td className="p-2">{p.process_name}</td>
                <td className="p-2 text-right">
                  {p.pid > 0 && p.pid !== 4 && (
                    <button onClick={() => kill(p.pid)} className="px-2 py-0.5 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                      {t("toolkit.portTool.kill")}
                    </button>
                  )}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {ports.length > 0 && <div className="text-xs text-muted-foreground">{filtered.length} / {ports.length} {t("toolkit.portTool.ports")}</div>}
    </div>
  );
}
