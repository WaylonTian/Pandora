import { useState } from "react";
import { FileDropZone } from "../components/FileDropZone";

export function ImageTool() {
  const [preview, setPreview] = useState("");
  const [info, setInfo] = useState("");

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      setPreview(src);
      const img = new Image();
      img.onload = () => setInfo(`${file.name} · ${img.width}×${img.height} · ${(file.size / 1024).toFixed(1)} KB`);
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <FileDropZone onFile={handleFile} accept="image/*" />
      {info && <div className="text-sm text-muted-foreground">{info}</div>}
      {preview && <img src={preview} alt="" className="max-w-full max-h-96 rounded-lg border border-border" />}
    </div>
  );
}
