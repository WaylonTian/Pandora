import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { invoke } from "@tauri-apps/api/core";
import { ActionButton } from "../components/ActionBar";
import { ResultCard } from "../components/ResultCard";

export function IpInfoTool() {
  const t = useT();
  const [localIps, setLocalIps] = useState<string[]>([]);
  const [publicIp, setPublicIp] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [local, pub] = await Promise.all([invoke<string[]>("get_local_ips"), invoke<string>("get_public_ip")]);
      setLocalIps(local); setPublicIp(pub);
    } catch (e) { setPublicIp(`${t("toolkit.ipInfoTool.getIpInfoFailed")}: ${e}`); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <ActionButton onClick={load} disabled={loading}>{loading ? t("toolkit.ipInfoTool.loading") : t("toolkit.ipInfoTool.refresh")}</ActionButton>
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">{t("toolkit.ipInfoTool.localIpAddresses")}</div>
        {localIps.length > 0 ? localIps.map((ip, i) => <ResultCard key={i} label={`#${i + 1}`} value={ip} />) : <div className="text-sm text-muted-foreground">{t("toolkit.ipInfoTool.noLocalIp")}</div>}
        <div className="text-xs font-semibold text-muted-foreground mt-3">{t("toolkit.ipInfoTool.publicIpAddress")}</div>
        <ResultCard label="Public" value={publicIp || t("toolkit.ipInfoTool.gettingIp")} />
      </div>
    </div>
  );
}
