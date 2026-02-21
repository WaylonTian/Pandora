// Database Manager - Core Data Types
// This module defines all the core data structures used throughout the application.

use serde::{Deserialize, Serialize};
use thiserror::Error;

// ============================================================================
// Database Type Enumeration
// ============================================================================

/// Supported database types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DatabaseType {
    MySQL,
    PostgreSQL,
    SQLite,
}

impl DatabaseType {
    /// Returns the default port for the database type
    pub fn default_port(&self) -> Option<u16> {
        match self {
            DatabaseType::MySQL => Some(3306),
            DatabaseType::PostgreSQL => Some(5432),
            DatabaseType::SQLite => None,
        }
    }

    /// Returns whether this database type requires a host connection
    pub fn requires_host(&self) -> bool {
        match self {
            DatabaseType::MySQL | DatabaseType::PostgreSQL => true,
            DatabaseType::SQLite => false,
        }
    }

    /// Returns whether this database type uses a file path
    pub fn uses_file_path(&self) -> bool {
        matches!(self, DatabaseType::SQLite)
    }
}

// ============================================================================
// Connection Configuration
// ============================================================================

/// Configuration for a database connection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    /// Unique identifier for the connection
    pub id: String,
    /// User-friendly name for the connection
    pub name: String,
    /// Type of database
    pub db_type: DatabaseType,
    /// Host address (for MySQL/PostgreSQL)
    pub host: Option<String>,
    /// Port number (for MySQL/PostgreSQL)
    pub port: Option<u16>,
    /// Username for authentication
    pub username: Option<String>,
    /// Password for authentication
    pub password: Option<String>,
    /// Database name
    pub database: String,
    /// File path (for SQLite)
    pub file_path: Option<String>,
}

impl ConnectionConfig {
    /// Creates a new connection configuration with a generated UUID
    pub fn new(name: String, db_type: DatabaseType, database: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            db_type,
            host: None,
            port: db_type.default_port(),
            username: None,
            password: None,
            database,
            file_path: None,
        }
    }

    /// Validates the connection configuration based on database type
    pub fn validate(&self) -> Result<(), DbError> {
        if self.name.trim().is_empty() {
            return Err(DbError::ValidationError {
                message: "Connection name cannot be empty".to_string(),
                field: Some("name".to_string()),
            });
        }

        match self.db_type {
            DatabaseType::MySQL | DatabaseType::PostgreSQL => {
                if self.host.as_ref().map_or(true, |h| h.trim().is_empty()) {
                    return Err(DbError::ValidationError {
                        message: "Host is required for MySQL/PostgreSQL connections".to_string(),
                        field: Some("host".to_string()),
                    });
                }
                if self.port.is_none() {
                    return Err(DbError::ValidationError {
                        message: "Port is required for MySQL/PostgreSQL connections".to_string(),
                        field: Some("port".to_string()),
                    });
                }
            }
            DatabaseType::SQLite => {
                if self.file_path.as_ref().map_or(true, |p| p.trim().is_empty()) {
                    return Err(DbError::ValidationError {
                        message: "File path is required for SQLite connections".to_string(),
                        field: Some("file_path".to_string()),
                    });
                }
            }
        }

        Ok(())
    }
}

// ============================================================================
// Query Results
// ============================================================================

/// Information about a column in a query result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    /// Column name
    pub name: String,
    /// Data type of the column
    pub data_type: String,
}

/// A value that can be stored in a database cell
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Value {
    Null,
    Bool(bool),
    Integer(i64),
    Float(f64),
    String(String),
    Bytes(Vec<u8>),
}

impl Value {
    /// Returns true if the value is null
    pub fn is_null(&self) -> bool {
        matches!(self, Value::Null)
    }
}

/// Result of a query execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    /// Column information
    pub columns: Vec<ColumnInfo>,
    /// Row data - each row is a vector of values
    pub rows: Vec<Vec<Value>>,
    /// Number of rows affected (for INSERT/UPDATE/DELETE)
    pub affected_rows: u64,
    /// Query execution time in milliseconds
    pub execution_time_ms: u64,
}

impl QueryResult {
    /// Creates an empty query result
    pub fn empty() -> Self {
        Self {
            columns: Vec::new(),
            rows: Vec::new(),
            affected_rows: 0,
            execution_time_ms: 0,
        }
    }

    /// Creates a query result for a non-SELECT statement
    pub fn affected(affected_rows: u64, execution_time_ms: u64) -> Self {
        Self {
            columns: Vec::new(),
            rows: Vec::new(),
            affected_rows,
            execution_time_ms,
        }
    }

    /// Validates that all rows have the same number of columns
    pub fn validate(&self) -> bool {
        let col_count = self.columns.len();
        self.rows.iter().all(|row| row.len() == col_count)
    }
}

// ============================================================================
// Table Information
// ============================================================================

/// Definition of a table column
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnDefinition {
    /// Column name
    pub name: String,
    /// Data type
    pub data_type: String,
    /// Whether the column allows NULL values
    pub nullable: bool,
    /// Default value expression
    pub default_value: Option<String>,
    /// Whether this column is part of the primary key
    pub is_primary_key: bool,
    /// Whether this column auto-increments
    pub is_auto_increment: bool,
}

impl ColumnDefinition {
    /// Creates a new column definition with minimal required fields
    pub fn new(name: String, data_type: String) -> Self {
        Self {
            name,
            data_type,
            nullable: true,
            default_value: None,
            is_primary_key: false,
            is_auto_increment: false,
        }
    }
}

/// Information about a table index
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexInfo {
    /// Index name
    pub name: String,
    /// Columns included in the index
    pub columns: Vec<String>,
    /// Whether this is a unique index
    pub is_unique: bool,
    /// Whether this is the primary key index
    pub is_primary: bool,
}

/// Information about a foreign key relationship
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForeignKeyInfo {
    /// Foreign key constraint name
    pub name: String,
    /// Columns in the source table
    pub columns: Vec<String>,
    /// Referenced table name
    pub referenced_table: String,
    /// Referenced columns in the target table
    pub referenced_columns: Vec<String>,
    /// ON DELETE action
    pub on_delete: Option<String>,
    /// ON UPDATE action
    pub on_update: Option<String>,
}

/// Complete information about a database table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    /// Table name
    pub name: String,
    /// Schema name (if applicable)
    pub schema: Option<String>,
    /// Column definitions
    pub columns: Vec<ColumnDefinition>,
    /// Index information
    pub indexes: Vec<IndexInfo>,
    /// Foreign key relationships
    pub foreign_keys: Vec<ForeignKeyInfo>,
}

