// Database Manager - Configuration Storage Module
// This module handles persistent storage of connection configurations,
// query history, and application state using JSON files in Tauri's app data directory.

use super::types::{UiState, ConnectionConfig, DbError, FavoriteItem, QueryHistoryItem};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

// ============================================================================
// Configuration File Names
// ============================================================================

const CONNECTIONS_FILE: &str = "connections.json";
const QUERY_HISTORY_FILE: &str = "query_history.json";
const APP_STATE_FILE: &str = "app_state.json";
const FAVORITES_FILE: &str = "favorites.json";

// ============================================================================
// Storage Data Structures
// ============================================================================

/// Container for storing multiple connections
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ConnectionsData {
    pub connections: Vec<ConnectionConfig>,
}

/// Container for storing query history
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct QueryHistoryData {
    pub history: Vec<QueryHistoryItem>,
}

/// Container for storing favorites
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FavoritesData {
    pub favorites: Vec<FavoriteItem>,
}

// ============================================================================
// ConfigStore Trait
// ============================================================================

/// Trait defining the configuration storage interface
pub trait ConfigStore {
    /// Save a connection configuration
    fn save_connection(&self, config: &ConnectionConfig) -> Result<(), DbError>;

    /// Load all saved connection configurations
    fn load_connections(&self) -> Result<Vec<ConnectionConfig>, DbError>;

    /// Delete a connection configuration by ID
    fn delete_connection(&self, id: &str) -> Result<(), DbError>;

    /// Save a query history item
    fn save_query_history(&self, query: &QueryHistoryItem) -> Result<(), DbError>;

    /// Load query history with a limit on the number of items
    fn load_query_history(&self, limit: usize) -> Result<Vec<QueryHistoryItem>, DbError>;

    /// Clear all query history
    fn clear_query_history(&self) -> Result<(), DbError>;

    /// Save application state
    fn save_app_state(&self, state: &UiState) -> Result<(), DbError>;

    /// Load application state
    fn load_app_state(&self) -> Result<UiState, DbError>;

    /// Save a favorite item
    fn save_favorite(&self, item: &FavoriteItem) -> Result<(), DbError>;

    /// Load all favorites
    fn load_favorites(&self) -> Result<Vec<FavoriteItem>, DbError>;

    /// Delete a favorite by ID
    fn delete_favorite(&self, id: &str) -> Result<(), DbError>;
}

// ============================================================================
// File-Based ConfigStore Implementation
// ============================================================================

/// File-based implementation of ConfigStore
/// Stores configuration data as JSON files in the specified data directory
#[derive(Debug, Clone)]
pub struct FileConfigStore {
    /// Base directory for storing configuration files
    data_dir: PathBuf,
}

impl FileConfigStore {
    /// Creates a new FileConfigStore with the specified data directory
    pub fn new(data_dir: PathBuf) -> Self {
        Self { data_dir }
    }

    /// Creates a FileConfigStore using Tauri's app data directory
    /// This should be called with the app handle to get the proper path
    pub fn from_app_data_dir(app_data_dir: PathBuf) -> Result<Self, DbError> {
        let config_dir = app_data_dir.join("database-manager");

        // Ensure the directory exists
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).map_err(|e| {
                DbError::config(format!("Failed to create config directory: {}", e))
            })?;
        }

        Ok(Self::new(config_dir))
    }

    /// Gets the full path for a configuration file
    fn get_file_path(&self, filename: &str) -> PathBuf {
        self.data_dir.join(filename)
    }

    /// Ensures the data directory exists
    fn ensure_data_dir(&self) -> Result<(), DbError> {
        if !self.data_dir.exists() {
            fs::create_dir_all(&self.data_dir).map_err(|e| {
                DbError::config(format!("Failed to create data directory: {}", e))
            })?;
        }
        Ok(())
    }

    /// Reads and deserializes a JSON file, returning default if file doesn't exist
    fn read_json_file<T: for<'de> Deserialize<'de> + Default>(
        &self,
        filename: &str,
    ) -> Result<T, DbError> {
        let path = self.get_file_path(filename);

        if !path.exists() {
            return Ok(T::default());
        }

        let content = fs::read_to_string(&path)
            .map_err(|e| DbError::config(format!("Failed to read {}: {}", filename, e)))?;

        // Handle empty files
        if content.trim().is_empty() {
            return Ok(T::default());
        }

        serde_json::from_str(&content)
            .map_err(|e| DbError::config(format!("Failed to parse {}: {}", filename, e)))
    }

    /// Serializes and writes data to a JSON file
    fn write_json_file<T: Serialize>(&self, filename: &str, data: &T) -> Result<(), DbError> {
        self.ensure_data_dir()?;

        let path = self.get_file_path(filename);
        let content = serde_json::to_string_pretty(data)
            .map_err(|e| DbError::config(format!("Failed to serialize {}: {}", filename, e)))?;

        fs::write(&path, content)
            .map_err(|e| DbError::config(format!("Failed to write {}: {}", filename, e)))
    }
}

