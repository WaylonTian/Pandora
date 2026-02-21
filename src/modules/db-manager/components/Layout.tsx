import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppLayoutProps {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  className?: string;
  defaultSidebarWidth?: number;
  minSidebarWidth?: number;
  maxSidebarWidth?: number;
}

const DEFAULT_SIDEBAR_WIDTH = 260;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 500;

export function AppLayout({
  sidebar,
  main,
  className,
  defaultSidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  minSidebarWidth = MIN_SIDEBAR_WIDTH,
  maxSidebarWidth = MAX_SIDEBAR_WIDTH,
}: AppLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = React.useState(defaultSidebarWidth);
  const [isResizing, setIsResizing] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
    },
    []
  );

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      const clampedWidth = Math.min(
        Math.max(newWidth, minSidebarWidth),
        maxSidebarWidth
      );
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, minSidebarWidth, maxSidebarWidth]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-screen w-full overflow-hidden bg-background text-foreground",
        className
      )}
    >
      {/* 侧边栏 */}
      <aside
        className="flex-shrink-0 overflow-hidden border-r border-border bg-card"
        style={{ width: sidebarWidth }}
      >
        <div className="h-full overflow-auto scrollbar-thin">{sidebar}</div>
      </aside>

      {/* 拖拽分隔线 */}
      <div
        className={cn(
          "w-[3px] flex-shrink-0 cursor-col-resize transition-colors duration-150",
          isResizing
            ? "bg-primary/60"
            : "bg-transparent hover:bg-primary/30"
        )}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整侧边栏宽度"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            setSidebarWidth((w) => Math.max(w - 10, minSidebarWidth));
          } else if (e.key === "ArrowRight") {
            setSidebarWidth((w) => Math.min(w + 10, maxSidebarWidth));
          }
        }}
      />

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden bg-background">
        <div className="h-full overflow-auto">{main}</div>
      </main>
    </div>
  );
}

export default AppLayout;
