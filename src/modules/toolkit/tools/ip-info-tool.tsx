import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function IpInfoTool() {
  const [localIps, setLocalIps] = useState<string[]>([]);
  const [publicIp, setPublicIp] = useState("");
  const [loading, setLoading] = useState(false);

  const loadIpInfo = async () => {
    setLoading(true);
    try {
      const [local, pub] = await Promise.all([
        invoke<string[]>("get_local_ips"),
        invoke<string>("get_public_ip")
      ]);
      setLocalIps(local);
      setPublicIp(pub);
    } catch (e) {
      console.error("获取 IP 信息失败:", e);
      setLocalIps([]);
      setPublicIp(`错误: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIpInfo();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">IP 信息</h2>
      <button
        onClick={loadIpInfo}
        disabled={loading}
        className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
      >
        {loading ? "获取中..." : "刷新"}
      </button>
      
      <div className="space-y-3">
        <div>
          <h3 className="font-medium mb-2">本地 IP 地址:</h3>
          <div className="space-y-1">
            {localIps.length > 0 ? (
              localIps.map((ip, index) => (
                <div key={index} className="p-2 border rounded bg-muted font-mono text-sm">
                  {ip}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-sm">无本地 IP</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">公网 IP 地址:</h3>
          <div className="p-2 border rounded bg-muted font-mono text-sm">
            {publicIp || "获取中..."}
          </div>
        </div>
      </div>
    </div>
  );
}