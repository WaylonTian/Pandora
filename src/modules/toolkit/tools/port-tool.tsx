import { useState } from "react";
import { useT } from "@/i18n";
import { ActionButton } from "../components/ActionBar";

const COMMON_PORTS = [
  { port: 80, service: "HTTP" }, { port: 443, service: "HTTPS" }, { port: 3000, service: "Dev Server" },
  { port: 3306, service: "MySQL" }, { port: 5432, service: "PostgreSQL" }, { port: 6379, service: "Redis" },
  { port: 8080, service: "HTTP Alt" }, { port: 27017, service: "MongoDB" },
];

export function PortTool() {
  const t = useT();
  const [msg, setMsg] = useState("");

  return (
    <div className="space-y-4">
      <ActionButton onClick={() => setMsg(t("toolkit.portTool.comingSoon"))}>{t("toolkit.portTool.title")}</ActionButton>
      {msg && <div className="p-3 border border-border rounded-lg bg-muted/30 text-sm text-muted-foreground">{msg}</div>}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">{t("toolkit.portTool.commonPorts")}</div>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/50"><th className="p-2 text-left">Port</th><th className="p-2 text-left">Service</th></tr></thead>
            <tbody>{COMMON_PORTS.map((p) => <tr key={p.port} className="border-t border-border"><td className="p-2 font-mono">{p.port}</td><td className="p-2">{p.service}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
