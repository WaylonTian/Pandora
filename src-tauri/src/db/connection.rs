// Database Manager - Connection Management Module
// This module handles database connection management including connection pooling,
// connection testing, and support for MySQL, PostgreSQL, and SQLite databases.

use super::types::{ConnectionConfig, ConnectionId, DatabaseType, DbError};
use std::any::Any;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

// ============================================================================
// Database Connection Trait
// ============================================================================

/// Trait representing an active database connection
/// This trait provides a common interface for all database types
#[async_trait::async_trait]
pub trait DatabaseConnection: Send + Sync {
    /// Returns the database type of this connection
    fn db_type(&self) -> DatabaseType;

    /// Checks if the connection is still alive
    async fn is_alive(&self) -> bool;

    /// Closes the connection
    async fn close(&self) -> Result<(), DbError>;

    /// Returns the connection configuration
    fn config(&self) -> &ConnectionConfig;

    /// Returns self as Any for downcasting
    fn as_any(&self) -> &dyn Any;
}

// ============================================================================
// Connection Manager Trait
// ============================================================================

/// Trait defining the connection management interface
#[async_trait::async_trait]
pub trait ConnectionManager: Send + Sync {
    /// Creates a new database connection
    async fn create_connection(&self, config: &ConnectionConfig) -> Result<ConnectionId, DbError>;

    /// Tests if a connection can be established with the given configuration
    async fn test_connection(&self, config: &ConnectionConfig) -> Result<bool, DbError>;

    /// Closes an existing connection
    async fn close_connection(&self, id: &ConnectionId) -> Result<(), DbError>;

    /// Gets a reference to an active connection
    async fn get_connection(&self, id: &ConnectionId) -> Result<Arc<dyn DatabaseConnection>, DbError>;

    /// Lists all active connection IDs
    async fn list_connections(&self) -> Vec<ConnectionId>;

    /// Closes all active connections
    async fn close_all(&self) -> Result<(), DbError>;
}

// ============================================================================
// MySQL Connection Implementation
// ============================================================================

/// MySQL database connection wrapper
pub struct MySqlConnection {
    pool: mysql_async::Pool,
    config: ConnectionConfig,
}

impl MySqlConnection {
    /// Creates a new MySQL connection from configuration
    pub async fn new(config: &ConnectionConfig) -> Result<Self, DbError> {
        config.validate()?;

        let host = config.host.as_ref().ok_or_else(|| {
            DbError::validation_field("Host is required for MySQL", "host")
        })?;
        let port = config.port.ok_or_else(|| {
            DbError::validation_field("Port is required for MySQL", "port")
        })?;

        // Build connection URL
        let url = if let (Some(username), Some(password)) = (&config.username, &config.password) {
            format!(
                "mysql://{}:{}@{}:{}/{}",
                username, password, host, port, config.database
            )
        } else if let Some(username) = &config.username {
            format!(
                "mysql://{}@{}:{}/{}",
                username, host, port, config.database
            )
        } else {
            format!("mysql://{}:{}/{}", host, port, config.database)
        };

        let pool = mysql_async::Pool::new(url.as_str());

        // Test the connection by getting a connection from the pool
        let conn = pool.get_conn().await.map_err(|e| {
            DbError::connection_with_details(
                "Failed to connect to MySQL database",
                e.to_string(),
            )
        })?;
        drop(conn);

        Ok(Self {
            pool,
            config: config.clone(),
        })
    }

    /// Gets a connection from the pool for executing queries
    pub async fn get_conn(&self) -> Result<mysql_async::Conn, DbError> {
        self.pool.get_conn().await.map_err(|e| {
            DbError::connection_with_details("Failed to get MySQL connection from pool", e.to_string())
        })
    }
}

#[async_trait::async_trait]
impl DatabaseConnection for MySqlConnection {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::MySQL
    }

    async fn is_alive(&self) -> bool {
        self.pool.get_conn().await.is_ok()
    }

    async fn close(&self) -> Result<(), DbError> {
        self.pool.clone().disconnect().await.map_err(|e| {
            DbError::connection_with_details("Failed to close MySQL connection pool", e.to_string())
        })
    }

    fn config(&self) -> &ConnectionConfig {
        &self.config
    }

    fn as_any(&self) -> &dyn Any {
        self
    }
}

// ============================================================================
// PostgreSQL Connection Implementation
// ============================================================================

/// PostgreSQL database connection wrapper
pub struct PostgresConnection {
    client: Arc<tokio::sync::Mutex<tokio_postgres::Client>>,
    config: ConnectionConfig,
    // Keep the connection task alive
    _connection_handle: tokio::task::JoinHandle<()>,
}

