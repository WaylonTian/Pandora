// Database Manager - Tauri Commands Module
// This module implements all Tauri commands that bridge the frontend and backend.
// Commands handle connection management, query execution, schema operations, and configuration.

use super::config::{create_config_store_from_app, ConfigStore, FileConfigStore};
use super::connection::{ConnectionManager, DefaultConnectionManager};
use super::query::{DefaultQueryExecutor, QueryExecutor};
use super::schema::{DefaultSchemaManager, SchemaManager};
use super::types::{ConnectionConfig, ConnectionId, ExplainResult, FavoriteItem, QueryResult, TableInfo, DatabaseType, Value};
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

// Import the main AppState
use crate::AppState;

// ============================================================================
// Database Context Switching
// ============================================================================

/// 在执行操作前切换数据库上下文
async fn switch_database_context(
    conn: &Arc<dyn super::connection::DatabaseConnection>,
    database: &Option<String>,
    query_executor: &dyn QueryExecutor,
) -> Result<(), String> {
    if let Some(db) = database {
        if db.is_empty() {
            return Ok(());
        }
        let switch_sql = match conn.db_type() {
            DatabaseType::MySQL => format!("USE `{}`", db.replace('`', "``")),
            DatabaseType::PostgreSQL => format!("SET search_path TO \"{}\"", db.replace('"', "\"\"")),
            DatabaseType::SQLite => return Ok(()), // 单文件数据库，无需切换
        };
        query_executor
            .execute(conn.clone(), &switch_sql)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ============================================================================
// Application State
// ============================================================================

/// Database state managed by Tauri
/// Contains all the managers needed for database operations
pub struct DbState {
    /// Connection manager for handling database connections
    pub connection_manager: Arc<DefaultConnectionManager>,
    /// Query executor for running SQL queries
    pub query_executor: Arc<DefaultQueryExecutor>,
    /// Schema manager for database schema operations
    pub schema_manager: Arc<DefaultSchemaManager>,
    /// Config store for persistent storage (initialized lazily)
    pub config_store: RwLock<Option<FileConfigStore>>,
}

impl DbState {
    /// Creates a new DbState with default implementations
    pub fn new() -> Self {
        Self {
            connection_manager: Arc::new(DefaultConnectionManager::new()),
            query_executor: Arc::new(DefaultQueryExecutor::new()),
            schema_manager: Arc::new(DefaultSchemaManager::new()),
            config_store: RwLock::new(None),
        }
    }
}

impl Default for DbState {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Gets or initializes the config store
async fn get_config_store(
    app: &tauri::AppHandle,
    state: &State<'_, AppState>,
) -> Result<FileConfigStore, String> {
    let mut store_guard = state.db_state.config_store.write().await;
    
    if store_guard.is_none() {
        let store = create_config_store_from_app(app)
            .map_err(|e| e.to_string())?;
        *store_guard = Some(store);
    }
    
    store_guard.clone().ok_or_else(|| "Config store not initialized".to_string())
}

// ============================================================================
// Connection Management Commands
// ============================================================================

/// Creates a new database connection and returns the connection ID
/// 
/// # Arguments
/// * `config` - The connection configuration
/// 
/// # Returns
/// * `Ok(String)` - The connection ID on success
/// * `Err(String)` - Error message on failure
/// 
/// **Validates: Requirements 1.1, 1.4**
#[tauri::command]
pub async fn create_connection(
    config: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Validate the configuration
    config.validate().map_err(|e| e.to_string())?;
    
    // Create the connection
    let conn_id = state
        .db_state.connection_manager
        .create_connection(&config)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(conn_id.0)
}

/// Tests if a connection can be established with the given configuration
/// 
/// # Arguments
/// * `config` - The connection configuration to test
/// 
/// # Returns
/// * `Ok(true)` - Connection test successful
/// * `Err(String)` - Error message with connection failure details
/// 
/// **Validates: Requirements 1.3**
#[tauri::command]
pub async fn test_connection(
    config: ConnectionConfig,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    state
        .db_state.connection_manager
        .test_connection(&config)
        .await
        .map_err(|e| e.to_string())
}

/// Connects to a database using a saved connection configuration
/// 
/// # Arguments
/// * `connection_id` - The ID of the saved connection configuration
/// 
/// # Returns
/// * `Ok(String)` - The active connection ID
/// * `Err(String)` - Error message on failure
/// 
/// **Validates: Requirements 1.4**
#[tauri::command]
pub async fn connect(
    connection_id: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Load the connection configuration from storage
    let config_store = get_config_store(&app, &state).await?;
    let connections = config_store.load_connections().map_err(|e| e.to_string())?;
    
    // Find the connection configuration
    let config = connections
        .into_iter()
        .find(|c| c.id == connection_id)
        .ok_or_else(|| format!("Connection configuration '{}' not found", connection_id))?;
    
    // Create the connection
    let conn_id = state
        .db_state.connection_manager
        .create_connection(&config)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(conn_id.0)
}

/// Disconnects from a database
/// 
/// # Arguments
/// * `connection_id` - The ID of the active connection to close
/// 
/// # Returns
/// * `Ok(())` - Connection closed successfully
/// * `Err(String)` - Error message on failure
/// 
/// **Validates: Requirements 1.4**
#[tauri::command]
pub async fn disconnect(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn_id = ConnectionId::from_string(connection_id);
    
    state
        .db_state.connection_manager
        .close_connection(&conn_id)
        .await
        .map_err(|e| e.to_string())
}

// ============================================================================
// Query Commands
// ============================================================================

/// Executes a SQL query on the specified connection
/// 
/// # Arguments
/// * `connection_id` - The ID of the active connection
/// * `sql` - The SQL query to execute
/// 
/// # Returns
/// * `Ok(QueryResult)` - The query result with columns, rows, and execution info
/// * `Err(String)` - Error message with query failure details
/// 
/// **Validates: Requirements 3.2**
#[tauri::command]
pub async fn execute_query(
    connection_id: String,
    sql: String,
    database: Option<String>,
    state: State<'_, AppState>,
) -> Result<QueryResult, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    
    // Get the connection
    let conn = state
        .db_state.connection_manager
        .get_connection(&conn_id)
        .await
        .map_err(|e| e.to_string())?;
    
    // Switch database context if specified
    switch_database_context(&conn, &database, &*state.db_state.query_executor).await?;
    
    // Execute the query
    state
        .db_state.query_executor
        .execute(conn, &sql)
        .await
        .map_err(|e| e.to_string())
}

/// Executes multiple SQL statements in batch
/// 
/// # Arguments
/// * `connection_id` - The ID of the active connection
/// * `sql` - The SQL string containing multiple statements separated by semicolons
/// 
/// # Returns
/// * `Ok(Vec<QueryResult>)` - Array of query results, one for each statement
/// * `Err(String)` - Error message with query failure details
/// 
/// **Validates: Requirements 3.2, 3.5**
#[tauri::command]
pub async fn execute_batch(
    connection_id: String,
    sql: String,
    database: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<QueryResult>, String> {
    use super::query::split_sql_statements;
    
    let conn_id = ConnectionId::from_string(connection_id);
    
    // Get the connection
    let conn = state
        .db_state.connection_manager
        .get_connection(&conn_id)
        .await
        .map_err(|e| e.to_string())?;
    
    // Switch database context if specified
    switch_database_context(&conn, &database, &*state.db_state.query_executor).await?;
    
    // Split SQL into individual statements
    let statements = split_sql_statements(&sql);
    
    if statements.is_empty() {
        return Ok(vec![]);
    }
    
    // Convert to &str references
    let stmt_refs: Vec<&str> = statements.iter().map(|s| s.as_str()).collect();
    
    // Execute batch
    state
        .db_state.query_executor
        .execute_batch(conn, stmt_refs)
        .await
        .map_err(|e| e.to_string())
}

// ============================================================================
// Schema Commands
// ============================================================================

/// Lists all databases available on the connection
/// 
/// # Arguments
/// * `connection_id` - The ID of the active connection
/// 
/// # Returns
/// * `Ok(Vec<String>)` - List of database names
/// * `Err(String)` - Error message on failure
/// 
/// **Validates: Requirements 5.1**
#[tauri::command]
pub async fn list_databases(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    
    // Get the connection
    let conn = state
        .db_state.connection_manager
        .get_connection(&conn_id)
        .await
        .map_err(|e| e.to_string())?;
    
    // List databases
    state
        .db_state.schema_manager
        .list_databases(conn)
        .await
        .map_err(|e| e.to_string())
}

/// Lists all tables in a specific database
/// 
/// # Arguments
/// * `connection_id` - The ID of the active connection
/// * `database` - The database name (or schema for PostgreSQL)
/// 
/// # Returns
/// * `Ok(Vec<String>)` - List of table names
/// * `Err(String)` - Error message on failure
/// 
/// **Validates: Requirements 5.1**
#[tauri::command]
pub async fn list_tables(
    connection_id: String,
    database: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    
    // Get the connection
    let conn = state
        .db_state.connection_manager
        .get_connection(&conn_id)
        .await
        .map_err(|e| e.to_string())?;
    
    // List tables
    state
        .db_state.schema_manager
        .list_tables(conn, &database)
        .await
        .map_err(|e| e.to_string())
}

/// Gets detailed information about a table
/// 
/// # Arguments
/// * `connection_id` - The ID of the active connection
/// * `table` - The table name
/// 
/// # Returns
/// * `Ok(TableInfo)` - Detailed table information including columns, indexes, and foreign keys
/// * `Err(String)` - Error message on failure
/// 
/// **Validates: Requirements 5.1**
#[tauri::command]
pub async fn get_table_info(
    connection_id: String,
    table: String,
    database: Option<String>,
    state: State<'_, AppState>,
) -> Result<TableInfo, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    
    // Get the connection
    let conn = state
        .db_state.connection_manager
        .get_connection(&conn_id)
        .await
        .map_err(|e| e.to_string())?;
    
    // Switch database context if specified
    switch_database_context(&conn, &database, &*state.db_state.query_executor).await?;
    
    // Get table info
    state
        .db_state.schema_manager
        .get_table_info(conn, &table)
        .await
        .map_err(|e| e.to_string())
}

/// Gets the CREATE TABLE DDL statement for a table
/// 
/// # Arguments
/// * `connection_id` - The ID of the active connection
/// * `table` - The table name
/// 
/// # Returns
/// * `Ok(String)` - The CREATE TABLE SQL statement
/// * `Err(String)` - Error message on failure
#[tauri::command]
pub async fn get_table_ddl(
    connection_id: String,
    table: String,
    database: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    
    // Get the connection
    let conn = state
        .db_state.connection_manager
        .get_connection(&conn_id)
        .await
        .map_err(|e| e.to_string())?;
    
    // Switch database context if specified
    switch_database_context(&conn, &database, &*state.db_state.query_executor).await?;
    
    // Get table info first
    let table_info = state
        .db_state.schema_manager
        .get_table_info(conn.clone(), &table)
        .await
        .map_err(|e| e.to_string())?;
    
    // Generate DDL from table info
    let ddl = super::schema::generate_create_table_sql(&table_info, conn.db_type());
    
    Ok(ddl)
}

// ============================================================================
// Configuration Commands
// ============================================================================

/// Saves a connection configuration to persistent storage
/// 
/// # Arguments
/// * `config` - The connection configuration to save
/// 
/// # Returns
/// * `Ok(())` - Configuration saved successfully
/// * `Err(String)` - Error message on failure
/// 
/// **Validates: Requirements 1.2**
#[tauri::command]
pub async fn save_connection_config(
    config: ConnectionConfig,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config_store = get_config_store(&app, &state).await?;
    
    config_store
        .save_connection(&config)
        .map_err(|e| e.to_string())
}

/// Loads all saved connection configurations from persistent storage
/// 
/// # Returns
/// * `Ok(Vec<ConnectionConfig>)` - List of saved connection configurations
/// * `Err(String)` - Error message on failure
/// 
/// **Validates: Requirements 1.2**
#[tauri::command]
pub async fn load_connection_configs(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<ConnectionConfig>, String> {
    let config_store = get_config_store(&app, &state).await?;
    
    config_store
        .load_connections()
        .map_err(|e| e.to_string())
}

/// Deletes a connection configuration from persistent storage
/// 
/// # Arguments
/// * `connection_id` - The ID of the connection configuration to delete
/// 
/// # Returns
/// * `Ok(())` - Configuration deleted successfully
/// * `Err(String)` - Error message on failure
/// 
/// **Validates: Requirements 1.2**
#[tauri::command]
pub async fn delete_connection_config(
    connection_id: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config_store = get_config_store(&app, &state).await?;
    
    config_store
        .delete_connection(&connection_id)
        .map_err(|e| e.to_string())
}

// ============================================================================
// Favorites Commands (收藏夹命令)
// ============================================================================

/// 保存收藏项
/// 
/// # Arguments
/// * `item` - 要保存的收藏项
/// 
/// # Returns
/// * `Ok(())` - 保存成功
/// * `Err(String)` - 错误信息
#[tauri::command]
pub async fn save_favorite(
    item: FavoriteItem,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config_store = get_config_store(&app, &state).await?;
    
    config_store
        .save_favorite(&item)
        .map_err(|e| e.to_string())
}

/// 加载所有收藏项
/// 
/// # Returns
/// * `Ok(Vec<FavoriteItem>)` - 收藏项列表
/// * `Err(String)` - 错误信息
#[tauri::command]
pub async fn load_favorites(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<FavoriteItem>, String> {
    let config_store = get_config_store(&app, &state).await?;
    
    config_store
        .load_favorites()
        .map_err(|e| e.to_string())
}

/// 删除收藏项
/// 
/// # Arguments
/// * `id` - 要删除的收藏项 ID
/// 
/// # Returns
/// * `Ok(())` - 删除成功
/// * `Err(String)` - 错误信息
#[tauri::command]
pub async fn delete_favorite(
    id: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let config_store = get_config_store(&app, &state).await?;
    
    config_store
        .delete_favorite(&id)
        .map_err(|e| e.to_string())
}

// ============================================================================
// EXPLAIN Commands (查询计划分析命令)
// ============================================================================

/// 获取 SQL 查询的执行计划
/// 
/// # Arguments
/// * `connection_id` - 连接 ID
/// * `sql` - 要分析的 SQL 语句
/// * `analyze` - 是否执行 EXPLAIN ANALYZE（会实际执行查询）
/// 
/// # Returns
/// * `Ok(ExplainResult)` - 执行计划结果
/// * `Err(String)` - 错误信息
#[tauri::command]
pub async fn explain_query(
    connection_id: String,
    sql: String,
    analyze: bool,
    database: Option<String>,
    state: State<'_, AppState>,
) -> Result<ExplainResult, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    
    // 获取连接
    let conn = state
        .db_state.connection_manager
        .get_connection(&conn_id)
        .await
        .map_err(|e| e.to_string())?;
    
    // Switch database context if specified
    switch_database_context(&conn, &database, &*state.db_state.query_executor).await?;
    
    // 根据数据库类型构建 EXPLAIN 语句
    let explain_sql = match conn.db_type() {
        DatabaseType::MySQL => {
            if analyze {
                format!("EXPLAIN ANALYZE {}", sql)
            } else {
                format!("EXPLAIN {}", sql)
            }
        }
        DatabaseType::PostgreSQL => {
            if analyze {
                format!("EXPLAIN (ANALYZE, FORMAT TEXT) {}", sql)
            } else {
                format!("EXPLAIN (FORMAT TEXT) {}", sql)
            }
        }
        DatabaseType::SQLite => {
            format!("EXPLAIN QUERY PLAN {}", sql)
        }
    };
    
    // 执行 EXPLAIN 查询
    let result = state
        .db_state.query_executor
        .execute(conn.clone(), &explain_sql)
        .await
        .map_err(|e| e.to_string())?;
    
    // 将结果转换为 ExplainResult
    let mut explain_result = ExplainResult::empty(sql);
    
    // 构建原始执行计划文本
    let mut raw_plan_lines: Vec<String> = Vec::new();
    for row in &result.rows {
        let line: String = row
            .iter()
            .map(|v| match v {
                Value::String(s) => s.clone(),
                Value::Integer(i) => i.to_string(),
                Value::Float(f) => f.to_string(),
                Value::Null => "NULL".to_string(),
                Value::Bool(b) => b.to_string(),
                Value::Bytes(_) => "[BYTES]".to_string(),
            })
            .collect::<Vec<_>>()
            .join(" | ");
        raw_plan_lines.push(line);
    }
    explain_result.raw_plan = raw_plan_lines.join("\n");
    
    // 分析执行计划并生成警告
    let warnings = analyze_explain_plan(&explain_result.raw_plan, conn.db_type());
    explain_result.warnings = warnings;
    
    Ok(explain_result)
}

/// 分析执行计划并生成优化建议
fn analyze_explain_plan(raw_plan: &str, db_type: DatabaseType) -> Vec<String> {
    let mut warnings = Vec::new();
    let plan_lower = raw_plan.to_lowercase();
    
    match db_type {
        DatabaseType::MySQL => {
            // MySQL 特定的警告检测
            if plan_lower.contains("full table scan") || plan_lower.contains("all") {
                warnings.push("⚠️ 检测到全表扫描，考虑添加索引以提高性能".to_string());
            }
            if plan_lower.contains("using filesort") {
                warnings.push("⚠️ 使用了文件排序，考虑为 ORDER BY 列添加索引".to_string());
            }
            if plan_lower.contains("using temporary") {
                warnings.push("⚠️ 使用了临时表，可能影响性能".to_string());
            }
            if plan_lower.contains("using where") && !plan_lower.contains("using index") {
                warnings.push("💡 WHERE 条件未完全使用索引".to_string());
            }
        }
        DatabaseType::PostgreSQL => {
            // PostgreSQL 特定的警告检测
            if plan_lower.contains("seq scan") {
                warnings.push("⚠️ 检测到顺序扫描 (Seq Scan)，考虑添加索引".to_string());
            }
            if plan_lower.contains("nested loop") && plan_lower.contains("seq scan") {
                warnings.push("⚠️ 嵌套循环中包含顺序扫描，可能导致性能问题".to_string());
            }
            if plan_lower.contains("hash join") {
                warnings.push("💡 使用了 Hash Join，对于大表可能消耗较多内存".to_string());
            }
        }
        DatabaseType::SQLite => {
            // SQLite 特定的警告检测
            if plan_lower.contains("scan table") && !plan_lower.contains("using index") {
                warnings.push("⚠️ 检测到全表扫描，考虑添加索引".to_string());
            }
            if plan_lower.contains("use temp b-tree") {
                warnings.push("⚠️ 使用了临时 B-Tree，可能影响性能".to_string());
            }
        }
    }
    
    // 通用警告
    if warnings.is_empty() {
        warnings.push("✅ 执行计划看起来正常".to_string());
    }
    
    warnings
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use DatabaseType;

    #[test]
    fn test_app_state_creation() {
        let state = DbState::new();
        // Verify state is created successfully
        assert!(Arc::strong_count(&state.db_state.connection_manager) >= 1);
        assert!(Arc::strong_count(&state.db_state.query_executor) >= 1);
        assert!(Arc::strong_count(&state.db_state.schema_manager) >= 1);
    }

    #[test]
    fn test_connection_id_from_string() {
        let id = ConnectionId::from_string("test-id-123");
        assert_eq!(id.0, "test-id-123");
    }

    #[test]
    fn test_connection_config_validation() {
        // Valid MySQL config
        let mut config = ConnectionConfig {
            id: "test".to_string(),
            name: "Test MySQL".to_string(),
            db_type: DatabaseType::MySQL,
            host: Some("localhost".to_string()),
            port: Some(3306),
            username: Some("root".to_string()),
            password: None,
            database: "testdb".to_string(),
            file_path: None,
        };
        assert!(config.validate().is_ok());

        // Invalid MySQL config (missing host)
        config.host = None;
        assert!(config.validate().is_err());

        // Valid SQLite config
        let sqlite_config = ConnectionConfig {
            id: "test-sqlite".to_string(),
            name: "Test SQLite".to_string(),
            db_type: DatabaseType::SQLite,
            host: None,
            port: None,
            username: None,
            password: None,
            database: "main".to_string(),
            file_path: Some("/path/to/db.sqlite".to_string()),
        };
        assert!(sqlite_config.validate().is_ok());
    }
}


// ============================================================================
// Batch Import Commands
// ============================================================================

/// 批量导入数据到表
/// 
/// # Arguments
/// * `connection_id` - 连接 ID
/// * `table_name` - 目标表名
/// * `columns` - 列名列表
/// * `rows` - 数据行列表
/// 
/// # Returns
/// * `Ok(usize)` - 成功导入的行数
/// * `Err(String)` - 错误信息
#[tauri::command]
pub async fn batch_import(
    connection_id: String,
    table_name: String,
    columns: Vec<String>,
    rows: Vec<Vec<Value>>,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    
    let conn = state
        .db_state.connection_manager
        .get_connection(&conn_id)
        .await
        .map_err(|e| e.to_string())?;
    
    let mut imported = 0;
    let batch_size = 100;
    
    for chunk in rows.chunks(batch_size) {
        let mut values_list: Vec<String> = Vec::new();
        
        for row in chunk {
            let values: Vec<String> = row
                .iter()
                .map(|v| match v {
                    Value::Null => "NULL".to_string(),
                    Value::Bool(b) => if *b { "TRUE" } else { "FALSE" }.to_string(),
                    Value::Integer(i) => i.to_string(),
                    Value::Float(f) => f.to_string(),
                    Value::String(s) => format!("'{}'", s.replace('\'', "''")),
                    Value::Bytes(b) => format!("X'{}'", hex::encode(b)),
                })
                .collect();
            values_list.push(format!("({})", values.join(", ")));
        }
        
        let sql = format!(
            "INSERT INTO {} ({}) VALUES {}",
            table_name,
            columns.join(", "),
            values_list.join(", ")
        );
        
        state
            .db_state.query_executor
            .execute(conn.clone(), &sql)
            .await
            .map_err(|e| e.to_string())?;
        
        imported += chunk.len();
    }
    
    Ok(imported)
}

// ============================================================================
// Table Statistics Commands
// ============================================================================

/// 表统计信息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TableStats {
    pub table_name: String,
    pub row_count: i64,
    pub data_size: i64,
    pub index_size: i64,
    pub total_size: i64,
}

/// 获取数据库中所有表的统计信息
#[tauri::command]
pub async fn get_table_stats(
    connection_id: String,
    database: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<TableStats>, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    
    let conn = state
        .db_state.connection_manager
        .get_connection(&conn_id)
        .await
        .map_err(|e| e.to_string())?;
    
    // Switch database context if specified
    switch_database_context(&conn, &database, &*state.db_state.query_executor).await?;
    
    let sql = match conn.db_type() {
        DatabaseType::MySQL => {
            "SELECT 
                TABLE_NAME as table_name,
                TABLE_ROWS as row_count,
                DATA_LENGTH as data_size,
                INDEX_LENGTH as index_size,
                DATA_LENGTH + INDEX_LENGTH as total_size
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY total_size DESC".to_string()
        }
        DatabaseType::PostgreSQL => {
            "SELECT 
                relname as table_name,
                n_live_tup as row_count,
                pg_table_size(relid) as data_size,
                pg_indexes_size(relid) as index_size,
                pg_total_relation_size(relid) as total_size
            FROM pg_stat_user_tables
            ORDER BY total_size DESC".to_string()
        }
        DatabaseType::SQLite => {
            // SQLite 没有直接的表大小统计，返回行数
            "SELECT name as table_name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'".to_string()
        }
    };
    
    let result = state
        .db_state.query_executor
        .execute(conn.clone(), &sql)
        .await
        .map_err(|e| e.to_string())?;
    
    let mut stats: Vec<TableStats> = Vec::new();
    
    if conn.db_type() == DatabaseType::SQLite {
        // SQLite: 需要单独查询每个表的行数
        for row in &result.rows {
            if let Some(Value::String(table_name)) = row.get(0) {
                let count_sql = format!("SELECT COUNT(*) FROM {}", table_name);
                if let Ok(count_result) = state.db_state.query_executor.execute(conn.clone(), &count_sql).await {
                    let row_count = count_result.rows.get(0)
                        .and_then(|r| r.get(0))
                        .map(|v| match v {
                            Value::Integer(i) => *i,
                            _ => 0,
                        })
                        .unwrap_or(0);
                    
                    stats.push(TableStats {
                        table_name: table_name.clone(),
                        row_count,
                        data_size: 0,
                        index_size: 0,
                        total_size: 0,
                    });
                }
            }
        }
    } else {
        for row in &result.rows {
            let table_name = match row.get(0) {
                Some(Value::String(s)) => s.clone(),
                _ => continue,
            };
            let row_count = match row.get(1) {
                Some(Value::Integer(i)) => *i,
                _ => 0,
            };
            let data_size = match row.get(2) {
                Some(Value::Integer(i)) => *i,
                _ => 0,
            };
            let index_size = match row.get(3) {
                Some(Value::Integer(i)) => *i,
                _ => 0,
            };
            let total_size = match row.get(4) {
                Some(Value::Integer(i)) => *i,
                _ => 0,
            };
            
            stats.push(TableStats {
                table_name,
                row_count,
                data_size,
                index_size,
                total_size,
            });
        }
    }
    
    Ok(stats)
}


// ============================================================================
// Schema Object Commands (Views, Functions, Procedures, Triggers)
// ============================================================================

#[tauri::command]
pub async fn list_views(
    connection_id: String,
    database: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    let conn = state.db_state.connection_manager.get_connection(&conn_id).await.map_err(|e| e.to_string())?;
    super::schema::list_views(conn, &database).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_functions(
    connection_id: String,
    database: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    let conn = state.db_state.connection_manager.get_connection(&conn_id).await.map_err(|e| e.to_string())?;
    super::schema::list_functions(conn, &database).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_procedures(
    connection_id: String,
    database: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    let conn = state.db_state.connection_manager.get_connection(&conn_id).await.map_err(|e| e.to_string())?;
    super::schema::list_procedures(conn, &database).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_triggers(
    connection_id: String,
    database: String,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let conn_id = ConnectionId::from_string(connection_id);
    let conn = state.db_state.connection_manager.get_connection(&conn_id).await.map_err(|e| e.to_string())?;
    super::schema::list_triggers(conn, &database).await.map_err(|e| e.to_string())
}


// ============================================================================
// Query Cancel Command
// ============================================================================

#[tauri::command]
pub async fn cancel_query(
    connection_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn_id = ConnectionId::from_string(connection_id);
    let conn = state.db_state.connection_manager.get_connection(&conn_id).await.map_err(|e| e.to_string())?;

    match conn.db_type() {
        DatabaseType::MySQL => {
            // MySQL: get thread id and kill it via a separate connection
            use mysql_async::prelude::*;
            let mysql_conn = conn.as_any().downcast_ref::<super::connection::MySqlConnection>()
                .ok_or("Invalid connection type")?;
            let mut c = mysql_conn.get_conn().await.map_err(|e| e.to_string())?;
            let thread_id: Option<u32> = c.query_first("SELECT CONNECTION_ID()").await.map_err(|e| e.to_string())?;
            if let Some(tid) = thread_id {
                let _ = c.query_drop(format!("KILL QUERY {}", tid)).await;
            }
            Ok(())
        }
        DatabaseType::PostgreSQL => {
            let pg_conn = conn.as_any().downcast_ref::<super::connection::PostgresConnection>()
                .ok_or("Invalid connection type")?;
            let client = pg_conn.get_client().await;
            let _ = client.execute("SELECT pg_cancel_backend(pg_backend_pid())", &[]).await;
            Ok(())
        }
        DatabaseType::SQLite => {
            // SQLite: interrupt via the connection handle
            let sqlite_conn = conn.as_any().downcast_ref::<super::connection::SqliteConnection>()
                .ok_or("Invalid connection type")?;
            let conn_guard = sqlite_conn.get_connection().lock().map_err(|e| e.to_string())?;
            conn_guard.get_interrupt_handle().interrupt();
            Ok(())
        }
    }
}
