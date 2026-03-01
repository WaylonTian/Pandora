export function TextInput({ value, onChange, placeholder, rows = 6, className = "" }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; className?: string }) {
  return <textarea className={`w-full p-3 border border-border rounded-lg bg-muted/30 text-foreground font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
    value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} />;
}
