import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function HostsEditorTool() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadHosts = async () => {
    setLoading(true);
    try {
      const hostsContent = await invoke<string>("read_hosts_file");
      setContent(hostsContent);
    } catch (e) {
      setContent(`# 读取 hosts 文件失败: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const saveHosts = async () => {
    setSaving(true);
    try {
      await invoke("write_hosts_file", { content });
      alert("Hosts 文件保存成功");
    } catch (e) {
      alert(`保存失败: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadHosts();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Hosts 文件编辑器</h2>
      <div className="flex gap-2">
        <button
          onClick={loadHosts}
          disabled={loading}
          className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm disabled:opacity-50"
        >
          {loading ? "加载中..." : "重新加载"}
        </button>
        <button
          onClick={saveHosts}
          disabled={saving}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        注意: 修改 hosts 文件可能需要管理员权限
      </div>
      <textarea
        className="w-full h-96 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Hosts 文件内容..."
        disabled={loading}
      />
    </div>
  );
}