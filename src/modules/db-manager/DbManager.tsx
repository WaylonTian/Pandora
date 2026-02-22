import * as React from "react";
import { Button } from "@/components/ui/button";
import { useT } from '@/i18n';

// Layout and Navigation Components
import { AppLayout } from "./components/Layout";
import { DatabaseTree } from "./components/DatabaseTree";
import { TabBar } from "./components/TabBar";

// Editor and Result Components
import { ConnectedSqlEditor } from "./components/SqlEditor";
import { ConnectedQueryResult } from "./components/QueryResult";

// Dialog and Panel Components
import { ConnectionDialog } from "./components/ConnectionDialog";
import { QueryHistory } from "./components/QueryHistory";
import { ConfirmDialog, useConfirmDialog } from "./components/ConfirmDialog";
import { ExplainPanel } from "./components/ExplainPanel";
import { Favorites } from "./components/Favorites";

// Error Handling and Loading Components
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingOverlay } from "./components/LoadingOverlay";

// Data and Structure Components
import { DataBrowser } from "./components/DataBrowser";
import { TableStructure } from "./components/TableStructure";
import { TableMetaPanel } from "./components/TableMetaPanel";

// Hooks

import { useAppState, getSidebarWidth } from "./hooks/useAppState";

// Store
import { useAppStore, useActiveConnection, useActualConnectionId, tauriCommands, FavoriteItem } from "./store/index";

// ============================================================================
// Icon Components - 使用一致的 Lucide 风格 SVG 图标
// ============================================================================


function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l4 2" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function DatabaseLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

// ============================================================================

// ============================================================================
// Sidebar Component - 重新设计为更现代的侧边栏
// ============================================================================

interface SidebarProps {
  onNewConnection: () => void;
  onSelectTable: (connectionId: string, tableName: string) => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  showFavorites: boolean;
  onToggleFavorites: () => void;
  onExecuteSql?: (sql: string) => void;
}

