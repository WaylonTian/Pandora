import { ResultCard } from "../components/ResultCard";

export function EnvViewerTool() {
  const info: [string, string][] = [
    ["Platform", navigator.platform],
    ["Language", navigator.language],
    ["User Agent", navigator.userAgent],
    ["Screen", `${screen.width}×${screen.height}`],
    ["DPR", String(window.devicePixelRatio)],
    ["Cores", String(navigator.hardwareConcurrency || "N/A")],
    ["Online", String(navigator.onLine)],
  ];

  return (
    <div className="space-y-2">
      {info.map(([label, value]) => <ResultCard key={label} label={label} value={value} />)}
    </div>
  );
}
