// Database Manager - Zustand Store
// This module implements the global state management for the application.
// It includes connection state, query state, and schema state with Tauri invoke wrappers.

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported database types
 */
export type DatabaseType = 'MySQL' | 'PostgreSQL' | 'SQLite';

/**
 * Configuration for a database connection
 * Mirrors the Rust ConnectionConfig struct
 */
export interface ConnectionConfig {
  id: string;
  name: string;
  db_type: DatabaseType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  file_path?: string;
}

/**
 * Connection status for tracking connection state
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

/**
 * Information about a column in a query result
 */
export interface ColumnInfo {
  name: string;
  data_type: string;
}

/**
 * A value that can be stored in a database cell
 */
export type Value = null | boolean | number | string | number[];

/**
 * Result of a query execution
 */
export interface QueryResult {
  columns: ColumnInfo[];
  rows: Value[][];
  affected_rows: number;
  execution_time_ms: number;
}

/**
 * Tab content type
 */
export type TabType = 'query' | 'data' | 'structure';

/**
 * A query tab in the editor
 */
export interface QueryTab {
  id: string;
  title: string;
  content: string;
  connectionId: string | null;
  results: QueryResult[]; // 支持多个结果
  error: string | null;
  isExecuting: boolean;
  // 新增字段
  type: TabType;
  tableName?: string; // 用于 data 和 structure 类型
  database?: string; // 当前 tab 操作的数据库
}

/**
 * A record of a previously executed query
 */
export interface QueryHistoryItem {
  id: string;
  connection_id: string;
  sql: string;
  executed_at: string;
  execution_time_ms: number;
  success: boolean;
  error_message?: string;
}

/**
 * Definition of a table column
 */
export interface ColumnDefinition {
  name: string;
  data_type: string;
  nullable: boolean;
  default_value?: string;
  is_primary_key: boolean;
  is_auto_increment: boolean;
}

/**
 * Information about a table index
 */
export interface IndexInfo {
  name: string;
  columns: string[];
  is_unique: boolean;
  is_primary: boolean;
}

/**
 * Information about a foreign key relationship
 */
export interface ForeignKeyInfo {
  name: string;
  columns: string[];
  referenced_table: string;
  referenced_columns: string[];
  on_delete?: string;
  on_update?: string;
}

/**
 * Complete information about a database table
 */
export interface TableInfo {
  name: string;
  schema?: string;
  columns: ColumnDefinition[];
  indexes: IndexInfo[];
  foreign_keys: ForeignKeyInfo[];
}

// ============================================================================
// 收藏夹类型 (Favorites)
// ============================================================================

/**
 * 收藏项类型
 */
export type FavoriteType = 'Table' | 'Query';

/**
 * 收藏项
 */
export interface FavoriteItem {
  id: string;
  favorite_type: FavoriteType;
  name: string;
  connection_id: string;
  table_name?: string;
  database_name?: string;
  sql?: string;
  created_at: string;
}

// ============================================================================
// 查询执行计划类型 (EXPLAIN)
// ============================================================================

/**
 * 执行计划结果
 */
export interface ExplainResult {
  sql: string;
  raw_plan: string;
  total_cost?: number;
  total_time_ms?: number;
  warnings: string[];
}

// ============================================================================
// State Interfaces
// ============================================================================

/**
 * Connection state slice
 * Manages database connections and their status
 * **Validates: Requirements 1.1, 1.4**
 */
export interface ConnectionState {
  connections: ConnectionConfig[];
  activeConnectionId: string | null;
  // 配置 ID 到实际连接 ID 的映射
  connectionIdMap: Record<string, string>;
  connectionStatus: Record<string, ConnectionStatus>;
  connectionError: string | null;
  isLoadingConnections: boolean;
}

/**
 * Query state slice
 * Manages query tabs and execution history
 * **Validates: Requirements 3.2, 6.4**
 */
export interface QueryState {
  tabs: QueryTab[];
  activeTabId: string;
  queryHistory: QueryHistoryItem[];
}

/**
 * Schema state slice
 * Manages database schema information
 */
