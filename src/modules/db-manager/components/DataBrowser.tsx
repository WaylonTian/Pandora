import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tauriCommands, type Value, type ColumnInfo } from "../store/index";
import { useT } from '@/i18n';

/**
 * DataBrowser Component
 *
 * A data browser for viewing and editing table data with:
 * - Scrollable data table display
 * - Pagination controls (page number, prev/next, page size selector)
 * - Column sorting (click header to sort asc/desc/none)
 * - Filter condition input (WHERE clause)
 * - Refresh button to reload data
 * - Loading state during data fetch
 *
 * Requirements:
 * - 4.1: WHEN 用户选择一个表时，THE Data_Browser SHALL 显示表中的数据
 * - 4.2: THE Data_Browser SHALL 支持数据分页显示
 * - 4.3: THE Data_Browser SHALL 支持按列排序
 * - 4.4: THE Data_Browser SHALL 支持按条件筛选数据
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface DataBrowserProps {
  /** Connection ID for the database */
  connectionId: string;
  /** Name of the table to browse */
  tableName: string;
  /** Number of rows per page */
  pageSize: number;
  /** Callback when a cell is edited */
  onEdit: (row: Record<string, unknown>, column: string, value: unknown) => void;
  /** Optional className for the container */
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalRows: number;
}

/**
 * Represents a cell being edited
 */
interface EditingCell {
  rowIndex: number;
  columnIndex: number;
  originalValue: Value;
  currentValue: string;
}

/**
 * Represents a modified cell
 * Key format: "rowIndex-columnIndex"
 */
interface ModifiedCell {
  rowIndex: number;
  columnIndex: number;
  columnName: string;
  originalValue: Value;
  newValue: string;
}

// Available page size options
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// ============================================================================
// Icon Components
// ============================================================================

/**
 * Loading spinner icon
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Sort ascending icon
 */
function SortAscIcon({ className }: { className?: string }) {
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
      <path d="M12 5v14" />
      <path d="M18 11l-6-6-6 6" />
    </svg>
  );
}

/**
 * Sort descending icon
 */
function SortDescIcon({ className }: { className?: string }) {
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
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </svg>
  );
}

/**
 * Unsorted icon (both arrows)
 */
function SortIcon({ className }: { className?: string }) {
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
      <path d="M7 15l5 5 5-5" />
      <path d="M7 9l5-5 5 5" />
    </svg>
  );
}

/**
 * Refresh icon
 */
