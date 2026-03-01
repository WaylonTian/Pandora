import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createPluginBridge, sendPluginEvent } from "./bridge";
import { generateShimScript } from "./utools-shim";
import type { InstalledPlugin } from "./types";

interface Props {
  plugin: InstalledPlugin;
  featureCode?: string;
}

export function PluginContainer({ plugin, featureCode }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up bridge FIRST, before iframe starts loading
    const cleanup = createPluginBridge({
      pluginId: plugin.id,
      iframeRef,
      onReady: () => {
        setTimeout(() => {
          if (iframeRef.current) {
            sendPluginEvent(iframeRef.current, "pluginEnter", {
              code: featureCode || plugin.manifest.features[0]?.code || "",
              type: "text",
              payload: "",
            }, plugin.id);
          }
        }, 50);
      },
      onResize: () => {},
    });

    // Then prepare and load the iframe
    (async () => {
      const port: number = await invoke("plugin_server_port");
      const pathNames = ["home", "desktop", "downloads", "documents", "temp", "appData"];
      const paths: Record<string, string> = {};
      for (const n of pathNames) {
        try { paths[n] = await invoke("plugin_get_path", { name: n }) as string; } catch {}
      }
      const pathsScript = `window.__utoolsPaths = ${JSON.stringify(paths)};\n`;
      const shim = pathsScript + generateShimScript(plugin.id, port, plugin.manifest.features);
      await invoke("plugin_write_shim", { pluginId: plugin.id, content: shim });

      const base = `http://127.0.0.1:${port}/${encodeURIComponent(plugin.id)}`;
      const mainFile = plugin.manifest.main || "index.html";
      setSrc(`${base}/${mainFile}?__inject__=1`);
    })().catch((e) => {
      console.error("Plugin load error:", e);
      setError(String(e.message || e));
    });

    return cleanup;
  }, [plugin.id, featureCode]);

  if (error) return (
    <div className="p-4 text-destructive bg-destructive/10 rounded">
      <div className="font-medium text-sm">插件加载失败</div>
      <div className="text-xs mt-1">{error}</div>
    </div>
  );

  if (!src) return <div className="p-4 text-muted-foreground">Loading plugin...</div>;

  return (
    <iframe
      ref={iframeRef}
      src={src}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      className="w-full border-0"
      style={{ flex: 1, height: 0 }}
      title={plugin.name}
    />
  );
}