export interface SchemaState {
  databases: string[];
  tables: Record<string, string[]>;
  tableInfo: Record<string, TableInfo>;
  expandedNodes: Set<string>;
  isLoadingSchema: boolean;
  schemaError: string | null;
  // Schema objects per database
  views: Record<string, string[]>;
  functions: Record<string, string[]>;
  procedures: Record<string, string[]>;
  triggers: Record<string, string[]>;
  // Lazy loading tracking
  loadedDatabases: Set<string>;
  // Tree search
  treeSearchQuery: string;
}

// ============================================================================
// Action Interfaces
// ============================================================================

/**
 * Connection-related actions
 */
export interface ConnectionActions {
  // Load saved connections from storage
  loadConnections: () => Promise<void>;
  // Add a new connection configuration
  addConnection: (config: ConnectionConfig) => Promise<void>;
  // Remove a connection configuration
  removeConnection: (id: string) => Promise<void>;
  // Connect to a database
  connect: (id: string) => Promise<void>;
  // Disconnect from a database
  disconnect: (id: string) => Promise<void>;
  // Test a connection configuration
  testConnection: (config: ConnectionConfig) => Promise<boolean>;
  // Set the active connection
  setActiveConnection: (id: string | null) => void;
  // Clear connection error
  clearConnectionError: () => void;
}

/**
 * Query-related actions
 */
export interface QueryActions {
  // Execute a SQL query
  executeQuery: (sql: string) => Promise<QueryResult>;
  // Add a new query tab
  addQueryTab: () => void;
  // Open or reuse a data browser tab for a table
  openDataTab: (tableName: string, database?: string) => void;
  // Close a query tab
  closeQueryTab: (id: string) => void;
  // Set the active tab
  setActiveTab: (id: string) => void;
  // Update tab content
  updateTabContent: (id: string, content: string) => void;
  // Update tab title
  updateTabTitle: (id: string, title: string) => void;
  // Update tab type
  updateTabType: (id: string, type: TabType, tableName?: string) => void;
  // Set tab connection
  setTabConnection: (id: string, connectionId: string | null) => void;
  // Clear tab result
  clearTabResult: (id: string) => void;
  // Add to query history
  addToHistory: (item: QueryHistoryItem) => void;
  // Clear query history
  clearHistory: () => void;
}

/**
 * Schema-related actions
 */
export interface SchemaActions {
  // Refresh the schema for the active connection
  refreshSchema: () => Promise<void>;
  // Load table information
  loadTableInfo: (tableName: string, database?: string) => Promise<void>;
  // Load tables for a database
  loadTables: (database: string) => Promise<void>;
  // Load all schema objects for a database (tables, views, functions, procedures, triggers)
  loadDatabaseObjects: (database: string) => Promise<void>;
  // Toggle node expansion in the tree
  toggleNodeExpansion: (nodeId: string) => void;
  // Expand a node in the tree (without toggling)
  expandNode: (nodeId: string) => void;
  // Clear schema state
  clearSchema: () => void;
  // Set tree search query
  setTreeSearchQuery: (query: string) => void;
}

// ============================================================================
// Combined Store Interface
// ============================================================================

export interface AppStore
  extends ConnectionState,
    QueryState,
    SchemaState,
    ConnectionActions,
    QueryActions,
    SchemaActions {}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generates a unique ID for tabs and other entities
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a default query tab
 */
function createDefaultTab(connectionId: string | null = null, type: TabType = 'query', tableName?: string, database?: string): QueryTab {
  return {
    id: generateId(),
    title: type === 'query' ? 'Query' : tableName ? `📊 ${tableName}` : 'Tab',
    content: '',
    connectionId,
    results: [],
    error: null,
    isExecuting: false,
    type,
    tableName,
    database,
  };
}

// ============================================================================
// Tauri Invoke Wrappers
// ============================================================================

/**
 * Wrapper for Tauri invoke calls with error handling
 */
async function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    // Convert error to string for consistent error handling
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }
}

