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

  useEffect(() => {
    (async () => {
      const port: number = await invoke("plugin_server_port");
      // Pre-fetch paths for sync getPath API
      const pathNames = ["home", "desktop", "downloads", "documents", "temp", "appData"];
      const paths: Record<string, string> = {};
      for (const n of pathNames) {
        try { paths[n] = await invoke("plugin_get_path", { name: n }) as string; } catch {}
      }
      const pathsScript = `window.__utoolsPaths = ${JSON.stringify(paths)};\n`;
      const shim = pathsScript + generateShimScript(plugin.id, port);
      await invoke("plugin_write_shim", { pluginId: plugin.id, content: shim });

      const base = `http://127.0.0.1:${port}/${encodeURIComponent(plugin.id)}`;
      const mainFile = plugin.manifest.main || "index.html";
      // Direct iframe src — server injects shim + preload into HTML
      setSrc(`${base}/${mainFile}?__inject__=1`);
    })().catch((e) => console.error("Plugin load error:", e));
  }, [plugin.id]);

  useEffect(() => {
    if (!src) return;
    const cleanup = createPluginBridge({
      pluginId: plugin.id,
      onReady: () => {
        if (iframeRef.current) {
          sendPluginEvent(iframeRef.current, "pluginEnter", {
            code: featureCode || plugin.manifest.features[0]?.code || "",
            type: "text",
            payload: "",
          }, plugin.id);
        }
      },
      onResize: () => {},
    });
    return cleanup;
  }, [plugin.id, src, featureCode]);

  if (!src) return <div className="p-4 text-muted-foreground">Loading plugin...</div>;

  return (
    <iframe
      ref={iframeRef}
      src={src}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      className="w-full border-0 flex-1"
      style={{ minHeight: "200px" }}
      title={plugin.name}
    />
  );
}
