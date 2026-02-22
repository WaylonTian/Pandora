import { useEffect, useRef, useState } from "react";
import { createPluginBridge, sendPluginEvent } from "./bridge";
import { generateShimScript } from "./utools-shim";
import type { InstalledPlugin } from "./types";

interface Props {
  plugin: InstalledPlugin;
  featureCode?: string;
}

export function PluginContainer({ plugin, featureCode }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | undefined>();
  useEffect(() => {
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
      onResize: setHeight,
    });
    return cleanup;
  }, [plugin.id, featureCode]);

  const shimScript = generateShimScript(plugin.id);
  const mainFile = plugin.manifest.main || "index.html";
  const pluginBaseUrl = `asset://localhost/plugins/${plugin.id}/`;

  const srcdoc = `<!DOCTYPE html>
<html><head><base href="${pluginBaseUrl}"><script>${shimScript}<\/script></head>
<body><script>
fetch("${pluginBaseUrl}${mainFile}").then(r=>r.text()).then(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('link[rel="stylesheet"],style').forEach(el=>document.head.appendChild(el.cloneNode(true)));
  document.body.innerHTML=doc.body.innerHTML;
  doc.querySelectorAll('script').forEach(el=>{
    const s=document.createElement('script');
    if(el.src)s.src=el.src;else s.textContent=el.textContent;
    document.body.appendChild(s);
  });
});
<\/script></body></html>`;

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      className="w-full border-0"
      style={{ height: height ? `${height}px` : "100%", minHeight: "200px" }}
      title={plugin.name}
    />
  );
}
