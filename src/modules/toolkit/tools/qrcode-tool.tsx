import { useState, useRef } from "react";
import { useT } from "@/i18n";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { TextInput } from "../components/TextInput";
import { ActionButton } from "../components/ActionBar";
import { ResultCard } from "../components/ResultCard";

export function QrcodeTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [imgSrc, setImgSrc] = useState("");
  const [decoded, setDecoded] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = async () => {
    if (!input) return;
    try { setImgSrc(await QRCode.toDataURL(input, { width: 300, margin: 2 })); }
    catch (e) { setImgSrc(""); }
  };

  const download = () => {
    if (!imgSrc) return;
    const a = document.createElement("a");
    a.href = imgSrc; a.download = "qrcode.png"; a.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const result = jsQR(imageData.data, img.width, img.height);
      setDecoded(result ? result.data : t("toolkit.qrcodeTool.decodeFailed"));
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.qrcodeTool.inputPlaceholder")} rows={3} />
      <div className="flex gap-2">
        <ActionButton onClick={generate}>{t("toolkit.qrcodeTool.generate")}</ActionButton>
        {imgSrc && <ActionButton onClick={download} variant="secondary">{t("toolkit.qrcodeTool.download")}</ActionButton>}
      </div>
      {imgSrc && <img src={imgSrc} alt="QR Code" className="rounded-lg border border-border" />}

      <div className="pt-3 border-t border-border space-y-3">
        <div className="text-sm font-medium">{t("toolkit.qrcodeTool.decode")}</div>
        <input type="file" accept="image/*" onChange={handleFile}
          className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:text-sm file:cursor-pointer" />
        {decoded && <ResultCard label={t("toolkit.qrcodeTool.result")} value={decoded} />}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
