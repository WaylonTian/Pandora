import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createPluginBridge, sendPluginEvent } from "./bridge";
import { generateShimScript } from "./utools-shim";
import type { InstalledPlugin } from "./types";

interface Props {
  plugin: InstalledPlugin;
  featureCode?: string;
}

async function readPluginFile(pluginId: string, path: string): Promise<string> {
  const bytes: number[] = await invoke("plugin_read_file", { pluginId, path });
  return new TextDecoder().decode(new Uint8Array(bytes));
}

async function buildSrcdoc(plugin: InstalledPlugin): Promise<string> {
  const shim = generateShimScript(plugin.id);
  const mainFile = plugin.manifest.main || "index.html";
  const html = await readPluginFile(plugin.id, mainFile);

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Inline all <script src="..."> tags
  const scripts = doc.querySelectorAll("script[src]");
  for (const el of scripts) {
    const src = el.getAttribute("src");
    if (src && !src.startsWith("http")) {
      try {
        const code = await readPluginFile(plugin.id, src);
        const inline = doc.createElement("script");
        inline.textContent = code;
        el.replaceWith(inline);
      } catch { /* skip missing files */ }
    }
  }

  // Inline all <link rel="stylesheet" href="...">
  const links = doc.querySelectorAll('link[rel="stylesheet"]');
  for (const el of links) {
    const href = el.getAttribute("href");
    if (href && !href.startsWith("http")) {
      try {
        const css = await readPluginFile(plugin.id, href);
        const style = doc.createElement("style");
        style.textContent = css;
        el.replaceWith(style);
      } catch { /* skip */ }
    }
  }

  // Inject shim as first script in head
  const shimEl = doc.createElement("script");
  shimEl.textContent = shim;
  doc.head.insertBefore(shimEl, doc.head.firstChild);

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export function PluginContainer({ plugin, featureCode }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [srcdoc, setSrcdoc] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    buildSrcdoc(plugin).then(setSrcdoc).catch((e) => setError(String(e)));
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
      className="w-full border-0"
      style={{ height: "100%", minHeight: "200px" }}
      title={plugin.name}
    />
  );
}
