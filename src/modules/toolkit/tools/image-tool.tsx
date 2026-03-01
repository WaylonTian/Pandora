import { useState } from "react";
import { useT } from "@/i18n";
import { FileDropZone } from "../components/FileDropZone";
import { ResultCard } from "../components/ResultCard";

export function ImageTool() {
  const t = useT();
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState("");

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    const img = new Image();
    img.onload = () => {
      setMeta({
        [t("toolkit.imageTool.name")]: file.name,
        [t("toolkit.imageTool.size")]: `${(file.size / 1024).toFixed(1)} KB`,
        [t("toolkit.imageTool.dimensions")]: `${img.naturalWidth} × ${img.naturalHeight}`,
        [t("toolkit.imageTool.type")]: file.type,
      });
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="space-y-4">
      <FileDropZone onFile={handleFile} accept="image/*" />
      {preview && (
        <>
          <img src={preview} alt="Preview" className="max-h-64 rounded-lg border border-border object-contain" />
          <div className="space-y-2">
            {Object.entries(meta).map(([k, v]) => <ResultCard key={k} label={k} value={v} />)}
          </div>
        </>
      )}
    </div>
  );
}
