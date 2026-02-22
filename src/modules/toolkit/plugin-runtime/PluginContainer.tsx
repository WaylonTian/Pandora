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
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let url = "";
    (async () => {
      const shim = generateShimScript(plugin.id);
      const mainFile = plugin.manifest.main || "index.html";
      const baseUrl = `plugin://${encodeURIComponent(plugin.id)}/`;

      // Read main HTML
      const htmlBytes: number[] = await invoke("plugin_read_file", { pluginId: plugin.id, path: mainFile });
      let html = new TextDecoder().decode(new Uint8Array(htmlBytes));

      // Read preload if exists
      let preloadCode = "";
      if (plugin.manifest.preload) {
        try {
          const preBytes: number[] = await invoke("plugin_read_file", { pluginId: plugin.id, path: plugin.manifest.preload });
          preloadCode = new TextDecoder().decode(new Uint8Array(preBytes));
        } catch { /* optional */ }
      }

      // Inject base href + shim + preload into <head>
      const injection = `<base href="${baseUrl}"><script>${shim}<\/script>${preloadCode ? `<script>${preloadCode}<\/script>` : ""}`;
      if (html.includes("<head>")) {
        html = html.replace("<head>", `<head>${injection}`);
      } else if (html.includes("<HEAD>")) {
        html = html.replace("<HEAD>", `<HEAD>${injection}`);
      } else {
        html = injection + html;
      }

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      url = URL.createObjectURL(blob);
      setBlobUrl(url);
    })().catch((e) => setError(String(e)));

    return () => { if (url) URL.revokeObjectURL(url); };
  }, [plugin.id]);

  useEffect(() => {
    if (!blobUrl) return;
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
  }, [plugin.id, blobUrl, featureCode]);

  if (error) return <div className="p-4 text-red-500">Failed to load plugin: {error}</div>;
  if (!blobUrl) return <div className="p-4 text-muted-foreground">Loading plugin...</div>;

  return (
    <iframe
      ref={iframeRef}
      src={blobUrl}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      className="w-full border-0 flex-1"
      style={{ minHeight: "200px" }}
      title={plugin.name}
    />
  );
}
