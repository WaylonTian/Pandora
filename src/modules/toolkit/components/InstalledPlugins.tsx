import { usePluginStore } from "../stores/plugin-store";
import { useT } from "@/i18n";

export function InstalledPlugins() {
  const t = useT();
  const { installed, uninstall, toggle } = usePluginStore();

  if (installed.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        {t("toolkit.installed.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {installed.map((plugin) => (
        <div key={plugin.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">📦</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{plugin.name}</div>
            <div className="text-xs text-muted-foreground">v{plugin.version}</div>
          </div>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={plugin.enabled} onChange={(e) => toggle(plugin.id, e.target.checked)} className="rounded" />
            <span className="text-xs">{t("toolkit.installed.enabled")}</span>
          </label>
          <button
            onClick={() => uninstall(plugin.id)}
            className="px-2 py-1 rounded text-xs bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            {t("toolkit.installed.uninstall")}
          </button>
        </div>
      ))}
    </div>
  );
}
