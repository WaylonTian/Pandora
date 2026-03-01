import { useState } from "react";
import { useT } from "@/i18n";
import { invoke } from "@tauri-apps/api/core";
import { ResultCard } from "../components/ResultCard";
import { ActionButton } from "../components/ActionBar";

function hexToRgb(hex: string) {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m || m.length < 3) return null;
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function ColorTool() {
  const t = useT();
  const [hex, setHex] = useState("#3b82f6");
  const [picking, setPicking] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const rgb = hexToRgb(hex);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;

  const addHistory = (c: string) => setHistory(prev => [c, ...prev.filter(h => h !== c)].slice(0, 20));

  const pick = async () => {
    setPicking(true);
    try { const c = await invoke<string>("plugin_screen_color_pick"); setHex(c); addHistory(c); }
    catch { /* cancelled */ }
    finally { setPicking(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <input type="color" value={hex} onChange={e => { setHex(e.target.value); addHistory(e.target.value); }} className="w-12 h-12 rounded cursor-pointer border-0" />
        <input className="flex-1 px-3 py-2 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={hex} onChange={e => setHex(e.target.value)} placeholder="#000000" />
        <ActionButton onClick={pick} disabled={picking}>{picking ? t("toolkit.colorTool.picking") : t("toolkit.colorTool.pick")}</ActionButton>
      </div>
      {rgb && (
        <div className="space-y-2">
          <div className="w-full h-16 rounded-lg border border-border" style={{ backgroundColor: hex }} />
          <ResultCard label="HEX" value={hex} />
          <ResultCard label="RGB" value={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} />
          {hsl && <ResultCard label="HSL" value={`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`} />}
        </div>
      )}
      {history.length > 0 && (
        <div className="pt-3 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground mb-2">{t("toolkit.colorTool.history")}</div>
          <div className="flex gap-1.5 flex-wrap">
            {history.map((c, i) => <button key={i} onClick={() => setHex(c)} className="w-8 h-8 rounded-md border border-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}
