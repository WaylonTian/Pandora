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
  const [ready, setReady] = useState(false);

  // Write shim file to plugin dir, then allow iframe to load
  useEffect(() => {
    const shim = generateShimScript(plugin.id);
    invoke("plugin_write_shim", { pluginId: plugin.id, content: shim })
      .then(() => setReady(true))
      .catch((e) => console.error("Failed to write shim:", e));
  }, [plugin.id]);

  useEffect(() => {
    if (!ready) return;
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
  }, [plugin.id, ready, featureCode]);

  if (!ready) return <div className="p-4 text-muted-foreground">Loading plugin...</div>;

  const src = `plugin://${encodeURIComponent(plugin.id)}/${plugin.manifest.main || "index.html"}?__shim__=1`;

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
