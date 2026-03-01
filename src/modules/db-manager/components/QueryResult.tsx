import * as React from "react";
import { cn } from "@/lib/utils";
import { useT } from '@/i18n';
import type { QueryResult, Value, ColumnInfo } from "../store/index";
import { useActiveTab } from "../store/index";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { CellDetailModal } from "./CellDetailModal";

/**
 * QueryResult Component
 *
 * 显示查询执行结果，支持：
 * - 多结果集显示（Tab 切换）
 * - 可排序的表格列
 * - 导出功能（CSV/JSON）
 * - 执行时间和影响行数显示
 * - 错误信息显示
 * - 加载状态
 * - 空状态
 * - NULL 值显示处理
 *
 * Requirements:
 * - 3.2: WHEN 用户执行查询时，THE Query_Executor SHALL 运行 SQL 语句并显示结果
 * - 3.3: WHEN 查询返回数据时，THE Query_Executor SHALL 以表格形式展示结果
 * - 3.4: WHEN 查询执行出错时，THE Query_Executor SHALL 显示错误信息和错误位置
 * - 3.5: 支持多条 SQL 语句批量执行
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ResultTableProps {
  /** Query results array (支持多个结果) */
  results: QueryResult[];
  /** Whether a query is currently executing */
  loading: boolean;
  /** Error message if query failed */
  error: string | null;
  /** Optional className for the container */
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

interface SortState {
  columnIndex: number | null;
  direction: SortDirection;
}

// ============================================================================
// Icon Components
// ============================================================================

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function SortAscIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" /><path d="M18 11l-6-6-6 6" />
    </svg>
  );
}

function SortDescIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" /><path d="M6 13l6 6 6-6" />
    </svg>
  );
}

function SortIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 15l5 5 5-5" /><path d="M7 9l5-5 5 5" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function RowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
}

function EmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatValue(value: Value): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

function compareValues(a: Value, b: Value, direction: SortDirection): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  let result = 0;
  if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else if (typeof a === "boolean" && typeof b === "boolean") {
    result = a === b ? 0 : a ? 1 : -1;
  } else if (Array.isArray(a) && Array.isArray(b)) {
    result = a.join(",").localeCompare(b.join(","));
  } else {
    result = String(a).localeCompare(String(b));
  }
  return direction === "desc" ? -result : result;
}

function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// Export Functions
// ============================================================================