impl TableInfo {
    /// Creates a new table info with just a name
    pub fn new(name: String) -> Self {
        Self {
            name,
            schema: None,
            columns: Vec::new(),
            indexes: Vec::new(),
            foreign_keys: Vec::new(),
        }
    }

    /// Returns the primary key columns
    pub fn primary_key_columns(&self) -> Vec<&ColumnDefinition> {
        self.columns.iter().filter(|c| c.is_primary_key).collect()
    }

    /// Validates that the table info is complete
    pub fn validate(&self) -> Result<(), DbError> {
        if self.name.trim().is_empty() {
            return Err(DbError::ValidationError {
                message: "Table name cannot be empty".to_string(),
                field: Some("name".to_string()),
            });
        }

        for col in &self.columns {
            if col.name.trim().is_empty() {
                return Err(DbError::ValidationError {
                    message: "Column name cannot be empty".to_string(),
                    field: Some("columns.name".to_string()),
                });
            }
            if col.data_type.trim().is_empty() {
                return Err(DbError::ValidationError {
                    message: format!("Data type for column '{}' cannot be empty", col.name),
                    field: Some("columns.data_type".to_string()),
                });
            }
        }

        Ok(())
    }
}

// ============================================================================
// Query History
// ============================================================================

/// A record of a previously executed query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryHistoryItem {
    /// Unique identifier
    pub id: String,
    /// Connection ID where the query was executed
    pub connection_id: String,
    /// The SQL query text
    pub sql: String,
    /// When the query was executed (ISO 8601 format)
    pub executed_at: String,
    /// Execution time in milliseconds
    pub execution_time_ms: u64,
    /// Whether the query succeeded
    pub success: bool,
    /// Error message if the query failed
    pub error_message: Option<String>,
}

impl QueryHistoryItem {
    /// Creates a new query history item
    pub fn new(connection_id: String, sql: String, execution_time_ms: u64, success: bool) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            connection_id,
            sql,
            executed_at: chrono::Utc::now().to_rfc3339(),
            execution_time_ms,
            success,
            error_message: None,
        }
    }
}

// ============================================================================
// Application State
// ============================================================================

/// Window state for persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            width: 1200,
            height: 800,
            x: 100,
            y: 100,
            maximized: false,
        }
    }
}

/// Type of tab content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TabType {
    Query,
    Table,
    Structure,
}

/// A tab in the application
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabState {
    pub id: String,
    pub tab_type: TabType,
    pub connection_id: String,
    pub title: String,
    pub content: Option<String>,
}

/// Complete application state for persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiState {
    pub window_state: WindowState,
    pub theme: String,
    pub active_connection_id: Option<String>,
    pub open_tabs: Vec<TabState>,
    pub active_tab_id: Option<String>,
    pub sidebar_width: u32,
}

impl Default for UiState {
    fn default() -> Self {
        Self {
            window_state: WindowState::default(),
            theme: "dark".to_string(),
            active_connection_id: None,
            open_tabs: Vec::new(),
            active_tab_id: None,
            sidebar_width: 250,
        }
    }
}

// ============================================================================
// Error Handling
// ============================================================================

/// Database-related errors
#[derive(Debug, Error, Serialize, Deserialize)]
pub enum DbError {
    /// Connection to database failed
    #[error("Connection failed: {message}")]
    ConnectionError {
        message: String,
        details: Option<String>,
    },

    /// Query execution failed
    #[error("Query execution failed: {message}")]
    QueryError {
        message: String,
        line: Option<u32>,
        column: Option<u32>,
    },

    /// Schema operation failed
    #[error("Schema operation failed: {message}")]
    SchemaError { message: String },

    /// Configuration error
    #[error("Configuration error: {message}")]
    ConfigError { message: String },

    /// Input validation error
    #[error("Invalid input: {message}")]
    ValidationError {
        message: String,
        field: Option<String>,
    },
}

impl DbError {
    /// Creates a connection error
    pub fn connection(message: impl Into<String>) -> Self {
        Self::ConnectionError {
            message: message.into(),
            details: None,
        }
    }

    /// Creates a connection error with details
    pub fn connection_with_details(message: impl Into<String>, details: impl Into<String>) -> Self {
        Self::ConnectionError {
            message: message.into(),
            details: Some(details.into()),
        }
    }

    /// Creates a query error
    pub fn query(message: impl Into<String>) -> Self {
        Self::QueryError {
            message: message.into(),
            line: None,
            column: None,
        }
    }

    /// Creates a query error with location
    pub fn query_with_location(message: impl Into<String>, line: u32, column: u32) -> Self {
        Self::QueryError {
            message: message.into(),
            line: Some(line),
            column: Some(column),
        }
    }

    /// Creates a schema error
    pub fn schema(message: impl Into<String>) -> Self {
        Self::SchemaError {
            message: message.into(),
        }
    }

    /// Creates a config error
    pub fn config(message: impl Into<String>) -> Self {
        Self::ConfigError {
            message: message.into(),
        }
    }

    /// Creates a validation error
    pub fn validation(message: impl Into<String>) -> Self {
        Self::ValidationError {
            message: message.into(),
            field: None,
        }
    }

    /// Creates a validation error for a specific field
    pub fn validation_field(message: impl Into<String>, field: impl Into<String>) -> Self {
        Self::ValidationError {
            message: message.into(),
            field: Some(field.into()),
        }
    }

    /// Returns the error message
    pub fn message(&self) -> &str {
        match self {
            DbError::ConnectionError { message, .. } => message,
            DbError::QueryError { message, .. } => message,
            DbError::SchemaError { message } => message,
            DbError::ConfigError { message } => message,
            DbError::ValidationError { message, .. } => message,
        }
    }

    /// Returns true if this error has location information
    pub fn has_location(&self) -> bool {
        matches!(
            self,
            DbError::QueryError {
                line: Some(_),
                column: Some(_),
                ..
            }
        )
    }
}

// ============================================================================
// Connection ID Type
// ============================================================================

/// A unique identifier for an active database connection
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ConnectionId(pub String);

impl ConnectionId {
    /// Creates a new connection ID
    pub fn new() -> Self {
        Self(uuid::Uuid::new_v4().to_string())
    }

    /// Creates a connection ID from a string
    pub fn from_string(s: impl Into<String>) -> Self {
        Self(s.into())
    }
}

impl Default for ConnectionId {
    fn default() -> Self {
        Self::new()
    }
}