function RefreshIcon({ className }: { className?: string }) {
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
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

/**
 * Filter icon
 */
function FilterIcon({ className }: { className?: string }) {
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
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

/**
 * Clear/X icon
 */
function ClearIcon({ className }: { className?: string }) {
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
 * Chevron left icon
 */
function ChevronLeftIcon({ className }: { className?: string }) {
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
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/**
 * Chevron right icon
 */
function ChevronRightIcon({ className }: { className?: string }) {
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
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/**
 * Alert/Error icon
 */
function AlertIcon({ className }: { className?: string }) {
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
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

/**
 * Empty state icon
 */
function EmptyIcon({ className }: { className?: string }) {
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
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}

/**
 * Save icon
 */
function SaveIcon({ className }: { className?: string }) {
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
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

/**
 * Discard/Undo icon
 */
function DiscardIcon({ className }: { className?: string }) {
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
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Formats a value for display in the table
 */
function formatValue(value: Value): string {
  if (value === null) {
    return "NULL";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    return `[${value.join(", ")}]`;
  }
  return String(value);
}

/**
 * Calculates total number of pages
 */
function calculateTotalPages(totalRows: number, pageSize: number): number {
  return Math.max(1, Math.ceil(totalRows / pageSize));
}

/**
 * Calculates the offset for a given page
 */
function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

/**
 * Builds a SQL query for fetching data with sorting, filtering, and pagination
 */
function buildDataQuery(
  tableName: string,
  sortState: SortState,
  filterCondition: string,
  pageSize: number,
  offset: number
): string {
  let sql = `SELECT * FROM ${tableName}`;
  
  // Add WHERE clause if filter is provided
  if (filterCondition.trim()) {
    sql += ` WHERE ${filterCondition}`;
  }
  
  // Add ORDER BY clause if sorting is enabled
  if (sortState.column && sortState.direction) {
    sql += ` ORDER BY ${sortState.column} ${sortState.direction.toUpperCase()}`;
  }
  
  // Add LIMIT and OFFSET for pagination
  sql += ` LIMIT ${pageSize} OFFSET ${offset}`;
  
  return sql;
}

/**
 * Builds a SQL query to count total rows
 */
function buildCountQuery(tableName: string, filterCondition: string): string {
  let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
  
  if (filterCondition.trim()) {
    sql += ` WHERE ${filterCondition}`;
  }
  
  return sql;
}

/**
 * Escapes a value for use in SQL
 */
function escapeValue(value: string): string {
  // Escape single quotes by doubling them
  return value.replace(/'/g, "''");
}

/**
 * Converts a string value to the appropriate SQL representation
 */
function valueToSql(value: string, originalValue: Value): string {
  // Handle NULL
  if (value.toUpperCase() === "NULL" || value === "") {
    return "NULL";
  }
  
  // If original was a number, try to keep it as number
  if (typeof originalValue === "number") {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      return String(num);
    }
  }
  
  // If original was boolean
  if (typeof originalValue === "boolean") {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "1") {
      return "TRUE";
    }
    if (lower === "false" || lower === "0") {
      return "FALSE";
    }
  }
  
  // Default to string
  return `'${escapeValue(value)}'`;
}

/**
 * Builds an UPDATE SQL statement for a modified row
 */
function buildUpdateSql(
  tableName: string,
  columns: ColumnInfo[],
  originalRow: Value[],
  modifications: Map<number, ModifiedCell>,
  primaryKeyColumns: string[]
): string {
  // Build SET clause
  const setClauses: string[] = [];
  modifications.forEach((mod) => {
    const sqlValue = valueToSql(mod.newValue, mod.originalValue);
    setClauses.push(`${mod.columnName} = ${sqlValue}`);
  });
  
  // Build WHERE clause using primary key or all original values
  const whereClauses: string[] = [];
  
  if (primaryKeyColumns.length > 0) {
    // Use primary key columns
    primaryKeyColumns.forEach((pkCol) => {
      const colIndex = columns.findIndex((c) => c.name === pkCol);
      if (colIndex !== -1) {
        const value = originalRow[colIndex];
        if (value === null) {
          whereClauses.push(`${pkCol} IS NULL`);
        } else {
          whereClauses.push(`${pkCol} = ${valueToSql(formatValue(value), value)}`);
        }
      }
    });
  } else {
    // Use all columns as identifier (fallback)
    columns.forEach((col, index) => {
      const value = originalRow[index];
      if (value === null) {
        whereClauses.push(`${col.name} IS NULL`);
      } else {
        whereClauses.push(`${col.name} = ${valueToSql(formatValue(value), value)}`);
      }
    });
  }
  
  return `UPDATE ${tableName} SET ${setClauses.join(", ")} WHERE ${whereClauses.join(" AND ")}`;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Loading state component
 */
function LoadingState() {
  const t = useT();
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <LoadingSpinner className="h-6 w-6" />
      <p className="text-xs">{t('dataBrowser.loadingData')}</p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const t = useT();
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertIcon className="h-5 w-5" />
        <span className="text-sm font-medium">{t('dataBrowser.loadDataError')}</span>
      </div>
      <div className="max-w-full rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <pre className="whitespace-pre-wrap break-words text-xs font-mono text-destructive">
          {error}
        </pre>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="cursor-pointer">
        <RefreshIcon className="mr-2 h-3.5 w-3.5" />
        {t('dataBrowser.retry')}
      </Button>
    </div>
  );
}

/**
 * Empty state component (no data)
 */
function EmptyState({ tableName }: { tableName: string }) {
  const t = useT();
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <EmptyIcon className="h-10 w-10 opacity-20" />
      <p className="text-sm">{t('dataBrowser.noDataInTable', { tableName })}</p>
      <p className="text-xs opacity-60">{t('dataBrowser.tableEmptyOrNoMatch')}</p>
    </div>
  );
}

/**
 * Toolbar component with filter input and refresh button
 */
interface ToolbarProps {
  filterValue: string;
  onFilterChange: (value: string) => void;
  onApplyFilter: () => void;
  onClearFilter: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  tableName: string;
  pendingChangesCount: number;
  onSaveChanges: () => void;
  onDiscardChanges: () => void;
  isSaving: boolean;
}

function Toolbar({
  filterValue,
  onFilterChange,
  onApplyFilter,
  onClearFilter,
  onRefresh,
  isLoading,
  tableName,
  pendingChangesCount,
  onSaveChanges,
  onDiscardChanges,
  isSaving,
}: ToolbarProps) {
  const t = useT();
  // Handle Enter key to apply filter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onApplyFilter();
    }
  };

  return (
    <div className="flex items-center gap-2 border-b border-border bg-card/50 px-3 py-1.5">
      {/* Table name */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">{t('dataBrowser.table')}</span>
        <span className="font-medium">{tableName}</span>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Filter input */}
      <div className="flex flex-1 items-center gap-1.5">
        <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('dataBrowser.whereCondition')}
          value={filterValue}
          onChange={(e) => onFilterChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 flex-1 text-xs"
          disabled={isLoading || isSaving}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onApplyFilter}
          disabled={isLoading || isSaving}
          title={t('dataBrowser.applyFilter')}
          className="h-7 text-xs cursor-pointer"
        >
          {t('dataBrowser.apply')}
        </Button>
        <button
          onClick={onClearFilter}
          disabled={isLoading || isSaving || !filterValue}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50 cursor-pointer transition-colors"
          title={t('dataBrowser.clearFilter')}
        >
          <ClearIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Pending changes indicator and actions */}
      {pendingChangesCount > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">
              {t('dataBrowser.pendingChanges', { count: pendingChangesCount })}
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={onSaveChanges}
              disabled={isSaving}
              title={t('dataBrowser.saveAllChanges')}
              className="h-7 text-xs bg-success hover:bg-success/90 cursor-pointer"
            >
              {isSaving ? (
                <LoadingSpinner className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <SaveIcon className="mr-1.5 h-3.5 w-3.5" />
              )}
              {t('dbManager.save')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDiscardChanges}
              disabled={isSaving}
              title={t('dataBrowser.discardAllChanges')}
              className="h-7 text-xs cursor-pointer"
            >
              <DiscardIcon className="mr-1.5 h-3.5 w-3.5" />
              {t('dataBrowser.discardAllChanges')}
            </Button>
          </div>
          <div className="h-4 w-px bg-border" />
        </>
      )}

      {/* Refresh button */}
      <button
        onClick={onRefresh}
        disabled={isLoading || isSaving}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50 cursor-pointer transition-colors"
        title={t('dataBrowser.refreshData')}
      >
        <RefreshIcon className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
      </button>
    </div>
  );
}

/**
 * Pagination controls component
 */
interface PaginationControlsProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  isLoading: boolean;
}