// Connection commands
export const tauriCommands = {
  /**
   * Creates a new database connection
   * **Validates: Requirements 1.1, 1.4**
   */
  createConnection: (config: ConnectionConfig): Promise<string> =>
    tauriInvoke<string>('create_connection', { config }),

  /**
   * Tests a database connection
   * **Validates: Requirements 1.3**
   */
  testConnection: (config: ConnectionConfig): Promise<boolean> =>
    tauriInvoke<boolean>('test_connection', { config }),

  /**
   * Connects to a saved database configuration
   * **Validates: Requirements 1.4**
   */
  connect: (connectionId: string): Promise<string> =>
    tauriInvoke<string>('connect', { connectionId }),

  /**
   * Disconnects from a database
   * **Validates: Requirements 1.4**
   */
  disconnect: (connectionId: string): Promise<void> =>
    tauriInvoke<void>('disconnect', { connectionId }),

  /**
   * Executes a SQL query
   * **Validates: Requirements 3.2**
   */
  executeQuery: (connectionId: string, sql: string, database?: string): Promise<QueryResult> =>
    tauriInvoke<QueryResult>('execute_query', { connectionId, sql, database }),

  /**
   * Executes multiple SQL statements in batch
   * **Validates: Requirements 3.2, 3.5**
   */
  executeBatch: (connectionId: string, sql: string, database?: string): Promise<QueryResult[]> =>
    tauriInvoke<QueryResult[]>('execute_batch', { connectionId, sql, database }),

  /**
   * Lists all databases
   */
  listDatabases: (connectionId: string): Promise<string[]> =>
    tauriInvoke<string[]>('list_databases', { connectionId }),

  /**
   * Lists all tables in a database
   */
  listTables: (connectionId: string, database: string): Promise<string[]> =>
    tauriInvoke<string[]>('list_tables', { connectionId, database }),

  /**
   * Gets detailed table information
   */
  getTableInfo: (connectionId: string, table: string, database?: string): Promise<TableInfo> =>
    tauriInvoke<TableInfo>('get_table_info', { connectionId, table, database }),

  /**
   * Gets the CREATE TABLE DDL statement
   */
  getTableDdl: (connectionId: string, table: string, database?: string): Promise<string> =>
    tauriInvoke<string>('get_table_ddl', { connectionId, table, database }),

  /**
   * Saves a connection configuration
   * **Validates: Requirements 1.2**
   */
  saveConnectionConfig: (config: ConnectionConfig): Promise<void> =>
    tauriInvoke<void>('save_connection_config', { config }),

  /**
   * Loads all saved connection configurations
   * **Validates: Requirements 1.2**
   */
  loadConnectionConfigs: (): Promise<ConnectionConfig[]> =>
    tauriInvoke<ConnectionConfig[]>('load_connection_configs'),

  /**
   * Deletes a connection configuration
   * **Validates: Requirements 1.2**
   */
  deleteConnectionConfig: (connectionId: string): Promise<void> =>
    tauriInvoke<void>('delete_connection_config', { connectionId }),

  // =========================================================================
  // 收藏夹命令 (Favorites)
  // =========================================================================

  /**
   * 保存收藏项
   */
  saveFavorite: (item: FavoriteItem): Promise<void> =>
    tauriInvoke<void>('save_favorite', { item }),

  /**
   * 加载所有收藏项
   */
  loadFavorites: (): Promise<FavoriteItem[]> =>
    tauriInvoke<FavoriteItem[]>('load_favorites'),

  /**
   * 删除收藏项
   */
  deleteFavorite: (id: string): Promise<void> =>
    tauriInvoke<void>('delete_favorite', { id }),

  // =========================================================================
  // 查询计划分析命令 (EXPLAIN)
  // =========================================================================

  /**
   * 获取 SQL 查询的执行计划
   */
  explainQuery: (connectionId: string, sql: string, analyze: boolean = false, database?: string): Promise<ExplainResult> =>
    tauriInvoke<ExplainResult>('explain_query', { connectionId, sql, analyze, database }),

  // =========================================================================
  // 批量导入命令 (Batch Import)
  // =========================================================================

  /**
   * 批量导入数据到表
   */
  batchImport: (connectionId: string, tableName: string, columns: string[], rows: Value[][]): Promise<number> =>
    tauriInvoke<number>('batch_import', { connectionId, tableName, columns, rows }),

  // Schema object commands
  listViews: (connectionId: string, database: string): Promise<string[]> =>
    tauriInvoke<string[]>('list_views', { connectionId, database }),

  listFunctions: (connectionId: string, database: string): Promise<string[]> =>
    tauriInvoke<string[]>('list_functions', { connectionId, database }),

  listProcedures: (connectionId: string, database: string): Promise<string[]> =>
    tauriInvoke<string[]>('list_procedures', { connectionId, database }),

  listTriggers: (connectionId: string, database: string): Promise<string[]> =>
    tauriInvoke<string[]>('list_triggers', { connectionId, database }),

  cancelQuery: (connectionId: string): Promise<void> =>
    tauriInvoke<void>('cancel_query', { connectionId }),
};

