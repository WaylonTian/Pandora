import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createPluginBridge, sendPluginEvent } from "./bridge";
import { generateShimScript } from "./utools-shim";
import type { InstalledPlugin } from "./types";

interface Props {
  plugin: InstalledPlugin;
  featureCode?: string;
}

async function readPluginText(pluginId: string, path: string): Promise<string> {
  const bytes: number[] = await invoke("plugin_read_file", { pluginId, path });
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function buildSrcdoc(plugin: InstalledPlugin, preloadCode: string): string {
  const shim = generateShimScript(plugin.id);
  const baseUrl = `plugin://${encodeURIComponent(plugin.id)}/`;

  return `<!DOCTYPE html>
<html><head>
<base href="${baseUrl}">
<script>${shim}<\/script>
${preloadCode ? `<script>${preloadCode}<\/script>` : ""}
</head><body>
<script>
fetch("${baseUrl}${plugin.manifest.main || "index.html"}")
  .then(r => r.text())
  .then(html => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('link[rel="stylesheet"],style').forEach(el => document.head.appendChild(el.cloneNode(true)));
    document.body.innerHTML = doc.body.innerHTML;
    doc.querySelectorAll('script').forEach(el => {
      const s = document.createElement('script');
      if (el.src) s.src = el.src; else s.textContent = el.textContent;
      document.body.appendChild(s);
    });
  });
<\/script></body></html>`;
}

export function PluginContainer({ plugin, featureCode }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [srcdoc, setSrcdoc] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const preloadPath = plugin.manifest.preload;
    if (preloadPath) {
      readPluginText(plugin.id, preloadPath)
        .then((code) => setSrcdoc(buildSrcdoc(plugin, code)))
        .catch((e) => setError(String(e)));
    } else {
      setSrcdoc(buildSrcdoc(plugin, ""));
    }
  }, [plugin.id]);

  useEffect(() => {
    if (!srcdoc) return;
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
  }, [plugin.id, srcdoc, featureCode]);

  if (error) return <div className="p-4 text-red-500">Failed to load plugin: {error}</div>;
  if (!srcdoc) return <div className="p-4 text-muted-foreground">Loading plugin...</div>;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      className="w-full border-0 flex-1"
      style={{ minHeight: "200px" }}
      title={plugin.name}
    />
  );
}
