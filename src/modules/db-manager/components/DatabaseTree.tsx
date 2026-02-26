import * as React from "react";
import { cn } from "@/lib/utils";
import { useT } from '@/i18n';
import { Input } from "@/components/ui/input";
import {
  useAppStore,
  ConnectionConfig,
  ConnectionStatus,
  tauriCommands,
} from "../store/index";

// ============================================================================
// Props
// ============================================================================

export interface DatabaseTreeProps {
  onSelectTable?: (connectionId: string, tableName: string, database?: string) => void;
  onSelectConnection?: (connectionId: string) => void;
  className?: string;
}

// ============================================================================
// Icons (inline SVG)
// ============================================================================

const ServerIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" />
  </svg>
);
const DatabaseIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);
const TableIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);
const ViewIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const FunctionIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2c-1.7 0-3 1.3-3 3v4c0 1.7-1.3 3-3 3 1.7 0 3 1.3 3 3v4c0 1.7 1.3 3 3 3" /><path d="M14 2c1.7 0 3 1.3 3 3v4c0 1.7 1.3 3 3 3-1.7 0-3 1.3-3 3v4c0 1.7-1.3 3-3 3" />
  </svg>
);
const TriggerIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={cn("h-3.5 w-3.5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
);
const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={cn("h-3.5 w-3.5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
);
const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const PlugIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
  </svg>
);
const UnplugIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 5 3-3" /><path d="m2 22 3-3" /><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" />
    <path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z" />
  </svg>
);
const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-4 w-4", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={cn("h-3.5 w-3.5", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ============================================================================
// Status Indicator
// ============================================================================

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    connected: "bg-success shadow-[0_0_6px_hsl(var(--success)/0.5)]",
    disconnected: "bg-muted-foreground/40",
    connecting: "bg-warning animate-pulse",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", colors[status])} />;
}

// ============================================================================
// Context Menu
// ============================================================================

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  type: "connection" | "database" | "table" | null;
  connectionId: string | null;
  database: string | null;
  table: string | null;
}

const INITIAL_CONTEXT: ContextMenuState = { isOpen: false, x: 0, y: 0, type: null, connectionId: null, database: null, table: null };

function ContextMenu({ state, onClose, actions }: {
  state: ContextMenuState;
  onClose: () => void;
  actions: {
    onConnect: () => void; onDisconnect: () => void; onRefresh: () => void;
    onDelete: () => void; onViewData: () => void; onViewStructure: () => void;
    onCopyName: () => void; onGenerateSelect: () => void;
    isConnected: boolean; isConnecting: boolean;
  };
}) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const t = useT();

  React.useEffect(() => {
    if (!state.isOpen) return;
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose(); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [state.isOpen, onClose]);

  if (!state.isOpen) return null;

  const MenuItem = ({ icon, label, onClick, danger, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) => (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors cursor-pointer",
        danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-accent hover:text-accent-foreground",
        disabled && "opacity-50 pointer-events-none"
      )}
      onClick={() => { onClick(); onClose(); }}
      disabled={disabled}
    >{icon}<span>{label}</span></button>
  );

  const Divider = () => <div className="my-1 h-px bg-border" />;

  return (
    <div ref={menuRef} className="fixed z-50 min-w-[200px] rounded-lg border border-border bg-popover p-1 shadow-xl animate-in fade-in-0 zoom-in-95" style={{ left: state.x, top: state.y }}>
      {state.type === "connection" && (<>
        {!actions.isConnected
          ? <MenuItem icon={<PlugIcon />} label={actions.isConnecting ? t('dbManager.connecting') : t('dbManager.connect')} onClick={actions.onConnect} disabled={actions.isConnecting} />
          : <MenuItem icon={<UnplugIcon />} label={t('dbManager.disconnect')} onClick={actions.onDisconnect} />
        }
        <MenuItem icon={<RefreshIcon />} label={t('dbManager.refresh')} onClick={actions.onRefresh} disabled={!actions.isConnected} />
        <Divider />
        <MenuItem icon={<TrashIcon />} label={t('dbManager.deleteConnection')} onClick={actions.onDelete} danger />
      </>)}
      {state.type === "database" && (<>
        <MenuItem icon={<RefreshIcon />} label={t('dbManager.refresh')} onClick={actions.onRefresh} />
        <MenuItem icon={<CopyIcon />} label={t('dbManager.copyName')} onClick={actions.onCopyName} />
      </>)}
      {state.type === "table" && (<>
        <MenuItem icon={<TableIcon />} label={t('dbManager.viewData')} onClick={actions.onViewData} />
        <MenuItem icon={<TableIcon />} label={t('dbManager.viewStructure')} onClick={actions.onViewStructure} />
        <Divider />
        <MenuItem icon={<CopyIcon />} label={t('dbManager.copyName')} onClick={actions.onCopyName} />
        <MenuItem icon={<CopyIcon />} label={t('dbManager.generateSelect')} onClick={actions.onGenerateSelect} />
      </>)}
    </div>
  );
}

