import * as React from "react";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { useT } from '@/i18n';
import { tauriCommands, useActiveTab, useActualConnectionId, TableInfo } from "../store/index";

// ============================================================================
// Icons
// ============================================================================

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);
const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const LoadingSpinner = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

type TabType = 'columns' | 'indexes' | 'ddl';

// ============================================================================
// Main Component
// ============================================================================

interface TableMetaPanelProps {
  className?: string;
}

export function TableMetaPanel({ className }: TableMetaPanelProps) {
  const t = useT();
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [activeSection, setActiveSection] = React.useState<TabType>('columns');
  const [tableInfo, setTableInfo] = React.useState<TableInfo | null>(null);
  const [ddl, setDdl] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const activeTab = useActiveTab();
  const actualConnectionId = useActualConnectionId();
  const tableName = activeTab?.tableName;
  const database = activeTab?.database;

  const isDark = document.documentElement.classList.contains('dark');

  // Load table info
  React.useEffect(() => {
    if (!tableName || !actualConnectionId) {
      setTableInfo(null);
      setDdl('');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const info = await tauriCommands.getTableInfo(actualConnectionId, tableName, database);
        if (cancelled) return;
        setTableInfo(info);
        const ddlResult = await tauriCommands.getTableDdl(actualConnectionId, tableName, database);
        if (cancelled) return;
        setDdl(ddlResult);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [tableName, actualConnectionId, database]);

  const handleCopyDdl = React.useCallback(async () => {
    if (ddl) {
      await navigator.clipboard.writeText(ddl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [ddl]);

  if (!tableName) return null;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'columns', label: t('tableMetaPanel.columns') },
    { key: 'indexes', label: t('tableMetaPanel.indexes') },
    { key: 'ddl', label: 'DDL' },
  ];

  return (
    <div className={cn("flex h-full", className)}>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-center w-5 border-l border-border bg-card/50 hover:bg-muted transition-colors cursor-pointer"
        title={isExpanded ? t('tableMetaPanel.collapsePanel') : t('tableMetaPanel.expandPanel')}
      >
        {isExpanded ? <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronLeftIcon className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {isExpanded && (
        <div className="w-72 flex flex-col border-l border-border bg-background">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/50">
            <span className="text-xs font-semibold truncate flex-1" title={tableName}>📊 {tableName}</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border bg-card/30">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={cn(
                  "flex-1 px-2 py-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                  activeSection === tab.key
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >{tab.label}</button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32"><LoadingSpinner className="h-5 w-5" /></div>
            ) : error ? (
              <div className="p-3 text-xs text-destructive">{error}</div>
            ) : activeSection === 'columns' ? (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-2 py-1 text-left font-medium">{t('tableMetaPanel.columnName')}</th>
                    <th className="px-2 py-1 text-left font-medium">{t('tableMetaPanel.type')}</th>
                    <th className="px-2 py-1 text-center font-medium">Null</th>
                    <th className="px-2 py-1 text-left font-medium">{t('tableMetaPanel.default')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tableInfo?.columns.map(col => (
                    <tr key={col.name} className="border-b border-border hover:bg-accent/30 transition-colors">
                      <td className="px-2 py-1 font-medium">
                        {col.name}
                        {col.is_primary_key && <span className="ml-1 text-warning" title="Primary Key">🔑</span>}
                      </td>
                      <td className="px-2 py-1 text-muted-foreground font-mono">{col.data_type}</td>
                      <td className="px-2 py-1 text-center">
                        {col.nullable ? <span className="text-success">✓</span> : <span className="text-destructive">✗</span>}
                      </td>
                      <td className="px-2 py-1 text-muted-foreground truncate max-w-[80px]" title={col.default_value || ''}>
                        {col.is_auto_increment ? <span className="text-primary">AUTO</span> : (col.default_value || '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeSection === 'indexes' ? (
              <div className="p-2 space-y-3">
                {/* Indexes */}
                <div>
                  <h4 className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">{t('tableMetaPanel.indexes')}</h4>
                  {tableInfo?.indexes && tableInfo.indexes.length > 0 ? (
                    <table className="w-full text-[11px]">
                      <thead><tr className="border-b border-border bg-muted/30">
                        <th className="px-2 py-1 text-left font-medium">Name</th>
                        <th className="px-2 py-1 text-left font-medium">Columns</th>
                        <th className="px-2 py-1 text-center font-medium">Unique</th>
                      </tr></thead>
                      <tbody>
                        {tableInfo.indexes.map(idx => (
                          <tr key={idx.name} className="border-b border-border">
                            <td className="px-2 py-1 font-mono">{idx.name}</td>
                            <td className="px-2 py-1 text-muted-foreground">{idx.columns.join(', ')}</td>
                            <td className="px-2 py-1 text-center">{idx.is_unique ? '✓' : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <p className="text-[11px] text-muted-foreground px-2">No indexes</p>}
                </div>
                {/* Foreign Keys */}
                <div>
                  <h4 className="text-[11px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">{t('tableMetaPanel.foreignKeys')}</h4>
                  {tableInfo?.foreign_keys && tableInfo.foreign_keys.length > 0 ? (
                    <div className="space-y-1">
                      {tableInfo.foreign_keys.map((fk, i) => (
                        <div key={i} className="rounded border border-border p-1.5 text-[11px]">
                          <div className="font-mono">{fk.columns.join(', ')} → {fk.referenced_table}({fk.referenced_columns.join(', ')})</div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-[11px] text-muted-foreground px-2">No foreign keys</p>}
                </div>
              </div>
            ) : (
              /* DDL tab */
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-end px-2 py-1 border-b border-border">
                  <button onClick={handleCopyDdl} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    <CopyIcon className="h-3 w-3" />
                    {copied ? t('tableMetaPanel.copied') : t('tableMetaPanel.copyDdl')}
                  </button>
                </div>
                <div className="flex-1 min-h-[200px]">
                  <Editor
                    height="100%"
                    defaultLanguage="sql"
                    value={ddl}
                    theme={isDark ? "vs-dark" : "vs"}
                    options={{ readOnly: true, minimap: { enabled: false }, lineNumbers: "off", wordWrap: "on", scrollBeyondLastLine: false, fontSize: 11 }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
