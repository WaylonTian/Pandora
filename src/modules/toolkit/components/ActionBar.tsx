import type { ReactNode } from "react";

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 flex-wrap">{children}</div>;
}

export function ActionButton({ onClick, variant = "primary", disabled, children }: { onClick: () => void; variant?: "primary" | "secondary"; disabled?: boolean; children: ReactNode }) {
  const base = "px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50";
  const styles = variant === "primary" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80";
  return <button onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>{children}</button>;
}
