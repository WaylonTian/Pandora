import * as React from "react";
import { cn } from "@/lib/utils";
import { useT } from '@/i18n';
import { tauriCommands, useActiveTab, useActualConnectionId, TableInfo } from "../store/index";

/**
 * TableMetaPanel Component
 * 
 * 右侧可折叠面板，显示当前表的元数据信息：
 * - 表结构（列、类型、约束）
 * - 建表语句（DDL）
 */

// ============================================================================
// Icon Components
// ============================================================================

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

// ============================================================================
// Sub Components
// ============================================================================

interface ColumnRowProps {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  defaultValue?: string;
}

function ColumnRow({ name, dataType, nullable, isPrimaryKey, isAutoIncrement, defaultValue }: ColumnRowProps) {
  const t = useT();
  return (
    <tr className="border-b border-border hover:bg-accent/30 transition-colors">
      <td className="px-2 py-1 text-xs font-medium">
        {name}
        {isPrimaryKey && <span className="ml-1 text-warning" title={t('tableMetaPanel.primaryKeyTooltip')}>🔑</span>}
      </td>
      <td className="px-2 py-1 text-xs text-muted-foreground font-mono">{dataType}</td>
      <td className="px-2 py-1 text-xs text-center">
        {nullable ? <span className="text-success">✓</span> : <span className="text-destructive">✗</span>}
      </td>
      <td className="px-2 py-1 text-xs text-muted-foreground truncate max-w-[100px]" title={defaultValue || ''}>
        {isAutoIncrement ? <span className="text-primary">AUTO</span> : (defaultValue || '-')}
      </td>
    </tr>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface TableMetaPanelProps {
  className?: string;
}

export function TableMetaPanel({ className }: TableMetaPanelProps) {
  const t = useT();
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [activeSection, setActiveSection] = React.useState<'structure' | 'ddl'>('structure');
  const [tableInfo, setTableInfo] = React.useState<TableInfo | null>(null);
  const [ddl, setDdl] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const activeTab = useActiveTab();
  const actualConnectionId = useActualConnectionId();
  const tableName = activeTab?.tableName;

  // 加载表信息
  React.useEffect(() => {
    if (!tableName || !actualConnectionId) {
      setTableInfo(null);
      setDdl('');
      return;
    }

    let cancelled = false;
    const loadTableMeta = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 串行调用避免 SQLite 连接锁竞争
        const info = await tauriCommands.getTableInfo(actualConnectionId, tableName);
        if (cancelled) return;
        setTableInfo(info);

        const ddlResult = await tauriCommands.getTableDdl(actualConnectionId, tableName);
        if (cancelled) return;
        setDdl(ddlResult);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadTableMeta();
    return () => { cancelled = true; };
  }, [tableName, actualConnectionId]);

  // 复制 DDL
  const handleCopyDdl = React.useCallback(async () => {
    if (ddl) {
      await navigator.clipboard.writeText(ddl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [ddl]);

  // 如果没有选中表，不显示面板
  if (!tableName) {
    return null;
  }

  return (
    <div className={cn("flex h-full", className)}>
      {/* 折叠/展开按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-center w-5 border-l border-border bg-card/50 hover:bg-muted transition-colors cursor-pointer"
        title={isExpanded ? t('tableMetaPanel.collapsePanel') : t('tableMetaPanel.expandPanel')}
      >
        {isExpanded ? (
          <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeftIcon className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* 面板内容 */}
      {isExpanded && (
        <div className="w-72 flex flex-col border-l border-border bg-background animate-slide-in-right">
          {/* 标题栏 */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/50">
            <TableIcon className="h-3.5 w-3.5 text-success" />
            <span className="text-xs font-semibold truncate" title={tableName}>{tableName}</span>
          </div>

          {/* Tab 切换 */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveSection('structure')}
              className={cn(
                "flex-1 px-3 py-1.5 text-[10px] font-medium transition-colors cursor-pointer",
                activeSection === 'structure'
                  ? "bg-background border-b-2 border-primary text-foreground"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              )}
            >
              <TableIcon className="h-3 w-3 inline mr-1" />
              {t('tableMetaPanel.structureTab')}
            </button>
            <button
              onClick={() => setActiveSection('ddl')}
              className={cn(
                "flex-1 px-3 py-1.5 text-[10px] font-medium transition-colors cursor-pointer",
                activeSection === 'ddl'
                  ? "bg-background border-b-2 border-primary text-foreground"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              )}
            >
              <CodeIcon className="h-3 w-3 inline mr-1" />
              {t('tableMetaPanel.ddlTab')}
            </button>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-auto scrollbar-thin">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner className="h-5 w-5 text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="p-3 text-xs text-destructive">{error}</div>
            ) : activeSection === 'structure' ? (
              <div className="p-2">
                {tableInfo && tableInfo.columns.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('tableMetaPanel.columnNameHeader')}</th>
                        <th className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('tableMetaPanel.typeHeader')}</th>
                        <th className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider text-center">{t('tableMetaPanel.nullHeader')}</th>
                        <th className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t('tableMetaPanel.defaultValueHeader')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableInfo.columns.map((col) => (
                        <ColumnRow
                          key={col.name}
                          name={col.name}
                          dataType={col.data_type}
                          nullable={col.nullable}
                          isPrimaryKey={col.is_primary_key}
                          isAutoIncrement={col.is_auto_increment}
                          defaultValue={col.default_value}
                        />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-xs text-muted-foreground text-center py-4">{t('tableMetaPanel.noColumnInfo')}</div>
                )}

                {/* 索引信息 */}
                {tableInfo && tableInfo.indexes.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5 px-2 uppercase tracking-wider">{t('tableMetaPanel.indexesTitle')}</h4>
                    <div className="space-y-1">
                      {tableInfo.indexes.map((idx) => (
                        <div key={idx.name} className="px-2 py-1 text-xs bg-muted/30 rounded-md">
                          <span className="font-medium">{idx.name}</span>
                          {idx.is_primary && <span className="ml-1 text-warning">({t('tableStructure.primaryKeyHeader')})</span>}
                          {idx.is_unique && !idx.is_primary && <span className="ml-1 text-primary">({t('tableStructure.uniqueHeader')})</span>}
                          <div className="text-muted-foreground text-[10px]">{idx.columns.join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('tableMetaPanel.createTableStatement')}</span>
                  <button
                    onClick={handleCopyDdl}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md hover:bg-muted transition-colors cursor-pointer"
                    title={t('tableMetaPanel.copyButton')}
                  >
                    <CopyIcon className="h-3 w-3" />
                    {copied ? t('tableMetaPanel.copiedButton') : t('tableMetaPanel.copyButton')}
                  </button>
                </div>
                <pre className="text-xs bg-muted/50 p-2 rounded-lg overflow-auto max-h-[400px] whitespace-pre-wrap break-all font-mono scrollbar-thin">
                  {ddl || t('tableMetaPanel.noDdlInfo')}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TableMetaPanel;