// ============================================================================
// Tree Node
// ============================================================================

function TreeNode({ label, icon, isExpanded, isExpandable, isSelected, level = 0, statusIndicator, onClick, onDoubleClick, onContextMenu, children }: {
  label: string; icon: React.ReactNode; isExpanded?: boolean; isExpandable?: boolean;
  isSelected?: boolean; level?: number; statusIndicator?: React.ReactNode;
  onClick?: () => void; onDoubleClick?: () => void; onContextMenu?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="select-none">
      <div
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
          "hover:bg-accent/60", isSelected && "bg-accent font-medium"
        )}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}
        onContextMenu={onContextMenu}
        role="treeitem"
        tabIndex={0}
      >
        {isExpandable ? (
          <span className="flex-shrink-0">{isExpanded ? <ChevronDown className="text-muted-foreground" /> : <ChevronRight className="text-muted-foreground" />}</span>
        ) : <span className="w-3.5 flex-shrink-0" />}
        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {statusIndicator}
      </div>
      {isExpanded && children && <div role="group">{children}</div>}
    </div>
  );
}

// ============================================================================
// Object Group Node (Tables, Views, Functions, etc.)
// ============================================================================

function ObjectGroup({ label, icon, items, level, onItemClick, onItemContextMenu, searchQuery }: {
  label: string; icon: React.ReactNode; items: string[]; level: number;
  onItemClick: (name: string) => void; onItemContextMenu?: (e: React.MouseEvent, name: string) => void;
  searchQuery: string;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const filtered = searchQuery ? items.filter(i => i.toLowerCase().includes(searchQuery.toLowerCase())) : items;
  if (filtered.length === 0 && searchQuery) return null;

  return (
    <TreeNode
      label={`${label} (${filtered.length})`}
      icon={icon}
      isExpanded={expanded}
      isExpandable={filtered.length > 0}
      level={level}
      onClick={() => setExpanded(!expanded)}
    >
      {filtered.map(name => (
        <TreeNode
          key={name}
          label={name}
          icon={icon}
          level={level + 1}
          onClick={() => onItemClick(name)}
          onContextMenu={onItemContextMenu ? (e) => onItemContextMenu(e, name) : undefined}
        />
      ))}
    </TreeNode>
  );
}

// ============================================================================
// Main DatabaseTree Component
// ============================================================================

export function DatabaseTree({ onSelectTable, onSelectConnection, className }: DatabaseTreeProps) {
  const t = useT();
  const connections = useAppStore(s => s.connections);
  const connectionStatus = useAppStore(s => s.connectionStatus);
  const databases = useAppStore(s => s.databases);
  const tables = useAppStore(s => s.tables);
  const views = useAppStore(s => s.views);
  const functions = useAppStore(s => s.functions);
  const procedures = useAppStore(s => s.procedures);
  const triggers = useAppStore(s => s.triggers);
  const expandedNodes = useAppStore(s => s.expandedNodes);
  const loadedDatabases = useAppStore(s => s.loadedDatabases);
  const treeSearchQuery = useAppStore(s => s.treeSearchQuery);

  const connect = useAppStore(s => s.connect);
  const disconnect = useAppStore(s => s.disconnect);
  const removeConnection = useAppStore(s => s.removeConnection);
  const refreshSchema = useAppStore(s => s.refreshSchema);
  const loadDatabaseObjects = useAppStore(s => s.loadDatabaseObjects);
  const toggleNodeExpansion = useAppStore(s => s.toggleNodeExpansion);
  const setTreeSearchQuery = useAppStore(s => s.setTreeSearchQuery);
  const openDataTab = useAppStore(s => s.openDataTab);

  const [contextMenu, setContextMenu] = React.useState<ContextMenuState>(INITIAL_CONTEXT);

  // Handle database node click — lazy load
  const handleDatabaseClick = React.useCallback(async (connId: string, database: string) => {
    const nodeId = `${connId}:${database}`;
    if (!loadedDatabases.has(database)) {
      await loadDatabaseObjects(database);
    }
    toggleNodeExpansion(nodeId);
  }, [loadedDatabases, loadDatabaseObjects, toggleNodeExpansion]);

  // Handle database refresh
  const handleDatabaseRefresh = React.useCallback(async (database: string) => {
    // Clear cache and reload
    useAppStore.setState(state => {
      const newLoaded = new Set(state.loadedDatabases);
      newLoaded.delete(database);
      return { loadedDatabases: newLoaded };
    });
    await loadDatabaseObjects(database);
  }, [loadDatabaseObjects]);

  // Context menu actions
  const contextActions = React.useMemo(() => {
    const connId = contextMenu.connectionId;
    const status = connId ? connectionStatus[connId] : 'disconnected';
    return {
      isConnected: status === 'connected',
      isConnecting: status === 'connecting',
      onConnect: () => connId && connect(connId),
      onDisconnect: () => connId && disconnect(connId),
      onRefresh: () => {
        if (contextMenu.type === 'connection' && connId) refreshSchema();
        if (contextMenu.type === 'database' && contextMenu.database) handleDatabaseRefresh(contextMenu.database);
      },
      onDelete: () => connId && removeConnection(connId),
      onViewData: () => {
        if (contextMenu.table && contextMenu.database) {
          openDataTab(contextMenu.table, contextMenu.database);
        }
      },
      onViewStructure: () => { /* TODO: open structure tab */ },
      onCopyName: () => {
        const name = contextMenu.table || contextMenu.database || '';
        navigator.clipboard.writeText(name);
      },
      onGenerateSelect: () => {
        if (contextMenu.table) {
          navigator.clipboard.writeText(`SELECT * FROM ${contextMenu.table} LIMIT 100;`);
        }
      },
    };
  }, [contextMenu, connectionStatus, connect, disconnect, refreshSchema, removeConnection, openDataTab, handleDatabaseRefresh]);

  const handleContextMenu = React.useCallback((e: React.MouseEvent, type: ContextMenuState['type'], connId: string, database?: string, table?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ isOpen: true, x: e.clientX, y: e.clientY, type, connectionId: connId, database: database || null, table: table || null });
  }, []);

  // Filter connections/databases by search
  const searchLower = treeSearchQuery.toLowerCase();

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Search */}
      <div className="px-2 py-1.5 border-b border-border">
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={treeSearchQuery}
            onChange={e => setTreeSearchQuery(e.target.value)}
            placeholder={t('dbManager.searchPlaceholder')}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1" role="tree">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-1 px-4">
            <p>{t('dbManager.noConnections')}</p>
            <p className="text-[10px] opacity-60">{t('dbManager.noConnectionsHint')}</p>
          </div>
        ) : (
          connections.map(conn => {
            const status = connectionStatus[conn.id] || 'disconnected';
            const isConnected = status === 'connected';
            const connExpanded = expandedNodes.has(conn.id);
            const connDatabases = databases || [];

            // Filter by search
            if (searchLower && !conn.name.toLowerCase().includes(searchLower)) {
              // Check if any child matches
              const hasChildMatch = connDatabases.some(db => {
                if (db.toLowerCase().includes(searchLower)) return true;
                const dbTables = tables[db] || [];
                return dbTables.some(t => t.toLowerCase().includes(searchLower));
              });
              if (!hasChildMatch) return null;
            }

            return (
              <TreeNode
                key={conn.id}
                label={conn.name}
                icon={<ServerIcon className="text-primary" />}
                isExpanded={connExpanded}
                isExpandable={isConnected && connDatabases.length > 0}
                statusIndicator={<StatusIndicator status={status} />}
                onClick={() => {
                  onSelectConnection?.(conn.id);
                  if (isConnected && connDatabases.length > 0) toggleNodeExpansion(conn.id);
                }}
                onDoubleClick={() => { if (!isConnected) connect(conn.id); }}
                onContextMenu={(e) => handleContextMenu(e, 'connection', conn.id)}
              >
                {isConnected && connDatabases
                  .filter(db => !searchLower || db.toLowerCase().includes(searchLower) ||
                    (tables[db] || []).some(t => t.toLowerCase().includes(searchLower)))
                  .map(database => {
                    const dbNodeId = `${conn.id}:${database}`;
                    const isDbExpanded = expandedNodes.has(dbNodeId);
                    const isLoaded = loadedDatabases.has(database);
                    const dbTables = tables[database] || [];
                    const dbViews = views[database] || [];
                    const dbFunctions = functions[database] || [];
                    const dbProcedures = procedures[database] || [];
                    const dbTriggers = triggers[database] || [];

                    return (
                      <TreeNode
                        key={database}
                        label={database}
                        icon={<DatabaseIcon className={isLoaded ? "text-warning" : "text-muted-foreground"} />}
                        isExpanded={isDbExpanded}
                        isExpandable={isLoaded}
                        level={1}
                        onClick={() => handleDatabaseClick(conn.id, database)}
                        onContextMenu={(e) => handleContextMenu(e, 'database', conn.id, database)}
                      >
                        {isLoaded && (<>
                          <ObjectGroup
                            label={t('dbManager.tables')}
                            icon={<TableIcon className="text-success" />}
                            items={dbTables}
                            level={2}
                            searchQuery={treeSearchQuery}
                            onItemClick={(name) => {
                              onSelectTable?.(conn.id, name, database);
                              openDataTab(name, database);
                            }}
                            onItemContextMenu={(e, name) => handleContextMenu(e, 'table', conn.id, database, name)}
                          />
                          {dbViews.length > 0 && (
                            <ObjectGroup label={t('dbManager.views')} icon={<ViewIcon className="text-blue-400" />} items={dbViews} level={2} searchQuery={treeSearchQuery} onItemClick={() => {}} />
                          )}
                          {dbFunctions.length > 0 && (
                            <ObjectGroup label={t('dbManager.functions')} icon={<FunctionIcon className="text-purple-400" />} items={dbFunctions} level={2} searchQuery={treeSearchQuery} onItemClick={() => {}} />
                          )}
                          {dbProcedures.length > 0 && (
                            <ObjectGroup label={t('dbManager.procedures')} icon={<FunctionIcon className="text-orange-400" />} items={dbProcedures} level={2} searchQuery={treeSearchQuery} onItemClick={() => {}} />
                          )}
                          {dbTriggers.length > 0 && (
                            <ObjectGroup label={t('dbManager.triggers')} icon={<TriggerIcon className="text-red-400" />} items={dbTriggers} level={2} searchQuery={treeSearchQuery} onItemClick={() => {}} />
                          )}
                        </>)}
                      </TreeNode>
                    );
                  })}
              </TreeNode>
            );
          })
        )}
      </div>

      {/* Context Menu */}
      <ContextMenu state={contextMenu} onClose={() => setContextMenu(INITIAL_CONTEXT)} actions={contextActions} />
    </div>
  );
}
