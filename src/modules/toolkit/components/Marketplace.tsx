import { useState, useEffect } from "react";
import { useT } from "@/i18n";
import { usePluginStore } from "../stores/plugin-store";

const TOPICS = [
  { id: 17, label: "popular" },
  { id: 6, label: "developer" },
  { id: 2, label: "productivity" },
  { id: 7, label: "ai" },
  { id: 9, label: "media" },
  { id: 13, label: "system" },
];

export function Marketplace() {
  const t = useT();
  const { marketPlugins, marketLoading, installing, installed, searchMarket, loadTopic, installFromMarket } = usePluginStore();
  const installError = usePluginStore((s) => s.installError);
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState(17);

  useEffect(() => { loadTopic(activeTopic); }, [activeTopic]);

  const handleSearch = () => {
    if (query.trim()) searchMarket(query.trim());
    else loadTopic(activeTopic);
  };

  const isInstalled = (name: string) => installed.some((p) => p.name === name);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border rounded bg-background text-foreground text-sm"
          placeholder={t("toolkit.marketplace.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button onClick={handleSearch} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.marketplace.search")}
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            onClick={() => { setActiveTopic(topic.id); setQuery(""); }}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              activeTopic === topic.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            {t(`toolkit.marketplace.topic.${topic.label}`)}
          </button>
        ))}
      </div>

      {installError && (
        <div className="p-2 rounded bg-destructive/10 text-destructive text-sm">{installError}</div>
      )}

      {marketLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {marketPlugins.map((plugin) => (
            <div key={plugin.name} className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
                {plugin.logo ? <img src={plugin.logo} alt="" className="w-10 h-10 rounded-lg" /> : "📦"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{plugin.name}</div>
                <div className="text-xs text-muted-foreground truncate">{plugin.description || plugin.name}</div>
              </div>
              <button
                onClick={() => installFromMarket(plugin.name)}
                disabled={isInstalled(plugin.name) || installing.has(plugin.name)}
                className="px-3 py-1 rounded text-xs font-medium shrink-0 disabled:opacity-50 bg-primary text-primary-foreground"
              >
                {isInstalled(plugin.name) ? t("toolkit.marketplace.installed")
                  : installing.has(plugin.name) ? t("toolkit.marketplace.installing")
                  : t("toolkit.marketplace.install")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
