import * as React from "react";
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react";
import { format as formatSql } from "sql-formatter";
import { cn } from "@/lib/utils";
import { useT } from '@/i18n';
import { Button } from "@/components/ui/button";
import { useAppStore, useActiveTab, useActiveConnection, tauriCommands } from "../store/index";
import { createSqlCompletionProvider, type SchemaCache } from "../lib/sqlCompletion";

/**
 * SQL Editor Component
 *
 * A Monaco Editor-based SQL editor with:
 * - SQL syntax highlighting
 * - Execute button in toolbar
 * - Ctrl+Enter keyboard shortcut to execute
 * - Connection status indicator
 * - Loading state during query execution
 * - 自动跟随系统主题切换
 * - 智能自动补全
 *
 * Requirements:
 * - 3.1: THE Query_Executor SHALL 提供带语法高亮的 SQL 编辑器
 * - 6.5: THE Database_Manager SHALL 提供键盘快捷键支持常用操作
 */

// ============================================================================
// Hooks
// ============================================================================

/**
 * 检测当前是否为暗色主题
 */
function useIsDarkTheme(): boolean {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  React.useEffect(() => {
    // 监听 class 变化
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface SqlEditorProps {
  /** SQL content value */
  value: string;
  /** Callback when SQL content changes */
  onChange: (value: string) => void;
  /** Callback when execute is triggered, receives the SQL to execute (selected or all) */
  onExecute: (sql: string) => void;
  /** Callback when EXPLAIN is triggered */
  onExplain?: () => void;
  /** Callback when add to favorites is triggered */
  onAddFavorite?: () => void;
  /** Connection ID for the editor */
  connectionId: string;
  /** Optional className for the container */
  className?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
}

// ============================================================================
// Icon Components
// ============================================================================

/**
 * Play icon for execute button
 */
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

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

function DisconnectedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

// ============================================================================
// Connection Status Indicator Component
// ============================================================================

interface ConnectionStatusProps {
  connectionId: string | null;
  className?: string;
}

function ConnectionStatus({ connectionId, className }: ConnectionStatusProps) {
  const t = useT();
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const connections = useAppStore((state) => state.connections);

  const connection = connections.find((c) => c.id === connectionId);
  const status = connectionId ? connectionStatus[connectionId] : undefined;

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs",
        isConnected
          ? "text-success"
          : "text-muted-foreground",
        className
      )}
    >
      {isConnecting ? (
        <>
          <LoadingSpinner className="h-3.5 w-3.5" />
          <span>{t('sqlEditor.connecting')}</span>
        </>
      ) : isConnected ? (
        <>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_4px_hsl(var(--success)/0.5)]" />
          <span>{connection?.name || t('sqlEditor.connected')}</span>
        </>
      ) : (
        <>
          <DisconnectedIcon className="h-3.5 w-3.5" />
          <span>{t('sqlEditor.notConnected')}</span>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Editor Toolbar Component
// ============================================================================

interface EditorToolbarProps {
  onExecute: () => void;
  onCancel?: () => void;
  onExplain?: () => void;
  onAddFavorite?: () => void;
  onFormat?: () => void;
  isExecuting: boolean;
  isConnected: boolean;
  connectionId: string | null;
  hasSelection: boolean;
}

/**
 * Chart icon for EXPLAIN button
 */
function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

/**
 * Star icon for favorites
 */
function StarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

/**
 * Format icon for SQL formatting
 */
function FormatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="21" y1="10" x2="3" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="21" y1="18" x2="3" y2="18" />
    </svg>
  );
}

function EditorToolbar({
  onExecute,
  onCancel,
  onExplain,
  onAddFavorite,
  onFormat,
  isExecuting,
  isConnected,
  connectionId,
  hasSelection,
}: EditorToolbarProps) {
  const t = useT();
  return (
    <div className="flex items-center justify-between border-b border-border bg-card/50 px-3 py-1.5">
      {/* 左侧：执行按钮和操作 */}
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          onClick={onExecute}
          disabled={isExecuting || !isConnected}
          className="gap-1.5 h-7 px-3 text-xs cursor-pointer"
          title={hasSelection ? t('sqlEditor.executeShortcut') : t('sqlEditor.executeAllShortcut')}
        >
          {isExecuting ? (
            <>
              <LoadingSpinner className="h-3.5 w-3.5" />
              <span>{t('sqlEditor.executing')}</span>
            </>
          ) : (
            <>
              <PlayIcon className="h-3.5 w-3.5" />
              <span>{hasSelection ? t('sqlEditor.executeSelected') : t('sqlEditor.execute')}</span>
            </>
          )}
        </Button>
        <span className="text-[10px] text-muted-foreground/60">Ctrl+Enter</span>
        {hasSelection && (
          <span className="text-[10px] text-primary">{t('sqlEditor.selected')}</span>
        )}
        {isExecuting && onCancel && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onCancel}
            className="gap-1.5 h-7 px-3 text-xs cursor-pointer"
          >
            {t('sqlEditor.cancel')}
          </Button>
        )}
        
        <div className="mx-1 h-4 w-px bg-border" />
        
        {onFormat && (
          <button
            onClick={onFormat}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
            title={t('sqlEditor.formatSqlShortcut')}
          >
            <FormatIcon className="h-3.5 w-3.5" />
            <span>{t('sqlEditor.format')}</span>
          </button>
        )}
        
        {onExplain && (
          <button
            onClick={onExplain}
            disabled={isExecuting || !isConnected}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 cursor-pointer transition-colors"
            title={t('sqlEditor.analyzeQueryPlan')}
          >
            <ChartIcon className="h-3.5 w-3.5" />
            <span>{t('sqlEditor.explain')}</span>
          </button>
        )}
        
        {onAddFavorite && (
          <button
            onClick={onAddFavorite}
            disabled={!isConnected}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-warning disabled:opacity-50 cursor-pointer transition-colors"
            title={t('sqlEditor.addToFavorites')}
          >
            <StarIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* 右侧：连接状态 */}
      <ConnectionStatus connectionId={connectionId} />
    </div>
  );
}

