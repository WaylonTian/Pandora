import * as React from "react";
import { cn } from "@/lib/utils";

interface Props {
  top: React.ReactNode;
  bottom: React.ReactNode;
  className?: string;
  defaultTopRatio?: number;
  minTopHeight?: number;
  minBottomHeight?: number;
}

export function ResizableSplit({
  top, bottom, className,
  defaultTopRatio = 0.5,
  minTopHeight = 100,
  minBottomHeight = 100,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [topRatio, setTopRatio] = React.useState(defaultTopRatio);
  const [isResizing, setIsResizing] = React.useState(false);

  React.useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      const y = e.clientY - rect.top;
      const minTop = minTopHeight / totalHeight;
      const maxTop = 1 - minBottomHeight / totalHeight;
      setTopRatio(Math.min(Math.max(y / totalHeight, minTop), maxTop));
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, minTopHeight, minBottomHeight]);

  return (
    <div ref={containerRef} className={cn("flex flex-col h-full w-full overflow-hidden", className)}>
      <div className="overflow-auto" style={{ height: `calc(${topRatio * 100}% - 1.5px)` }}>{top}</div>
      <div
        className={cn("h-[3px] flex-shrink-0 cursor-row-resize transition-colors duration-150",
          isResizing ? "bg-primary/60" : "bg-transparent hover:bg-primary/30")}
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
        role="separator"
        aria-orientation="horizontal"
      />
      <div className="overflow-auto flex-1">{bottom}</div>
    </div>
  );
}