impl PostgresConnection {
    /// Creates a new PostgreSQL connection from configuration
    pub async fn new(config: &ConnectionConfig) -> Result<Self, DbError> {
        config.validate()?;

        let host = config.host.as_ref().ok_or_else(|| {
            DbError::validation_field("Host is required for PostgreSQL", "host")
        })?;
        let port = config.port.ok_or_else(|| {
            DbError::validation_field("Port is required for PostgreSQL", "port")
        })?;

        // Build connection string
        let mut conn_string = format!("host={} port={} dbname={}", host, port, config.database);

        if let Some(username) = &config.username {
            conn_string.push_str(&format!(" user={}", username));
        }
        if let Some(password) = &config.password {
            conn_string.push_str(&format!(" password={}", password));
        }

        let (client, connection) = tokio_postgres::connect(&conn_string, tokio_postgres::NoTls)
            .await
            .map_err(|e| {
                DbError::connection_with_details(
                    "Failed to connect to PostgreSQL database",
                    e.to_string(),
                )
            })?;

        // Spawn the connection handler
        let connection_handle = tokio::spawn(async move {
            if let Err(e) = connection.await {
                log::error!("PostgreSQL connection error: {}", e);
            }
        });

        Ok(Self {
            client: Arc::new(tokio::sync::Mutex::new(client)),
            config: config.clone(),
            _connection_handle: connection_handle,
        })
    }

    /// Gets the PostgreSQL client for executing queries
    pub fn client(&self) -> Arc<tokio::sync::Mutex<tokio_postgres::Client>> {
        self.client.clone()
    }
}

#[async_trait::async_trait]
impl DatabaseConnection for PostgresConnection {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::PostgreSQL
    }

    async fn is_alive(&self) -> bool {
        let client = self.client.lock().await;
        client.simple_query("SELECT 1").await.is_ok()
    }

    async fn close(&self) -> Result<(), DbError> {
        // PostgreSQL client doesn't have an explicit close method
        // The connection will be closed when dropped
        Ok(())
    }

    fn config(&self) -> &ConnectionConfig {
        &self.config
    }

    fn as_any(&self) -> &dyn Any {
        self
    }
}

// ============================================================================
// SQLite Connection Implementation
// ============================================================================

/// SQLite database connection wrapper
pub struct SqliteConnection {
    connection: Arc<tokio::sync::Mutex<rusqlite::Connection>>,
    config: ConnectionConfig,
}

impl SqliteConnection {
    /// Creates a new SQLite connection from configuration
    pub async fn new(config: &ConnectionConfig) -> Result<Self, DbError> {
        config.validate()?;

        let file_path = config.file_path.as_ref().ok_or_else(|| {
            DbError::validation_field("File path is required for SQLite", "file_path")
        })?;

        // Open SQLite connection (this is blocking, so we use spawn_blocking)
        let path = file_path.clone();
        let connection = tokio::task::spawn_blocking(move || {
            rusqlite::Connection::open(&path)
        })
        .await
        .map_err(|e| DbError::connection_with_details("Task join error", e.to_string()))?
        .map_err(|e| {
            DbError::connection_with_details(
                "Failed to open SQLite database",
                e.to_string(),
            )
        })?;

        Ok(Self {
            connection: Arc::new(tokio::sync::Mutex::new(connection)),
            config: config.clone(),
        })
    }

    /// Gets the SQLite connection for executing queries
    pub fn connection(&self) -> Arc<tokio::sync::Mutex<rusqlite::Connection>> {
        self.connection.clone()
    }
}

#[async_trait::async_trait]
impl DatabaseConnection for SqliteConnection {
    fn db_type(&self) -> DatabaseType {
        DatabaseType::SQLite
    }

    async fn is_alive(&self) -> bool {
        let conn = self.connection.lock().await;
        conn.execute("SELECT 1", []).is_ok()
    }

    async fn close(&self) -> Result<(), DbError> {
        // SQLite connection will be closed when dropped
        Ok(())
    }

    fn config(&self) -> &ConnectionConfig {
        &self.config
    }

    fn as_any(&self) -> &dyn Any {
        self
    }
}

// ============================================================================
// Default Connection Manager Implementation
// ============================================================================

/// Default implementation of ConnectionManager
/// Manages multiple database connections of different types
pub struct DefaultConnectionManager {
    connections: RwLock<HashMap<String, Arc<dyn DatabaseConnection>>>,
}

impl DefaultConnectionManager {
    /// Creates a new DefaultConnectionManager
    pub fn new() -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
        }
    }
}

