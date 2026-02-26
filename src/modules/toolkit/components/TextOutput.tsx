import { CopyButton } from "./CopyButton";

export function TextOutput({ value, placeholder, rows = 6, className = "" }: { value: string; placeholder?: string; rows?: number; className?: string }) {
  return (
    <div className="relative">
      <textarea className={`w-full p-3 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm resize-y focus:outline-none ${className}`}
        value={value} readOnly placeholder={placeholder} rows={rows} />
      {value && <div className="absolute top-2 right-2"><CopyButton text={value} /></div>}
    </div>
  );
}
