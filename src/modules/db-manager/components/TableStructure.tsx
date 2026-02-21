import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore, type ColumnDefinition, type IndexInfo, type ForeignKeyInfo } from "../store/index";

/**
 * TableStructure Component
 *
 * Displays table structure information including:
 * - Table name and schema
 * - Columns tab: name, type, nullable, default, primary key, auto increment
 * - Indexes tab: name, columns, unique, primary
 * - Foreign Keys tab: name, columns, referenced table, referenced columns, on delete, on update
 *
 * Requirements:
 * - 5.1: WHEN 用户查看表结构时，THE Schema_Manager SHALL 显示所有列的名称、类型和约束
 * - 5.4: THE Schema_Manager SHALL 显示表的索引信息
 * - 5.5: THE Schema_Manager SHALL 显示表的外键关系
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface TableStructureProps {
  /** Name of the table to display structure for */
  tableName: string;
  /** Optional className for the container */
  className?: string;
}

type TabType = "columns" | "indexes" | "foreignKeys";

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
 * Primary key icon
 */
function KeyIcon({ className, title }: { className?: string; title?: string }) {
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
      {title && <title>{title}</title>}
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

/**
 * Auto increment icon (lightning bolt)
 */
function AutoIncrementIcon({ className }: { className?: string }) {
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
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/**
 * Check icon for boolean true values
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
 * X icon for boolean false values
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
 * Columns icon
 */
function ColumnsIcon({ className }: { className?: string }) {
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
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}

/**
 * Index icon
 */
function IndexIcon({ className }: { className?: string }) {
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
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

/**
 * Foreign key / link icon
 */
function LinkIcon({ className, title }: { className?: string; title?: string }) {
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
      {title && <title>{title}</title>}
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/**
 * Table icon
 */
function TableIcon({ className }: { className?: string }) {
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
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
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

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Loading state component
 */
function LoadingState() {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <LoadingSpinner className="h-5 w-5" />
      <p className="text-xs">加载表结构中...</p>
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertIcon className="h-5 w-5" />
        <span className="text-sm font-semibold">加载表结构失败</span>
      </div>
      <div className="max-w-full rounded-lg border border-destructive/30 bg-destructive/10 p-3">
        <pre className="whitespace-pre-wrap break-words text-xs text-destructive">
          {error}
        </pre>
      </div>
    </div>
  );
}

/**
 * Empty state component for tabs with no data
 */
function EmptyTabState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[150px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <EmptyIcon className="h-8 w-8 opacity-30" />
      <p className="text-xs">{message}</p>
    </div>
  );
}

/**
 * Tab button component
 */
interface TabButtonProps {
  label: string;
  icon: React.ReactNode;
  count: number;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ label, icon, count, isActive, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors",
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px]",
          isActive
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Table header component
 */
interface TableHeaderProps {
  tableName: string;
  schema?: string;
}

function TableHeader({ tableName, schema }: TableHeaderProps) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border bg-card/50 px-4 py-2">
      <TableIcon className="h-4 w-4 text-success" />
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{tableName}</span>
        {schema && (
          <span className="text-[10px] text-muted-foreground">Schema: {schema}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Boolean indicator component
 */
function BooleanIndicator({ value, trueLabel, falseLabel }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return value ? (
    <span className="flex items-center gap-1 text-green-600 dark:text-green-400" title={trueLabel || "Yes"}>
      <CheckIcon className="h-4 w-4" />
    </span>
  ) : (
    <span className="flex items-center gap-1 text-muted-foreground" title={falseLabel || "No"}>
      <XIcon className="h-4 w-4 opacity-30" />
    </span>
  );
}

// ============================================================================
// Columns Tab Component
// ============================================================================

interface ColumnsTabProps {
  columns: ColumnDefinition[];
}

function ColumnsTab({ columns }: ColumnsTabProps) {
  if (columns.length === 0) {
    return <EmptyTabState message="无列定义" />;
  }

  return (
    <div className="overflow-auto scrollbar-thin">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              列名
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              类型
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-center text-xs font-medium">
              可空
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              默认值
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-center text-xs font-medium">
              <span className="flex items-center justify-center gap-1" title="主键">
                <KeyIcon className="h-3.5 w-3.5" />
                <span className="sr-only">主键</span>
              </span>
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-muted px-3 py-1.5 text-center text-xs font-medium">
              <span className="flex items-center justify-center gap-1" title="自增">
                <AutoIncrementIcon className="h-3.5 w-3.5" />
                <span className="sr-only">自增</span>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column, index) => (
            <tr
              key={column.name}
              className={cn(
                "transition-colors hover:bg-accent/30",
                index % 2 === 0 ? "bg-background" : "bg-muted/20"
              )}
            >
              <td className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  {column.is_primary_key && (
                    <KeyIcon className="h-3.5 w-3.5 text-warning" title="主键" />
                  )}
                  <span className={cn(column.is_primary_key && "font-semibold")}>
                    {column.name}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-xs font-mono text-muted-foreground">
                {column.data_type}
              </td>
              <td className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-center text-xs">
                <BooleanIndicator value={column.nullable} trueLabel="可空" falseLabel="非空" />
              </td>
              <td className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-xs">
                {column.default_value ? (
                  <span className="font-mono text-muted-foreground">{column.default_value}</span>
                ) : (
                  <span className="italic text-muted-foreground/50">无</span>
                )}
              </td>
              <td className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-center text-xs">
                <BooleanIndicator value={column.is_primary_key} trueLabel="主键" falseLabel="非主键" />
              </td>
              <td className="whitespace-nowrap border-b border-border px-3 py-1.5 text-center text-xs">
                <BooleanIndicator value={column.is_auto_increment} trueLabel="自增" falseLabel="非自增" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Indexes Tab Component
// ============================================================================

interface IndexesTabProps {
  indexes: IndexInfo[];
}

function IndexesTab({ indexes }: IndexesTabProps) {
  if (indexes.length === 0) {
    return <EmptyTabState message="无索引定义" />;
  }

  return (
    <div className="overflow-auto scrollbar-thin">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              索引名
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              列
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-center text-xs font-medium">
              唯一
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-muted px-3 py-1.5 text-center text-xs font-medium">
              主键
            </th>
          </tr>
        </thead>
        <tbody>
          {indexes.map((index, idx) => (
            <tr
              key={index.name}
              className={cn(
                "transition-colors hover:bg-accent/30",
                idx % 2 === 0 ? "bg-background" : "bg-muted/20"
              )}
            >
              <td className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  {index.is_primary && (
                    <KeyIcon className="h-3.5 w-3.5 text-warning" title="主键索引" />
                  )}
                  <span className={cn(index.is_primary && "font-semibold")}>
                    {index.name}
                  </span>
                </div>
              </td>
              <td className="border-b border-r border-border px-3 py-1.5 text-xs">
                <div className="flex flex-wrap gap-1">
                  {index.columns.map((col, colIdx) => (
                    <span
                      key={col}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono"
                    >
                      {col}
                      {colIdx < index.columns.length - 1 && ","}
                    </span>
                  ))}
                </div>
              </td>
              <td className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-center text-xs">
                <BooleanIndicator value={index.is_unique} trueLabel="唯一" falseLabel="非唯一" />
              </td>
              <td className="whitespace-nowrap border-b border-border px-3 py-1.5 text-center text-xs">
                <BooleanIndicator value={index.is_primary} trueLabel="主键" falseLabel="非主键" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Foreign Keys Tab Component
// ============================================================================

interface ForeignKeysTabProps {
  foreignKeys: ForeignKeyInfo[];
}

function ForeignKeysTab({ foreignKeys }: ForeignKeysTabProps) {
  if (foreignKeys.length === 0) {
    return <EmptyTabState message="无外键定义" />;
  }

  return (
    <div className="overflow-auto scrollbar-thin">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              外键名
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              列
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              引用表
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              引用列
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-r border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              删除时
            </th>
            <th className="sticky top-0 z-10 whitespace-nowrap border-b border-border bg-muted px-3 py-1.5 text-left text-xs font-medium">
              更新时
            </th>
          </tr>
        </thead>
        <tbody>
          {foreignKeys.map((fk, idx) => (
            <tr
              key={fk.name}
              className={cn(
                "transition-colors hover:bg-accent/30",
                idx % 2 === 0 ? "bg-background" : "bg-muted/20"
              )}
            >
              <td className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5 text-primary" title="外键" />
                  <span>{fk.name}</span>
                </div>
              </td>
              <td className="border-b border-r border-border px-3 py-1.5 text-xs">
                <div className="flex flex-wrap gap-1">
                  {fk.columns.map((col) => (
                    <span
                      key={col}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </td>
              <td className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-xs">
                <span className="font-semibold text-primary">{fk.referenced_table}</span>
              </td>
              <td className="border-b border-r border-border px-3 py-1.5 text-xs">
                <div className="flex flex-wrap gap-1">
                  {fk.referenced_columns.map((col) => (
                    <span
                      key={col}
                      className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono text-primary"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </td>
              <td className="whitespace-nowrap border-b border-r border-border px-3 py-1.5 text-xs">
                {fk.on_delete ? (
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-mono text-destructive">
                    {fk.on_delete}
                  </span>
                ) : (
                  <span className="italic text-muted-foreground/50">无</span>
                )}
              </td>
              <td className="whitespace-nowrap border-b border-border px-3 py-1.5 text-xs">
                {fk.on_update ? (
                  <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[10px] font-mono text-warning">
                    {fk.on_update}
                  </span>
                ) : (
                  <span className="italic text-muted-foreground/50">无</span>
                )}
              </td>
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
 * TableStructure component
 *
 * Displays comprehensive table structure information with tabs for:
 * - Columns: name, type, nullable, default, primary key, auto increment
 * - Indexes: name, columns, unique, primary
 * - Foreign Keys: name, columns, referenced table, referenced columns, on delete, on update
 *
 * **Validates: Requirements 5.1, 5.4, 5.5**
 */
export function TableStructure({ tableName, className }: TableStructureProps) {
  // State for active tab
  const [activeTab, setActiveTab] = React.useState<TabType>("columns");

  // Get state and actions from store
  const tableInfo = useAppStore((state) => state.tableInfo[tableName]);
  const isLoading = useAppStore((state) => state.isLoadingSchema);
  const error = useAppStore((state) => state.schemaError);
  const loadTableInfo = useAppStore((state) => state.loadTableInfo);

  // Load table info on mount or when table name changes
  React.useEffect(() => {
    if (tableName) {
      loadTableInfo(tableName);
    }
  }, [tableName, loadTableInfo]);

  // Render loading state
  if (isLoading && !tableInfo) {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <LoadingState />
      </div>
    );
  }

  // Render error state
  if (error && !tableInfo) {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <ErrorState error={error} />
      </div>
    );
  }

  // Render empty state if no table info
  if (!tableInfo) {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
          <TableIcon className="h-10 w-10 opacity-20" />
          <p className="text-xs">未选择表</p>
          <p className="text-[10px]">选择一个表来查看结构</p>
        </div>
      </div>
    );
  }

  // Get counts for tab badges
  const columnsCount = tableInfo.columns.length;
  const indexesCount = tableInfo.indexes.length;
  const foreignKeysCount = tableInfo.foreign_keys.length;

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Table header with name and schema */}
      <TableHeader tableName={tableInfo.name} schema={tableInfo.schema} />

      {/* Tab navigation */}
      <div className="flex border-b border-border bg-muted/20">
        <TabButton
          label="列"
          icon={<ColumnsIcon className="h-3.5 w-3.5" />}
          count={columnsCount}
          isActive={activeTab === "columns"}
          onClick={() => setActiveTab("columns")}
        />
        <TabButton
          label="索引"
          icon={<IndexIcon className="h-3.5 w-3.5" />}
          count={indexesCount}
          isActive={activeTab === "indexes"}
          onClick={() => setActiveTab("indexes")}
        />
        <TabButton
          label="外键"
          icon={<LinkIcon className="h-3.5 w-3.5" />}
          count={foreignKeysCount}
          isActive={activeTab === "foreignKeys"}
          onClick={() => setActiveTab("foreignKeys")}
        />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "columns" && <ColumnsTab columns={tableInfo.columns} />}
        {activeTab === "indexes" && <IndexesTab indexes={tableInfo.indexes} />}
        {activeTab === "foreignKeys" && <ForeignKeysTab foreignKeys={tableInfo.foreign_keys} />}
      </div>

      {/* Loading overlay when refreshing */}
      {isLoading && tableInfo && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <LoadingSpinner className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

export default TableStructure;