impl Default for DefaultConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl ConnectionManager for DefaultConnectionManager {
    async fn create_connection(&self, config: &ConnectionConfig) -> Result<ConnectionId, DbError> {
        // Validate configuration
        config.validate()?;

        // Create the appropriate connection based on database type
        let connection: Arc<dyn DatabaseConnection> = match config.db_type {
            DatabaseType::MySQL => {
                Arc::new(MySqlConnection::new(config).await?)
            }
            DatabaseType::PostgreSQL => {
                Arc::new(PostgresConnection::new(config).await?)
            }
            DatabaseType::SQLite => {
                Arc::new(SqliteConnection::new(config).await?)
            }
        };

        // Generate a connection ID
        let conn_id = ConnectionId::new();

        // Store the connection
        let mut connections = self.connections.write().await;
        connections.insert(conn_id.0.clone(), connection);

        Ok(conn_id)
    }

    async fn test_connection(&self, config: &ConnectionConfig) -> Result<bool, DbError> {
        // Validate configuration first
        config.validate()?;

        // Try to create a connection and immediately close it
        match config.db_type {
            DatabaseType::MySQL => {
                let conn = MySqlConnection::new(config).await?;
                let alive = conn.is_alive().await;
                conn.close().await?;
                Ok(alive)
            }
            DatabaseType::PostgreSQL => {
                let conn = PostgresConnection::new(config).await?;
                let alive = conn.is_alive().await;
                conn.close().await?;
                Ok(alive)
            }
            DatabaseType::SQLite => {
                let conn = SqliteConnection::new(config).await?;
                let alive = conn.is_alive().await;
                conn.close().await?;
                Ok(alive)
            }
        }
    }

    async fn close_connection(&self, id: &ConnectionId) -> Result<(), DbError> {
        let mut connections = self.connections.write().await;

        if let Some(connection) = connections.remove(&id.0) {
            connection.close().await?;
            Ok(())
        } else {
            Err(DbError::connection(format!(
                "Connection with id '{}' not found",
                id.0
            )))
        }
    }

    async fn get_connection(&self, id: &ConnectionId) -> Result<Arc<dyn DatabaseConnection>, DbError> {
        let connections = self.connections.read().await;

        connections
            .get(&id.0)
            .cloned()
            .ok_or_else(|| DbError::connection(format!("Connection with id '{}' not found", id.0)))
    }

    async fn list_connections(&self) -> Vec<ConnectionId> {
        let connections = self.connections.read().await;
        connections
            .keys()
            .map(|k| ConnectionId::from_string(k.clone()))
            .collect()
    }