// ============================================================================
// Main SqlEditor Component
// ============================================================================

/**
 * SQL Editor component with Monaco Editor integration
 *
 * Features:
 * - SQL syntax highlighting
 * - Execute button and Ctrl+Enter shortcut
 * - 支持执行选中的 SQL 或全部 SQL
 * - SQL 格式化
 * - Connection status indicator
 * - Loading state during execution
 */
export function SqlEditor({
  value,
  onChange,
  onExecute,
  onExplain,
  onAddFavorite,
  connectionId,
  className,
  readOnly = false,
}: SqlEditorProps) {
  const editorRef = React.useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = React.useRef<Monaco | null>(null);
  
  // 跟踪是否有选中的文本
  const [hasSelection, setHasSelection] = React.useState(false);

  // 检测当前主题
  const isDarkTheme = useIsDarkTheme();

  // Get connection status from store
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const activeTab = useActiveTab();

  const status = connectionId ? connectionStatus[connectionId] : undefined;
  const isConnected = status === "connected";
  const isExecuting = activeTab?.isExecuting ?? false;

  /**
   * 格式化 SQL
   */
  const handleFormat = React.useCallback(() => {
    if (!value.trim()) return;
    try {
      const formatted = formatSql(value, {
        language: "sql",
        tabWidth: 2,
        keywordCase: "upper",
        linesBetweenQueries: 2,
      });
      onChange(formatted);
    } catch {
      // 格式化失败时保持原样
    }
  }, [value, onChange]);

  /**
   * 获取要执行的 SQL（选中的文本或全部内容）
   */
  const getSqlToExecute = React.useCallback((): string => {
    const editor = editorRef.current;
    if (!editor) return value;

    const selection = editor.getSelection();
    if (selection && !selection.isEmpty()) {
      const selectedText = editor.getModel()?.getValueInRange(selection);
      if (selectedText && selectedText.trim()) {
        return selectedText;
      }
    }
    return value;
  }, [value]);

  /**
   * 处理执行操作
   */
  const handleExecute = React.useCallback(() => {
    const sql = getSqlToExecute();
    if (sql.trim()) {
      onExecute(sql);
    }
  }, [getSqlToExecute, onExecute]);

  /**
   * 处理取消查询
   */
  const handleCancel = React.useCallback(async () => {
    const actualConnId = useAppStore.getState().connectionIdMap[connectionId] || connectionId;
    if (actualConnId) {
      try {
        await tauriCommands.cancelQuery(actualConnId);
      } catch (e) {
        // ignore cancel errors
      }
    }
  }, [connectionId]);

  /**
   * Handle editor mount
   * Sets up the editor reference and configures SQL-specific settings
   */
  const handleEditorMount: OnMount = React.useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // 注册 SQL 自动补全提供器
      const getSchemaCache = (): SchemaCache => {
        const state = useAppStore.getState();
        const allTables: string[] = [];
        Object.values(state.tables).forEach((tables) => {
          allTables.push(...tables);
        });
        return {
          tables: allTables,
          tableInfo: state.tableInfo,
        };
      };

      monaco.languages.registerCompletionItemProvider(
        "sql",
        createSqlCompletionProvider(monaco, getSchemaCache)
      );

      // Add Ctrl+Enter keybinding for execute
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        if (isConnected && !isExecuting) {
          const sql = getSqlToExecute();
          if (sql.trim()) {
            onExecute(sql);
          }
        }
      });

      // Add Shift+Alt+F keybinding for format
      editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
        () => {
          handleFormat();
        }
      );

      // 监听选择变化
      editor.onDidChangeCursorSelection(() => {
        const selection = editor.getSelection();
        const hasSelectedText = selection && !selection.isEmpty();
        setHasSelection(!!hasSelectedText);
      });

      // Focus the editor
      editor.focus();
    },
    [onExecute, isConnected, isExecuting, getSqlToExecute, handleFormat]
  );

  /**
   * Handle content change
   */
  const handleChange = React.useCallback(
    (newValue: string | undefined) => {
      onChange(newValue ?? "");
    },
    [onChange]
  );

  /**
   * Update keybinding when dependencies change
   */
  React.useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (editor && monaco) {
      // Re-add the keybinding with updated closure
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          if (isConnected && !isExecuting) {
            const sql = getSqlToExecute();
            if (sql.trim()) {
              onExecute(sql);
            }
          }
        }
      );
    }
  }, [onExecute, isConnected, isExecuting, getSqlToExecute]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Toolbar */}
      <EditorToolbar
        onExecute={handleExecute}
        onCancel={handleCancel}
        onExplain={onExplain}
        onAddFavorite={onAddFavorite}
        onFormat={handleFormat}
        isExecuting={isExecuting}
        isConnected={isConnected}
        connectionId={connectionId}
        hasSelection={hasSelection}
      />

      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="sql"
          language="sql"
          value={value}
          onChange={handleChange}
          onMount={handleEditorMount}
          theme={isDarkTheme ? "vs-dark" : "light"}
          options={{
            // Basic editor options
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineNumbers: "on",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            readOnly,

            // SQL-specific options
            tabSize: 2,
            insertSpaces: true,

            // UI options
            renderLineHighlight: "line",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,

            // Bracket matching
            bracketPairColorization: { enabled: true },
            matchBrackets: "always",

            // Suggestions and autocomplete
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,

            // Folding
            folding: true,
            foldingStrategy: "indentation",

            // Padding
            padding: { top: 8, bottom: 8 },
          }}
          loading={
            <div className="flex h-full items-center justify-center bg-background">
              <LoadingSpinner className="h-8 w-8 text-muted-foreground" />
            </div>
          }
        />
      </div>
    </div>
  );
}

