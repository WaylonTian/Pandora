import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { invoke } from "@tauri-apps/api/core";
import { ActionButton } from "../components/ActionBar";

export function HostsEditorTool() {
  const t = useT();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setContent(await invoke<string>("read_hosts_file")); }
    catch (e) { setContent(`# ${t("toolkit.hostsEditorTool.readFailed")}: ${e}`); }
    finally { setLoading(false); }
  };

  const save = async () => {
    try { await invoke("write_hosts_file", { content }); alert(t("toolkit.hostsEditorTool.saveSuccess")); }
    catch (e) { alert(`${t("toolkit.hostsEditorTool.saveFailed")}: ${e}`); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <ActionButton onClick={load} disabled={loading} variant="secondary">{loading ? t("toolkit.hostsEditorTool.loading") : t("toolkit.hostsEditorTool.reload")}</ActionButton>
        <ActionButton onClick={save}>{t("toolkit.hostsEditorTool.save")}</ActionButton>
      </div>
      <div className="text-xs text-muted-foreground">{t("toolkit.hostsEditorTool.adminNote")}</div>
      <textarea className="w-full h-96 p-3 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring"
        value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("toolkit.hostsEditorTool.placeholder")} disabled={loading} />
    </div>
  );
}