    async fn close_all(&self) -> Result<(), DbError> {
        let mut connections = self.connections.write().await;
        let mut errors = Vec::new();

        for (id, connection) in connections.drain() {
            if let Err(e) = connection.close().await {
                errors.push(format!("Failed to close connection {}: {}", id, e));
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(DbError::connection(errors.join("; ")))
        }
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Returns the required configuration fields for a given database type
pub fn get_required_fields(db_type: DatabaseType) -> Vec<&'static str> {
    match db_type {
        DatabaseType::MySQL | DatabaseType::PostgreSQL => {
            vec!["host", "port", "database"]
        }
        DatabaseType::SQLite => {
            vec!["file_path", "database"]
        }
    }
}

/// Returns the optional configuration fields for a given database type
pub fn get_optional_fields(db_type: DatabaseType) -> Vec<&'static str> {
    match db_type {
        DatabaseType::MySQL | DatabaseType::PostgreSQL => {
            vec!["username", "password"]
        }
        DatabaseType::SQLite => {
            vec![]
        }
    }
}

/// Validates that all required fields are present for a database type
pub fn validate_required_fields(config: &ConnectionConfig) -> Result<(), DbError> {
    config.validate()
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_required_fields_mysql() {
        let fields = get_required_fields(DatabaseType::MySQL);
        assert!(fields.contains(&"host"));
        assert!(fields.contains(&"port"));
        assert!(fields.contains(&"database"));
        assert!(!fields.contains(&"file_path"));
    }

    #[test]
    fn test_get_required_fields_postgresql() {
        let fields = get_required_fields(DatabaseType::PostgreSQL);
        assert!(fields.contains(&"host"));
        assert!(fields.contains(&"port"));
        assert!(fields.contains(&"database"));
        assert!(!fields.contains(&"file_path"));
    }

    #[test]
    fn test_get_required_fields_sqlite() {
        let fields = get_required_fields(DatabaseType::SQLite);
        assert!(fields.contains(&"file_path"));
        assert!(fields.contains(&"database"));
        assert!(!fields.contains(&"host"));
        assert!(!fields.contains(&"port"));
    }

    #[test]
    fn test_get_optional_fields_mysql() {
        let fields = get_optional_fields(DatabaseType::MySQL);
        assert!(fields.contains(&"username"));
        assert!(fields.contains(&"password"));
    }

    #[test]
    fn test_get_optional_fields_sqlite() {
        let fields = get_optional_fields(DatabaseType::SQLite);
        assert!(fields.is_empty());
    }

    #[test]
    fn test_connection_id_creation() {
        let id1 = ConnectionId::new();
        let id2 = ConnectionId::new();
        assert_ne!(id1, id2);
    }

    #[test]
    fn test_connection_id_from_string() {
        let id = ConnectionId::from_string("test-id");
        assert_eq!(id.0, "test-id");
    }

    #[test]
    fn test_default_connection_manager_creation() {
        let manager = DefaultConnectionManager::new();
        // Just verify it can be created
        assert!(std::mem::size_of_val(&manager) > 0);
    }

    #[tokio::test]
    async fn test_connection_manager_list_empty() {
        let manager = DefaultConnectionManager::new();
        let connections = manager.list_connections().await;
        assert!(connections.is_empty());
    }

    #[tokio::test]
    async fn test_get_nonexistent_connection() {
        let manager = DefaultConnectionManager::new();
        let id = ConnectionId::from_string("nonexistent");
        let result = manager.get_connection(&id).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_close_nonexistent_connection() {
        let manager = DefaultConnectionManager::new();
        let id = ConnectionId::from_string("nonexistent");
        let result = manager.close_connection(&id).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_close_all_empty() {
        let manager = DefaultConnectionManager::new();
        let result = manager.close_all().await;
        assert!(result.is_ok());
    }

    // Note: Integration tests for actual database connections would require
    // running database instances. These are typically done in separate
    // integration test files with Docker containers.
}

// ============================================================================
// Property-Based Tests
// ============================================================================

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

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

    // ========================================================================
    // Property Tests
    // ========================================================================

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// **Validates: Requirements 2.4**
        /// Property 2: Database Type Configuration Fields
        /// For any DatabaseType, the required configuration fields returned should match
        /// the expected fields for that database type (e.g., SQLite requires file_path,
        /// MySQL/PostgreSQL require host and port).
        #[test]
        fn prop_database_type_configuration_fields(db_type in arb_database_type()) {
            let required_fields = get_required_fields(db_type);
            let optional_fields = get_optional_fields(db_type);

            match db_type {
                DatabaseType::MySQL | DatabaseType::PostgreSQL => {
                    // MySQL and PostgreSQL require host, port, and database
                    prop_assert!(
                        required_fields.contains(&"host"),
                        "MySQL/PostgreSQL should require 'host' field"
                    );
                    prop_assert!(
                        required_fields.contains(&"port"),
                        "MySQL/PostgreSQL should require 'port' field"
                    );
                    prop_assert!(
                        required_fields.contains(&"database"),
                        "MySQL/PostgreSQL should require 'database' field"
                    );
                    
                    // MySQL and PostgreSQL should NOT require file_path
                    prop_assert!(
                        !required_fields.contains(&"file_path"),
                        "MySQL/PostgreSQL should NOT require 'file_path' field"
                    );
                    
                    // MySQL and PostgreSQL have optional username and password
                    prop_assert!(
                        optional_fields.contains(&"username"),
                        "MySQL/PostgreSQL should have optional 'username' field"
                    );
                    prop_assert!(
                        optional_fields.contains(&"password"),
                        "MySQL/PostgreSQL should have optional 'password' field"
                    );
                }
                DatabaseType::SQLite => {
                    // SQLite requires file_path and database
                    prop_assert!(
                        required_fields.contains(&"file_path"),
                        "SQLite should require 'file_path' field"
                    );
                    prop_assert!(
                        required_fields.contains(&"database"),
                        "SQLite should require 'database' field"
                    );
                    
                    // SQLite should NOT require host or port
                    prop_assert!(
                        !required_fields.contains(&"host"),
                        "SQLite should NOT require 'host' field"
                    );
                    prop_assert!(
                        !required_fields.contains(&"port"),
                        "SQLite should NOT require 'port' field"
                    );
                    
                    // SQLite has no optional fields
                    prop_assert!(
                        optional_fields.is_empty(),
                        "SQLite should have no optional fields"
                    );
                }
            }
        }
    }
}
