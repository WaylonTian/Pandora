import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore, type QueryHistoryItem } from "../store/index";
import { useT } from '@/i18n';

/**
 * QueryHistory Component
 *
 * Displays query execution history with:
 * - List of previously executed queries
 * - Click to fill editor with historical query
 * - Search/filter functionality
 * - Clear history button
 * - Success/failure status indicators
 * - Execution time display
 *
 * Requirements:
 * - 3.6: THE Query_Executor SHALL 记录查询历史以便用户重复使用
 */

// ============================================================================
// Icon Components
// ============================================================================

/**
 * Search icon
 */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

/**
 * Clock icon for timestamp
 */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/**
 * Check icon for success
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * X icon for failure
 */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Trash icon for clear history
 */
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/**
 * History icon for empty state
 */
function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Truncates SQL query for display
 */
function truncateSql(sql: string, maxLength: number = 100): string {
  const normalized = sql.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.substring(0, maxLength) + "...";
}

/**
 * Formats execution time for display
 */
function formatExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Formats timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Search input component
 */
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function SearchInput({ value, onChange }: SearchInputProps) {
  const t = useT();
  return (
    <div className="relative">
      <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('queryHistory.searchHistory')}
        className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        aria-label={t('queryHistory.searchHistory')}
      />
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ hasSearchQuery }: { hasSearchQuery: boolean }) {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-muted-foreground">
      <HistoryIcon className="h-8 w-8 opacity-20" />
      <p className="text-xs">
        {hasSearchQuery ? t('queryHistory.noMatchingQueries') : t('queryHistory.noQueryHistory')}
      </p>
      <p className="text-[10px] opacity-60">
        {hasSearchQuery
          ? t('queryHistory.tryOtherSearchTerms')
          : t('queryHistory.executeQueryToShow')}
      </p>
    </div>
  );
}

/**
 * History item component
 */
interface HistoryItemProps {
  item: QueryHistoryItem;
  onClick: () => void;
}

function HistoryItem({ item, onClick }: HistoryItemProps) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-lg border border-border bg-background p-2.5 text-left transition-all duration-200 hover:bg-accent/50 cursor-pointer",
        !item.success && "border-destructive/20"
      )}
      title={item.sql}
    >
      {/* SQL Preview */}
      <div className="mb-1.5">
        <code className="block text-xs font-mono text-foreground">
          {truncateSql(item.sql)}
        </code>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <div
          className={cn(
            "flex items-center gap-1",
            item.success ? "text-success" : "text-destructive"
          )}
        >
          {item.success ? (
            <CheckIcon className="h-3 w-3" />
          ) : (
            <XIcon className="h-3 w-3" />
          )}
          <span>{item.success ? t('queryHistory.success') : t('queryHistory.failed')}</span>
        </div>

        <div className="flex items-center gap-1">
          <ClockIcon className="h-3 w-3" />
          <span>{formatExecutionTime(item.execution_time_ms)}</span>
        </div>

        <div className="ml-auto">
          {formatTimestamp(item.executed_at)}
        </div>
      </div>

      {/* Error message (if failed) */}
      {!item.success && item.error_message && (
        <div className="mt-1.5 rounded-md border border-destructive/15 bg-destructive/5 p-1.5">
          <p className="text-[10px] font-mono text-destructive line-clamp-2">
            {item.error_message}
          </p>
        </div>
      )}
    </button>
  );
}

/**
 * Header component with title and clear button
 */
interface HeaderProps {
  itemCount: number;
  onClear: () => void;
}

function Header({ itemCount, onClear }: HeaderProps) {
  const t = useT();
  return (
    <div className="flex items-center justify-between">
      {itemCount > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {t('queryHistory.records', { count: itemCount })}
        </span>
      )}
      <div className="flex-1" />
      {itemCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
          title={t('queryHistory.clearAllHistory')}
        >
          <TrashIcon className="h-3 w-3" />
          <span>{t('queryHistory.clear')}</span>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export interface QueryHistoryProps {
  /** Optional className for the container */
  className?: string;
}

/**
 * QueryHistory component
 *
 * Displays a searchable list of previously executed queries.
 * Clicking on a history item fills the active tab's editor with the SQL.
 *
 * **Validates: Requirements 3.6**
 */
export function QueryHistory({ className }: QueryHistoryProps) {
  // State
  const [searchQuery, setSearchQuery] = React.useState("");

  // Store
  const queryHistory = useAppStore((state) => state.queryHistory);
  const activeTabId = useAppStore((state) => state.activeTabId);
  const updateTabContent = useAppStore((state) => state.updateTabContent);
  const clearHistory = useAppStore((state) => state.clearHistory);

  // Filter history based on search query
  const filteredHistory = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return queryHistory;
    }
    const lowerQuery = searchQuery.toLowerCase();
    return queryHistory.filter((item) =>
      item.sql.toLowerCase().includes(lowerQuery)
    );
  }, [queryHistory, searchQuery]);

  /**
   * Handle clicking on a history item
   * Fills the active tab's editor with the SQL
   */
  const handleItemClick = React.useCallback(
    (item: QueryHistoryItem) => {
      if (activeTabId) {
        updateTabContent(activeTabId, item.sql);
      }
    },
    [activeTabId, updateTabContent]
  );

  /**
   * Handle clearing history
   */
  const handleClearHistory = React.useCallback(() => {
    clearHistory();
    setSearchQuery("");
  }, [clearHistory]);

  return (
    <div className={cn("flex h-full flex-col gap-3 p-3", className)}>
      {/* Header */}
      <Header itemCount={queryHistory.length} onClear={handleClearHistory} />

      {/* Search input */}
      <SearchInput value={searchQuery} onChange={setSearchQuery} />

      {/* History list */}
      {filteredHistory.length === 0 ? (
        <EmptyState hasSearchQuery={searchQuery.trim().length > 0} />
      ) : (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {filteredHistory.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default QueryHistory;