impl ConfigStore for FileConfigStore {
    fn save_connection(&self, config: &ConnectionConfig) -> Result<(), DbError> {
        let mut data: ConnectionsData = self.read_json_file(CONNECTIONS_FILE)?;

        // Check if connection with same ID exists and update it, otherwise add new
        if let Some(existing) = data.connections.iter_mut().find(|c| c.id == config.id) {
            *existing = config.clone();
        } else {
            data.connections.push(config.clone());
        }

        self.write_json_file(CONNECTIONS_FILE, &data)
    }

    fn load_connections(&self) -> Result<Vec<ConnectionConfig>, DbError> {
        let data: ConnectionsData = self.read_json_file(CONNECTIONS_FILE)?;
        Ok(data.connections)
    }

    fn delete_connection(&self, id: &str) -> Result<(), DbError> {
        let mut data: ConnectionsData = self.read_json_file(CONNECTIONS_FILE)?;

        let original_len = data.connections.len();
        data.connections.retain(|c| c.id != id);

        if data.connections.len() == original_len {
            return Err(DbError::config(format!(
                "Connection with id '{}' not found",
                id
            )));
        }

        self.write_json_file(CONNECTIONS_FILE, &data)
    }

    fn save_query_history(&self, query: &QueryHistoryItem) -> Result<(), DbError> {
        let mut data: QueryHistoryData = self.read_json_file(QUERY_HISTORY_FILE)?;

        // Add new query at the beginning (most recent first)
        data.history.insert(0, query.clone());

        // Limit history size to prevent unbounded growth (keep last 1000 items)
        const MAX_HISTORY_SIZE: usize = 1000;
        if data.history.len() > MAX_HISTORY_SIZE {
            data.history.truncate(MAX_HISTORY_SIZE);
        }

        self.write_json_file(QUERY_HISTORY_FILE, &data)
    }

    fn load_query_history(&self, limit: usize) -> Result<Vec<QueryHistoryItem>, DbError> {
        let data: QueryHistoryData = self.read_json_file(QUERY_HISTORY_FILE)?;

        // Return up to 'limit' items
        let result: Vec<QueryHistoryItem> = data.history.into_iter().take(limit).collect();

        Ok(result)
    }

    fn clear_query_history(&self) -> Result<(), DbError> {
        let data = QueryHistoryData::default();
        self.write_json_file(QUERY_HISTORY_FILE, &data)
    }

    fn save_app_state(&self, state: &UiState) -> Result<(), DbError> {
        self.write_json_file(APP_STATE_FILE, state)
    }

    fn load_app_state(&self) -> Result<UiState, DbError> {
        self.read_json_file(APP_STATE_FILE)
    }

    fn save_favorite(&self, item: &FavoriteItem) -> Result<(), DbError> {
        let mut data: FavoritesData = self.read_json_file(FAVORITES_FILE)?;

        // 检查是否已存在相同 ID 的收藏，存在则更新，否则添加
        if let Some(existing) = data.favorites.iter_mut().find(|f| f.id == item.id) {
            *existing = item.clone();
        } else {
            data.favorites.push(item.clone());
        }

        self.write_json_file(FAVORITES_FILE, &data)
    }