function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  isLoading,
}: PaginationControlsProps) {
  const t = useT();
  const { currentPage, pageSize, totalRows } = pagination;
  const totalPages = calculateTotalPages(totalRows, pageSize);
  
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  // Calculate displayed row range
  const startRow = totalRows === 0 ? 0 : calculateOffset(currentPage, pageSize) + 1;
  const endRow = Math.min(startRow + pageSize - 1, totalRows);

  return (
    <div className="flex items-center justify-between border-t border-border bg-card/50 px-3 py-1.5">
      {/* Left side: Row count info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {t('dataBrowser.showing')} {startRow}-{endRow} / {t('dataBrowser.total')} {totalRows} {t('dataBrowser.rows')}
        </span>
      </div>

      {/* Center: Page navigation */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious || isLoading}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 cursor-pointer transition-colors"
          title={t('dataBrowser.previousPage')}
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
        </button>
        
        <span className="min-w-[80px] text-center text-xs text-muted-foreground">
          {t('dataBrowser.page')} {currentPage} {t('dataBrowser.of')} {totalPages}
        </span>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext || isLoading}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-30 cursor-pointer transition-colors"
          title={t('dataBrowser.nextPage')}
        >
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Right side: Page size selector */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">{t('dataBrowser.perPage')}</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={isLoading}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * Table header cell with sorting
 */
interface TableHeaderCellProps {
  column: ColumnInfo;
  sortState: SortState;
  onSort: (columnName: string) => void;
}

function TableHeaderCell({ column, sortState, onSort }: TableHeaderCellProps) {
  const t = useT();
  const isSorted = sortState.column === column.name;
  const sortDirection = isSorted ? sortState.direction : null;

  return (
    <th
      className={cn(
        "sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap border-b border-r border-border bg-card px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-accent/50",
        isSorted && "bg-accent/30"
      )}
      onClick={() => onSort(column.name)}
      title={`${column.name} (${column.data_type}) - ${t('dataBrowser.clickToSort')}`}
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="text-foreground">{column.name}</span>
          <span className="text-xs text-muted-foreground">{column.data_type}</span>
        </div>
        <div className="ml-auto">
          {sortDirection === "asc" ? (
            <SortAscIcon className="h-4 w-4 text-primary" />
          ) : sortDirection === "desc" ? (
            <SortDescIcon className="h-4 w-4 text-primary" />
          ) : (
            <SortIcon className="h-4 w-4 opacity-30" />
          )}
        </div>
      </div>
    </th>
  );
}

/**
 * Table data cell with editing support
 */
interface TableDataCellProps {
  value: Value;
  isLastColumn: boolean;
  rowIndex: number;
  columnIndex: number;
  isEditing: boolean;
  isModified: boolean;
  editValue: string;
  onDoubleClick: () => void;
  onEditChange: (value: string) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
}

function TableDataCell({
  value,
  isLastColumn,
  isEditing,
  isModified,
  editValue,
  onDoubleClick,
  onEditChange,
  onEditConfirm,
  onEditCancel,
}: TableDataCellProps) {
  const t = useT();
  const isNull = value === null;
  const displayValue = formatValue(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle keyboard events in edit mode
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEditConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onEditCancel();
    }
  };

  return (
    <td
      className={cn(
        "whitespace-nowrap border-b px-3 py-1.5 text-xs font-mono",
        !isLastColumn && "border-r border-border",
        isNull && !isEditing && "italic text-muted-foreground",
        isModified && !isEditing && "bg-warning/15",
        "cursor-pointer"
      )}
      title={isEditing ? undefined : t('dataBrowser.doubleClickToEdit', { value: displayValue })}
      onDoubleClick={isEditing ? undefined : onDoubleClick}
    >
      {isEditing ? (
        <Input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onEditConfirm}
          className="h-7 w-full min-w-[100px] text-sm"
        />
      ) : (
        <span className={cn("block max-w-[300px] truncate", isNull && "opacity-60")}>
          {displayValue}
        </span>
      )}
    </td>
  );
}

