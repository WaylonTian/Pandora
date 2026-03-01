import * as React from "react";
import { cn } from "@/lib/utils";

export interface ResizableLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  className?: string;
  defaultSidebarWidth?: number;
  minSidebarWidth?: number;
  maxSidebarWidth?: number;
}

export function ResizableLayout({
  sidebar,
  main,
  className,
  defaultSidebarWidth = 260,
  minSidebarWidth = 180,
  maxSidebarWidth = 500,
}: ResizableLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = React.useState(defaultSidebarWidth);
  const [isResizing, setIsResizing] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  React.useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setSidebarWidth(Math.min(Math.max(e.clientX - rect.left, minSidebarWidth), maxSidebarWidth));
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, minSidebarWidth, maxSidebarWidth]);

  return (
    <div ref={containerRef} className={cn("flex h-full w-full overflow-hidden bg-background text-foreground", className)}>
      <aside className="flex-shrink-0 overflow-hidden border-r border-border bg-card" style={{ width: sidebarWidth }}>
        <div className="h-full overflow-auto scrollbar-thin">{sidebar}</div>
      </aside>
      <div
        className={cn("w-[3px] flex-shrink-0 cursor-col-resize transition-colors duration-150",
          isResizing ? "bg-primary/60" : "bg-transparent hover:bg-primary/30")}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setSidebarWidth((w) => Math.max(w - 10, minSidebarWidth));
          else if (e.key === "ArrowRight") setSidebarWidth((w) => Math.min(w + 10, maxSidebarWidth));
        }}
      />
      <main className="flex-1 overflow-hidden bg-background">
        <div className="h-full overflow-auto">{main}</div>
      </main>
    </div>
  );
}
