import { useState } from "react";
import { useT } from "@/i18n";
import { invoke } from "@tauri-apps/api/core";
import { ActionButton } from "../components/ActionBar";
import { CopyButton } from "../components/CopyButton";

interface ColorRecord { hex: string; rgb: string; time: string; }

export function ColorPickerTool() {
  const t = useT();
  const [colors, setColors] = useState<ColorRecord[]>([]);
  const [picking, setPicking] = useState(false);

  const pick = async () => {
    setPicking(true);
    try {
      const hex = await invoke<string>("plugin_screen_color_pick");
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      setColors(prev => [{ hex, rgb: `rgb(${r}, ${g}, ${b})`, time: new Date().toLocaleTimeString() }, ...prev]);
    } catch (e) { /* user cancelled */ }
    finally { setPicking(false); }
  };

  return (
    <div className="space-y-4">
      <ActionButton onClick={pick} disabled={picking}>{picking ? t("toolkit.colorPickerTool.picking") : t("toolkit.colorPickerTool.pick")}</ActionButton>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {colors.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t("toolkit.colorPickerTool.hint")}</div>
        ) : colors.map((c, i) => (
          <div key={i} className="flex items-center gap-3 p-2 border border-border rounded-lg bg-muted/30">
            <div className="w-10 h-10 rounded-md border border-border shrink-0" style={{ backgroundColor: c.hex }} />
            <div className="flex-1 space-y-0.5">
              <div className="font-mono text-sm font-semibold flex items-center gap-1">{c.hex} <CopyButton text={c.hex} /></div>
              <div className="font-mono text-xs text-muted-foreground">{c.rgb}</div>
            </div>
            <div className="text-xs text-muted-foreground">{c.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
