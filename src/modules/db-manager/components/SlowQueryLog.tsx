import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppStore, type QueryHistoryItem } from "../store/index";
import { useT } from '@/i18n';

/**
 * SlowQueryLog Component
 * 
 * 慢查询日志面板，显示执行时间超过阈值的查询
 */

// ============================================================================
// Types
// ============================================================================

interface SlowQueryLogProps {
  className?: string;
  threshold?: number; // 慢查询阈值（毫秒），默认 1000ms
  onExecute?: (sql: string) => void;
}

// ============================================================================
// Icons
// ============================================================================

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}min`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

function getSeverity(ms: number, threshold: number): "warning" | "danger" | "critical" {
  if (ms >= threshold * 10) return "critical";
  if (ms >= threshold * 3) return "danger";
  return "warning";
}

// ============================================================================
// Sub Components
// ============================================================================

interface SlowQueryItemProps {
  item: QueryHistoryItem;
  threshold: number;
  onExecute?: () => void;
}

function SlowQueryItem({ item, threshold, onExecute }: SlowQueryItemProps) {
  const t = useT();
  const severity = getSeverity(item.execution_time_ms, threshold);
  
  const severityColors = {
    warning: "text-yellow-500 bg-yellow-500/10",
    danger: "text-orange-500 bg-orange-500/10",
    critical: "text-red-500 bg-red-500/10",
  };
  
  return (
    <div className="border border-border rounded-lg p-2.5 space-y-1.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={cn("p-0.5 rounded", severityColors[severity])}>
            <AlertIcon className="h-3.5 w-3.5" />
          </div>
          <span className={cn("text-xs font-semibold", severityColors[severity].split(" ")[0])}>
            {formatDuration(item.execution_time_ms)}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatTime(item.executed_at)}
        </span>
      </div>
      
      {/* SQL */}
      <pre className="text-xs bg-muted/50 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap break-words max-h-20 font-mono scrollbar-thin">
        {item.sql}
      </pre>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {onExecute && (
          <Button size="sm" variant="ghost" onClick={onExecute} className="h-6 px-2 text-[10px] cursor-pointer">
            <PlayIcon className="h-3 w-3 mr-1" />
            {t('slowQueryLog.reExecute')}
          </Button>
        )}
        {item.error_message && (
          <span className="text-[10px] text-destructive truncate flex-1">
            {t('slowQueryLog.error')}: {item.error_message}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SlowQueryLog({
  className,
  threshold = 1000,
  onExecute,
}: SlowQueryLogProps) {
  const t = useT();
  const queryHistory = useAppStore((state) => state.queryHistory);
  const clearHistory = useAppStore((state) => state.clearHistory);
  const [localThreshold, setLocalThreshold] = React.useState(threshold);
  
  // 过滤慢查询
  const slowQueries = React.useMemo(() => {
    return queryHistory
      .filter((item) => item.execution_time_ms >= localThreshold)
      .sort((a, b) => b.execution_time_ms - a.execution_time_ms);
  }, [queryHistory, localThreshold]);
  
  // 统计信息
  const stats = React.useMemo(() => {
    if (slowQueries.length === 0) return null;
    
    const totalTime = slowQueries.reduce((sum, q) => sum + q.execution_time_ms, 0);
    const avgTime = totalTime / slowQueries.length;
    const maxTime = Math.max(...slowQueries.map((q) => q.execution_time_ms));
    
    return { count: slowQueries.length, avgTime, maxTime, totalTime };
  }, [slowQueries]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-3.5 w-3.5 text-warning" />
          <span className="text-xs font-semibold">{t('slowQueryLog.title')}</span>
          {stats && (
            <span className="text-[10px] text-muted-foreground">
              ({stats.count} 条)
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          disabled={queryHistory.length === 0}
          title={t('slowQueryLog.clearHistory')}
          className="h-6 w-6 p-0 cursor-pointer"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {/* Threshold Setting */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30">
        <span className="text-[10px] text-muted-foreground">{t('slowQueryLog.threshold')}:</span>
        <select
          value={localThreshold}
          onChange={(e) => setLocalThreshold(Number(e.target.value))}
          className="text-[10px] px-2 py-0.5 border border-border rounded-md bg-background"
        >
          <option value={100}>100ms</option>
          <option value={500}>500ms</option>
          <option value={1000}>1s</option>
          <option value={3000}>3s</option>
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
        </select>
      </div>
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 px-3 py-2 border-b border-border text-center">
          <div>
            <div className="text-base font-bold text-warning">{stats.count}</div>
            <div className="text-[10px] text-muted-foreground">{t('slowQueryLog.slowQueryCount')}</div>
          </div>
          <div>
            <div className="text-base font-bold text-warning">
              {formatDuration(stats.avgTime)}
            </div>
            <div className="text-[10px] text-muted-foreground">{t('slowQueryLog.averageTime')}</div>
          </div>
          <div>
            <div className="text-base font-bold text-destructive">
              {formatDuration(stats.maxTime)}
            </div>
            <div className="text-[10px] text-muted-foreground">{t('slowQueryLog.maxTime')}</div>
          </div>
        </div>
      )}
      
      {/* Query List */}
      <div className="flex-1 overflow-auto p-2 space-y-1.5 scrollbar-thin">
        {slowQueries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ClockIcon className="h-8 w-8 opacity-20 mb-2" />
            <p className="text-xs">{t('slowQueryLog.noSlowQueries')}</p>
            <p className="text-[10px]">{t('slowQueryLog.thresholdDescription', { threshold: formatDuration(localThreshold) })}</p>
          </div>
        ) : (
          slowQueries.map((item) => (
            <SlowQueryItem
              key={item.id}
              item={item}
              threshold={localThreshold}
              onExecute={onExecute ? () => onExecute(item.sql) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
