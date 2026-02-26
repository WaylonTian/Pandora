import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useT } from "@/i18n";
import { ActionButton } from "../components/ActionBar";
import { CopyButton } from "../components/CopyButton";

function hexToRgb(hex: string) {
  const m = hex.replace("#", "").match(/.{2}/g);
  return m ? `rgb(${parseInt(m[0], 16)}, ${parseInt(m[1], 16)}, ${parseInt(m[2], 16)})` : "";
}

export function ColorPickerTool() {
  const t = useT();
  const [history, setHistory] = useState<string[]>([]);

  const pick = async () => {
    try {
      const color = await invoke<string>("plugin_screen_color_pick");
      setHistory(prev => [color, ...prev.filter(c => c !== color)].slice(0, 20));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-4">
      <ActionButton onClick={pick}>{t("toolkit.colorPickerTool.pick")}</ActionButton>
      {history.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-2">{t("toolkit.colorPickerTool.history")}</div>
          <div className="space-y-1.5">{history.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-2 border border-border rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded border border-border shrink-0" style={{ backgroundColor: c }} />
              <span className="font-mono text-sm flex-1">{c}</span>
              <span className="text-xs text-muted-foreground">{hexToRgb(c)}</span>
              <CopyButton text={c} />
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}