// ============================================================================
// Store Implementation
// ============================================================================

/**
 * Main application store using Zustand
 * Combines connection, query, and schema state with their respective actions
 */
export const useAppStore = create<AppStore>((set, get) => ({
  // =========================================================================
  // Connection State
  // =========================================================================
  connections: [],
  activeConnectionId: null,
  connectionIdMap: {},
  connectionStatus: {},
  connectionError: null,
  isLoadingConnections: false,

  // =========================================================================
  // Query State
  // =========================================================================
  tabs: [createDefaultTab()],
  activeTabId: '',
  queryHistory: [],

  // =========================================================================
  // Schema State
  // =========================================================================
  databases: [],
  tables: {},
  tableInfo: {},
  expandedNodes: new Set<string>(),
  isLoadingSchema: false,
  schemaError: null,
  views: {},
  functions: {},
  procedures: {},
  triggers: {},
  loadedDatabases: new Set<string>(),
  treeSearchQuery: '',

  // =========================================================================
  // Connection Actions
  // =========================================================================

  /**
   * Loads saved connections from persistent storage
   * **Validates: Requirements 1.2**
   */
  loadConnections: async () => {
    set({ isLoadingConnections: true, connectionError: null });
    try {
      const connections = await tauriCommands.loadConnectionConfigs();
      set({ connections, isLoadingConnections: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ connectionError: errorMessage, isLoadingConnections: false });
    }
  },

  /**
   * Adds a new connection configuration and saves it
   * **Validates: Requirements 1.1, 1.2**
   */
  addConnection: async (config: ConnectionConfig) => {
    set({ connectionError: null });
    try {
      await tauriCommands.saveConnectionConfig(config);
      set((state) => ({
        connections: [...state.connections, config],
        connectionStatus: {
          ...state.connectionStatus,
          [config.id]: 'disconnected',
        },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ connectionError: errorMessage });
      throw error;
    }
  },

  /**
   * Removes a connection configuration
   * **Validates: Requirements 1.2**
   */
  removeConnection: async (id: string) => {
    set({ connectionError: null });
    try {
      // Disconnect if connected
      const status = get().connectionStatus[id];
      if (status === 'connected') {
        await tauriCommands.disconnect(id);
      }
      
      await tauriCommands.deleteConnectionConfig(id);
      
      set((state) => {
        const newStatus = { ...state.connectionStatus };
        delete newStatus[id];
        
        return {
          connections: state.connections.filter((c) => c.id !== id),
          connectionStatus: newStatus,
          activeConnectionId:
            state.activeConnectionId === id ? null : state.activeConnectionId,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ connectionError: errorMessage });
      throw error;
    }
  },

  /**
   * Connects to a database
   * **Validates: Requirements 1.4**
   */
  connect: async (id: string) => {
    set((state) => ({
      connectionStatus: { ...state.connectionStatus, [id]: 'connecting' },
      connectionError: null,
    }));
    
    try {
      // connect 返回的是实际的连接 ID（可能与配置 ID 不同）
      const actualConnectionId = await tauriCommands.connect(id);
      
      // 存储配置 ID 到实际连接 ID 的映射，并设置活动连接为配置 ID
      set((state) => ({
        connectionStatus: { ...state.connectionStatus, [id]: 'connected' },
        connectionIdMap: { ...state.connectionIdMap, [id]: actualConnectionId },
        activeConnectionId: id, // 使用配置 ID 作为活动连接 ID
      }));
      
      // Refresh schema after connecting (只加载数据库列表，不加载表)
      await get().refreshSchema();
      
      // 不自动展开连接节点，用户需要手动点击或双击来展开
      // 这样可以避免用户误以为所有数据库的表都被加载了
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set((state) => ({
        connectionStatus: { ...state.connectionStatus, [id]: 'disconnected' },
        connectionError: errorMessage,
      }));
      throw error;
    }
  },

  /**
   * Disconnects from a database
   * **Validates: Requirements 1.4**
   */
  disconnect: async (id: string) => {
    set({ connectionError: null });
    try {
      await tauriCommands.disconnect(id);
      set((state) => ({
        connectionStatus: { ...state.connectionStatus, [id]: 'disconnected' },
        activeConnectionId:
          state.activeConnectionId === id ? null : state.activeConnectionId,
      }));
      
      // Clear schema if this was the active connection
      if (get().activeConnectionId === null) {
        get().clearSchema();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ connectionError: errorMessage });
      throw error;
    }
  },

  /**
   * Tests a connection configuration
   * **Validates: Requirements 1.3**
   */
  testConnection: async (config: ConnectionConfig) => {
    set({ connectionError: null });
    try {
      return await tauriCommands.testConnection(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ connectionError: errorMessage });
      throw error;
    }
  },

  /**
   * Sets the active connection
   */
  setActiveConnection: (id: string | null) => {
    set({ activeConnectionId: id });
  },

  /**
   * Clears the connection error
   */
  clearConnectionError: () => {
    set({ connectionError: null });
  },

  // =========================================================================
  // Query Actions
  // =========================================================================

  /**
   * Executes a SQL query on the active connection
   * 支持多条 SQL 语句，返回多个结果
   * **Validates: Requirements 3.2**
   */
  executeQuery: async (sql: string) => {
    const { activeConnectionId, connectionIdMap, activeTabId } = get();
    
    if (!activeConnectionId) {
      throw new Error('No active connection');
    }
    
    // 获取实际的连接 ID
    const actualConnectionId = connectionIdMap[activeConnectionId] || activeConnectionId;
    
    // Set executing state
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === activeTabId
          ? { ...tab, isExecuting: true, error: null }
          : tab
      ),
    }));
    
    const startTime = Date.now();
    
    try {
      // 使用批量执行，支持多条 SQL
      const activeTab = get().tabs.find(t => t.id === activeTabId);
      const results = await tauriCommands.executeBatch(actualConnectionId, sql, activeTab?.database);
      
      // Update tab with results
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, results, isExecuting: false, error: null }
            : tab
        ),
      }));
      
      // Add to history (记录整个批量执行)
      const totalTime = results.reduce((sum, r) => sum + r.execution_time_ms, 0);
      const historyItem: QueryHistoryItem = {
        id: generateId(),
        connection_id: activeConnectionId,
        sql,
        executed_at: new Date().toISOString(),
        execution_time_ms: totalTime,
        success: true,
      };
      get().addToHistory(historyItem);
      
      // 返回第一个结果（保持向后兼容）
      return results[0] || { columns: [], rows: [], affected_rows: 0, execution_time_ms: 0 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Update tab with error
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, results: [], isExecuting: false, error: errorMessage }
            : tab
        ),
      }));
      
      // Add failed query to history
      const historyItem: QueryHistoryItem = {
        id: generateId(),
        connection_id: activeConnectionId,
        sql,
        executed_at: new Date().toISOString(),
        execution_time_ms: Date.now() - startTime,
        success: false,
        error_message: errorMessage,
      };
      get().addToHistory(historyItem);
      
      throw error;
    }
  },

  /**
   * Adds a new query tab
   * **Validates: Requirements 6.2**
   */
  addQueryTab: () => {
    const { activeConnectionId } = get();
    const newTab = createDefaultTab(activeConnectionId);
    
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
  },

  /**
   * Opens or reuses a data browser tab for a table
   */
  openDataTab: (tableName: string, database?: string) => {
    const { tabs, activeConnectionId } = get();
    
    // 查找是否已有该表的 data tab
    const existingTab = tabs.find(
      (tab) => tab.type === 'data' && tab.tableName === tableName && tab.database === database
    );
    
    if (existingTab) {
      // 复用已有的 tab
      set({ activeTabId: existingTab.id });
    } else {
      // 创建新的 data tab
      const newTab = createDefaultTab(activeConnectionId, 'data', tableName, database);
      set((state) => ({
        tabs: [...state.tabs, newTab],
        activeTabId: newTab.id,
      }));
    }
  },

  /**
   * Closes a query tab
   * **Validates: Requirements 6.2**
   */
  closeQueryTab: (id: string) => {
    set((state) => {
      const newTabs = state.tabs.filter((tab) => tab.id !== id);
      
      // Ensure at least one tab exists
      if (newTabs.length === 0) {
        const defaultTab = createDefaultTab(state.activeConnectionId);
        return {
          tabs: [defaultTab],
          activeTabId: defaultTab.id,
        };
      }
      
      // Update active tab if the closed tab was active
      let newActiveTabId = state.activeTabId;
      if (state.activeTabId === id) {
        const closedIndex = state.tabs.findIndex((tab) => tab.id === id);
        const newIndex = Math.min(closedIndex, newTabs.length - 1);
        newActiveTabId = newTabs[newIndex].id;
      }
      
      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
    });
  },

  /**
   * Sets the active tab
   * **Validates: Requirements 6.2**
   */
  setActiveTab: (id: string) => {
    set({ activeTabId: id });
  },

  /**
   * Updates the content of a tab
   */
  updateTabContent: (id: string, content: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, content } : tab
      ),
    }));
  },

  /**
   * Updates the title of a tab
   */
  updateTabTitle: (id: string, title: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, title } : tab
      ),
    }));
  },

  /**
   * Updates the type of a tab
   */
  updateTabType: (id: string, type: TabType, tableName?: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, type, tableName } : tab
      ),
    }));
  },

  /**
   * Sets the connection for a tab
   */
  setTabConnection: (id: string, connectionId: string | null) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, connectionId } : tab
      ),
    }));
  },

  /**
   * Clears the result of a tab
   */
  clearTabResult: (id: string) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, results: [], error: null } : tab
      ),
    }));
  },

  /**
   * Adds a query to the history
   * **Validates: Requirements 3.6**
   */
  addToHistory: (item: QueryHistoryItem) => {
    set((state) => ({
      queryHistory: [item, ...state.queryHistory].slice(0, 100), // Keep last 100 items
    }));
  },

  /**
   * Clears the query history
   */
  clearHistory: () => {
    set({ queryHistory: [] });
  },

  // =========================================================================
  // Schema Actions
  // =========================================================================

  /**
   * Refreshes the schema for the active connection
   */
  refreshSchema: async () => {
    const { activeConnectionId, connectionIdMap } = get();
    
    if (!activeConnectionId) {
      return;
    }
    
    // 获取实际的连接 ID
    const actualConnectionId = connectionIdMap[activeConnectionId] || activeConnectionId;
    
    set({ isLoadingSchema: true, schemaError: null });
    
    try {
      const databases = await tauriCommands.listDatabases(actualConnectionId);
      set({ databases, isLoadingSchema: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ schemaError: errorMessage, isLoadingSchema: false });
    }
  },

  /**
   * Loads tables for a specific database
   */
  loadTables: async (database: string) => {
    const { activeConnectionId, connectionIdMap } = get();
    
    if (!activeConnectionId) {
      return;
    }
    
    // 获取实际的连接 ID
    const actualConnectionId = connectionIdMap[activeConnectionId] || activeConnectionId;
    
    set({ isLoadingSchema: true, schemaError: null });
    
    try {
      const tables = await tauriCommands.listTables(actualConnectionId, database);
      set((state) => ({
        tables: { ...state.tables, [database]: tables },
        isLoadingSchema: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ schemaError: errorMessage, isLoadingSchema: false });
    }
  },

  /**
   * Loads all schema objects for a database (tables, views, functions, procedures, triggers)
   */
  loadDatabaseObjects: async (database: string) => {
    const { activeConnectionId, connectionIdMap } = get();
    if (!activeConnectionId) return;
    const actualConnectionId = connectionIdMap[activeConnectionId] || activeConnectionId;

    set({ isLoadingSchema: true, schemaError: null });
    try {
      const [tables, views, functions, procedures, triggers] = await Promise.all([
        tauriCommands.listTables(actualConnectionId, database),
        tauriCommands.listViews(actualConnectionId, database),
        tauriCommands.listFunctions(actualConnectionId, database),
        tauriCommands.listProcedures(actualConnectionId, database),
        tauriCommands.listTriggers(actualConnectionId, database),
      ]);
      set((state) => {
        const newLoaded = new Set(state.loadedDatabases);
        newLoaded.add(database);
        return {
          tables: { ...state.tables, [database]: tables },
          views: { ...state.views, [database]: views },
          functions: { ...state.functions, [database]: functions },
          procedures: { ...state.procedures, [database]: procedures },
          triggers: { ...state.triggers, [database]: triggers },
          loadedDatabases: newLoaded,
          isLoadingSchema: false,
        };
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ schemaError: errorMessage, isLoadingSchema: false });
    }
  },

  /**
   * Loads detailed information about a table
   */
  loadTableInfo: async (tableName: string, database?: string) => {
    const { activeConnectionId, connectionIdMap } = get();
    
    if (!activeConnectionId) {
      return;
    }
    
    // 获取实际的连接 ID
    const actualConnectionId = connectionIdMap[activeConnectionId] || activeConnectionId;
    
    set({ isLoadingSchema: true, schemaError: null });
    
    try {
      const info = await tauriCommands.getTableInfo(actualConnectionId, tableName, database);
      set((state) => ({
        tableInfo: { ...state.tableInfo, [tableName]: info },
        isLoadingSchema: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      set({ schemaError: errorMessage, isLoadingSchema: false });
    }
  },

  /**
   * Toggles the expansion state of a node in the tree
   */
  toggleNodeExpansion: (nodeId: string) => {
    set((state) => {
      const newExpandedNodes = new Set(state.expandedNodes);
      if (newExpandedNodes.has(nodeId)) {
        newExpandedNodes.delete(nodeId);
      } else {
        newExpandedNodes.add(nodeId);
      }
      return { expandedNodes: newExpandedNodes };
    });
  },

  /**
   * Expands a node in the tree (without toggling - only adds)
   */
  expandNode: (nodeId: string) => {
    set((state) => {
      const newExpandedNodes = new Set(state.expandedNodes);
      newExpandedNodes.add(nodeId);
      return { expandedNodes: newExpandedNodes };
    });
  },

  /**
   * Clears all schema state
   */
  clearSchema: () => {
    set({
      databases: [],
      tables: {},
      tableInfo: {},
      expandedNodes: new Set<string>(),
      schemaError: null,
      views: {},
      functions: {},
      procedures: {},
      triggers: {},
      loadedDatabases: new Set<string>(),
      treeSearchQuery: '',
    });
  },

  setTreeSearchQuery: (query: string) => {
    set({ treeSearchQuery: query });
  },
}));

// Initialize the active tab ID after store creation
const initialState = useAppStore.getState();
if (initialState.tabs.length > 0 && !initialState.activeTabId) {
  useAppStore.setState({ activeTabId: initialState.tabs[0].id });
}

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Selector for getting the active connection
 */
export const useActiveConnection = () =>
  useAppStore((state) => {
    const { activeConnectionId, connections } = state;
    return connections.find((c) => c.id === activeConnectionId) ?? null;
  });

/**
 * Selector for getting the actual connection ID (for backend calls)
 */
export const useActualConnectionId = () =>
  useAppStore((state) => {
    const { activeConnectionId, connectionIdMap } = state;
    if (!activeConnectionId) return null;
    return connectionIdMap[activeConnectionId] || activeConnectionId;
  });

/**
 * Selector for getting the active tab
 */
export const useActiveTab = () =>
  useAppStore((state) => {
    const { activeTabId, tabs } = state;
    return tabs.find((t) => t.id === activeTabId) ?? null;
  });

/**
 * Selector for getting connected connections
 */
export const useConnectedConnections = () =>
  useAppStore((state) => {
    const { connections, connectionStatus } = state;
    return connections.filter((c) => connectionStatus[c.id] === 'connected');
  });

/**
 * Selector for checking if a connection is connected
 */
export const useIsConnected = (connectionId: string) =>
  useAppStore((state) => state.connectionStatus[connectionId] === 'connected');

export default useAppStore;
