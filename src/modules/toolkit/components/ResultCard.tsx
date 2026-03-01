import { CopyButton } from "./CopyButton";

export function ResultCard({ label, value, copyable = true }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2.5 border border-border rounded-lg bg-muted/30">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="flex-1 font-mono text-sm truncate">{value}</span>
      {copyable && value && <CopyButton text={value} />}
    </div>
  );
}