impl std::fmt::Display for ConnectionId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_type_default_port() {
        assert_eq!(DatabaseType::MySQL.default_port(), Some(3306));
        assert_eq!(DatabaseType::PostgreSQL.default_port(), Some(5432));
        assert_eq!(DatabaseType::SQLite.default_port(), None);
    }

    #[test]
    fn test_database_type_requires_host() {
        assert!(DatabaseType::MySQL.requires_host());
        assert!(DatabaseType::PostgreSQL.requires_host());
        assert!(!DatabaseType::SQLite.requires_host());
    }

    #[test]
    fn test_connection_config_validation_mysql() {
        let mut config = ConnectionConfig::new(
            "Test MySQL".to_string(),
            DatabaseType::MySQL,
            "testdb".to_string(),
        );
        
        // Should fail without host
        assert!(config.validate().is_err());
        
        // Should succeed with host
        config.host = Some("localhost".to_string());
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_connection_config_validation_sqlite() {
        let mut config = ConnectionConfig::new(
            "Test SQLite".to_string(),
            DatabaseType::SQLite,
            "main".to_string(),
        );
        
        // Should fail without file_path
        assert!(config.validate().is_err());
        
        // Should succeed with file_path
        config.file_path = Some("/path/to/db.sqlite".to_string());
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_query_result_validate() {
        let result = QueryResult {
            columns: vec![
                ColumnInfo { name: "id".to_string(), data_type: "INTEGER".to_string() },
                ColumnInfo { name: "name".to_string(), data_type: "TEXT".to_string() },
            ],
            rows: vec![
                vec![Value::Integer(1), Value::String("Alice".to_string())],
                vec![Value::Integer(2), Value::String("Bob".to_string())],
            ],
            affected_rows: 0,
            execution_time_ms: 10,
        };
        
        assert!(result.validate());
    }

    #[test]
    fn test_query_result_validate_mismatch() {
        let result = QueryResult {
            columns: vec![
                ColumnInfo { name: "id".to_string(), data_type: "INTEGER".to_string() },
            ],
            rows: vec![
                vec![Value::Integer(1), Value::String("Extra".to_string())], // Too many values
            ],
            affected_rows: 0,
            execution_time_ms: 10,
        };
        
        assert!(!result.validate());
    }

    #[test]
    fn test_db_error_creation() {
        let err = DbError::connection("Failed to connect");
        assert_eq!(err.message(), "Failed to connect");
        
        let err = DbError::query_with_location("Syntax error", 5, 10);
        assert!(err.has_location());
        
        let err = DbError::validation_field("Invalid value", "port");
        match err {
            DbError::ValidationError { field, .. } => {
                assert_eq!(field, Some("port".to_string()));
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[test]
    fn test_value_is_null() {
        assert!(Value::Null.is_null());
        assert!(!Value::Integer(42).is_null());
        assert!(!Value::String("test".to_string()).is_null());
    }

    #[test]
    fn test_table_info_primary_key_columns() {
        let table = TableInfo {
            name: "users".to_string(),
            schema: None,
            columns: vec![
                ColumnDefinition {
                    name: "id".to_string(),
                    data_type: "INTEGER".to_string(),
                    nullable: false,
                    default_value: None,
                    is_primary_key: true,
                    is_auto_increment: true,
                },
                ColumnDefinition {
                    name: "name".to_string(),
                    data_type: "TEXT".to_string(),
                    nullable: false,
                    default_value: None,
                    is_primary_key: false,
                    is_auto_increment: false,
                },
            ],
            indexes: Vec::new(),
            foreign_keys: Vec::new(),
        };
        
        let pk_cols = table.primary_key_columns();
        assert_eq!(pk_cols.len(), 1);
        assert_eq!(pk_cols[0].name, "id");
    }

    #[test]
    fn test_serialization_roundtrip() {
        let config = ConnectionConfig {
            id: "test-id".to_string(),
            name: "Test Connection".to_string(),
            db_type: DatabaseType::MySQL,
            host: Some("localhost".to_string()),
            port: Some(3306),
            username: Some("root".to_string()),
            password: Some("password".to_string()),
            database: "testdb".to_string(),
            file_path: None,
        };
        
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: ConnectionConfig = serde_json::from_str(&json).unwrap();
        
        assert_eq!(config.id, deserialized.id);
        assert_eq!(config.name, deserialized.name);
        assert_eq!(config.db_type, deserialized.db_type);
        assert_eq!(config.host, deserialized.host);
        assert_eq!(config.port, deserialized.port);
    }
}

// ============================================================================
// Property-Based Tests
// ============================================================================

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    // **Validates: Requirements 1.2, 3.6, 6.4**
    // Property 1: Configuration Round-Trip
    // For any valid ConnectionConfig, QueryHistoryItem, or AppState object,
    // serializing to JSON and then deserializing should produce an equivalent object.

    // ========================================================================
    // Arbitrary Generators
    // ========================================================================

    /// Strategy for generating arbitrary DatabaseType
    fn arb_database_type() -> impl Strategy<Value = DatabaseType> {
        prop_oneof![
            Just(DatabaseType::MySQL),
            Just(DatabaseType::PostgreSQL),
            Just(DatabaseType::SQLite),
        ]
    }

    /// Strategy for generating non-empty strings (for names, identifiers)
    fn arb_non_empty_string() -> impl Strategy<Value = String> {
        "[a-zA-Z][a-zA-Z0-9_]{0,30}".prop_map(|s| s)
    }

    /// Strategy for generating optional strings
    fn arb_optional_string() -> impl Strategy<Value = Option<String>> {
        prop_oneof![
            Just(None),
            arb_non_empty_string().prop_map(Some),
        ]
    }

    /// Strategy for generating valid port numbers
    fn arb_port() -> impl Strategy<Value = Option<u16>> {
        prop_oneof![
            Just(None),
            (1u16..=65535u16).prop_map(Some),
        ]
    }

    /// Strategy for generating arbitrary ConnectionConfig
    fn arb_connection_config() -> impl Strategy<Value = ConnectionConfig> {
        (
            arb_non_empty_string(),  // id
            arb_non_empty_string(),  // name
            arb_database_type(),     // db_type
            arb_optional_string(),   // host
            arb_port(),              // port
            arb_optional_string(),   // username
            arb_optional_string(),   // password
            arb_non_empty_string(),  // database
            arb_optional_string(),   // file_path
        )
            .prop_map(|(id, name, db_type, host, port, username, password, database, file_path)| {
                ConnectionConfig {
                    id,
                    name,
                    db_type,
                    host,
                    port,
                    username,
                    password,
                    database,
                    file_path,
                }
            })
    }

    /// Strategy for generating arbitrary QueryHistoryItem
    fn arb_query_history_item() -> impl Strategy<Value = QueryHistoryItem> {
        (
            arb_non_empty_string(),  // id
            arb_non_empty_string(),  // connection_id
            "[A-Za-z0-9 _;*=]{1,100}",  // sql (simple SQL-like string)
            "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z",  // executed_at (ISO 8601)
            0u64..10000u64,          // execution_time_ms
            any::<bool>(),           // success
            arb_optional_string(),   // error_message
        )
            .prop_map(|(id, connection_id, sql, executed_at, execution_time_ms, success, error_message)| {
                QueryHistoryItem {
                    id,
                    connection_id,
                    sql,
                    executed_at,
                    execution_time_ms,
                    success,
                    error_message,
                }
            })
    }

    /// Strategy for generating arbitrary WindowState
    fn arb_window_state() -> impl Strategy<Value = WindowState> {
        (
            100u32..4000u32,   // width
            100u32..3000u32,   // height
            -1000i32..5000i32, // x
            -1000i32..3000i32, // y
            any::<bool>(),     // maximized
        )
            .prop_map(|(width, height, x, y, maximized)| {
                WindowState {
                    width,
                    height,
                    x,
                    y,
                    maximized,
                }
            })
    }

    /// Strategy for generating arbitrary TabType
    fn arb_tab_type() -> impl Strategy<Value = TabType> {
        prop_oneof![
            Just(TabType::Query),
            Just(TabType::Table),
            Just(TabType::Structure),
        ]
    }

    /// Strategy for generating arbitrary TabState
    fn arb_tab_state() -> impl Strategy<Value = TabState> {
        (
            arb_non_empty_string(),  // id
            arb_tab_type(),          // tab_type
            arb_non_empty_string(),  // connection_id
            arb_non_empty_string(),  // title
            arb_optional_string(),   // content
        )
            .prop_map(|(id, tab_type, connection_id, title, content)| {
                TabState {
                    id,
                    tab_type,
                    connection_id,
                    title,
                    content,
                }
            })
    }

    /// Strategy for generating arbitrary AppState
    fn arb_app_state() -> impl Strategy<Value = AppState> {
        (
            arb_window_state(),                          // window_state
            prop_oneof![Just("dark".to_string()), Just("light".to_string())], // theme
            arb_optional_string(),                       // active_connection_id
            prop::collection::vec(arb_tab_state(), 0..5), // open_tabs
            arb_optional_string(),                       // active_tab_id
            100u32..500u32,                              // sidebar_width
        )
            .prop_map(|(window_state, theme, active_connection_id, open_tabs, active_tab_id, sidebar_width)| {
                AppState {
                    window_state,
                    theme,
                    active_connection_id,
                    open_tabs,
                    active_tab_id,
                    sidebar_width,
                }
            })
    }

    // ========================================================================
    // Property Tests
    // ========================================================================

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// **Validates: Requirements 1.2, 3.6, 6.4**
        /// Property 1: Configuration Round-Trip - ConnectionConfig
        /// For any valid ConnectionConfig, serializing to JSON and then
        /// deserializing should produce an equivalent object.
        #[test]
        fn prop_connection_config_roundtrip(config in arb_connection_config()) {
            // Serialize to JSON
            let json = serde_json::to_string(&config)
                .expect("ConnectionConfig should serialize to JSON");

            // Deserialize back
            let deserialized: ConnectionConfig = serde_json::from_str(&json)
                .expect("ConnectionConfig should deserialize from JSON");

            // Verify equivalence
            prop_assert_eq!(config.id, deserialized.id);
            prop_assert_eq!(config.name, deserialized.name);
            prop_assert_eq!(config.db_type, deserialized.db_type);
            prop_assert_eq!(config.host, deserialized.host);
            prop_assert_eq!(config.port, deserialized.port);
            prop_assert_eq!(config.username, deserialized.username);
            prop_assert_eq!(config.password, deserialized.password);
            prop_assert_eq!(config.database, deserialized.database);
            prop_assert_eq!(config.file_path, deserialized.file_path);
        }

        /// **Validates: Requirements 1.2, 3.6, 6.4**
        /// Property 1: Configuration Round-Trip - QueryHistoryItem
        /// For any valid QueryHistoryItem, serializing to JSON and then
        /// deserializing should produce an equivalent object.
        #[test]
        fn prop_query_history_item_roundtrip(item in arb_query_history_item()) {
            // Serialize to JSON
            let json = serde_json::to_string(&item)
                .expect("QueryHistoryItem should serialize to JSON");

            // Deserialize back
            let deserialized: QueryHistoryItem = serde_json::from_str(&json)
                .expect("QueryHistoryItem should deserialize from JSON");

            // Verify equivalence
            prop_assert_eq!(item.id, deserialized.id);
            prop_assert_eq!(item.connection_id, deserialized.connection_id);
            prop_assert_eq!(item.sql, deserialized.sql);
            prop_assert_eq!(item.executed_at, deserialized.executed_at);
            prop_assert_eq!(item.execution_time_ms, deserialized.execution_time_ms);
            prop_assert_eq!(item.success, deserialized.success);
            prop_assert_eq!(item.error_message, deserialized.error_message);
        }

        /// **Validates: Requirements 1.2, 3.6, 6.4**
        /// Property 1: Configuration Round-Trip - AppState
        /// For any valid AppState, serializing to JSON and then
        /// deserializing should produce an equivalent object.
        #[test]
        fn prop_app_state_roundtrip(state in arb_app_state()) {
            // Serialize to JSON
            let json = serde_json::to_string(&state)
                .expect("AppState should serialize to JSON");

            // Deserialize back
            let deserialized: AppState = serde_json::from_str(&json)
                .expect("AppState should deserialize from JSON");

            // Verify equivalence - WindowState
            prop_assert_eq!(state.window_state.width, deserialized.window_state.width);
            prop_assert_eq!(state.window_state.height, deserialized.window_state.height);
            prop_assert_eq!(state.window_state.x, deserialized.window_state.x);
            prop_assert_eq!(state.window_state.y, deserialized.window_state.y);
            prop_assert_eq!(state.window_state.maximized, deserialized.window_state.maximized);

            // Verify equivalence - AppState fields
            prop_assert_eq!(state.theme, deserialized.theme);
            prop_assert_eq!(state.active_connection_id, deserialized.active_connection_id);
            prop_assert_eq!(state.active_tab_id, deserialized.active_tab_id);
            prop_assert_eq!(state.sidebar_width, deserialized.sidebar_width);

            // Verify equivalence - open_tabs
            prop_assert_eq!(state.open_tabs.len(), deserialized.open_tabs.len());
            for (original, deser) in state.open_tabs.iter().zip(deserialized.open_tabs.iter()) {
                prop_assert_eq!(&original.id, &deser.id);
                prop_assert_eq!(&original.connection_id, &deser.connection_id);
                prop_assert_eq!(&original.title, &deser.title);
                prop_assert_eq!(&original.content, &deser.content);
            }
        }
    }

    // ========================================================================
    // Property 9: TableInfo Structure Completeness
    // ========================================================================

    /// Strategy for generating valid ColumnDefinition with non-empty name and data_type
    fn arb_column_definition() -> impl Strategy<Value = ColumnDefinition> {
        (
            arb_non_empty_string(),  // name
            arb_non_empty_string(),  // data_type
            any::<bool>(),           // nullable
            arb_optional_string(),   // default_value
            any::<bool>(),           // is_primary_key
            any::<bool>(),           // is_auto_increment
        )
            .prop_map(|(name, data_type, nullable, default_value, is_primary_key, is_auto_increment)| {
                ColumnDefinition {
                    name,
                    data_type,
                    nullable,
                    default_value,
                    is_primary_key,
                    is_auto_increment,
                }
            })
    }

    /// Strategy for generating valid IndexInfo with name and at least one column
    fn arb_index_info() -> impl Strategy<Value = IndexInfo> {
        (
            arb_non_empty_string(),  // name
            prop::collection::vec(arb_non_empty_string(), 1..5),  // columns (at least 1)
            any::<bool>(),           // is_unique
            any::<bool>(),           // is_primary
        )
            .prop_map(|(name, columns, is_unique, is_primary)| {
                IndexInfo {
                    name,
                    columns,
                    is_unique,
                    is_primary,
                }
            })
    }

    /// Strategy for generating valid ForeignKeyInfo with all required fields
    fn arb_foreign_key_info() -> impl Strategy<Value = ForeignKeyInfo> {
        (
            arb_non_empty_string(),  // name
            prop::collection::vec(arb_non_empty_string(), 1..3),  // columns (at least 1)
            arb_non_empty_string(),  // referenced_table
            prop::collection::vec(arb_non_empty_string(), 1..3),  // referenced_columns (at least 1)
            arb_optional_string(),   // on_delete
            arb_optional_string(),   // on_update
        )
            .prop_map(|(name, columns, referenced_table, referenced_columns, on_delete, on_update)| {
                ForeignKeyInfo {
                    name,
                    columns,
                    referenced_table,
                    referenced_columns,
                    on_delete,
                    on_update,
                }
            })
    }

    /// Strategy for generating valid TableInfo with complete structure
    fn arb_table_info() -> impl Strategy<Value = TableInfo> {
        (
            arb_non_empty_string(),  // name
            arb_optional_string(),   // schema
            prop::collection::vec(arb_column_definition(), 1..10),  // columns (at least 1)
            prop::collection::vec(arb_index_info(), 0..5),          // indexes
            prop::collection::vec(arb_foreign_key_info(), 0..3),    // foreign_keys
        )
            .prop_map(|(name, schema, columns, indexes, foreign_keys)| {
                TableInfo {
                    name,
                    schema,
                    columns,
                    indexes,
                    foreign_keys,
                }
            })
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// **Validates: Requirements 5.1, 5.4, 5.5**
        /// Property 9: TableInfo Structure Completeness
        /// For any TableInfo object, it should contain all columns with name, type,
        /// and nullable information, all indexes with name and column references,
        /// and all foreign keys with source and target information.
        #[test]
        fn prop_table_info_structure_completeness(table_info in arb_table_info()) {
            // Verify table has a non-empty name
            prop_assert!(!table_info.name.trim().is_empty(),
                "Table name must be non-empty");

            // Verify all columns have non-empty name and data_type (Requirements 5.1)
            for (idx, column) in table_info.columns.iter().enumerate() {
                prop_assert!(!column.name.trim().is_empty(),
                    "Column {} must have a non-empty name", idx);
                prop_assert!(!column.data_type.trim().is_empty(),
                    "Column '{}' must have a non-empty data_type", column.name);
                // nullable is always present as a bool, so it's always complete
            }

            // Verify all indexes have name and at least one column reference (Requirements 5.4)
            for (idx, index) in table_info.indexes.iter().enumerate() {
                prop_assert!(!index.name.trim().is_empty(),
                    "Index {} must have a non-empty name", idx);
                prop_assert!(!index.columns.is_empty(),
                    "Index '{}' must have at least one column reference", index.name);
                // Verify each column reference is non-empty
                for (col_idx, col_name) in index.columns.iter().enumerate() {
                    prop_assert!(!col_name.trim().is_empty(),
                        "Index '{}' column reference {} must be non-empty", index.name, col_idx);
                }
            }

            // Verify all foreign keys have source columns, referenced table, and referenced columns (Requirements 5.5)
            for (idx, fk) in table_info.foreign_keys.iter().enumerate() {
                prop_assert!(!fk.name.trim().is_empty(),
                    "Foreign key {} must have a non-empty name", idx);
                
                // Source columns must be present and non-empty
                prop_assert!(!fk.columns.is_empty(),
                    "Foreign key '{}' must have at least one source column", fk.name);
                for (col_idx, col_name) in fk.columns.iter().enumerate() {
                    prop_assert!(!col_name.trim().is_empty(),
                        "Foreign key '{}' source column {} must be non-empty", fk.name, col_idx);
                }

                // Referenced table must be non-empty
                prop_assert!(!fk.referenced_table.trim().is_empty(),
                    "Foreign key '{}' must have a non-empty referenced table", fk.name);

                // Referenced columns must be present and non-empty
                prop_assert!(!fk.referenced_columns.is_empty(),
                    "Foreign key '{}' must have at least one referenced column", fk.name);
                for (col_idx, col_name) in fk.referenced_columns.iter().enumerate() {
                    prop_assert!(!col_name.trim().is_empty(),
                        "Foreign key '{}' referenced column {} must be non-empty", fk.name, col_idx);
                }
            }

            // Verify TableInfo validation passes for well-formed structures
            prop_assert!(table_info.validate().is_ok(),
                "Well-formed TableInfo should pass validation");
        }
    }

    // ========================================================================
    // Property 3: Error Information Completeness
    // ========================================================================

    /// Strategy for generating non-empty error messages
    fn arb_error_message() -> impl Strategy<Value = String> {
        // Generate non-empty strings that represent realistic error messages
        "[A-Za-z][A-Za-z0-9 _:.,!?-]{0,100}".prop_filter(
            "Error message must be non-empty",
            |s| !s.trim().is_empty()
        )
    }

    /// Strategy for generating optional error details
    fn arb_optional_details() -> impl Strategy<Value = Option<String>> {
        prop_oneof![
            Just(None),
            arb_error_message().prop_map(Some),
        ]
    }

    /// Strategy for generating optional line numbers (valid line numbers start from 1)
    fn arb_optional_line() -> impl Strategy<Value = Option<u32>> {
        prop_oneof![
            Just(None),
            (1u32..=10000u32).prop_map(Some),
        ]
    }

    /// Strategy for generating optional column numbers (valid column numbers start from 1)
    fn arb_optional_column() -> impl Strategy<Value = Option<u32>> {
        prop_oneof![
            Just(None),
            (1u32..=1000u32).prop_map(Some),
        ]
    }

    /// Strategy for generating optional field names
    fn arb_optional_field() -> impl Strategy<Value = Option<String>> {
        prop_oneof![
            Just(None),
            arb_non_empty_string().prop_map(Some),
        ]
    }

    /// Strategy for generating ConnectionError variant
    fn arb_connection_error() -> impl Strategy<Value = DbError> {
        (arb_error_message(), arb_optional_details())
            .prop_map(|(message, details)| DbError::ConnectionError { message, details })
    }

    /// Strategy for generating QueryError variant
    fn arb_query_error() -> impl Strategy<Value = DbError> {
        (arb_error_message(), arb_optional_line(), arb_optional_column())
            .prop_map(|(message, line, column)| DbError::QueryError { message, line, column })
    }

    /// Strategy for generating QueryError variant with location info
    fn arb_query_error_with_location() -> impl Strategy<Value = DbError> {
        (arb_error_message(), 1u32..=10000u32, 1u32..=1000u32)
            .prop_map(|(message, line, column)| DbError::QueryError {
                message,
                line: Some(line),
                column: Some(column),
            })
    }

    /// Strategy for generating SchemaError variant
    fn arb_schema_error() -> impl Strategy<Value = DbError> {
        arb_error_message().prop_map(|message| DbError::SchemaError { message })
    }

    /// Strategy for generating ConfigError variant
    fn arb_config_error() -> impl Strategy<Value = DbError> {
        arb_error_message().prop_map(|message| DbError::ConfigError { message })
    }

    /// Strategy for generating ValidationError variant
    fn arb_validation_error() -> impl Strategy<Value = DbError> {
        (arb_error_message(), arb_optional_field())
            .prop_map(|(message, field)| DbError::ValidationError { message, field })
    }

    /// Strategy for generating any DbError variant
    fn arb_db_error() -> impl Strategy<Value = DbError> {
        prop_oneof![
            arb_connection_error(),
            arb_query_error(),
            arb_schema_error(),
            arb_config_error(),
            arb_validation_error(),
        ]
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// **Validates: Requirements 1.5, 3.4**
        /// Property 3: Error Information Completeness - All variants have non-empty message
        /// For any database error, the error object should contain a non-empty error message.
        #[test]
        fn prop_db_error_has_non_empty_message(error in arb_db_error()) {
            // Get the error message using the message() method
            let message = error.message();
            
            // Verify the message is non-empty
            prop_assert!(!message.is_empty(),
                "DbError message must not be empty");
            prop_assert!(!message.trim().is_empty(),
                "DbError message must not be only whitespace");
        }

        /// **Validates: Requirements 1.5, 3.4**
        /// Property 3: Error Information Completeness - Message accessible via message() method
        /// For any database error, the error message should be accessible via the message() method.
        #[test]
        fn prop_db_error_message_accessible(error in arb_db_error()) {
            // The message() method should return the correct message for each variant
            let message = error.message();
            
            // Verify the message matches the internal message field
            match &error {
                DbError::ConnectionError { message: msg, .. } => {
                    prop_assert_eq!(message, msg.as_str(),
                        "ConnectionError message() should return the message field");
                }
                DbError::QueryError { message: msg, .. } => {
                    prop_assert_eq!(message, msg.as_str(),
                        "QueryError message() should return the message field");
                }
                DbError::SchemaError { message: msg } => {
                    prop_assert_eq!(message, msg.as_str(),
                        "SchemaError message() should return the message field");
                }
                DbError::ConfigError { message: msg } => {
                    prop_assert_eq!(message, msg.as_str(),
                        "ConfigError message() should return the message field");
                }
                DbError::ValidationError { message: msg, .. } => {
                    prop_assert_eq!(message, msg.as_str(),
                        "ValidationError message() should return the message field");
                }
            }
        }

        /// **Validates: Requirements 1.5, 3.4**
        /// Property 3: Error Information Completeness - QueryError with location has valid values
        /// When QueryError has location information, line and column values should be valid (>= 1).
        #[test]
        fn prop_query_error_location_valid(error in arb_query_error_with_location()) {
            // Verify the error has location information
            prop_assert!(error.has_location(),
                "QueryError with location should report has_location() as true");
            
            // Extract and verify line/column values
            if let DbError::QueryError { line, column, .. } = &error {
                // Line should be present and >= 1
                prop_assert!(line.is_some(),
                    "QueryError with location should have line number");
                let line_val = line.unwrap();
                prop_assert!(line_val >= 1,
                    "QueryError line number should be >= 1, got {}", line_val);
                
                // Column should be present and >= 1
                prop_assert!(column.is_some(),
                    "QueryError with location should have column number");
                let col_val = column.unwrap();
                prop_assert!(col_val >= 1,
                    "QueryError column number should be >= 1, got {}", col_val);
            } else {
                prop_assert!(false, "Expected QueryError variant");
            }
        }

        /// **Validates: Requirements 1.5, 3.4**
        /// Property 3: Error Information Completeness - ConnectionError structure
        /// ConnectionError should always have a message and optionally have details.
        #[test]
        fn prop_connection_error_structure(error in arb_connection_error()) {
            if let DbError::ConnectionError { message, details } = &error {
                // Message must be non-empty
                prop_assert!(!message.is_empty(),
                    "ConnectionError message must not be empty");
                prop_assert!(!message.trim().is_empty(),
                    "ConnectionError message must not be only whitespace");
                
                // If details are present, they should also be non-empty
                if let Some(detail_str) = details {
                    prop_assert!(!detail_str.is_empty(),
                        "ConnectionError details, if present, must not be empty");
                    prop_assert!(!detail_str.trim().is_empty(),
                        "ConnectionError details, if present, must not be only whitespace");
                }
            } else {
                prop_assert!(false, "Expected ConnectionError variant");
            }
        }

        /// **Validates: Requirements 1.5, 3.4**
        /// Property 3: Error Information Completeness - ValidationError structure
        /// ValidationError should always have a message and optionally have a field name.
        #[test]
        fn prop_validation_error_structure(error in arb_validation_error()) {
            if let DbError::ValidationError { message, field } = &error {
                // Message must be non-empty
                prop_assert!(!message.is_empty(),
                    "ValidationError message must not be empty");
                prop_assert!(!message.trim().is_empty(),
                    "ValidationError message must not be only whitespace");
                
                // If field is present, it should be non-empty
                if let Some(field_str) = field {
                    prop_assert!(!field_str.is_empty(),
                        "ValidationError field, if present, must not be empty");
                    prop_assert!(!field_str.trim().is_empty(),
                        "ValidationError field, if present, must not be only whitespace");
                }
            } else {
                prop_assert!(false, "Expected ValidationError variant");
            }
        }
    }

    // ========================================================================
    // Property 4: QueryResult Structure Integrity
    // ========================================================================

    /// Strategy for generating arbitrary ColumnInfo
    fn arb_column_info() -> impl Strategy<Value = ColumnInfo> {
        (
            arb_non_empty_string(),  // name
            prop_oneof![
                Just("INTEGER".to_string()),
                Just("TEXT".to_string()),
                Just("REAL".to_string()),
                Just("BLOB".to_string()),
                Just("BOOLEAN".to_string()),
                Just("VARCHAR(255)".to_string()),
            ],  // data_type
        )
            .prop_map(|(name, data_type)| ColumnInfo { name, data_type })
    }

    /// Strategy for generating arbitrary Value
    fn arb_value() -> impl Strategy<Value = Value> {
        prop_oneof![
            Just(Value::Null),
            any::<bool>().prop_map(Value::Bool),
            any::<i64>().prop_map(Value::Integer),
            (-1e10f64..1e10f64).prop_map(|f| Value::Float(f)),
            "[a-zA-Z0-9 _-]{0,50}".prop_map(|s| Value::String(s)),
            prop::collection::vec(any::<u8>(), 0..20).prop_map(Value::Bytes),
        ]
    }

    /// Strategy for generating a valid QueryResult where each row has exactly
    /// the same number of values as there are columns
    fn arb_valid_query_result() -> impl Strategy<Value = QueryResult> {
        // First generate the number of columns (0 to 10)
        (0usize..=10usize).prop_flat_map(|num_cols| {
            // Generate columns
            let columns_strategy = prop::collection::vec(arb_column_info(), num_cols..=num_cols);
            
            // Generate rows where each row has exactly num_cols values
            let rows_strategy = prop::collection::vec(
                prop::collection::vec(arb_value(), num_cols..=num_cols),
                0..20  // 0 to 20 rows
            );
            
            (
                columns_strategy,
                rows_strategy,
                0u64..1000u64,      // affected_rows
                0u64..10000u64,     // execution_time_ms
            )
        })
        .prop_map(|(columns, rows, affected_rows, execution_time_ms)| {
            QueryResult {
                columns,
                rows,
                affected_rows,
                execution_time_ms,
            }
        })
    }

    /// Strategy for generating an invalid QueryResult where at least one row
    /// has a different number of values than the number of columns
    fn arb_invalid_query_result() -> impl Strategy<Value = QueryResult> {
        // Generate at least 1 column and at least 1 row with mismatched values
        (1usize..=10usize).prop_flat_map(|num_cols| {
            // Generate columns
            let columns_strategy = prop::collection::vec(arb_column_info(), num_cols..=num_cols);
            
            // Generate a row with wrong number of values (either more or fewer)
            let wrong_row_len = if num_cols > 1 {
                prop_oneof![
                    Just(0usize),                    // Empty row
                    Just(num_cols - 1),              // One fewer
                    Just(num_cols + 1),              // One more
                    Just(num_cols + 5),              // Many more
                ].boxed()
            } else {
                // If num_cols is 1, we can only have 0 or more values
                prop_oneof![
                    Just(0usize),                    // Empty row
                    Just(num_cols + 1),              // One more
                    Just(num_cols + 5),              // Many more
                ].boxed()
            };
            
            (
                columns_strategy,
                wrong_row_len,
                0u64..1000u64,      // affected_rows
                0u64..10000u64,     // execution_time_ms
            )
        })
        .prop_flat_map(|(columns, wrong_len, affected_rows, execution_time_ms)| {
            // Generate the invalid row with wrong number of values
            let invalid_row_strategy = prop::collection::vec(arb_value(), wrong_len..=wrong_len);
            
            // Optionally add some valid rows before/after the invalid one
            let num_cols = columns.len();
            let valid_rows_before = prop::collection::vec(
                prop::collection::vec(arb_value(), num_cols..=num_cols),
                0..5
            );
            let valid_rows_after = prop::collection::vec(
                prop::collection::vec(arb_value(), num_cols..=num_cols),
                0..5
            );
            
            (
                Just(columns),
                valid_rows_before,
                invalid_row_strategy,
                valid_rows_after,
                Just(affected_rows),
                Just(execution_time_ms),
            )
        })
        .prop_map(|(columns, valid_before, invalid_row, valid_after, affected_rows, execution_time_ms)| {
            let mut rows = valid_before;
            rows.push(invalid_row);
            rows.extend(valid_after);
            
            QueryResult {
                columns,
                rows,
                affected_rows,
                execution_time_ms,
            }
        })
    }

    /// Strategy for generating an empty QueryResult (no columns, no rows)
    fn arb_empty_query_result() -> impl Strategy<Value = QueryResult> {
        (0u64..1000u64, 0u64..10000u64)
            .prop_map(|(affected_rows, execution_time_ms)| {
                QueryResult {
                    columns: Vec::new(),
                    rows: Vec::new(),
                    affected_rows,
                    execution_time_ms,
                }
            })
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// **Validates: Requirements 3.3**
        /// Property 4: QueryResult Structure Integrity - Valid QueryResult
        /// For any valid QueryResult, the number of columns equals the number of values in each row,
        /// and the validate() method returns true.
        #[test]
        fn prop_query_result_valid_structure(result in arb_valid_query_result()) {
            let num_cols = result.columns.len();
            
            // Verify each row has exactly the same number of values as columns
            for (row_idx, row) in result.rows.iter().enumerate() {
                prop_assert_eq!(
                    row.len(),
                    num_cols,
                    "Row {} should have {} values (matching column count), but has {}",
                    row_idx,
                    num_cols,
                    row.len()
                );
            }
            
            // Verify validate() returns true for valid QueryResult
            prop_assert!(
                result.validate(),
                "validate() should return true for QueryResult with matching column/row counts"
            );
        }

        /// **Validates: Requirements 3.3**
        /// Property 4: QueryResult Structure Integrity - Invalid QueryResult
        /// For any QueryResult where at least one row has a different number of values
        /// than the number of columns, the validate() method returns false.
        #[test]
        fn prop_query_result_invalid_structure(result in arb_invalid_query_result()) {
            let num_cols = result.columns.len();
            
            // Verify that at least one row has mismatched value count
            let has_mismatch = result.rows.iter().any(|row| row.len() != num_cols);
            prop_assert!(
                has_mismatch,
                "Invalid QueryResult should have at least one row with mismatched value count"
            );
            
            // Verify validate() returns false for invalid QueryResult
            prop_assert!(
                !result.validate(),
                "validate() should return false for QueryResult with mismatched column/row counts"
            );
        }

        /// **Validates: Requirements 3.3**
        /// Property 4: QueryResult Structure Integrity - Empty QueryResult
        /// An empty QueryResult (no columns, no rows) is valid.
        #[test]
        fn prop_query_result_empty_is_valid(result in arb_empty_query_result()) {
            // Verify the result is empty
            prop_assert!(
                result.columns.is_empty(),
                "Empty QueryResult should have no columns"
            );
            prop_assert!(
                result.rows.is_empty(),
                "Empty QueryResult should have no rows"
            );
            
            // Verify validate() returns true for empty QueryResult
            prop_assert!(
                result.validate(),
                "validate() should return true for empty QueryResult"
            );
        }

        /// **Validates: Requirements 3.3**
        /// Property 4: QueryResult Structure Integrity - Column count consistency
        /// For any QueryResult that passes validation, all rows must have the same
        /// number of values as there are columns.
        #[test]
        fn prop_query_result_column_count_consistency(result in arb_valid_query_result()) {
            // If validate() passes, all rows must have consistent column count
            if result.validate() {
                let expected_count = result.columns.len();
                
                for (row_idx, row) in result.rows.iter().enumerate() {
                    prop_assert_eq!(
                        row.len(),
                        expected_count,
                        "After validation passes, row {} should have {} values, but has {}",
                        row_idx,
                        expected_count,
                        row.len()
                    );
                }
            }
        }

        /// **Validates: Requirements 3.3**
        /// Property 4: QueryResult Structure Integrity - QueryResult::empty() is valid
        /// The QueryResult::empty() constructor creates a valid empty result.
        #[test]
        fn prop_query_result_empty_constructor_valid(_seed in any::<u64>()) {
            let empty_result = QueryResult::empty();
            
            // Verify it's empty
            prop_assert!(empty_result.columns.is_empty(), "empty() should have no columns");
            prop_assert!(empty_result.rows.is_empty(), "empty() should have no rows");
            prop_assert_eq!(empty_result.affected_rows, 0, "empty() should have 0 affected_rows");
            prop_assert_eq!(empty_result.execution_time_ms, 0, "empty() should have 0 execution_time_ms");
            
            // Verify it validates
            prop_assert!(empty_result.validate(), "empty() result should validate");
        }

        /// **Validates: Requirements 3.3**
        /// Property 4: QueryResult Structure Integrity - QueryResult::affected() is valid
        /// The QueryResult::affected() constructor creates a valid result for non-SELECT statements.
        #[test]
        fn prop_query_result_affected_constructor_valid(
            affected_rows in 0u64..1000000u64,
            execution_time_ms in 0u64..100000u64
        ) {
            let result = QueryResult::affected(affected_rows, execution_time_ms);
            
            // Verify structure
            prop_assert!(result.columns.is_empty(), "affected() should have no columns");
            prop_assert!(result.rows.is_empty(), "affected() should have no rows");
            prop_assert_eq!(result.affected_rows, affected_rows, "affected() should preserve affected_rows");
            prop_assert_eq!(result.execution_time_ms, execution_time_ms, "affected() should preserve execution_time_ms");
            
            // Verify it validates
            prop_assert!(result.validate(), "affected() result should validate");
        }
    }
}


// ============================================================================
// 收藏夹类型 (Favorites)
// ============================================================================

/// 收藏项类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FavoriteType {
    /// 收藏的表
    Table,
    /// 收藏的 SQL 查询
    Query,
}

/// 收藏项
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FavoriteItem {
    /// 唯一标识符
    pub id: String,
    /// 收藏类型
    pub favorite_type: FavoriteType,
    /// 显示名称
    pub name: String,
    /// 关联的连接 ID
    pub connection_id: String,
    /// 表名（仅当 favorite_type 为 Table 时）
    pub table_name: Option<String>,
    /// 数据库名（仅当 favorite_type 为 Table 时）
    pub database_name: Option<String>,
    /// SQL 内容（仅当 favorite_type 为 Query 时）
    pub sql: Option<String>,
    /// 创建时间 (ISO 8601 格式)
    pub created_at: String,
}

impl FavoriteItem {
    /// 创建一个表收藏
    pub fn new_table(
        name: String,
        connection_id: String,
        table_name: String,
        database_name: String,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            favorite_type: FavoriteType::Table,
            name,
            connection_id,
            table_name: Some(table_name),
            database_name: Some(database_name),
            sql: None,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    /// 创建一个 SQL 查询收藏
    pub fn new_query(name: String, connection_id: String, sql: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            favorite_type: FavoriteType::Query,
            name,
            connection_id,
            table_name: None,
            database_name: None,
            sql: Some(sql),
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

// ============================================================================
// 查询执行计划类型 (EXPLAIN)
// ============================================================================

/// 执行计划节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplainNode {
    /// 节点 ID
    pub id: u32,
    /// 操作类型 (如 Seq Scan, Index Scan, Hash Join 等)
    pub operation: String,
    /// 目标表名
    pub table_name: Option<String>,
    /// 使用的索引名
    pub index_name: Option<String>,
    /// 预估行数
    pub estimated_rows: Option<f64>,
    /// 实际行数（仅 EXPLAIN ANALYZE）
    pub actual_rows: Option<f64>,
    /// 预估成本
    pub estimated_cost: Option<f64>,
    /// 实际执行时间（毫秒，仅 EXPLAIN ANALYZE）
    pub actual_time_ms: Option<f64>,
    /// 过滤条件
    pub filter: Option<String>,
    /// 额外信息
    pub extra: Option<String>,
    /// 子节点
    pub children: Vec<ExplainNode>,
}

/// 查询执行计划结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplainResult {
    /// 原始 SQL
    pub sql: String,
    /// 执行计划树
    pub plan: Option<ExplainNode>,
    /// 原始执行计划文本（用于显示）
    pub raw_plan: String,
    /// 总预估成本
    pub total_cost: Option<f64>,
    /// 总执行时间（毫秒，仅 EXPLAIN ANALYZE）
    pub total_time_ms: Option<f64>,
    /// 警告和建议
    pub warnings: Vec<String>,
}

impl ExplainResult {
    /// 创建一个空的执行计划结果
    pub fn empty(sql: String) -> Self {
        Self {
            sql,
            plan: None,
            raw_plan: String::new(),
            total_cost: None,
            total_time_ms: None,
            warnings: Vec::new(),
        }
    }
}
