import { useState, useEffect } from "react";
import { useT } from '@/i18n';
import { invoke } from "@tauri-apps/api/core";

export function IpInfoTool() {
  const t = useT();
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
      console.error(t("toolkit.ipInfoTool.getIpInfoFailed"), e);
      setLocalIps([]);
      setPublicIp(`${t("toolkit.ipInfoTool.getIpInfoFailed")}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIpInfo();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("toolkit.ipInfoTool.title")}</h2>
      <button
        onClick={loadIpInfo}
        disabled={loading}
        className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
      >
        {loading ? t("toolkit.ipInfoTool.loading") : t("toolkit.ipInfoTool.refresh")}
      </button>
      
      <div className="space-y-3">
        <div>
          <h3 className="font-medium mb-2">{t("toolkit.ipInfoTool.localIpAddresses")}:</h3>
          <div className="space-y-1">
            {localIps.length > 0 ? (
              localIps.map((ip, index) => (
                <div key={index} className="p-2 border rounded bg-muted font-mono text-sm">
                  {ip}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-sm">{t("toolkit.ipInfoTool.noLocalIp")}</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">{t("toolkit.ipInfoTool.publicIpAddress")}:</h3>
          <div className="p-2 border rounded bg-muted font-mono text-sm">
            {publicIp || t("toolkit.ipInfoTool.gettingIp")}
          </div>
        </div>
      </div>
    </div>
  );
}