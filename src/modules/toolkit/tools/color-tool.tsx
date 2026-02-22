import { useState } from "react";
import { CopyButton } from "../components/CopyButton";

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
    h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6
      : max === g ? ((b - r) / d + 2) / 6
      : ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function ColorTool() {
  const [input, setInput] = useState("#3b82f6");
  const rgb = hexToRgb(input);
  const hsl = rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
  const rgbStr = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : "";
  const hslStr = hsl ? `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` : "";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Color Converter</h2>
      <div className="flex gap-3 items-center">
        <input type="color" value={input} onChange={(e) => setInput(e.target.value)} className="w-12 h-12 rounded cursor-pointer border-0" />
        <input className="flex-1 px-3 py-2 border rounded bg-background text-foreground font-mono text-sm"
          value={input} onChange={(e) => setInput(e.target.value)} placeholder="#hex" />
      </div>
      {rgb && (
        <div className="space-y-2">
          <div className="w-full h-16 rounded-lg border" style={{ backgroundColor: input }} />
          {[["HEX", input], ["RGB", rgbStr], ["HSL", hslStr]].map(([label, val]) => (
            <div key={label} className="flex items-center gap-2 p-2 border rounded bg-muted font-mono text-sm">
              <span className="flex-1">{label}: {val}</span><CopyButton text={val} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
