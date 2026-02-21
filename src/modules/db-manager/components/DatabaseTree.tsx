import * as React from "react";
import { cn } from "@/lib/utils";
import {
  useAppStore,
  ConnectionConfig,
  ConnectionStatus,
} from "../store/index";

/**
 * Database Tree Component
 *
 * Displays a hierarchical tree view of database connections, databases, and tables.
 * Supports expand/collapse, right-click context menus, and connection status indicators.
 *
 * Requirements: 6.1 - THE Database_Manager SHALL 提供侧边栏显示数据库结构树
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface DatabaseTreeProps {
  /** Callback when a table is selected */
  onSelectTable?: (connectionId: string, tableName: string) => void;
  /** Callback when a connection is selected */
  onSelectConnection?: (connectionId: string) => void;
  /** Optional className for the root container */
  className?: string;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  type: "connection" | "database" | "table" | null;
  connectionId: string | null;
  database: string | null;
  table: string | null;
}

// ============================================================================
// Icon Components
// ============================================================================

/** Server/Connection icon */
function ServerIcon({ className }: { className?: string }) {
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
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

/** Database icon */
function DatabaseIcon({ className }: { className?: string }) {
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
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

/** Table icon */
function TableIcon({ className }: { className?: string }) {
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
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

/** Chevron right icon for collapsed state */
function ChevronRightIcon({ className }: { className?: string }) {
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
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/** Chevron down icon for expanded state */
function ChevronDownIcon({ className }: { className?: string }) {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** Refresh icon */
function RefreshIcon({ className }: { className?: string }) {
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
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

/** Trash icon */
function TrashIcon({ className }: { className?: string }) {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/** Plug/Connect icon */
function PlugIcon({ className }: { className?: string }) {
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
      <path d="M12 22v-5" />
      <path d="M9 8V2" />
      <path d="M15 8V2" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
    </svg>
  );
}

/** Unplug/Disconnect icon */
function UnplugIcon({ className }: { className?: string }) {
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
      <path d="m19 5 3-3" />
      <path d="m2 22 3-3" />
      <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z" />
      <path d="M7.5 13.5 10 11" />
      <path d="M10.5 16.5 13 14" />
      <path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z" />
    </svg>
  );
}

// ============================================================================
// Status Indicator Component
// ============================================================================

interface StatusIndicatorProps {
  status: ConnectionStatus;
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  const statusColors: Record<ConnectionStatus, string> = {
    connected: "bg-success shadow-[0_0_6px_hsl(var(--success)/0.5)]",
    disconnected: "bg-muted-foreground/40",
    connecting: "bg-warning animate-pulse-subtle",
  };

  const statusLabels: Record<ConnectionStatus, string> = {
    connected: "已连接",
    disconnected: "未连接",
    connecting: "连接中",
  };

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full transition-all duration-300",
        statusColors[status]
      )}
      title={statusLabels[status]}
    />
  );
}

// ============================================================================
// Context Menu Component
// ============================================================================

interface ContextMenuProps {
  state: ContextMenuState;
  onClose: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  onDelete: () => void;
  isConnected: boolean;
  isConnecting: boolean;
}

function ContextMenu({
  state,
  onClose,
  onConnect,
  onDisconnect,
  onRefresh,
  onDelete,
  isConnected,
  isConnecting,
}: ContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (state.isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [state.isOpen, onClose]);

  if (!state.isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] animate-fade-in rounded-lg border border-border bg-popover p-1 shadow-xl"
      style={{ left: state.x, top: state.y }}
    >
      {state.type === "connection" && (
        <>
          {!isConnected ? (
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 cursor-pointer transition-colors"
              onClick={() => {
                onConnect();
                onClose();
              }}
              disabled={isConnecting}
            >
              <PlugIcon className="h-4 w-4" />
              {isConnecting ? "连接中..." : "连接"}
            </button>
          ) : (
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
              onClick={() => {
                onDisconnect();
                onClose();
              }}
            >
              <UnplugIcon className="h-4 w-4" />
              断开连接
            </button>
          )}
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 cursor-pointer transition-colors"
            onClick={() => {
              onRefresh();
              onClose();
            }}
            disabled={!isConnected}
          >
            <RefreshIcon className="h-4 w-4" />
            刷新
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            <TrashIcon className="h-4 w-4" />
            删除连接
          </button>
        </>
      )}
      {state.type === "database" && (
        <button
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
          onClick={() => {
            onRefresh();
            onClose();
          }}
        >
          <RefreshIcon className="h-4 w-4" />
          刷新表
        </button>
      )}
      {state.type === "table" && (
        <button
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
          onClick={() => {
            onRefresh();
            onClose();
          }}
        >
          <RefreshIcon className="h-4 w-4" />
          刷新
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Tree Node Components
// ============================================================================

interface TreeNodeProps {
  label: string;
  icon: React.ReactNode;
  isExpanded?: boolean;
  isExpandable?: boolean;
  isSelected?: boolean;
  level?: number;
  statusIndicator?: React.ReactNode;
  onClick?: () => void;
  onToggle?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

function TreeNode({
  label,
  icon,
  isExpanded = false,
  isExpandable = false,
  isSelected = false,
  level = 0,
  statusIndicator,
  onClick,
  onToggle,
  onDoubleClick,
  onContextMenu,
  children,
}: TreeNodeProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpandable && onToggle) {
      onToggle();
    }
    onClick?.();
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isExpandable && onToggle) {
        onToggle();
      }
      onClick?.();
    }
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-150",
          "hover:bg-accent/60 hover:text-accent-foreground",
          isSelected && "bg-accent text-accent-foreground font-medium"
        )}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={onContextMenu}
        onKeyDown={handleKeyDown}
        role="treeitem"
        aria-expanded={isExpandable ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
      >
        {isExpandable ? (
          <span className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}
        <span className="flex-shrink-0">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        {statusIndicator && (
          <span className="flex-shrink-0">{statusIndicator}</span>
        )}
      </div>
      {isExpanded && children && (
        <div role="group">{children}</div>
      )}
    </div>
  );
}

// ============================================================================
// Connection Node Component
// ============================================================================

interface ConnectionNodeProps {
  connection: ConnectionConfig;
  status: ConnectionStatus;
  isExpanded: boolean;
  databases: string[];
  tables: Record<string, string[]>;
  expandedNodes: Set<string>;
  onToggle: () => void;
  onSelect: () => void;
  onDoubleClick: () => void;
  onSelectTable: (tableName: string) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDatabaseToggle: (database: string) => void;
  onDatabaseDoubleClick: (database: string) => void;
  onDatabaseContextMenu: (e: React.MouseEvent, database: string) => void;
  onTableContextMenu: (e: React.MouseEvent, database: string, table: string) => void;
}

function ConnectionNode({
  connection,
  status,
  isExpanded,
  databases,
  tables,
  expandedNodes,
  onToggle,
  onSelect,
  onDoubleClick,
  onSelectTable,
  onContextMenu,
  onDatabaseToggle,
  onDatabaseDoubleClick,
  onDatabaseContextMenu,
  onTableContextMenu,
}: ConnectionNodeProps) {
  const isConnected = status === "connected";

  return (
    <TreeNode
      label={connection.name}
      icon={<ServerIcon className="text-primary" />}
      isExpanded={isExpanded}
      isExpandable={isConnected && databases.length > 0}
      statusIndicator={<StatusIndicator status={status} />}
      onClick={onSelect}
      onToggle={onToggle}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {isConnected &&
        databases.map((database) => {
          const dbNodeId = `${connection.id}:${database}`;
          const isDbExpanded = expandedNodes.has(dbNodeId);
          const dbTables = tables[database] || [];

          return (
            <TreeNode
              key={database}
              label={database}
              icon={<DatabaseIcon className="text-warning" />}
              isExpanded={isDbExpanded}
              isExpandable={true}
              level={1}
              onToggle={() => onDatabaseToggle(database)}
              onDoubleClick={() => onDatabaseDoubleClick(database)}
              onContextMenu={(e) => onDatabaseContextMenu(e, database)}
            >
              {dbTables.map((table) => (
                <TreeNode
                  key={table}
                  label={table}
                  icon={<TableIcon className="text-success" />}
                  level={2}
                  onClick={() => onSelectTable(table)}
                  onContextMenu={(e) => onTableContextMenu(e, database, table)}
                />
              ))}
            </TreeNode>
          );
        })}
    </TreeNode>
  );
}

// ============================================================================
// Main DatabaseTree Component
// ============================================================================

export function DatabaseTree({
  onSelectTable,
  onSelectConnection,
  className,
}: DatabaseTreeProps) {
  // Store state
  const connections = useAppStore((state) => state.connections);
  const connectionStatus = useAppStore((state) => state.connectionStatus);
  const databases = useAppStore((state) => state.databases);
  const tables = useAppStore((state) => state.tables);
  const expandedNodes = useAppStore((state) => state.expandedNodes);
  // Note: activeConnectionId is available in the store if needed for highlighting
  // const activeConnectionId = useAppStore((state) => state.activeConnectionId);

  // Store actions
  const connect = useAppStore((state) => state.connect);
  const disconnect = useAppStore((state) => state.disconnect);
  const removeConnection = useAppStore((state) => state.removeConnection);
  const refreshSchema = useAppStore((state) => state.refreshSchema);
  const loadTables = useAppStore((state) => state.loadTables);
  const toggleNodeExpansion = useAppStore((state) => state.toggleNodeExpansion);
  const setActiveConnection = useAppStore((state) => state.setActiveConnection);

  // Context menu state
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    type: null,
    connectionId: null,
    database: null,
    table: null,
  });

  // Close context menu
  const closeContextMenu = React.useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Handle connection context menu
  const handleConnectionContextMenu = React.useCallback(
    (e: React.MouseEvent, connectionId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        type: "connection",
        connectionId,
        database: null,
        table: null,
      });
    },
    []
  );

  // Handle database context menu
  const handleDatabaseContextMenu = React.useCallback(
    (e: React.MouseEvent, connectionId: string, database: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        type: "database",
        connectionId,
        database,
        table: null,
      });
    },
    []
  );

  // Handle table context menu
  const handleTableContextMenu = React.useCallback(
    (e: React.MouseEvent, connectionId: string, database: string, table: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        type: "table",
        connectionId,
        database,
        table,
      });
    },
    []
  );

  // Handle connect action
  const handleConnect = React.useCallback(async () => {
    if (contextMenu.connectionId) {
      try {
        await connect(contextMenu.connectionId);
      } catch (error) {
        console.error("Failed to connect:", error);
      }
    }
  }, [contextMenu.connectionId, connect]);

  // Handle disconnect action
  const handleDisconnect = React.useCallback(async () => {
    if (contextMenu.connectionId) {
      try {
        await disconnect(contextMenu.connectionId);
      } catch (error) {
        console.error("Failed to disconnect:", error);
      }
    }
  }, [contextMenu.connectionId, disconnect]);

  // Handle refresh action
  const handleRefresh = React.useCallback(async () => {
    if (contextMenu.type === "connection" && contextMenu.connectionId) {
      // Set active connection and refresh schema
      setActiveConnection(contextMenu.connectionId);
      await refreshSchema();
    } else if (contextMenu.type === "database" && contextMenu.database) {
      // Refresh tables for the database
      await loadTables(contextMenu.database);
    }
  }, [contextMenu, setActiveConnection, refreshSchema, loadTables]);

  // Handle delete action
  const handleDelete = React.useCallback(async () => {
    if (contextMenu.connectionId) {
      try {
        await removeConnection(contextMenu.connectionId);
      } catch (error) {
        console.error("Failed to delete connection:", error);
      }
    }
  }, [contextMenu.connectionId, removeConnection]);

  // Handle connection toggle
  const handleConnectionToggle = React.useCallback(
    (connectionId: string) => {
      toggleNodeExpansion(connectionId);
    },
    [toggleNodeExpansion]
  );

  // Handle database toggle
  const handleDatabaseToggle = React.useCallback(
    async (connectionId: string, database: string) => {
      const nodeId = `${connectionId}:${database}`;
      toggleNodeExpansion(nodeId);

      // Load tables if expanding and not already loaded
      if (!expandedNodes.has(nodeId) && !tables[database]) {
        setActiveConnection(connectionId);
        await loadTables(database);
      }
    },
    [toggleNodeExpansion, expandedNodes, tables, setActiveConnection, loadTables]
  );

  // Handle database double click - expand and load tables
  const handleDatabaseDoubleClick = React.useCallback(
    async (connectionId: string, database: string) => {
      const nodeId = `${connectionId}:${database}`;
      
      // 如果未展开，则展开并加载表
      if (!expandedNodes.has(nodeId)) {
        toggleNodeExpansion(nodeId);
        setActiveConnection(connectionId);
        await loadTables(database);
      } else {
        // 如果已展开，则折叠
        toggleNodeExpansion(nodeId);
      }
    },
    [expandedNodes, toggleNodeExpansion, setActiveConnection, loadTables]
  );

  // Handle connection select
  const handleConnectionSelect = React.useCallback(
    (connectionId: string) => {
      setActiveConnection(connectionId);
      onSelectConnection?.(connectionId);
    },
    [setActiveConnection, onSelectConnection]
  );

  // Handle connection double click - connect if disconnected
  const handleConnectionDoubleClick = React.useCallback(
    async (connectionId: string) => {
      const status = connectionStatus[connectionId] || "disconnected";
      if (status === "disconnected") {
        try {
          await connect(connectionId);
        } catch (error) {
          console.error("Failed to connect:", error);
        }
      }
    },
    [connectionStatus, connect]
  );

  // Handle table select
  const handleTableSelect = React.useCallback(
    (connectionId: string, tableName: string) => {
      setActiveConnection(connectionId);
      onSelectTable?.(connectionId, tableName);
    },
    [setActiveConnection, onSelectTable]
  );

  // Get current context menu connection status
  const contextConnectionStatus = contextMenu.connectionId
    ? connectionStatus[contextMenu.connectionId] || "disconnected"
    : "disconnected";

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">连接</h2>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-auto py-1 scrollbar-thin" role="tree" aria-label="数据库连接">
        {connections.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            <p>暂无连接</p>
            <p className="mt-1 text-xs">点击 + 创建新连接</p>
          </div>
        ) : (
          connections.map((connection) => {
            const status = connectionStatus[connection.id] || "disconnected";
            const isExpanded = expandedNodes.has(connection.id);
            const isConnected = status === "connected";

            return (
              <ConnectionNode
                key={connection.id}
                connection={connection}
                status={status}
                isExpanded={isExpanded}
                databases={isConnected ? databases : []}
                tables={tables}
                expandedNodes={expandedNodes}
                onToggle={() => handleConnectionToggle(connection.id)}
                onSelect={() => handleConnectionSelect(connection.id)}
                onDoubleClick={() => handleConnectionDoubleClick(connection.id)}
                onSelectTable={(tableName) =>
                  handleTableSelect(connection.id, tableName)
                }
                onContextMenu={(e) =>
                  handleConnectionContextMenu(e, connection.id)
                }
                onDatabaseToggle={(database) =>
                  handleDatabaseToggle(connection.id, database)
                }
                onDatabaseDoubleClick={(database) =>
                  handleDatabaseDoubleClick(connection.id, database)
                }
                onDatabaseContextMenu={(e, database) =>
                  handleDatabaseContextMenu(e, connection.id, database)
                }
                onTableContextMenu={(e, database, table) =>
                  handleTableContextMenu(e, connection.id, database, table)
                }
              />
            );
          })
        )}
      </div>

      {/* Context Menu */}
      <ContextMenu
        state={contextMenu}
        onClose={closeContextMenu}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onRefresh={handleRefresh}
        onDelete={handleDelete}
        isConnected={contextConnectionStatus === "connected"}
        isConnecting={contextConnectionStatus === "connecting"}
      />
    </div>
  );
}

export default DatabaseTree;
