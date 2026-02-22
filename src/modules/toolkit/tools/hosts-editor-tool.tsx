import { useState, useEffect } from "react";
import { useT } from '@/i18n';
import { invoke } from "@tauri-apps/api/core";

export function HostsEditorTool() {
  const t = useT();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadHosts = async () => {
    setLoading(true);
    try {
      const hostsContent = await invoke<string>("read_hosts_file");
      setContent(hostsContent);
    } catch (e) {
      setContent(`# ${t("toolkit.hostsEditorTool.readFailed")}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const saveHosts = async () => {
    setSaving(true);
    try {
      await invoke("write_hosts_file", { content });
      alert(t("toolkit.hostsEditorTool.saveSuccess"));
    } catch (e) {
      alert(`${t("toolkit.hostsEditorTool.saveFailed")}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadHosts();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("toolkit.hostsEditorTool.title")}</h2>
      <div className="flex gap-2">
        <button
          onClick={loadHosts}
          disabled={loading}
          className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm disabled:opacity-50"
        >
          {loading ? t("toolkit.hostsEditorTool.loading") : t("toolkit.hostsEditorTool.reload")}
        </button>
        <button
          onClick={saveHosts}
          disabled={saving}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
        >
          {saving ? t("toolkit.hostsEditorTool.saving") : t("toolkit.hostsEditorTool.save")}
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        {t("toolkit.hostsEditorTool.adminNote")}
      </div>
      <textarea
        className="w-full h-96 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={t("toolkit.hostsEditorTool.placeholder")}
        disabled={loading}
      />
    </div>
  );
}