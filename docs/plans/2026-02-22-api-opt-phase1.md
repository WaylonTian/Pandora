# Phase 1: Resizable Layout Components

## Task 1: Extract ResizableLayout from DB Manager

**Files:**
- Create: `src/components/ResizableLayout.tsx`
- Modify: `src/modules/db-manager/components/Layout.tsx` (re-export from shared)

**Step 1: Create shared ResizableLayout**

Copy DB Manager's `AppLayout` to `src/components/ResizableLayout.tsx` with minor generalization:

```tsx
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
      />
      <main className="flex-1 overflow-hidden bg-background">
        <div className="h-full overflow-auto">{main}</div>
      </main>
    </div>
  );
}
```

**Step 2: Update DB Manager Layout to re-export**

Replace `src/modules/db-manager/components/Layout.tsx` body with:
```tsx
import { ResizableLayout, type ResizableLayoutProps } from "@/components/ResizableLayout";
export { ResizableLayout as AppLayout };
export type { ResizableLayoutProps as AppLayoutProps };
export default ResizableLayout;
```

**Step 3: Verify DB Manager still works**
```bash
npx tsc --noEmit
```

**Step 4: Commit**
```bash
git add -A && git commit -m "refactor: extract ResizableLayout as shared component"
```

---

## Task 2: Create ResizableSplit (vertical)

**Files:**
- Create: `src/components/ResizableSplit.tsx`

**Step 1: Implement vertical resizable split**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface Props {
  top: React.ReactNode;
  bottom: React.ReactNode;
  className?: string;
  defaultTopRatio?: number; // 0-1, default 0.5
  minTopHeight?: number;    // px
  minBottomHeight?: number; // px
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
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat: add ResizableSplit vertical component"
```

---

## Task 3: Apply resizable layouts to API Tester

**Files:**
- Modify: `src/modules/api-tester/ApiTester.tsx`

**Step 1: Replace fixed sidebar with ResizableLayout**

In `ApiTester.tsx`:
- Import `ResizableLayout` and `ResizableSplit`
- Replace the outer `<div className="app">` structure:
  - Wrap sidebar + main in `<ResizableLayout sidebar={...} main={...} />`
  - Replace `.split-pane` with `<ResizableSplit top={requestPanel} bottom={responsePanel} />`
- Remove `settings.sidebarWidth` usage (ResizableLayout handles it internally)
- Remove `.h-resizer` CSS placeholder

**Step 2: Remove sidebar width from settings store**

In `src/modules/api-tester/stores/settings.ts`, remove `sidebarWidth` if it exists.

**Step 3: Update CSS**

In `api-tester.css`:
- Remove `.app { display: flex }` layout rules (ResizableLayout handles it)
- Remove `.sidebar { width: ... }` rules
- Remove `.split-pane` rules
- Keep all other styling (tabs, buttons, inputs, etc.)

**Step 4: Verify**
```bash
npx tsc --noEmit
```

**Step 5: Commit**
```bash
git add -A && git commit -m "feat(api-tester): apply resizable layouts to sidebar and request/response panels"
```