/** 生成 CSV 内容 */
function generateCSV(result: QueryResult): string {
  const headers = result.columns.map(c => `"${c.name.replace(/"/g, '""')}"`).join(",");
  const rows = result.rows.map(row =>
    row.map(val => {
      const str = formatValue(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [headers, ...rows].join("\n");
}

/** 生成 JSON 内容 */
function generateJSON(result: QueryResult): string {
  const data = result.rows.map(row => {
    const obj: Record<string, Value> = {};
    result.columns.forEach((col, i) => {
      obj[col.name] = row[i];
    });
    return obj;
  });
  return JSON.stringify(data, null, 2);
}

/** 生成 INSERT SQL 内容 */
function generateInsertSQL(result: QueryResult, tableName: string = 'table_name'): string {
  const cols = result.columns.map(c => c.name).join(', ');
  return result.rows.map(row => {
    const vals = row.map(v => {
      if (v === null) return 'NULL';
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      if (typeof v === 'number') return String(v);
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    return `INSERT INTO ${tableName} (${cols}) VALUES (${vals.join(', ')});`;
  }).join('\n');
}

/** 将结果导出为 CSV 格式 */
async function exportToCSV(result: QueryResult, defaultFilename: string = "export.csv", t: (key: string) => string) {
  try {
    const filePath = await save({
      defaultPath: defaultFilename,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    
    if (filePath) {
      const csv = generateCSV(result);
      await writeTextFile(filePath, csv);
      console.log('CSV 导出成功:', filePath);
    }
  } catch (error) {
    console.error('导出 CSV 失败:', error);
    alert(`${t('queryResult.exportCsv')} failed: ${error}`);
  }
}

/** 将结果导出为 JSON 格式 */
async function exportToJSON(result: QueryResult, defaultFilename: string = "export.json", t: (key: string) => string) {
  try {
    const filePath = await save({
      defaultPath: defaultFilename,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    
    if (filePath) {
      const json = generateJSON(result);
      await writeTextFile(filePath, json);
      console.log('JSON 导出成功:', filePath);
    }
  } catch (error) {
    console.error('导出 JSON 失败:', error);
    alert(`${t('queryResult.exportJson')} failed: ${error}`);
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

function LoadingState() {
  const t = useT();
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 text-muted-foreground">
      <LoadingSpinner className="h-6 w-6" />
      <p className="text-xs">{t('queryResult.executingQuery')}</p>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  const t = useT();
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-4">
      <div className="flex items-center gap-2 text-destructive">
        <AlertIcon className="h-5 w-5" />
        <span className="text-sm font-medium">{t('queryResult.queryError')}</span>
      </div>
      <div className="max-w-full rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <pre className="whitespace-pre-wrap break-words text-xs font-mono text-destructive">{error}</pre>
      </div>
    </div>
  );
}

function EmptyState() {
  const t = useT();
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <EmptyIcon className="h-10 w-10 opacity-20" />
      <p className="text-sm">{t('queryResult.noResults')}</p>
      <p className="text-xs opacity-60">{t('queryResult.executeQueryToSeeResults')}</p>
    </div>
  );
}

interface ResultMetaBarProps {
  executionTime: number;
  affectedRows: number;
  rowCount: number;
  columnCount: number;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onExportInsert: () => void;
}

function ResultMetaBar({ executionTime, affectedRows, rowCount, columnCount, onExportCSV, onExportJSON, onExportInsert }: ResultMetaBarProps) {
  const t = useT();
  return (
    <div className="flex items-center gap-4 border-b border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5" title={t('queryResult.executionTime')}>
        <ClockIcon className="h-3.5 w-3.5" />
        <span>{formatExecutionTime(executionTime)}</span>
      </div>
      <div className="flex items-center gap-1.5" title={t('queryResult.affectedRows')}>
        <RowsIcon className="h-3.5 w-3.5" />
        <span>{affectedRows > 0 ? `${affectedRows} ${t('queryResult.rowsAffected')}` : `${rowCount} ${t('queryResult.rows')}`}</span>
      </div>
      <div>{columnCount} {t('queryResult.columns')}</div>
      
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onExportCSV}
          className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
          title={t('queryResult.exportCsv')}
        >
          <DownloadIcon className="h-3 w-3" />
          CSV
        </button>
        <button
          onClick={onExportJSON}
          className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
          title={t('queryResult.exportJson')}
        >
          <DownloadIcon className="h-3 w-3" />
          JSON
        </button>
        <button
          onClick={onExportInsert}
          className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
          title={t('queryResult.exportInsert')}
        >
          <DownloadIcon className="h-3 w-3" />
          INSERT
        </button>
      </div>
    </div>
  );
}

interface TableHeaderCellProps {
  column: ColumnInfo;
  columnIndex: number;
  sortState: SortState;
  onSort: (columnIndex: number) => void;
}

function TableHeaderCell({ column, columnIndex, sortState, onSort }: TableHeaderCellProps) {
  const t = useT();
  const isSorted = sortState.columnIndex === columnIndex;
  const sortDirection = isSorted ? sortState.direction : null;

  return (
    <th
      className={cn(
        "sticky top-0 z-10 cursor-pointer select-none whitespace-nowrap border-b border-r border-border bg-card px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-accent/50",
        isSorted && "bg-accent/30"
      )}
      onClick={() => onSort(columnIndex)}
      title={`${column.name} (${column.data_type}) - ${t('queryResult.clickToSort')}`}
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

interface TableDataCellProps {
  value: Value;
  isLastColumn: boolean;
  onExpand?: (value: string) => void;
}

function TableDataCell({ value, isLastColumn, onExpand }: TableDataCellProps) {
  const isNull = value === null;
  const displayValue = formatValue(value);
  const isLong = displayValue.length > 50;

  return (
    <td
      className={cn(
        "whitespace-nowrap border-b px-3 py-1.5 text-xs font-mono",
        !isLastColumn && "border-r border-border",
        isNull && "italic text-muted-foreground",
        isLong && "cursor-pointer hover:bg-accent/40"
      )}
      title={isLong ? "Click to expand" : displayValue}
      onClick={isLong && onExpand ? () => onExpand(displayValue) : undefined}
    >
      <span className={cn("block max-w-[300px] truncate", isNull && "opacity-60")}>{displayValue}</span>
    </td>
  );
}

interface ResultTableContentProps {
  columns: ColumnInfo[];
  rows: Value[][];
  sortState: SortState;
  onSort: (columnIndex: number) => void;
  onCellExpand?: (value: string, columnName: string) => void;
}

function ResultTableContent({ columns, rows, sortState, onSort, onCellExpand }: ResultTableContentProps) {
  const sortedRows = React.useMemo(() => {
    if (sortState.columnIndex === null || sortState.direction === null) return rows;
    return [...rows].sort((a, b) =>
      compareValues(a[sortState.columnIndex!], b[sortState.columnIndex!], sortState.direction)
    );
  }, [rows, sortState]);

  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 top-0 z-20 w-12 border-b border-r border-border bg-card px-2 py-2 text-center text-[10px] font-medium text-muted-foreground">#</th>
            {columns.map((column, index) => (
              <TableHeaderCell key={`${column.name}-${index}`} column={column} columnIndex={index} sortState={sortState} onSort={onSort} />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIndex) => (
            <tr key={rowIndex} className={cn("transition-colors hover:bg-accent/30", rowIndex % 2 === 0 ? "bg-background" : "bg-muted/10")}>
              <td className="sticky left-0 z-10 w-12 border-b border-r border-border bg-inherit px-2 py-1.5 text-center text-[10px] text-muted-foreground">{rowIndex + 1}</td>
              {row.map((value, colIndex) => (
                <TableDataCell key={`${rowIndex}-${colIndex}`} value={value} isLastColumn={colIndex === row.length - 1} onExpand={onCellExpand ? (v) => onCellExpand(v, columns[colIndex]?.name || '') : undefined} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Single Result Component
// ============================================================================

interface SingleResultProps {
  result: QueryResult;
  resultIndex: number;
}

function SingleResult({ result, resultIndex }: SingleResultProps) {
  const t = useT();
  const [sortState, setSortState] = React.useState<SortState>({ columnIndex: null, direction: null });
  const [cellDetail, setCellDetail] = React.useState<{ value: string; columnName: string } | null>(null);

  React.useEffect(() => {
    setSortState({ columnIndex: null, direction: null });
  }, [result]);

  const handleSort = React.useCallback((columnIndex: number) => {
    setSortState((prev) => {
      if (prev.columnIndex !== columnIndex) return { columnIndex, direction: "asc" };
      if (prev.direction === "asc") return { columnIndex, direction: "desc" };
      if (prev.direction === "desc") return { columnIndex: null, direction: null };
      return { columnIndex, direction: "asc" };
    });
  }, []);

  const handleExportCSV = () => exportToCSV(result, `result_${resultIndex + 1}.csv`, t);
  const handleExportJSON = () => exportToJSON(result, `result_${resultIndex + 1}.json`, t);
  const handleExportInsert = async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({ defaultPath: `result_${resultIndex + 1}.sql`, filters: [{ name: 'SQL', extensions: ['sql'] }] });
      if (filePath) {
        const sql = generateInsertSQL(result);
        await writeTextFile(filePath, sql);
      }
    } catch (error) {
      // Copy to clipboard as fallback
      const sql = generateInsertSQL(result);
      await navigator.clipboard.writeText(sql);
    }
  };

  // 无数据但有影响行数（UPDATE/DELETE 等）
  if (result.rows.length === 0 && result.affected_rows > 0) {
    return (
      <div className="flex h-full flex-col bg-background">
        <ResultMetaBar
          executionTime={result.execution_time_ms}
          affectedRows={result.affected_rows}
          rowCount={0}
          columnCount={result.columns.length}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          onExportInsert={handleExportInsert}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <RowsIcon className="h-12 w-12 opacity-50" />
          <p className="text-sm">{t('queryResult.queryExecutedSuccessfully')}</p>
          <p className="text-xs">{result.affected_rows} {t('queryResult.rowsAffected')}</p>
        </div>
      </div>
    );
  }

  // 无数据
  if (result.rows.length === 0) {
    return (
      <div className="flex h-full flex-col bg-background">
        <ResultMetaBar
          executionTime={result.execution_time_ms}
          affectedRows={0}
          rowCount={0}
          columnCount={result.columns.length}
          onExportCSV={handleExportCSV}
          onExportJSON={handleExportJSON}
          onExportInsert={handleExportInsert}
        />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <EmptyIcon className="h-12 w-12 opacity-50" />
          <p className="text-sm">{t('queryResult.queryReturnedEmpty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <ResultMetaBar
        executionTime={result.execution_time_ms}
        affectedRows={result.affected_rows}
        rowCount={result.rows.length}
        columnCount={result.columns.length}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
          onExportInsert={handleExportInsert}
      />
      <ResultTableContent columns={result.columns} rows={result.rows} sortState={sortState} onSort={handleSort} onCellExpand={(value, columnName) => setCellDetail({ value, columnName })} />
      {cellDetail && (
        <CellDetailModal
          isOpen={true}
          onClose={() => setCellDetail(null)}
          value={cellDetail.value}
          columnName={cellDetail.columnName}
        />
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function QueryResultView({ results, loading, error, className }: ResultTableProps) {
  const t = useT();
  const [activeResultIndex, setActiveResultIndex] = React.useState(0);

  // 当结果变化时重置选中的结果索引
  React.useEffect(() => {
    setActiveResultIndex(0);
  }, [results]);

  if (loading) {
    return <div className={cn("flex h-full flex-col bg-background", className)}><LoadingState /></div>;
  }

  if (error) {
    return <div className={cn("flex h-full flex-col bg-background", className)}><ErrorState error={error} /></div>;
  }

  if (!results || results.length === 0) {
    return <div className={cn("flex h-full flex-col bg-background", className)}><EmptyState /></div>;
  }

  // 单个结果，直接显示
  if (results.length === 1) {
    return (
      <div className={cn("flex h-full flex-col bg-background", className)}>
        <SingleResult result={results[0]} resultIndex={0} />
      </div>
    );
  }

  // 多个结果，显示 Tab 切换
  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* 结果集 Tab 栏 */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/50 px-2 py-1">
        <span className="text-xs text-muted-foreground mr-2">{t('queryResult.resultSets')}</span>
        {results.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveResultIndex(index)}
            className={cn(
              "px-3 py-1 text-xs rounded transition-colors",
              activeResultIndex === index
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            #{index + 1}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {t('queryResult.totalResultSets', { count: results.length })}
        </span>
      </div>
      
      {/* 当前选中的结果 */}
      <div className="flex-1 overflow-hidden">
        <SingleResult result={results[activeResultIndex]} resultIndex={activeResultIndex} />
      </div>
    </div>
  );
}

// ============================================================================
// Connected Component
// ============================================================================

export function ConnectedQueryResult({ className }: { className?: string }) {
  const activeTab = useActiveTab();

  if (!activeTab) {
    return <div className={cn("flex h-full flex-col bg-background", className)}><EmptyState /></div>;
  }

  return (
    <QueryResultView
      results={activeTab.results}
      loading={activeTab.isExecuting}
      error={activeTab.error}
      className={className}
    />
  );
}

// 保持向后兼容的导出
export { QueryResultView as QueryResult };
export default QueryResultView;