// ============================================================================
// Connected SqlEditor Component
// ============================================================================

/**
 * SqlEditor connected to the app store
 *
 * This component automatically syncs with the active tab and connection,
 * making it easier to use in the main application.
 * 支持执行选中的 SQL 或全部 SQL。
 */

interface ConnectedSqlEditorProps {
  className?: string;
  onExplain?: () => void;
  onAddFavorite?: () => void;
}

export function ConnectedSqlEditor({ className, onExplain, onAddFavorite }: ConnectedSqlEditorProps) {
  const t = useT();
  const activeTab = useActiveTab();
  const activeConnection = useActiveConnection();
  const updateTabContent = useAppStore((state) => state.updateTabContent);
  const executeQuery = useAppStore((state) => state.executeQuery);

  // Handle content change
  const handleChange = React.useCallback(
    (value: string) => {
      if (activeTab) {
        updateTabContent(activeTab.id, value);
      }
    },
    [activeTab, updateTabContent]
  );

  // Handle execute - 接收要执行的 SQL（可能是选中的部分）
  const handleExecute = React.useCallback(async (sql: string) => {
    if (sql.trim()) {
      try {
        await executeQuery(sql);
      } catch (error) {
        // Error is handled by the store and displayed in the tab
        console.error("Query execution failed:", error);
      }
    }
  }, [executeQuery]);

  if (!activeTab) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <p className="text-muted-foreground">{t('sqlEditor.noActiveTab')}</p>
      </div>
    );
  }

  return (
    <SqlEditor
      value={activeTab.content}
      onChange={handleChange}
      onExecute={handleExecute}
      onExplain={onExplain}
      onAddFavorite={onAddFavorite}
      connectionId={activeConnection?.id ?? ""}
      className={className}
    />
  );
}

export default SqlEditor;
