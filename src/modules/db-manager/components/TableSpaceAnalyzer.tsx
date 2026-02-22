import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useT } from '@/i18n';
import { invoke } from "@tauri-apps/api/core";

/**
 * TableSpaceAnalyzer Component
 * 
 * 表空间分析组件，显示：
 * - 各表的行数
 * - 数据大小
 * - 索引大小
 * - 总大小
 * - 可视化图表
 */

// ============================================================================
// Types
// ============================================================================

interface TableStats {
  table_name: string;
  row_count: number;
  data_size: number;
  index_size: number;
  total_size: number;
}

interface TableSpaceAnalyzerProps {
  connectionId: string;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

// ============================================================================
// Sub Components
// ============================================================================

interface SizeBarProps {
  value: number;
  max: number;
  color: string;
}

function SizeBar({ value, max, color }: SizeBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface TableRowProps {
  stats: TableStats;
  maxSize: number;
}

function TableRow({ stats, maxSize }: TableRowProps) {
  return (
    <tr className="border-b border-border hover:bg-accent/30 transition-colors">
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{stats.table_name}</span>
        </div>
      </td>
      <td className="px-3 py-1.5 text-right">
        {formatNumber(stats.row_count)}
      </td>
      <td className="px-3 py-1.5 text-right">
        {formatBytes(stats.data_size)}
      </td>
      <td className="px-3 py-1.5 text-right">
        {formatBytes(stats.index_size)}
      </td>
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SizeBar value={stats.total_size} max={maxSize} color="bg-primary" />
          </div>
          <span className="text-xs text-muted-foreground w-20 text-right">
            {formatBytes(stats.total_size)}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TableSpaceAnalyzer({ connectionId, className }: TableSpaceAnalyzerProps) {
  const t = useT();
  const [stats, setStats] = React.useState<TableStats[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadStats = React.useCallback(async () => {
    if (!connectionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await invoke<TableStats[]>("get_table_stats", { connectionId });
      setStats(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [connectionId]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  // 计算总计
  const totals = React.useMemo(() => {
    return stats.reduce(
      (acc, s) => ({
        rowCount: acc.rowCount + s.row_count,
        dataSize: acc.dataSize + s.data_size,
        indexSize: acc.indexSize + s.index_size,
        totalSize: acc.totalSize + s.total_size,
      }),
      { rowCount: 0, dataSize: 0, indexSize: 0, totalSize: 0 }
    );
  }, [stats]);

  const maxSize = Math.max(...stats.map((s) => s.total_size), 1);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <DatabaseIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t('tableSpaceAnalyzer.tableSpaceAnalysis')}</h3>
          <span className="text-xs text-muted-foreground">
            {t('tableSpaceAnalyzer.tablesCount', { count: stats.length })}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadStats}
          disabled={isLoading}
          className="h-7 text-xs cursor-pointer"
        >
          <RefreshIcon className={cn("h-3.5 w-3.5 mr-1", isLoading && "animate-spin")} />
          {t('tableSpaceAnalyzer.refreshButton')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 p-3 border-b border-border">
        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-primary">
            {formatNumber(totals.rowCount)}
          </div>
          <div className="text-[10px] text-muted-foreground">{t('tableSpaceAnalyzer.totalRows')}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-primary">
            {formatBytes(totals.dataSize)}
          </div>
          <div className="text-[10px] text-muted-foreground">{t('tableSpaceAnalyzer.dataSize')}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-success">
            {formatBytes(totals.indexSize)}
          </div>
          <div className="text-[10px] text-muted-foreground">{t('tableSpaceAnalyzer.indexSize')}</div>
        </div>
        <div className="bg-muted/50 rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-warning">
            {formatBytes(totals.totalSize)}
          </div>
          <div className="text-[10px] text-muted-foreground">{t('tableSpaceAnalyzer.totalSize')}</div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {error ? (
          <div className="flex items-center justify-center h-full text-destructive text-xs">
            <p>{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <RefreshIcon className="h-5 w-5 animate-spin" />
          </div>
        ) : stats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <DatabaseIcon className="h-10 w-10 opacity-20 mb-2" />
            <p className="text-xs">{t('tableSpaceAnalyzer.noTableData')}</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">{t('tableSpaceAnalyzer.tableNameHeader')}</th>
                <th className="px-3 py-1.5 text-right font-medium">{t('tableSpaceAnalyzer.rowCountHeader')}</th>
                <th className="px-3 py-1.5 text-right font-medium">{t('tableSpaceAnalyzer.dataSizeHeader')}</th>
                <th className="px-3 py-1.5 text-right font-medium">{t('tableSpaceAnalyzer.indexSizeHeader')}</th>
                <th className="px-3 py-1.5 text-left font-medium">{t('tableSpaceAnalyzer.totalSizeHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <TableRow key={s.table_name} stats={s} maxSize={maxSize} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
