import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore, type QueryTab } from "../store";

export interface TabBarProps {
  className?: string;
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function QueryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

// ============================================================================
// Context Menu
// ============================================================================

interface ContextMenuProps {
  x: number;
  y: number;
  tabId: string;
  onClose: () => void;
  onCloseTab: (id: string) => void;
  onCloseOthers: (id: string) => void;
  onCloseAll: () => void;
  onCloseRight: (id: string) => void;
}

function ContextMenu({ x, y, tabId, onClose, onCloseTab, onCloseOthers, onCloseAll, onCloseRight }: ContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items = [
    { label: "关闭", action: () => onCloseTab(tabId) },
    { label: "关闭其他", action: () => onCloseOthers(tabId) },
    { label: "关闭右侧", action: () => onCloseRight(tabId) },
    { label: "关闭全部", action: () => onCloseAll() },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg animate-fade-in"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          className="flex w-full items-center rounded-md px-2.5 py-1.5 text-xs text-popover-foreground hover:bg-accent cursor-pointer transition-colors"
          onClick={() => { item.action(); onClose(); }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Tab List Dropdown (shows all tabs when overflow)
// ============================================================================

interface TabListDropdownProps {
  tabs: QueryTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

function TabListDropdown({ tabs, activeTabId, onSelect, onClose }: TabListDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex h-9 w-8 flex-shrink-0 items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground cursor-pointer transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        title={`${tabs.length} 个标签页`}
      >
        <ChevronDownIcon className="h-3.5 w-3.5" />
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
          {tabs.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 max-h-80 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg animate-fade-in scrollbar-thin">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs cursor-pointer transition-colors",
                tab.id === activeTabId
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-popover-foreground hover:bg-accent/50"
              )}
              onClick={() => { onSelect(tab.id); setIsOpen(false); }}
            >
              {tab.isExecuting ? (
                <LoadingSpinner className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              ) : tab.type === "query" ? (
                <QueryIcon className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <TableIcon className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="flex-1 truncate">{tab.title}</span>
              <button
                className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/15 hover:text-destructive cursor-pointer transition-all"
                onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                aria-label={`关闭 ${tab.title}`}
              >
                <CloseIcon className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Tab Item
// ============================================================================

interface TabItemProps {
  tab: QueryTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function TabItem({ tab, isActive, onSelect, onClose, onContextMenu }: TabItemProps) {
  const tabIcon = tab.type === "query" ? (
    <QueryIcon className="h-3.5 w-3.5 flex-shrink-0" />
  ) : (
    <TableIcon className="h-3.5 w-3.5 flex-shrink-0" />
  );

  return (
    <div
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      className={cn(
        "group relative flex h-9 min-w-[120px] max-w-[180px] cursor-pointer items-center gap-2 px-3 transition-all duration-200",
        isActive
          ? "bg-background text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); }
      }}
      onAuxClick={(e) => {
        if (e.button === 1) onClose(e);
      }}
    >
      {isActive && (
        <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-primary" />
      )}
      {!isActive && (
        <div className="absolute right-0 top-2 bottom-2 w-px bg-border" />
      )}

      {tab.isExecuting ? (
        <LoadingSpinner className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
      ) : tabIcon}

      <span className="flex-1 truncate text-xs font-medium">{tab.title}</span>

      <button
        type="button"
        className={cn(
          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md transition-all duration-150",
          "opacity-0 group-hover:opacity-100",
          isActive && "opacity-60",
          "hover:bg-destructive/15 hover:text-destructive hover:opacity-100 cursor-pointer"
        )}
        onClick={onClose}
        aria-label={`关闭 ${tab.title}`}
        tabIndex={-1}
      >
        <CloseIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

// ============================================================================
// Main TabBar
// ============================================================================

export function TabBar({ className }: TabBarProps) {
  const tabs = useAppStore((state) => state.tabs);
  const activeTabId = useAppStore((state) => state.activeTabId);
  const addQueryTab = useAppStore((state) => state.addQueryTab);
  const closeQueryTab = useAppStore((state) => state.closeQueryTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  const tabsContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; tabId: string } | null>(null);

  const checkScrollState = React.useCallback(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    checkScrollState();
    container.addEventListener("scroll", checkScrollState);
    window.addEventListener("resize", checkScrollState);
    return () => {
      container.removeEventListener("scroll", checkScrollState);
      window.removeEventListener("resize", checkScrollState);
    };
  }, [checkScrollState, tabs.length]);

  // 自动滚动到激活的 tab
  React.useEffect(() => {
    if (!activeTabId || !tabsContainerRef.current) return;
    const container = tabsContainerRef.current;
    const activeEl = container.querySelector('[aria-selected="true"]') as HTMLElement | null;
    if (activeEl) {
      const { left: cLeft, right: cRight } = container.getBoundingClientRect();
      const { left: tLeft, right: tRight } = activeEl.getBoundingClientRect();
      if (tLeft < cLeft) activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
      else if (tRight > cRight) activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
    }
  }, [activeTabId]);

  const scrollLeft = React.useCallback(() => {
    tabsContainerRef.current?.scrollBy({ left: -150, behavior: "smooth" });
  }, []);

  const scrollRight = React.useCallback(() => {
    tabsContainerRef.current?.scrollBy({ left: 150, behavior: "smooth" });
  }, []);

  const handleSelectTab = React.useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, [setActiveTab]);

  const handleCloseTab = React.useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeQueryTab(tabId);
  }, [closeQueryTab]);

  const handleCloseOthers = React.useCallback((tabId: string) => {
    tabs.forEach((t) => { if (t.id !== tabId) closeQueryTab(t.id); });
    setActiveTab(tabId);
  }, [tabs, closeQueryTab, setActiveTab]);

  const handleCloseRight = React.useCallback((tabId: string) => {
    const idx = tabs.findIndex((t) => t.id === tabId);
    tabs.slice(idx + 1).forEach((t) => closeQueryTab(t.id));
  }, [tabs, closeQueryTab]);

  const handleCloseAll = React.useCallback(() => {
    tabs.forEach((t) => closeQueryTab(t.id));
  }, [tabs, closeQueryTab]);

  const handleNewTab = React.useCallback(() => {
    addQueryTab();
    setTimeout(() => {
      tabsContainerRef.current?.scrollTo({
        left: tabsContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
    }, 0);
  }, [addQueryTab]);

  const handleContextMenu = React.useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabId });
  }, []);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
    if (e.key === "ArrowLeft" && currentIndex > 0) {
      e.preventDefault();
      setActiveTab(tabs[currentIndex - 1].id);
    } else if (e.key === "ArrowRight" && currentIndex < tabs.length - 1) {
      e.preventDefault();
      setActiveTab(tabs[currentIndex + 1].id);
    }
  }, [tabs, activeTabId, setActiveTab]);

  const hasOverflow = canScrollLeft || canScrollRight;

  return (
    <div
      className={cn("flex h-9 w-full items-stretch bg-card/50", className)}
      role="tablist"
      aria-label="查询标签页"
      onKeyDown={handleKeyDown}
    >
      {canScrollLeft && (
        <button
          type="button"
          className="flex-shrink-0 flex h-9 w-6 items-center justify-center hover:bg-muted/50 cursor-pointer"
          onClick={scrollLeft}
          aria-label="向左滚动"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>
      )}

      <div
        ref={tabsContainerRef}
        className="flex flex-1 min-w-0 items-stretch overflow-x-auto scrollbar-none"
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => handleSelectTab(tab.id)}
            onClose={(e) => handleCloseTab(e, tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
          />
        ))}
      </div>

      {canScrollRight && (
        <button
          type="button"
          className="flex-shrink-0 flex h-9 w-6 items-center justify-center hover:bg-muted/50 cursor-pointer"
          onClick={scrollRight}
          aria-label="向右滚动"
        >
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Tab 列表下拉 - 当有溢出时显示 */}
      {hasOverflow && (
        <TabListDropdown
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={handleSelectTab}
          onClose={(id) => closeQueryTab(id)}
        />
      )}

      <NewTabButton onClick={handleNewTab} />

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tabId={contextMenu.tabId}
          onClose={() => setContextMenu(null)}
          onCloseTab={(id) => closeQueryTab(id)}
          onCloseOthers={handleCloseOthers}
          onCloseRight={handleCloseRight}
          onCloseAll={handleCloseAll}
        />
      )}
    </div>
  );
}

function NewTabButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="flex h-9 w-9 flex-shrink-0 items-center justify-center text-muted-foreground hover:bg-muted/50 hover:text-foreground cursor-pointer transition-colors"
      onClick={onClick}
      aria-label="新建标签页"
      title="新建标签页 (Ctrl+N)"
    >
      <PlusIcon className="h-4 w-4" />
    </button>
  );
}

export default TabBar;