function Sidebar({
  onNewConnection,
  onSelectTable,
  showHistory,
  onToggleHistory,
  showFavorites,
  onToggleFavorites,
  onExecuteSql,
}: SidebarProps) {
  const t = useT();
  return (
    <div className="flex h-full flex-col">
      {/* 侧边栏头部 - 品牌区域 */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <DatabaseLogo className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight">DB Manager</span>
        <div className="flex-1" />
        <button
          onClick={onNewConnection}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
          title={t('dbManager.newConnection')}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {/* 数据库树 */}
      <div className="flex-1 overflow-hidden">
        <DatabaseTree onSelectTable={onSelectTable} />
      </div>

      {/* 收藏夹折叠面板 */}
      <div className="border-t border-border">
        <button
          className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          onClick={onToggleFavorites}
        >
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-warning" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{t('dbManager.favorites')}</span>
          </div>
          {showFavorites ? (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          )}
        </button>
        {showFavorites && (
          <div className="h-48 overflow-hidden border-t border-border">
            <Favorites
              onOpenTable={(tableName) => onSelectTable("", tableName)}
              onExecuteSql={onExecuteSql}
            />
          </div>
        )}
      </div>

      {/* 查询历史折叠面板 */}
      <div className="border-t border-border">
        <button
          className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          onClick={onToggleHistory}
        >
          <div className="flex items-center gap-2">
            <HistoryIcon className="h-3.5 w-3.5" />
            <span>{t('dbManager.queryHistory')}</span>
          </div>
          {showHistory ? (
            <ChevronDownIcon className="h-3.5 w-3.5" />
          ) : (
            <ChevronUpIcon className="h-3.5 w-3.5" />
          )}
        </button>
        {showHistory && (
          <div className="h-64 overflow-hidden border-t border-border">
            <QueryHistory />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Content Component - 重新设计主内容区
// ============================================================================

function MainContent() {
  const t = useT();






  const activeConnection = useActiveConnection();
  const actualConnectionId = useActualConnectionId();
  const activeTab = useAppStore((state) => {
    const { activeTabId, tabs } = state;
    return tabs.find((t) => t.id === activeTabId) ?? null;
  });
  const activeConnectionId = useAppStore((state) => state.activeConnectionId);

  const [showExplain, setShowExplain] = React.useState(false);
  const [showAddFavorite, setShowAddFavorite] = React.useState(false);
  const [favoriteName, setFavoriteName] = React.useState("");

  const showMetaPanel = activeTab?.type === "data" && !!activeTab?.tableName;

  const handleExplain = React.useCallback(() => {
    setShowExplain(true);
  }, []);

  const handleAddFavorite = React.useCallback(() => {
    setShowAddFavorite(true);
    setFavoriteName("");
  }, []);

  const handleSaveFavorite = React.useCallback(async () => {
    if (!favoriteName.trim() || !activeTab?.content || !activeConnectionId) return;
    const item: FavoriteItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      favorite_type: 'Query',
      name: favoriteName.trim(),
      connection_id: activeConnectionId,
      sql: activeTab.content,
      created_at: new Date().toISOString(),
    };
    try {
      await tauriCommands.saveFavorite(item);
      setShowAddFavorite(false);
      setFavoriteName("");
    } catch (error) {
      console.error("保存收藏失败:", error);
    }
  }, [favoriteName, activeTab?.content, activeConnectionId]);

  const renderContent = () => {
    if (!activeTab) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
          <DatabaseLogo className="h-16 w-16 opacity-20" />
          <div className="text-center">
            <p className="text-lg font-medium">{t('dbManager.noOpenTabs')}</p>
            <p className="mt-1 text-sm">{t('dbManager.noOpenTabsHint')}</p>
          </div>
        </div>
      );
    }

    switch (activeTab.type) {
      case "data":
        if (!activeTab.tableName || !activeConnection || !actualConnectionId) {
          return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>{t('dbManager.selectTableToBrowse')}</p>
            </div>
          );
        }
        return (
          <DataBrowser
            connectionId={actualConnectionId}
            tableName={activeTab.tableName}
            pageSize={25}
            onEdit={(row, column, value) => {
              console.log("Edit:", row, column, value);
            }}
          />
        );

      case "structure":
        if (!activeTab.tableName) {
          return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>{t('dbManager.selectTableToViewStructure')}</p>
            </div>
          );
        }
        return <TableStructure tableName={activeTab.tableName} />;

      case "query":
      default:
        return (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-hidden border-b border-border">
              <ConnectedSqlEditor
                onExplain={handleExplain}
                onAddFavorite={handleAddFavorite}
              />
            </div>
            {showExplain && (
              <ExplainPanel
                sql={activeTab.content}
                isOpen={showExplain}
                onClose={() => setShowExplain(false)}
              />
            )}
            <div className="flex-1 overflow-hidden">
              <ConnectedQueryResult />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 顶部栏：标签页 */}
      <div className="flex items-center border-b border-border min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          <TabBar />
        </div>
      </div>

      {/* 内容区 + 可选的元数据面板 */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 min-w-0 overflow-hidden">{renderContent()}</div>
        {showMetaPanel && <TableMetaPanel />}
      </div>

      {/* 添加收藏对话框 */}
      {showAddFavorite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="animate-fade-in bg-card border border-border rounded-xl shadow-xl w-[420px] p-5">
            <h3 className="text-base font-semibold mb-4">{t('favorites.addToFavorites')}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">{t('favorites.nameLabel')}</label>
                <input
                  type="text"
                  value={favoriteName}
                  onChange={(e) => setFavoriteName(e.target.value)}
                  placeholder={t('favorites.nameInputPlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">{t('favorites.sqlLabel')}</label>
                <pre className="text-xs font-mono bg-muted/50 p-3 rounded-lg max-h-32 overflow-auto scrollbar-thin text-foreground/80">
                  {activeTab?.content || t('favorites.noContent')}
                </pre>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" size="sm" onClick={() => setShowAddFavorite(false)} className="cursor-pointer">
                {t('favorites.cancelButton')}
              </Button>
              <Button size="sm" onClick={handleSaveFavorite} disabled={!favoriteName.trim()} className="cursor-pointer">
                {t('favorites.saveButton')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main App Component
// ============================================================================

function AppContent() {
  const t = useT();

  useAppState();

  const [isInitializing, setIsInitializing] = React.useState(true);
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [showFavorites, setShowFavorites] = React.useState(false);

  const loadConnections = useAppStore((state) => state.loadConnections);
  const addQueryTab = useAppStore((state) => state.addQueryTab);
  const openDataTab = useAppStore((state) => state.openDataTab);
  const closeQueryTab = useAppStore((state) => state.closeQueryTab);
  const activeTabId = useAppStore((state) => state.activeTabId);
  const removeConnection = useAppStore((state) => state.removeConnection);
  const updateTabContent = useAppStore((state) => state.updateTabContent);

  const defaultSidebarWidth = React.useMemo(() => getSidebarWidth(), []);

  const deleteConnectionDialog = useConfirmDialog({
    title: t('dbManager.deleteConnection'),
    message: t('dbManager.confirmDeleteConnection'),
    confirmLabel: t('dbManager.delete'),
    cancelLabel: t('dbManager.cancel'),
    confirmVariant: "destructive",
  });

  const [connectionToDelete, setConnectionToDelete] = React.useState<string | null>(null);

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        await loadConnections();
      } catch (error) {
        console.error("Failed to initialize app:", error);
      } finally {
        setTimeout(() => { setIsInitializing(false); }, 300);
      }
    };
    initializeApp();
  }, [loadConnections]);

  const _handleDeleteConnection = React.useCallback(
    async (connectionId: string) => {
      setConnectionToDelete(connectionId);
      const confirmed = await deleteConnectionDialog.confirm();
      if (confirmed && connectionToDelete) {
        try {
          await removeConnection(connectionToDelete);
        } catch (error) {
          console.error("Failed to delete connection:", error);
        }
      }
      setConnectionToDelete(null);
    },
    [deleteConnectionDialog, connectionToDelete, removeConnection]
  );
  void _handleDeleteConnection;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        addQueryTab();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault();
        if (activeTabId) { closeQueryTab(activeTabId); }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addQueryTab, closeQueryTab, activeTabId]);

  const handleNewConnection = React.useCallback(() => {
    setIsConnectionDialogOpen(true);
  }, []);

  const handleSelectTable = React.useCallback(
    (_connectionId: string, tableName: string) => {
      openDataTab(tableName);
    },
    [openDataTab]
  );

  const handleToggleHistory = React.useCallback(() => {
    setShowHistory((prev) => !prev);
  }, []);

  const handleToggleFavorites = React.useCallback(() => {
    setShowFavorites((prev) => !prev);
  }, []);

  const handleExecuteSqlFromFavorite = React.useCallback((sql: string) => {
    addQueryTab();
    setTimeout(() => {
      const state = useAppStore.getState();
      if (state.activeTabId) {
        updateTabContent(state.activeTabId, sql);
      }
    }, 0);
  }, [addQueryTab, updateTabContent]);

  const sidebarContent = (
    <Sidebar
      onNewConnection={handleNewConnection}
      onSelectTable={handleSelectTable}
      showHistory={showHistory}
      onToggleHistory={handleToggleHistory}
      showFavorites={showFavorites}
      onToggleFavorites={handleToggleFavorites}
      onExecuteSql={handleExecuteSqlFromFavorite}
    />
  );

  const mainContent = (
    <MainContent />
  );

  return (
    <>
      <LoadingOverlay isVisible={isInitializing} message={t('dbManager.loading')} />
      <AppLayout
        sidebar={sidebarContent}
        main={mainContent}
        defaultSidebarWidth={defaultSidebarWidth}
      />
      <ConnectionDialog
        isOpen={isConnectionDialogOpen}
        onClose={() => setIsConnectionDialogOpen(false)}
      />
      <ConfirmDialog {...deleteConnectionDialog.dialogProps} />
    </>
  );
}

export function DbManager() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error("Application error:", error);
        console.error("Component stack:", errorInfo.componentStack);
      }}
    >
      <AppContent />
    </ErrorBoundary>
  );
}