/**
 * Data table content component with editing support
 */
interface DataTableContentProps {
  columns: ColumnInfo[];
  rows: Value[][];
  sortState: SortState;
  onSort: (columnName: string) => void;
  pagination: PaginationState;
  editingCell: EditingCell | null;
  modifiedCells: Map<string, ModifiedCell>;
  onCellDoubleClick: (rowIndex: number, columnIndex: number) => void;
  onEditChange: (value: string) => void;
  onEditConfirm: () => void;
  onEditCancel: () => void;
}

function DataTableContent({
  columns,
  rows,
  sortState,
  onSort,
  pagination,
  editingCell,
  modifiedCells,
  onCellDoubleClick,
  onEditChange,
  onEditConfirm,
  onEditCancel,
}: DataTableContentProps) {
  // Calculate row numbers based on pagination
  const startRowNumber = calculateOffset(pagination.currentPage, pagination.pageSize) + 1;

  // Helper to check if a cell is modified
  const isCellModified = (rowIndex: number, columnIndex: number): boolean => {
    return modifiedCells.has(`${rowIndex}-${columnIndex}`);
  };

  // Helper to check if a cell is being edited
  const isCellEditing = (rowIndex: number, columnIndex: number): boolean => {
    return editingCell?.rowIndex === rowIndex && editingCell?.columnIndex === columnIndex;
  };

  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 w-12 border-b border-r border-border bg-card px-2 py-2 text-center text-[10px] font-medium text-muted-foreground">
              #
            </th>
            {columns.map((column, index) => (
              <TableHeaderCell
                key={`${column.name}-${index}`}
                column={column}
                sortState={sortState}
                onSort={onSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={cn(
                "transition-colors hover:bg-accent/30",
                rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10"
              )}
            >
              {/* Row number */}
              <td className="sticky left-0 z-10 w-12 border-b border-r border-border bg-inherit px-2 py-1.5 text-center text-[10px] text-muted-foreground">
                {startRowNumber + rowIndex}
              </td>
              {row.map((value, colIndex) => (
                <TableDataCell
                  key={`${rowIndex}-${colIndex}`}
                  value={value}
                  isLastColumn={colIndex === row.length - 1}
                  rowIndex={rowIndex}
                  columnIndex={colIndex}
                  isEditing={isCellEditing(rowIndex, colIndex)}
                  isModified={isCellModified(rowIndex, colIndex)}
                  editValue={isCellEditing(rowIndex, colIndex) ? editingCell!.currentValue : ""}
                  onDoubleClick={() => onCellDoubleClick(rowIndex, colIndex)}
                  onEditChange={onEditChange}
                  onEditConfirm={onEditConfirm}
                  onEditCancel={onEditCancel}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DataBrowser component
 *
 * A comprehensive data browser for viewing table data with:
 * - Pagination controls
 * - Column sorting
 * - Filter condition input
 * - Refresh functionality
 * - Loading and error states
 * - Cell editing with batch save
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**
 */
export function DataBrowser({
  connectionId,
  tableName,
  pageSize: initialPageSize,
  onEdit,
  className,
}: DataBrowserProps) {
  // State for data
  const [columns, setColumns] = React.useState<ColumnInfo[]>([]);
  const [rows, setRows] = React.useState<Value[][]>([]);
  const [originalRows, setOriginalRows] = React.useState<Value[][]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // State for sorting
  const [sortState, setSortState] = React.useState<SortState>({
    column: null,
    direction: null,
  });

  // State for filtering
  const [filterInput, setFilterInput] = React.useState("");
  const [appliedFilter, setAppliedFilter] = React.useState("");

  // State for pagination
  const [pagination, setPagination] = React.useState<PaginationState>({
    currentPage: 1,
    pageSize: initialPageSize,
    totalRows: 0,
  });

  // State for editing
  const [editingCell, setEditingCell] = React.useState<EditingCell | null>(null);
  const [modifiedCells, setModifiedCells] = React.useState<Map<string, ModifiedCell>>(new Map());
  const [isSaving, setIsSaving] = React.useState(false);
  const [primaryKeyColumns, setPrimaryKeyColumns] = React.useState<string[]>([]);

  /**
   * Fetches table info to get primary key columns
   */
  const fetchTableInfo = React.useCallback(async () => {
    try {
      const tableInfo = await tauriCommands.getTableInfo(connectionId, tableName);
      const pkColumns = tableInfo.columns
        .filter((col) => col.is_primary_key)
        .map((col) => col.name);
      setPrimaryKeyColumns(pkColumns);
    } catch {
      // If we can't get table info, we'll use all columns as identifier
      setPrimaryKeyColumns([]);
    }
  }, [connectionId, tableName]);

  /**
   * Fetches data from the database
   */
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, get the total count
      const countQuery = buildCountQuery(tableName, appliedFilter);
      const countResult = await tauriCommands.executeQuery(connectionId, countQuery);
      
      // Extract total count from result
      let totalRows = 0;
      if (countResult.rows.length > 0 && countResult.rows[0].length > 0) {
        const countValue = countResult.rows[0][0];
        totalRows = typeof countValue === "number" ? countValue : parseInt(String(countValue), 10);
      }

      // Update pagination with total rows
      setPagination((prev) => ({ ...prev, totalRows }));

      // Calculate offset
      const offset = calculateOffset(pagination.currentPage, pagination.pageSize);

      // Fetch the actual data
      const dataQuery = buildDataQuery(
        tableName,
        sortState,
        appliedFilter,
        pagination.pageSize,
        offset
      );
      const dataResult = await tauriCommands.executeQuery(connectionId, dataQuery);

      setColumns(dataResult.columns);
      setRows(dataResult.rows);
      setOriginalRows(dataResult.rows.map((row) => [...row])); // Deep copy for tracking changes
      
      // Clear modifications when data is refreshed
      setModifiedCells(new Map());
      setEditingCell(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connectionId, tableName, sortState, appliedFilter, pagination.currentPage, pagination.pageSize]);

  // Fetch table info on mount
  React.useEffect(() => {
    fetchTableInfo();
  }, [fetchTableInfo]);

  // Fetch data when dependencies change
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filter or sort changes
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [appliedFilter, sortState]);

  /**
   * Handle column header click for sorting
   * Cycles through: asc -> desc -> null
   */
  const handleSort = React.useCallback((columnName: string) => {
    setSortState((prev) => {
      if (prev.column !== columnName) {
        // New column - start with ascending
        return { column: columnName, direction: "asc" };
      }
      // Same column - cycle through: asc -> desc -> null
      if (prev.direction === "asc") {
        return { column: columnName, direction: "desc" };
      }
      if (prev.direction === "desc") {
        return { column: null, direction: null };
      }
      return { column: columnName, direction: "asc" };
    });
  }, []);

  /**
   * Handle filter application
   */
  const handleApplyFilter = React.useCallback(() => {
    setAppliedFilter(filterInput);
  }, [filterInput]);

  /**
   * Handle filter clear
   */
  const handleClearFilter = React.useCallback(() => {
    setFilterInput("");
    setAppliedFilter("");
  }, []);

  /**
   * Handle page change
   */
  const handlePageChange = React.useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  }, []);

  /**
   * Handle page size change
   */
  const handlePageSizeChange = React.useCallback((newPageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize: newPageSize,
      currentPage: 1, // Reset to first page when page size changes
    }));
  }, []);

  /**
   * Handle refresh
   */
  const handleRefresh = React.useCallback(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Handle double-click on a cell to start editing
   * **Validates: Requirement 4.5**
   */
  const handleCellDoubleClick = React.useCallback((rowIndex: number, columnIndex: number) => {
    const value = rows[rowIndex][columnIndex];
    setEditingCell({
      rowIndex,
      columnIndex,
      originalValue: value,
      currentValue: formatValue(value),
    });
  }, [rows]);

  /**
   * Handle edit value change
   */
  const handleEditChange = React.useCallback((value: string) => {
    setEditingCell((prev) => {
      if (!prev) return null;
      return { ...prev, currentValue: value };
    });
  }, []);

  /**
   * Handle edit confirmation (Enter key or blur)
   * **Validates: Requirement 4.5**
   */
  const handleEditConfirm = React.useCallback(() => {
    if (!editingCell) return;

    const { rowIndex, columnIndex, originalValue, currentValue } = editingCell;
    const cellKey = `${rowIndex}-${columnIndex}`;
    const columnName = columns[columnIndex].name;

    // Check if value actually changed
    const originalFormatted = formatValue(originalValue);
    if (currentValue !== originalFormatted) {
      // Update the displayed row data
      setRows((prevRows) => {
        const newRows = [...prevRows];
        newRows[rowIndex] = [...newRows[rowIndex]];
        // Store as string for now, will be converted to proper type on save
        newRows[rowIndex][columnIndex] = currentValue === "NULL" ? null : currentValue;
        return newRows;
      });

      // Track the modification
      setModifiedCells((prev) => {
        const newMap = new Map(prev);
        newMap.set(cellKey, {
          rowIndex,
          columnIndex,
          columnName,
          originalValue,
          newValue: currentValue,
        });
        return newMap;
      });

      // Notify parent of the edit
      const rowData: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        rowData[col.name] = rows[rowIndex][idx];
      });
      onEdit(rowData, columnName, currentValue);
    }

    setEditingCell(null);
  }, [editingCell, columns, rows, onEdit]);

  /**
   * Handle edit cancellation (Escape key)
   * **Validates: Requirement 4.5**
   */
  const handleEditCancel = React.useCallback(() => {
    setEditingCell(null);
  }, []);

  /**
   * Save all modifications to the database
   * **Validates: Requirement 4.6**
   */
  const handleSaveChanges = React.useCallback(async () => {
    if (modifiedCells.size === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      // Group modifications by row
      const rowModifications = new Map<number, Map<number, ModifiedCell>>();
      modifiedCells.forEach((mod) => {
        if (!rowModifications.has(mod.rowIndex)) {
          rowModifications.set(mod.rowIndex, new Map());
        }
        rowModifications.get(mod.rowIndex)!.set(mod.columnIndex, mod);
      });

      // Generate and execute UPDATE statements for each modified row
      const updatePromises: Promise<void>[] = [];
      
      rowModifications.forEach((mods, rowIndex) => {
        const updateSql = buildUpdateSql(
          tableName,
          columns,
          originalRows[rowIndex],
          mods,
          primaryKeyColumns
        );
        
        updatePromises.push(
          tauriCommands.executeQuery(connectionId, updateSql).then(() => {})
        );
      });

      await Promise.all(updatePromises);

      // Refresh data after successful save
      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to save changes: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  }, [modifiedCells, tableName, columns, originalRows, primaryKeyColumns, connectionId, fetchData]);

  /**
   * Discard all modifications
   * **Validates: Requirement 4.5**
   */
  const handleDiscardChanges = React.useCallback(() => {
    // Restore original row data
    setRows(originalRows.map((row) => [...row]));
    setModifiedCells(new Map());
    setEditingCell(null);
  }, [originalRows]);

  // Render error state
  if (error && !isLoading) {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <Toolbar
          filterValue={filterInput}
          onFilterChange={setFilterInput}
          onApplyFilter={handleApplyFilter}
          onClearFilter={handleClearFilter}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          tableName={tableName}
          pendingChangesCount={modifiedCells.size}
          onSaveChanges={handleSaveChanges}
          onDiscardChanges={handleDiscardChanges}
          isSaving={isSaving}
        />
        <ErrorState error={error} onRetry={handleRefresh} />
      </div>
    );
  }

  // Render loading state (initial load)
  if (isLoading && rows.length === 0) {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <Toolbar
          filterValue={filterInput}
          onFilterChange={setFilterInput}
          onApplyFilter={handleApplyFilter}
          onClearFilter={handleClearFilter}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          tableName={tableName}
          pendingChangesCount={modifiedCells.size}
          onSaveChanges={handleSaveChanges}
          onDiscardChanges={handleDiscardChanges}
          isSaving={isSaving}
        />
        <LoadingState />
      </div>
    );
  }

  // Render empty state
  if (!isLoading && rows.length === 0) {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <Toolbar
          filterValue={filterInput}
          onFilterChange={setFilterInput}
          onApplyFilter={handleApplyFilter}
          onClearFilter={handleClearFilter}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          tableName={tableName}
          pendingChangesCount={modifiedCells.size}
          onSaveChanges={handleSaveChanges}
          onDiscardChanges={handleDiscardChanges}
          isSaving={isSaving}
        />
        <EmptyState tableName={tableName} />
        <PaginationControls
          pagination={pagination}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          isLoading={isLoading}
        />
      </div>
    );
  }

  // Render data table
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      <Toolbar
        filterValue={filterInput}
        onFilterChange={setFilterInput}
        onApplyFilter={handleApplyFilter}
        onClearFilter={handleClearFilter}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        tableName={tableName}
        pendingChangesCount={modifiedCells.size}
        onSaveChanges={handleSaveChanges}
        onDiscardChanges={handleDiscardChanges}
        isSaving={isSaving}
      />
      <DataTableContent
        columns={columns}
        rows={rows}
        sortState={sortState}
        onSort={handleSort}
        pagination={pagination}
        editingCell={editingCell}
        modifiedCells={modifiedCells}
        onCellDoubleClick={handleCellDoubleClick}
        onEditChange={handleEditChange}
        onEditConfirm={handleEditConfirm}
        onEditCancel={handleEditCancel}
      />
      <PaginationControls
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        isLoading={isLoading}
      />
    </div>
  );
}

export default DataBrowser;
