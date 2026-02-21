import * as React from "react";
import { cn } from "@/lib/utils";
import { tauriCommands, ExplainResult, useActualConnectionId } from "../store/index";

/**
 * ExplainPanel Component
 * 
 * 查询执行计划分析面板，支持：
 * - 显示 EXPLAIN 结果
 * - 显示 EXPLAIN ANALYZE 结果（实际执行）
 * - 性能警告和优化建议
 */

// ============================================================================
// Icon Components
// ============================================================================

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ============================================================================
// Warning Item Component
// ============================================================================

interface WarningItemProps {
  message: string;
}

function WarningItem({ message }: WarningItemProps) {
  const isSuccess = message.startsWith("✅");
  const isWarning = message.startsWith("⚠️");
  const isTip = message.startsWith("💡");
  
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 rounded-lg text-xs",
        isSuccess && "bg-success/10 text-success",
        isWarning && "bg-warning/10 text-warning",
        isTip && "bg-primary/10 text-primary",
        !isSuccess && !isWarning && !isTip && "bg-muted text-muted-foreground"
      )}
    >
      {isSuccess && <CheckIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />}
      {isWarning && <AlertIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />}
      <span>{message.replace(/^[✅⚠️💡]\s*/, "")}</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface ExplainPanelProps {
  sql: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function ExplainPanel({ sql, isOpen, onClose, className }: ExplainPanelProps) {
  const [result, setResult] = React.useState<ExplainResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'explain' | 'analyze'>('explain');
  
  const actualConnectionId = useActualConnectionId();
  
  // 执行 EXPLAIN
  const runExplain = React.useCallback(async (analyze: boolean) => {
    if (!actualConnectionId || !sql.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const explainResult = await tauriCommands.explainQuery(actualConnectionId, sql, analyze);
      setResult(explainResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [actualConnectionId, sql]);
  
  // 当打开面板时自动执行 EXPLAIN
  React.useEffect(() => {
    if (isOpen && sql.trim() && actualConnectionId) {
      runExplain(mode === 'analyze');
    }
  }, [isOpen, sql, actualConnectionId, mode, runExplain]);
  
  if (!isOpen) return null;
  
  return (
    <div className={cn("flex flex-col border-t border-border bg-background", className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-card/50">
        <div className="flex items-center gap-2">
          <ChartIcon className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">查询执行计划</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* 模式切换 */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setMode('explain')}
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer",
                mode === 'explain'
                  ? "bg-primary/15 text-primary"
                  : "bg-background hover:bg-muted"
              )}
            >
              EXPLAIN
            </button>
            <button
              onClick={() => setMode('analyze')}
              className={cn(
                "px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer",
                mode === 'analyze'
                  ? "bg-primary/15 text-primary"
                  : "bg-background hover:bg-muted"
              )}
              title="实际执行查询并分析"
            >
              ANALYZE
            </button>
          </div>
          
          <button
            onClick={() => runExplain(mode === 'analyze')}
            disabled={isLoading || !actualConnectionId}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50 cursor-pointer transition-colors"
          >
            {isLoading ? (
              <LoadingSpinner className="h-3.5 w-3.5" />
            ) : (
              <PlayIcon className="h-3.5 w-3.5" />
            )}
          </button>
          
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent cursor-pointer transition-colors">
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      
      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-4 max-h-[300px] scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner className="h-5 w-5 text-primary" />
          </div>
        ) : error ? (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-xs">
            <div className="font-semibold mb-1">执行失败</div>
            <div>{error}</div>
          </div>
        ) : result ? (
          <div className="space-y-3">
            {/* 警告和建议 */}
            {result.warnings.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">分析结果</div>
                {result.warnings.map((warning, index) => (
                  <WarningItem key={index} message={warning} />
                ))}
              </div>
            )}
            
            {/* 执行时间（仅 ANALYZE 模式） */}
            {result.total_time_ms !== undefined && (
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">执行时间: </span>
                  <span className="font-semibold text-foreground">{result.total_time_ms.toFixed(2)} ms</span>
                </div>
                {result.total_cost !== undefined && (
                  <div>
                    <span className="text-muted-foreground">预估成本: </span>
                    <span className="font-semibold text-foreground">{result.total_cost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* 原始执行计划 */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">执行计划</div>
              <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-[200px] whitespace-pre-wrap font-mono scrollbar-thin">
                {result.raw_plan || "无执行计划数据"}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
            <span>点击运行按钮分析查询</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExplainPanel;
