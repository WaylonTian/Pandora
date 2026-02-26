import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { useT } from "@/i18n";

export function FileDropZone({ onFile, accept, children }: { onFile: (file: File) => void; accept?: string; children?: React.ReactNode }) {
  const t = useT();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"}`}>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      {children || <div className="flex flex-col items-center gap-2 text-muted-foreground"><Upload className="w-8 h-8" /><span className="text-sm">{t("toolkit.dropFile")}</span></div>}
    </div>
  );
}