    fn load_favorites(&self) -> Result<Vec<FavoriteItem>, DbError> {
        let data: FavoritesData = self.read_json_file(FAVORITES_FILE)?;
        Ok(data.favorites)
    }

    fn delete_favorite(&self, id: &str) -> Result<(), DbError> {
        let mut data: FavoritesData = self.read_json_file(FAVORITES_FILE)?;

        let original_len = data.favorites.len();
        data.favorites.retain(|f| f.id != id);

        if data.favorites.len() == original_len {
            return Err(DbError::config(format!(
                "Favorite with id '{}' not found",
                id
            )));
        }

        self.write_json_file(FAVORITES_FILE, &data)
    }
}

// ============================================================================
// Helper Functions for Tauri Integration
// ============================================================================

/// Creates a FileConfigStore from a Tauri app handle
/// This is the recommended way to create a ConfigStore in a Tauri application
pub fn create_config_store_from_app(
    app: &tauri::AppHandle,
) -> Result<FileConfigStore, DbError> {
    use tauri::Manager;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| DbError::config(format!("Failed to get app data directory: {}", e)))?;

    FileConfigStore::from_app_data_dir(app_data_dir)
}

/// Creates a FileConfigStore for testing purposes with a temporary directory
#[cfg(test)]
pub fn create_test_config_store() -> Result<FileConfigStore, DbError> {
    let temp_dir = std::env::temp_dir().join(format!(
        "db-manager-test-{}",
        uuid::Uuid::new_v4()
    ));
    FileConfigStore::from_app_data_dir(temp_dir)
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use super::types::{DatabaseType, TabState, TabType, WindowState};
    use std::fs;

    /// Helper to create a test config store with a unique temp directory
    fn setup_test_store() -> (FileConfigStore, PathBuf) {
        let temp_dir = std::env::temp_dir().join(format!(
            "db-manager-test-{}",
            uuid::Uuid::new_v4()
        ));
        let store = FileConfigStore::new(temp_dir.clone());
        (store, temp_dir)
    }

    /// Helper to clean up test directory
    fn cleanup_test_dir(path: &PathBuf) {
        if path.exists() {
            let _ = fs::remove_dir_all(path);
        }
    }

    // ------------------------------------------------------------------------
    // Connection Tests
    // ------------------------------------------------------------------------

    #[test]
    fn test_save_and_load_connection() {
        let (store, temp_dir) = setup_test_store();

        let config = ConnectionConfig {
            id: "test-conn-1".to_string(),
            name: "Test MySQL".to_string(),
            db_type: DatabaseType::MySQL,
            host: Some("localhost".to_string()),
            port: Some(3306),
            username: Some("root".to_string()),
            password: Some("password".to_string()),
            database: "testdb".to_string(),
            file_path: None,
        };

        // Save connection
        store.save_connection(&config).unwrap();

        // Load connections
        let connections = store.load_connections().unwrap();
        assert_eq!(connections.len(), 1);
        assert_eq!(connections[0].id, "test-conn-1");
        assert_eq!(connections[0].name, "Test MySQL");
        assert_eq!(connections[0].db_type, DatabaseType::MySQL);

        cleanup_test_dir(&temp_dir);
    }

    #[test]
    fn test_update_existing_connection() {
        let (store, temp_dir) = setup_test_store();

        let mut config = ConnectionConfig {
            id: "test-conn-1".to_string(),
            name: "Original Name".to_string(),
            db_type: DatabaseType::MySQL,
            host: Some("localhost".to_string()),
            port: Some(3306),
            username: None,
            password: None,
            database: "testdb".to_string(),
            file_path: None,
        };

        // Save original
        store.save_connection(&config).unwrap();

        // Update name
        config.name = "Updated Name".to_string();
        store.save_connection(&config).unwrap();

        // Verify only one connection exists with updated name
        let connections = store.load_connections().unwrap();
        assert_eq!(connections.len(), 1);
        assert_eq!(connections[0].name, "Updated Name");

        cleanup_test_dir(&temp_dir);
    }

    #[test]
    fn test_delete_connection() {
        let (store, temp_dir) = setup_test_store();

        let config1 = ConnectionConfig {
            id: "conn-1".to_string(),
            name: "Connection 1".to_string(),
            db_type: DatabaseType::MySQL,
            host: Some("localhost".to_string()),
            port: Some(3306),
            username: None,
            password: None,
            database: "db1".to_string(),
            file_path: None,
        };

        let config2 = ConnectionConfig {
            id: "conn-2".to_string(),
            name: "Connection 2".to_string(),
            db_type: DatabaseType::PostgreSQL,
            host: Some("localhost".to_string()),
            port: Some(5432),
            username: None,
            password: None,
            database: "db2".to_string(),
            file_path: None,
        };

        // Save both connections
        store.save_connection(&config1).unwrap();
        store.save_connection(&config2).unwrap();

        // Delete first connection
        store.delete_connection("conn-1").unwrap();

        // Verify only second connection remains
        let connections = store.load_connections().unwrap();
        assert_eq!(connections.len(), 1);
        assert_eq!(connections[0].id, "conn-2");

        cleanup_test_dir(&temp_dir);
    }

    #[test]
    fn test_delete_nonexistent_connection() {
        let (store, temp_dir) = setup_test_store();

        // Try to delete non-existent connection
        let result = store.delete_connection("nonexistent");
        assert!(result.is_err());

        cleanup_test_dir(&temp_dir);
    }

    #[test]
    fn test_load_connections_empty() {
        let (store, temp_dir) = setup_test_store();

        // Load from non-existent file should return empty vec
        let connections = store.load_connections().unwrap();
        assert!(connections.is_empty());

        cleanup_test_dir(&temp_dir);
    }

    // ------------------------------------------------------------------------
    // Query History Tests
    // ------------------------------------------------------------------------

    #[test]
    fn test_save_and_load_query_history() {
        let (store, temp_dir) = setup_test_store();

        let query = QueryHistoryItem {
            id: "query-1".to_string(),
            connection_id: "conn-1".to_string(),
            sql: "SELECT * FROM users".to_string(),
            executed_at: "2024-01-15T10:30:00Z".to_string(),
            execution_time_ms: 45,
            success: true,
            error_message: None,
        };

        // Save query
        store.save_query_history(&query).unwrap();

        // Load history
        let history = store.load_query_history(10).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].sql, "SELECT * FROM users");

        cleanup_test_dir(&temp_dir);
    }

    #[test]
    fn test_query_history_ordering() {
        let (store, temp_dir) = setup_test_store();

        // Save multiple queries
        for i in 1..=5 {
            let query = QueryHistoryItem {
                id: format!("query-{}", i),
                connection_id: "conn-1".to_string(),
                sql: format!("SELECT {}", i),
                executed_at: format!("2024-01-15T10:30:0{}Z", i),
                execution_time_ms: 10,
                success: true,
                error_message: None,
            };
            store.save_query_history(&query).unwrap();
        }

        // Load history - most recent should be first
        let history = store.load_query_history(10).unwrap();
        assert_eq!(history.len(), 5);
        assert_eq!(history[0].sql, "SELECT 5"); // Most recent
        assert_eq!(history[4].sql, "SELECT 1"); // Oldest

        cleanup_test_dir(&temp_dir);
    }

    #[test]
    fn test_query_history_limit() {
        let (store, temp_dir) = setup_test_store();

        // Save 10 queries
        for i in 1..=10 {
            let query = QueryHistoryItem {
                id: format!("query-{}", i),
                connection_id: "conn-1".to_string(),
                sql: format!("SELECT {}", i),
                executed_at: format!("2024-01-15T10:30:0{}Z", i % 10),
                execution_time_ms: 10,
                success: true,
                error_message: None,
            };
            store.save_query_history(&query).unwrap();
        }

        // Load with limit of 5
        let history = store.load_query_history(5).unwrap();
        assert_eq!(history.len(), 5);

        cleanup_test_dir(&temp_dir);
    }

    #[test]
    fn test_clear_query_history() {
        let (store, temp_dir) = setup_test_store();

        // Save some queries
        let query = QueryHistoryItem {
            id: "query-1".to_string(),
            connection_id: "conn-1".to_string(),
            sql: "SELECT * FROM users".to_string(),
            executed_at: "2024-01-15T10:30:00Z".to_string(),
            execution_time_ms: 45,
            success: true,
            error_message: None,
        };
        store.save_query_history(&query).unwrap();

        // Clear history
        store.clear_query_history().unwrap();

        // Verify empty
        let history = store.load_query_history(10).unwrap();
        assert!(history.is_empty());

        cleanup_test_dir(&temp_dir);
    }

    // ------------------------------------------------------------------------
    // App State Tests
    // ------------------------------------------------------------------------

    #[test]
    fn test_save_and_load_app_state() {
        let (store, temp_dir) = setup_test_store();

        let state = UiState {
            window_state: WindowState {
                width: 1400,
                height: 900,
                x: 50,
                y: 50,
                maximized: false,
            },
            theme: "light".to_string(),
            active_connection_id: Some("conn-1".to_string()),
            open_tabs: vec![TabState {
                id: "tab-1".to_string(),
                tab_type: TabType::Query,
                connection_id: "conn-1".to_string(),
                title: "Query 1".to_string(),
                content: Some("SELECT * FROM users".to_string()),
            }],
            active_tab_id: Some("tab-1".to_string()),
            sidebar_width: 300,
        };

        // Save state
        store.save_app_state(&state).unwrap();

        // Load state
        let loaded = store.load_app_state().unwrap();
        assert_eq!(loaded.window_state.width, 1400);
        assert_eq!(loaded.theme, "light");
        assert_eq!(loaded.active_connection_id, Some("conn-1".to_string()));
        assert_eq!(loaded.open_tabs.len(), 1);
        assert_eq!(loaded.sidebar_width, 300);

        cleanup_test_dir(&temp_dir);
    }

    #[test]
    fn test_load_app_state_default() {
        let (store, temp_dir) = setup_test_store();

        // Load from non-existent file should return default
        let state = store.load_app_state().unwrap();
        assert_eq!(state.theme, "dark");
        assert_eq!(state.window_state.width, 1200);
        assert!(state.open_tabs.is_empty());

        cleanup_test_dir(&temp_dir);
    }

    // ------------------------------------------------------------------------
    // SQLite Connection Tests
    // ------------------------------------------------------------------------

    #[test]
    fn test_save_sqlite_connection() {
        let (store, temp_dir) = setup_test_store();

        let config = ConnectionConfig {
            id: "sqlite-conn".to_string(),
            name: "Local SQLite".to_string(),
            db_type: DatabaseType::SQLite,
            host: None,
            port: None,
            username: None,
            password: None,
            database: "main".to_string(),
            file_path: Some("/path/to/database.db".to_string()),
        };

        store.save_connection(&config).unwrap();

        let connections = store.load_connections().unwrap();
        assert_eq!(connections.len(), 1);
        assert_eq!(connections[0].db_type, DatabaseType::SQLite);
        assert_eq!(
            connections[0].file_path,
            Some("/path/to/database.db".to_string())
        );

        cleanup_test_dir(&temp_dir);
    }

    // ------------------------------------------------------------------------
    // Error Handling Tests
    // ------------------------------------------------------------------------

    #[test]
    fn test_invalid_json_handling() {
        let (store, temp_dir) = setup_test_store();

        // Create directory and write invalid JSON
        fs::create_dir_all(&temp_dir).unwrap();
        let connections_path = temp_dir.join(CONNECTIONS_FILE);
        fs::write(&connections_path, "{ invalid json }").unwrap();

        // Should return error for invalid JSON
        let result = store.load_connections();
        assert!(result.is_err());

        cleanup_test_dir(&temp_dir);
    }

    #[test]
    fn test_empty_file_handling() {
        let (store, temp_dir) = setup_test_store();

        // Create directory and write empty file
        fs::create_dir_all(&temp_dir).unwrap();
        let connections_path = temp_dir.join(CONNECTIONS_FILE);
        fs::write(&connections_path, "").unwrap();

        // Should return default (empty vec) for empty file
        let connections = store.load_connections().unwrap();
        assert!(connections.is_empty());

        cleanup_test_dir(&temp_dir);
    }
}
