// Database Manager - Schema Management Module
// This module handles database schema operations including listing databases/tables,
// retrieving table structure, and generating DDL SQL statements.

use super::connection::{
    DatabaseConnection, MySqlConnection, PostgresConnection, SqliteConnection,
};
use super::types::{
    ColumnDefinition, DatabaseType, DbError, ForeignKeyInfo, IndexInfo, TableInfo,
};
use std::sync::Arc;

// ============================================================================
// Schema Manager Trait
// ============================================================================

/// Trait defining the schema management interface
#[async_trait::async_trait]
pub trait SchemaManager: Send + Sync {
    /// Lists all databases available on the connection
    async fn list_databases(&self, conn: Arc<dyn DatabaseConnection>) -> Result<Vec<String>, DbError>;

    /// Lists all tables in a specific database
    async fn list_tables(
        &self,
        conn: Arc<dyn DatabaseConnection>,
        database: &str,
    ) -> Result<Vec<String>, DbError>;

    /// Gets detailed information about a table
    async fn get_table_info(
        &self,
        conn: Arc<dyn DatabaseConnection>,
        table: &str,
    ) -> Result<TableInfo, DbError>;

    /// Creates a new table based on TableInfo
    async fn create_table(
        &self,
        conn: Arc<dyn DatabaseConnection>,
        table: &TableInfo,
    ) -> Result<(), DbError>;

    /// Drops a table
    async fn drop_table(
        &self,
        conn: Arc<dyn DatabaseConnection>,
        table: &str,
    ) -> Result<(), DbError>;
}


// ============================================================================
// Default Schema Manager Implementation
// ============================================================================

/// Default implementation of SchemaManager
pub struct DefaultSchemaManager;

impl DefaultSchemaManager {
    /// Creates a new DefaultSchemaManager
    pub fn new() -> Self {
        Self
    }
}

impl Default for DefaultSchemaManager {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl SchemaManager for DefaultSchemaManager {
    async fn list_databases(&self, conn: Arc<dyn DatabaseConnection>) -> Result<Vec<String>, DbError> {
        match conn.db_type() {
            DatabaseType::MySQL => list_databases_mysql(conn).await,
            DatabaseType::PostgreSQL => list_databases_postgres(conn).await,
            DatabaseType::SQLite => list_databases_sqlite(conn).await,
        }
    }

    async fn list_tables(
        &self,
        conn: Arc<dyn DatabaseConnection>,
        database: &str,
    ) -> Result<Vec<String>, DbError> {
        match conn.db_type() {
            DatabaseType::MySQL => list_tables_mysql(conn, database).await,
            DatabaseType::PostgreSQL => list_tables_postgres(conn, database).await,
            DatabaseType::SQLite => list_tables_sqlite(conn).await,
        }
    }

    async fn get_table_info(
        &self,
        conn: Arc<dyn DatabaseConnection>,
        table: &str,
    ) -> Result<TableInfo, DbError> {
        match conn.db_type() {
            DatabaseType::MySQL => get_table_info_mysql(conn, table).await,
            DatabaseType::PostgreSQL => get_table_info_postgres(conn, table).await,
            DatabaseType::SQLite => get_table_info_sqlite(conn, table).await,
        }
    }

    async fn create_table(
        &self,
        conn: Arc<dyn DatabaseConnection>,
        table: &TableInfo,
    ) -> Result<(), DbError> {
        table.validate()?;
        let sql = generate_create_table_sql(table, conn.db_type());
        execute_ddl(conn, &sql).await
    }

    async fn drop_table(
        &self,
        conn: Arc<dyn DatabaseConnection>,
        table: &str,
    ) -> Result<(), DbError> {
        let sql = format!("DROP TABLE {}", quote_identifier(table, conn.db_type()));
        execute_ddl(conn, &sql).await
    }
}


// ============================================================================
// MySQL Schema Operations
// ============================================================================

async fn list_databases_mysql(conn: Arc<dyn DatabaseConnection>) -> Result<Vec<String>, DbError> {
    use mysql_async::prelude::*;

    let mysql_conn = conn
        .as_any()
        .downcast_ref::<MySqlConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for MySQL"))?;

    let mut conn = mysql_conn.get_conn().await?;
    let rows: Vec<Option<String>> = conn
        .query("SHOW DATABASES")
        .await
        .map_err(|e| DbError::schema(format!("Failed to list databases: {}", e)))?;

    Ok(rows.into_iter().flatten().collect())
}

async fn list_tables_mysql(
    conn: Arc<dyn DatabaseConnection>,
    database: &str,
) -> Result<Vec<String>, DbError> {
    use mysql_async::prelude::*;

    let mysql_conn = conn
        .as_any()
        .downcast_ref::<MySqlConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for MySQL"))?;

    let mut conn = mysql_conn.get_conn().await?;

    // Use the specified database
    let use_db = format!("USE {}", quote_identifier(database, DatabaseType::MySQL));
    conn.query_drop(&use_db)
        .await
        .map_err(|e| DbError::schema(format!("Failed to use database: {}", e)))?;

    let rows: Vec<Option<String>> = conn
        .query("SHOW TABLES")
        .await
        .map_err(|e| DbError::schema(format!("Failed to list tables: {}", e)))?;

    Ok(rows.into_iter().flatten().collect())
}

async fn get_table_info_mysql(
    conn: Arc<dyn DatabaseConnection>,
    table: &str,
) -> Result<TableInfo, DbError> {
    log::info!("[get_table_info_mysql] Starting for table: {}", table);
    
    let mysql_conn = conn
        .as_any()
        .downcast_ref::<MySqlConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for MySQL"))?;

    log::info!("[get_table_info_mysql] Getting connection from pool...");
    let mut conn = mysql_conn.get_conn().await?;
    log::info!("[get_table_info_mysql] Got connection, fetching columns...");

    // Get column information
    let columns = get_columns_mysql(&mut conn, table).await?;
    log::info!("[get_table_info_mysql] Got {} columns", columns.len());

    // Get index information
    let indexes = get_indexes_mysql(&mut conn, table).await?;
    log::info!("[get_table_info_mysql] Got {} indexes", indexes.len());

    // Get foreign key information
    let foreign_keys = get_foreign_keys_mysql(&mut conn, table).await?;
    log::info!("[get_table_info_mysql] Got {} foreign keys", foreign_keys.len());

    Ok(TableInfo {
        name: table.to_string(),
        schema: None,
        columns,
        indexes,
        foreign_keys,
    })
}


async fn get_columns_mysql(
    conn: &mut mysql_async::Conn,
    table: &str,
) -> Result<Vec<ColumnDefinition>, DbError> {
    use mysql_async::prelude::*;

    let sql = format!(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = '{}' 
         ORDER BY ORDINAL_POSITION",
        table.replace('\'', "''")
    );

    let rows: Vec<mysql_async::Row> = conn
        .query(&sql)
        .await
        .map_err(|e| DbError::schema(format!("Failed to get columns: {}", e)))?;

    let columns = rows
        .into_iter()
        .map(|row| {
            // 使用 Option<String> 来安全处理可能为 NULL 的值
            let name: Option<String> = row.get(0);
            let data_type: Option<String> = row.get(1);
            let is_nullable: Option<String> = row.get(2);
            let default_value: Option<String> = row.get(3);
            let column_key: Option<String> = row.get(4);
            let extra: Option<String> = row.get(5);

            ColumnDefinition {
                name: name.unwrap_or_default(),
                data_type: data_type.unwrap_or_default().to_uppercase(),
                nullable: is_nullable.as_deref() == Some("YES"),
                default_value,
                is_primary_key: column_key.as_deref() == Some("PRI"),
                is_auto_increment: extra.as_deref().map(|e| e.contains("auto_increment")).unwrap_or(false),
            }
        })
        .collect();

    Ok(columns)
}

async fn get_indexes_mysql(
    conn: &mut mysql_async::Conn,
    table: &str,
) -> Result<Vec<IndexInfo>, DbError> {
    use mysql_async::prelude::*;
    use std::collections::HashMap;

    let sql = format!(
        "SHOW INDEX FROM {}",
        quote_identifier(table, DatabaseType::MySQL)
    );

    let rows: Vec<mysql_async::Row> = conn
        .query(&sql)
        .await
        .map_err(|e| DbError::schema(format!("Failed to get indexes: {}", e)))?;

    // Group columns by index name
    let mut index_map: HashMap<String, (bool, bool, Vec<String>)> = HashMap::new();

    for row in rows {
        // 使用 Option<String> 来安全处理可能为 NULL 的值
        let key_name: Option<String> = row.get("Key_name");
        let non_unique: Option<i64> = row.get("Non_unique");
        let column_name: Option<String> = row.get("Column_name");

        let key_name = key_name.unwrap_or_default();
        let column_name = column_name.unwrap_or_default();
        let is_unique = non_unique.unwrap_or(1) == 0;
        let is_primary = key_name == "PRIMARY";

        index_map
            .entry(key_name)
            .or_insert_with(|| (is_unique, is_primary, Vec::new()))
            .2
            .push(column_name);
    }

    let indexes = index_map
        .into_iter()
        .map(|(name, (is_unique, is_primary, columns))| IndexInfo {
            name,
            columns,
            is_unique,
            is_primary,
        })
        .collect();

    Ok(indexes)
}


async fn get_foreign_keys_mysql(
    conn: &mut mysql_async::Conn,
    table: &str,
) -> Result<Vec<ForeignKeyInfo>, DbError> {
    use mysql_async::prelude::*;
    use std::collections::HashMap;

    let sql = format!(
        "SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME,
                DELETE_RULE, UPDATE_RULE
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
         JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
           ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
         WHERE kcu.TABLE_NAME = '{}' AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY kcu.ORDINAL_POSITION",
        table.replace('\'', "''")
    );

    let rows: Vec<mysql_async::Row> = conn
        .query(&sql)
        .await
        .map_err(|e| DbError::schema(format!("Failed to get foreign keys: {}", e)))?;

    // Group by constraint name
    let mut fk_map: HashMap<String, ForeignKeyInfo> = HashMap::new();

    for row in rows {
        // 使用 Option<String> 来安全处理可能为 NULL 的值
        let name: Option<String> = row.get(0);
        let column: Option<String> = row.get(1);
        let ref_table: Option<String> = row.get(2);
        let ref_column: Option<String> = row.get(3);
        let on_delete: Option<String> = row.get(4);
        let on_update: Option<String> = row.get(5);

        let name = name.unwrap_or_default();
        let column = column.unwrap_or_default();
        let ref_table = ref_table.unwrap_or_default();
        let ref_column = ref_column.unwrap_or_default();

        fk_map
            .entry(name.clone())
            .or_insert_with(|| ForeignKeyInfo {
                name: name.clone(),
                columns: Vec::new(),
                referenced_table: ref_table,
                referenced_columns: Vec::new(),
                on_delete,
                on_update,
            });

        if let Some(fk) = fk_map.get_mut(&name) {
            fk.columns.push(column);
            fk.referenced_columns.push(ref_column);
        }
    }

    Ok(fk_map.into_values().collect())
}


// ============================================================================
// PostgreSQL Schema Operations
// ============================================================================

async fn list_databases_postgres(conn: Arc<dyn DatabaseConnection>) -> Result<Vec<String>, DbError> {
    let pg_conn = conn
        .as_any()
        .downcast_ref::<PostgresConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for PostgreSQL"))?;

    let client = pg_conn.client();
    let client = client.lock().await;

    let rows = client
        .query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname", &[])
        .await
        .map_err(|e| DbError::schema(format!("Failed to list databases: {}", e)))?;

    let databases: Vec<String> = rows.iter().map(|row| row.get(0)).collect();
    Ok(databases)
}

async fn list_tables_postgres(
    conn: Arc<dyn DatabaseConnection>,
    schema: &str,
) -> Result<Vec<String>, DbError> {
    let pg_conn = conn
        .as_any()
        .downcast_ref::<PostgresConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for PostgreSQL"))?;

    let client = pg_conn.client();
    let client = client.lock().await;

    let rows = client
        .query(
            "SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename",
            &[&schema],
        )
        .await
        .map_err(|e| DbError::schema(format!("Failed to list tables: {}", e)))?;

    let tables: Vec<String> = rows.iter().map(|row| row.get(0)).collect();
    Ok(tables)
}

async fn get_table_info_postgres(
    conn: Arc<dyn DatabaseConnection>,
    table: &str,
) -> Result<TableInfo, DbError> {
    let pg_conn = conn
        .as_any()
        .downcast_ref::<PostgresConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for PostgreSQL"))?;

    let client = pg_conn.client();
    let client = client.lock().await;

    // Get column information
    let columns = get_columns_postgres(&client, table).await?;

    // Get index information
    let indexes = get_indexes_postgres(&client, table).await?;

    // Get foreign key information
    let foreign_keys = get_foreign_keys_postgres(&client, table).await?;

    Ok(TableInfo {
        name: table.to_string(),
        schema: Some("public".to_string()),
        columns,
        indexes,
        foreign_keys,
    })
}


async fn get_columns_postgres(
    client: &tokio_postgres::Client,
    table: &str,
) -> Result<Vec<ColumnDefinition>, DbError> {
    let sql = r#"
        SELECT 
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
        FROM information_schema.columns c
        LEFT JOIN (
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.column_name = pk.column_name
        WHERE c.table_name = $1
        ORDER BY c.ordinal_position
    "#;

    let rows = client
        .query(sql, &[&table])
        .await
        .map_err(|e| DbError::schema(format!("Failed to get columns: {}", e)))?;

    let columns = rows
        .iter()
        .map(|row| {
            let name: String = row.get(0);
            let data_type: String = row.get(1);
            let is_nullable: String = row.get(2);
            let default_value: Option<String> = row.get(3);
            let is_primary_key: bool = row.get(4);

            // Check for auto-increment (serial types or sequences)
            let is_auto_increment = default_value
                .as_ref()
                .map(|d| d.contains("nextval"))
                .unwrap_or(false);

            ColumnDefinition {
                name,
                data_type: data_type.to_uppercase(),
                nullable: is_nullable == "YES",
                default_value: if is_auto_increment { None } else { default_value },
                is_primary_key,
                is_auto_increment,
            }
        })
        .collect();

    Ok(columns)
}

async fn get_indexes_postgres(
    client: &tokio_postgres::Client,
    table: &str,
) -> Result<Vec<IndexInfo>, DbError> {
    let sql = r#"
        SELECT 
            i.relname as index_name,
            array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) as columns,
            ix.indisunique as is_unique,
            ix.indisprimary as is_primary
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = $1
        GROUP BY i.relname, ix.indisunique, ix.indisprimary
    "#;

    let rows = client
        .query(sql, &[&table])
        .await
        .map_err(|e| DbError::schema(format!("Failed to get indexes: {}", e)))?;

    let indexes = rows
        .iter()
        .map(|row| {
            let name: String = row.get(0);
            let columns: Vec<String> = row.get(1);
            let is_unique: bool = row.get(2);
            let is_primary: bool = row.get(3);

            IndexInfo {
                name,
                columns,
                is_unique,
                is_primary,
            }
        })
        .collect();

    Ok(indexes)
}


async fn get_foreign_keys_postgres(
    client: &tokio_postgres::Client,
    table: &str,
) -> Result<Vec<ForeignKeyInfo>, DbError> {
    let sql = r#"
        SELECT
            tc.constraint_name,
            array_agg(kcu.column_name ORDER BY kcu.ordinal_position) as columns,
            ccu.table_name as referenced_table,
            array_agg(ccu.column_name ORDER BY kcu.ordinal_position) as referenced_columns,
            rc.delete_rule,
            rc.update_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
        GROUP BY tc.constraint_name, ccu.table_name, rc.delete_rule, rc.update_rule
    "#;

    let rows = client
        .query(sql, &[&table])
        .await
        .map_err(|e| DbError::schema(format!("Failed to get foreign keys: {}", e)))?;

    let foreign_keys = rows
        .iter()
        .map(|row| {
            let name: String = row.get(0);
            let columns: Vec<String> = row.get(1);
            let referenced_table: String = row.get(2);
            let referenced_columns: Vec<String> = row.get(3);
            let on_delete: Option<String> = row.get(4);
            let on_update: Option<String> = row.get(5);

            ForeignKeyInfo {
                name,
                columns,
                referenced_table,
                referenced_columns,
                on_delete,
                on_update,
            }
        })
        .collect();

    Ok(foreign_keys)
}


// ============================================================================
// SQLite Schema Operations
// ============================================================================

async fn list_databases_sqlite(conn: Arc<dyn DatabaseConnection>) -> Result<Vec<String>, DbError> {
    let sqlite_conn = conn
        .as_any()
        .downcast_ref::<SqliteConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for SQLite"))?;

    let connection = sqlite_conn.connection();

    let result = tokio::task::spawn_blocking(move || {
        let conn = connection.blocking_lock();
        let mut stmt = conn
            .prepare("PRAGMA database_list")
            .map_err(|e| DbError::schema(format!("Failed to list databases: {}", e)))?;

        let databases: Vec<String> = stmt
            .query_map([], |row| row.get(1))
            .map_err(|e| DbError::schema(format!("Failed to list databases: {}", e)))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(databases)
    })
    .await
    .map_err(|e| DbError::schema(format!("Task join error: {}", e)))?;

    result
}

async fn list_tables_sqlite(conn: Arc<dyn DatabaseConnection>) -> Result<Vec<String>, DbError> {
    let sqlite_conn = conn
        .as_any()
        .downcast_ref::<SqliteConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for SQLite"))?;

    let connection = sqlite_conn.connection();
    let guard = connection.lock().await;

    let result = tokio::task::block_in_place(|| {
        let mut stmt = guard
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
            .map_err(|e| DbError::schema(format!("Failed to list tables: {}", e)))?;

        let tables: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| DbError::schema(format!("Failed to list tables: {}", e)))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(tables)
    });

    result
}


async fn get_table_info_sqlite(
    conn: Arc<dyn DatabaseConnection>,
    table: &str,
) -> Result<TableInfo, DbError> {
    let sqlite_conn = conn
        .as_any()
        .downcast_ref::<SqliteConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for SQLite"))?;

    let connection = sqlite_conn.connection();
    let table_name = table.to_string();

    // 先获取锁，然后在 block_in_place 中使用
    let guard = connection.lock().await;
    
    let result = tokio::task::block_in_place(|| {
        // Get column information using PRAGMA table_info
        let columns = get_columns_sqlite(&guard, &table_name)?;

        // Get index information
        let indexes = get_indexes_sqlite(&guard, &table_name)?;

        // Get foreign key information
        let foreign_keys = get_foreign_keys_sqlite(&guard, &table_name)?;

        Ok(TableInfo {
            name: table_name,
            schema: None,
            columns,
            indexes,
            foreign_keys,
        })
    });

    result
}

fn get_columns_sqlite(
    conn: &rusqlite::Connection,
    table: &str,
) -> Result<Vec<ColumnDefinition>, DbError> {
    let sql = format!("PRAGMA table_info({})", quote_identifier(table, DatabaseType::SQLite));
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| DbError::schema(format!("Failed to get columns: {}", e)))?;

    let columns: Vec<ColumnDefinition> = stmt
        .query_map([], |row| {
            let name: String = row.get(1)?;
            let data_type: String = row.get(2)?;
            let not_null: i32 = row.get(3)?;
            let default_value: Option<String> = row.get(4)?;
            let pk: i32 = row.get(5)?;

            Ok(ColumnDefinition {
                name,
                data_type: data_type.to_uppercase(),
                nullable: not_null == 0,
                default_value,
                is_primary_key: pk > 0,
                is_auto_increment: pk > 0 && data_type.to_uppercase() == "INTEGER",
            })
        })
        .map_err(|e| DbError::schema(format!("Failed to get columns: {}", e)))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(columns)
}


fn get_indexes_sqlite(
    conn: &rusqlite::Connection,
    table: &str,
) -> Result<Vec<IndexInfo>, DbError> {
    let sql = format!("PRAGMA index_list({})", quote_identifier(table, DatabaseType::SQLite));
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| DbError::schema(format!("Failed to get indexes: {}", e)))?;

    let index_list: Vec<(String, bool, String)> = stmt
        .query_map([], |row| {
            let name: String = row.get(1)?;
            let unique: i32 = row.get(2)?;
            let origin: String = row.get(3)?;
            Ok((name, unique == 1, origin))
        })
        .map_err(|e| DbError::schema(format!("Failed to get indexes: {}", e)))?
        .filter_map(|r| r.ok())
        .collect();

    let mut indexes = Vec::new();

    for (index_name, is_unique, origin) in index_list {
        let sql = format!("PRAGMA index_info({})", quote_identifier(&index_name, DatabaseType::SQLite));
        let mut stmt = conn
            .prepare(&sql)
            .map_err(|e| DbError::schema(format!("Failed to get index info: {}", e)))?;

        let columns: Vec<String> = stmt
            .query_map([], |row| row.get(2))
            .map_err(|e| DbError::schema(format!("Failed to get index columns: {}", e)))?
            .filter_map(|r| r.ok())
            .collect();

        indexes.push(IndexInfo {
            name: index_name,
            columns,
            is_unique,
            is_primary: origin == "pk",
        });
    }

    Ok(indexes)
}

fn get_foreign_keys_sqlite(
    conn: &rusqlite::Connection,
    table: &str,
) -> Result<Vec<ForeignKeyInfo>, DbError> {
    use std::collections::HashMap;

    let sql = format!("PRAGMA foreign_key_list({})", quote_identifier(table, DatabaseType::SQLite));
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| DbError::schema(format!("Failed to get foreign keys: {}", e)))?;

    // Group by id (foreign key constraint id)
    let mut fk_map: HashMap<i32, ForeignKeyInfo> = HashMap::new();

    let rows: Vec<(i32, String, String, String, String, String)> = stmt
        .query_map([], |row| {
            let id: i32 = row.get(0)?;
            let table: String = row.get(2)?;
            let from: String = row.get(3)?;
            let to: String = row.get(4)?;
            let on_update: String = row.get(5)?;
            let on_delete: String = row.get(6)?;
            Ok((id, table, from, to, on_update, on_delete))
        })
        .map_err(|e| DbError::schema(format!("Failed to get foreign keys: {}", e)))?
        .filter_map(|r| r.ok())
        .collect();

    for (id, ref_table, from_col, to_col, on_update, on_delete) in rows {
        fk_map
            .entry(id)
            .or_insert_with(|| ForeignKeyInfo {
                name: format!("fk_{}", id),
                columns: Vec::new(),
                referenced_table: ref_table,
                referenced_columns: Vec::new(),
                on_delete: if on_delete == "NO ACTION" { None } else { Some(on_delete) },
                on_update: if on_update == "NO ACTION" { None } else { Some(on_update) },
            });

        if let Some(fk) = fk_map.get_mut(&id) {
            fk.columns.push(from_col);
            fk.referenced_columns.push(to_col);
        }
    }

    Ok(fk_map.into_values().collect())
}


// ============================================================================
// DDL SQL Generation
// ============================================================================

/// Generates CREATE TABLE SQL from TableInfo
pub fn generate_create_table_sql(table: &TableInfo, db_type: DatabaseType) -> String {
    let mut sql = String::new();

    // Table name with optional schema
    let table_name = if let Some(schema) = &table.schema {
        format!(
            "{}.{}",
            quote_identifier(schema, db_type),
            quote_identifier(&table.name, db_type)
        )
    } else {
        quote_identifier(&table.name, db_type)
    };

    sql.push_str(&format!("CREATE TABLE {} (\n", table_name));

    // Column definitions
    let column_defs: Vec<String> = table
        .columns
        .iter()
        .map(|col| generate_column_definition(col, db_type))
        .collect();

    sql.push_str(&column_defs.join(",\n"));

    // Primary key constraint (if not inline)
    let pk_columns: Vec<&ColumnDefinition> = table
        .columns
        .iter()
        .filter(|c| c.is_primary_key)
        .collect();

    if pk_columns.len() > 1 {
        // Composite primary key
        let pk_cols: Vec<String> = pk_columns
            .iter()
            .map(|c| quote_identifier(&c.name, db_type))
            .collect();
        sql.push_str(&format!(",\n  PRIMARY KEY ({})", pk_cols.join(", ")));
    }

    // Foreign key constraints
    for fk in &table.foreign_keys {
        sql.push_str(&format!(",\n  {}", generate_foreign_key_constraint(fk, db_type)));
    }

    sql.push_str("\n)");

    sql
}

fn generate_column_definition(col: &ColumnDefinition, db_type: DatabaseType) -> String {
    let mut def = format!("  {} {}", quote_identifier(&col.name, db_type), col.data_type);

    // Handle auto-increment
    if col.is_auto_increment {
        match db_type {
            DatabaseType::MySQL => def.push_str(" AUTO_INCREMENT"),
            DatabaseType::PostgreSQL => {
                // PostgreSQL uses SERIAL types, but if data_type is already specified,
                // we might need to adjust
                if !col.data_type.to_uppercase().contains("SERIAL") {
                    def = format!("  {} SERIAL", quote_identifier(&col.name, db_type));
                }
            }
            DatabaseType::SQLite => {
                // SQLite auto-increment is implicit for INTEGER PRIMARY KEY
            }
        }
    }

    // NOT NULL constraint
    if !col.nullable {
        def.push_str(" NOT NULL");
    }

    // Default value
    if let Some(default) = &col.default_value {
        def.push_str(&format!(" DEFAULT {}", default));
    }

    // Primary key (for single-column primary keys)
    if col.is_primary_key {
        def.push_str(" PRIMARY KEY");
    }

    def
}


fn generate_foreign_key_constraint(fk: &ForeignKeyInfo, db_type: DatabaseType) -> String {
    let cols: Vec<String> = fk.columns.iter().map(|c| quote_identifier(c, db_type)).collect();
    let ref_cols: Vec<String> = fk
        .referenced_columns
        .iter()
        .map(|c| quote_identifier(c, db_type))
        .collect();

    let mut constraint = format!(
        "CONSTRAINT {} FOREIGN KEY ({}) REFERENCES {} ({})",
        quote_identifier(&fk.name, db_type),
        cols.join(", "),
        quote_identifier(&fk.referenced_table, db_type),
        ref_cols.join(", ")
    );

    if let Some(on_delete) = &fk.on_delete {
        constraint.push_str(&format!(" ON DELETE {}", on_delete));
    }

    if let Some(on_update) = &fk.on_update {
        constraint.push_str(&format!(" ON UPDATE {}", on_update));
    }

    constraint
}

/// Represents a column modification operation
#[derive(Debug, Clone)]
pub enum ColumnModification {
    /// Add a new column
    Add(ColumnDefinition),
    /// Modify an existing column
    Modify(ColumnDefinition),
    /// Drop a column
    Drop(String),
    /// Rename a column
    Rename { old_name: String, new_name: String },
}

/// Generates ALTER TABLE SQL for column modifications
pub fn generate_alter_table_sql(
    table_name: &str,
    modification: &ColumnModification,
    db_type: DatabaseType,
) -> String {
    let quoted_table = quote_identifier(table_name, db_type);

    match modification {
        ColumnModification::Add(col) => {
            let col_def = generate_column_definition_simple(col, db_type);
            format!("ALTER TABLE {} ADD COLUMN {}", quoted_table, col_def)
        }
        ColumnModification::Modify(col) => {
            let col_def = generate_column_definition_simple(col, db_type);
            match db_type {
                DatabaseType::MySQL => {
                    format!("ALTER TABLE {} MODIFY COLUMN {}", quoted_table, col_def)
                }
                DatabaseType::PostgreSQL => {
                    // PostgreSQL uses ALTER COLUMN with separate clauses
                    let mut sql = format!(
                        "ALTER TABLE {} ALTER COLUMN {} TYPE {}",
                        quoted_table,
                        quote_identifier(&col.name, db_type),
                        col.data_type
                    );
                    if col.nullable {
                        sql.push_str(&format!(
                            ", ALTER COLUMN {} DROP NOT NULL",
                            quote_identifier(&col.name, db_type)
                        ));
                    } else {
                        sql.push_str(&format!(
                            ", ALTER COLUMN {} SET NOT NULL",
                            quote_identifier(&col.name, db_type)
                        ));
                    }
                    if let Some(default) = &col.default_value {
                        sql.push_str(&format!(
                            ", ALTER COLUMN {} SET DEFAULT {}",
                            quote_identifier(&col.name, db_type),
                            default
                        ));
                    }
                    sql
                }
                DatabaseType::SQLite => {
                    // SQLite doesn't support MODIFY COLUMN directly
                    // This would require recreating the table
                    format!(
                        "-- SQLite does not support MODIFY COLUMN. Table recreation required.\n\
                         -- Column: {} {}", 
                        col.name, col.data_type
                    )
                }
            }
        }
        ColumnModification::Drop(col_name) => {
            format!(
                "ALTER TABLE {} DROP COLUMN {}",
                quoted_table,
                quote_identifier(col_name, db_type)
            )
        }
        ColumnModification::Rename { old_name, new_name } => {
            match db_type {
                DatabaseType::MySQL => {
                    // MySQL requires the column definition for CHANGE
                    format!(
                        "ALTER TABLE {} RENAME COLUMN {} TO {}",
                        quoted_table,
                        quote_identifier(old_name, db_type),
                        quote_identifier(new_name, db_type)
                    )
                }
                DatabaseType::PostgreSQL | DatabaseType::SQLite => {
                    format!(
                        "ALTER TABLE {} RENAME COLUMN {} TO {}",
                        quoted_table,
                        quote_identifier(old_name, db_type),
                        quote_identifier(new_name, db_type)
                    )
                }
            }
        }
    }
}


fn generate_column_definition_simple(col: &ColumnDefinition, db_type: DatabaseType) -> String {
    let mut def = format!("{} {}", quote_identifier(&col.name, db_type), col.data_type);

    if !col.nullable {
        def.push_str(" NOT NULL");
    }

    if let Some(default) = &col.default_value {
        def.push_str(&format!(" DEFAULT {}", default));
    }

    def
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Quotes an identifier based on database type
pub fn quote_identifier(identifier: &str, db_type: DatabaseType) -> String {
    match db_type {
        DatabaseType::MySQL => format!("`{}`", identifier.replace('`', "``")),
        DatabaseType::PostgreSQL => format!("\"{}\"", identifier.replace('"', "\"\"")),
        DatabaseType::SQLite => format!("\"{}\"", identifier.replace('"', "\"\"")),
    }
}

/// Executes a DDL statement
async fn execute_ddl(conn: Arc<dyn DatabaseConnection>, sql: &str) -> Result<(), DbError> {
    match conn.db_type() {
        DatabaseType::MySQL => execute_ddl_mysql(conn, sql).await,
        DatabaseType::PostgreSQL => execute_ddl_postgres(conn, sql).await,
        DatabaseType::SQLite => execute_ddl_sqlite(conn, sql).await,
    }
}

async fn execute_ddl_mysql(conn: Arc<dyn DatabaseConnection>, sql: &str) -> Result<(), DbError> {
    use mysql_async::prelude::*;

    let mysql_conn = conn
        .as_any()
        .downcast_ref::<MySqlConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for MySQL"))?;

    let mut conn = mysql_conn.get_conn().await?;
    conn.query_drop(sql)
        .await
        .map_err(|e| DbError::schema(format!("Failed to execute DDL: {}", e)))?;

    Ok(())
}

async fn execute_ddl_postgres(conn: Arc<dyn DatabaseConnection>, sql: &str) -> Result<(), DbError> {
    let pg_conn = conn
        .as_any()
        .downcast_ref::<PostgresConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for PostgreSQL"))?;

    let client = pg_conn.client();
    let client = client.lock().await;

    client
        .execute(sql, &[])
        .await
        .map_err(|e| DbError::schema(format!("Failed to execute DDL: {}", e)))?;

    Ok(())
}

async fn execute_ddl_sqlite(conn: Arc<dyn DatabaseConnection>, sql: &str) -> Result<(), DbError> {
    let sqlite_conn = conn
        .as_any()
        .downcast_ref::<SqliteConnection>()
        .ok_or_else(|| DbError::schema("Invalid connection type for SQLite"))?;

    let connection = sqlite_conn.connection();
    let sql_owned = sql.to_string();

    tokio::task::spawn_blocking(move || {
        let conn = connection.blocking_lock();
        conn.execute(&sql_owned, [])
            .map_err(|e| DbError::schema(format!("Failed to execute DDL: {}", e)))?;
        Ok(())
    })
    .await
    .map_err(|e| DbError::schema(format!("Task join error: {}", e)))?
}


// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ========================================================================
    // Quote Identifier Tests
    // ========================================================================

    #[test]
    fn test_quote_identifier_mysql() {
        assert_eq!(quote_identifier("users", DatabaseType::MySQL), "`users`");
        assert_eq!(quote_identifier("user`name", DatabaseType::MySQL), "`user``name`");
    }

    #[test]
    fn test_quote_identifier_postgres() {
        assert_eq!(quote_identifier("users", DatabaseType::PostgreSQL), "\"users\"");
        assert_eq!(quote_identifier("user\"name", DatabaseType::PostgreSQL), "\"user\"\"name\"");
    }

    #[test]
    fn test_quote_identifier_sqlite() {
        assert_eq!(quote_identifier("users", DatabaseType::SQLite), "\"users\"");
        assert_eq!(quote_identifier("user\"name", DatabaseType::SQLite), "\"user\"\"name\"");
    }

    // ========================================================================
    // CREATE TABLE SQL Generation Tests
    // ========================================================================

    #[test]
    fn test_generate_create_table_simple() {
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
                    data_type: "VARCHAR(255)".to_string(),
                    nullable: false,
                    default_value: None,
                    is_primary_key: false,
                    is_auto_increment: false,
                },
            ],
            indexes: vec![],
            foreign_keys: vec![],
        };

        let sql = generate_create_table_sql(&table, DatabaseType::MySQL);
        assert!(sql.contains("CREATE TABLE `users`"));
        assert!(sql.contains("`id` INTEGER"));
        assert!(sql.contains("AUTO_INCREMENT"));
        assert!(sql.contains("NOT NULL"));
        assert!(sql.contains("PRIMARY KEY"));
        assert!(sql.contains("`name` VARCHAR(255)"));
    }

    #[test]
    fn test_generate_create_table_with_schema() {
        let table = TableInfo {
            name: "users".to_string(),
            schema: Some("public".to_string()),
            columns: vec![ColumnDefinition {
                name: "id".to_string(),
                data_type: "INTEGER".to_string(),
                nullable: false,
                default_value: None,
                is_primary_key: true,
                is_auto_increment: false,
            }],
            indexes: vec![],
            foreign_keys: vec![],
        };

        let sql = generate_create_table_sql(&table, DatabaseType::PostgreSQL);
        assert!(sql.contains("CREATE TABLE \"public\".\"users\""));
    }


    #[test]
    fn test_generate_create_table_with_foreign_key() {
        let table = TableInfo {
            name: "orders".to_string(),
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
                    name: "user_id".to_string(),
                    data_type: "INTEGER".to_string(),
                    nullable: false,
                    default_value: None,
                    is_primary_key: false,
                    is_auto_increment: false,
                },
            ],
            indexes: vec![],
            foreign_keys: vec![ForeignKeyInfo {
                name: "fk_orders_users".to_string(),
                columns: vec!["user_id".to_string()],
                referenced_table: "users".to_string(),
                referenced_columns: vec!["id".to_string()],
                on_delete: Some("CASCADE".to_string()),
                on_update: None,
            }],
        };

        let sql = generate_create_table_sql(&table, DatabaseType::MySQL);
        assert!(sql.contains("FOREIGN KEY"));
        assert!(sql.contains("REFERENCES `users`"));
        assert!(sql.contains("ON DELETE CASCADE"));
    }

    #[test]
    fn test_generate_create_table_with_default_value() {
        let table = TableInfo {
            name: "settings".to_string(),
            schema: None,
            columns: vec![ColumnDefinition {
                name: "enabled".to_string(),
                data_type: "BOOLEAN".to_string(),
                nullable: false,
                default_value: Some("true".to_string()),
                is_primary_key: false,
                is_auto_increment: false,
            }],
            indexes: vec![],
            foreign_keys: vec![],
        };

        let sql = generate_create_table_sql(&table, DatabaseType::PostgreSQL);
        assert!(sql.contains("DEFAULT true"));
    }

    // ========================================================================
    // ALTER TABLE SQL Generation Tests
    // ========================================================================

    #[test]
    fn test_generate_alter_table_add_column() {
        let col = ColumnDefinition {
            name: "email".to_string(),
            data_type: "VARCHAR(255)".to_string(),
            nullable: true,
            default_value: None,
            is_primary_key: false,
            is_auto_increment: false,
        };

        let sql = generate_alter_table_sql("users", &ColumnModification::Add(col), DatabaseType::MySQL);
        assert!(sql.contains("ALTER TABLE `users` ADD COLUMN"));
        assert!(sql.contains("`email` VARCHAR(255)"));
    }

    #[test]
    fn test_generate_alter_table_drop_column() {
        let sql = generate_alter_table_sql(
            "users",
            &ColumnModification::Drop("email".to_string()),
            DatabaseType::MySQL,
        );
        assert!(sql.contains("ALTER TABLE `users` DROP COLUMN `email`"));
    }

    #[test]
    fn test_generate_alter_table_rename_column() {
        let sql = generate_alter_table_sql(
            "users",
            &ColumnModification::Rename {
                old_name: "email".to_string(),
                new_name: "email_address".to_string(),
            },
            DatabaseType::PostgreSQL,
        );
        assert!(sql.contains("ALTER TABLE \"users\" RENAME COLUMN \"email\" TO \"email_address\""));
    }

    #[test]
    fn test_generate_alter_table_modify_column_mysql() {
        let col = ColumnDefinition {
            name: "name".to_string(),
            data_type: "VARCHAR(500)".to_string(),
            nullable: false,
            default_value: None,
            is_primary_key: false,
            is_auto_increment: false,
        };

        let sql = generate_alter_table_sql("users", &ColumnModification::Modify(col), DatabaseType::MySQL);
        assert!(sql.contains("ALTER TABLE `users` MODIFY COLUMN"));
        assert!(sql.contains("`name` VARCHAR(500)"));
        assert!(sql.contains("NOT NULL"));
    }

    #[test]
    fn test_generate_alter_table_modify_column_postgres() {
        let col = ColumnDefinition {
            name: "name".to_string(),
            data_type: "VARCHAR(500)".to_string(),
            nullable: false,
            default_value: Some("'unknown'".to_string()),
            is_primary_key: false,
            is_auto_increment: false,
        };

        let sql = generate_alter_table_sql("users", &ColumnModification::Modify(col), DatabaseType::PostgreSQL);
        assert!(sql.contains("ALTER TABLE \"users\" ALTER COLUMN \"name\" TYPE VARCHAR(500)"));
        assert!(sql.contains("SET NOT NULL"));
        assert!(sql.contains("SET DEFAULT 'unknown'"));
    }
}


// ============================================================================
// Property-Based Tests for DDL SQL Generation
// ============================================================================

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    // **Validates: Requirements 5.2, 5.3**
    // Property 8: DDL SQL Generation
    // For any valid TableInfo with columns, the generated CREATE TABLE SQL should include
    // all column definitions with correct types and constraints. For any column modification,
    // the generated ALTER TABLE SQL should correctly add, modify, or drop the specified column.

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

    /// Strategy for generating valid SQL identifiers (table/column names)
    fn arb_identifier() -> impl Strategy<Value = String> {
        "[a-zA-Z][a-zA-Z0-9_]{0,20}".prop_map(|s| s)
    }

    /// Strategy for generating valid SQL data types
    fn arb_data_type() -> impl Strategy<Value = String> {
        prop_oneof![
            Just("INTEGER".to_string()),
            Just("BIGINT".to_string()),
            Just("SMALLINT".to_string()),
            Just("TEXT".to_string()),
            Just("BOOLEAN".to_string()),
            Just("DATE".to_string()),
            Just("TIMESTAMP".to_string()),
            Just("REAL".to_string()),
            Just("DOUBLE".to_string()),
            (1u32..255u32).prop_map(|n| format!("VARCHAR({})", n)),
            (1u32..10u32, 0u32..4u32).prop_map(|(p, s)| format!("DECIMAL({},{})", p, s)),
        ]
    }

    /// Strategy for generating optional default values
    fn arb_default_value() -> impl Strategy<Value = Option<String>> {
        prop_oneof![
            Just(None),
            Just(Some("NULL".to_string())),
            Just(Some("0".to_string())),
            Just(Some("''".to_string())),
            Just(Some("true".to_string())),
            Just(Some("false".to_string())),
            Just(Some("CURRENT_TIMESTAMP".to_string())),
        ]
    }

    /// Strategy for generating arbitrary ColumnDefinition
    fn arb_column_definition() -> impl Strategy<Value = ColumnDefinition> {
        (
            arb_identifier(),      // name
            arb_data_type(),       // data_type
            any::<bool>(),         // nullable
            arb_default_value(),   // default_value
            any::<bool>(),         // is_primary_key
            any::<bool>(),         // is_auto_increment
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

    /// Strategy for generating non-primary-key columns (for general column lists)
    fn arb_non_pk_column() -> impl Strategy<Value = ColumnDefinition> {
        (
            arb_identifier(),      // name
            arb_data_type(),       // data_type
            any::<bool>(),         // nullable
            arb_default_value(),   // default_value
        )
            .prop_map(|(name, data_type, nullable, default_value)| {
                ColumnDefinition {
                    name,
                    data_type,
                    nullable,
                    default_value,
                    is_primary_key: false,
                    is_auto_increment: false,
                }
            })
    }

    /// Strategy for generating ForeignKeyInfo
    fn arb_foreign_key(source_columns: Vec<String>) -> impl Strategy<Value = ForeignKeyInfo> {
        let cols = source_columns.clone();
        (
            arb_identifier(),                    // name
            arb_identifier(),                    // referenced_table
            prop_oneof![
                Just(None),
                Just(Some("CASCADE".to_string())),
                Just(Some("SET NULL".to_string())),
                Just(Some("RESTRICT".to_string())),
            ],                                   // on_delete
            prop_oneof![
                Just(None),
                Just(Some("CASCADE".to_string())),
                Just(Some("SET NULL".to_string())),
                Just(Some("RESTRICT".to_string())),
            ],                                   // on_update
        )
            .prop_map(move |(name, referenced_table, on_delete, on_update)| {
                // Use first column as foreign key column
                let fk_col = cols.first().cloned().unwrap_or_else(|| "id".to_string());
                ForeignKeyInfo {
                    name,
                    columns: vec![fk_col.clone()],
                    referenced_table,
                    referenced_columns: vec!["id".to_string()],
                    on_delete,
                    on_update,
                }
            })
    }

    /// Strategy for generating valid TableInfo with at least one column
    fn arb_table_info() -> impl Strategy<Value = TableInfo> {
        (
            arb_identifier(),                                    // table name
            prop::option::of(arb_identifier()),                  // schema
            prop::collection::vec(arb_column_definition(), 1..6), // columns (1-5 columns)
        )
            .prop_map(|(name, schema, columns)| {
                TableInfo {
                    name,
                    schema,
                    columns,
                    indexes: vec![],
                    foreign_keys: vec![],
                }
            })
    }

    /// Strategy for generating TableInfo with foreign keys
    fn arb_table_info_with_fk() -> impl Strategy<Value = TableInfo> {
        (
            arb_identifier(),                                    // table name
            prop::collection::vec(arb_non_pk_column(), 2..5),    // columns (2-4 non-pk columns)
        )
            .prop_flat_map(|(name, columns)| {
                let col_names: Vec<String> = columns.iter().map(|c| c.name.clone()).collect();
                (
                    Just(name),
                    Just(columns),
                    prop::collection::vec(arb_foreign_key(col_names), 0..2),
                )
            })
            .prop_map(|(name, columns, foreign_keys)| {
                TableInfo {
                    name,
                    schema: None,
                    columns,
                    indexes: vec![],
                    foreign_keys,
                }
            })
    }

    /// Strategy for generating ColumnModification::Add
    fn arb_column_modification_add() -> impl Strategy<Value = ColumnModification> {
        arb_column_definition().prop_map(ColumnModification::Add)
    }

    /// Strategy for generating ColumnModification::Drop
    fn arb_column_modification_drop() -> impl Strategy<Value = ColumnModification> {
        arb_identifier().prop_map(ColumnModification::Drop)
    }

    /// Strategy for generating ColumnModification::Modify
    fn arb_column_modification_modify() -> impl Strategy<Value = ColumnModification> {
        arb_column_definition().prop_map(ColumnModification::Modify)
    }

    /// Strategy for generating ColumnModification::Rename
    fn arb_column_modification_rename() -> impl Strategy<Value = ColumnModification> {
        (arb_identifier(), arb_identifier())
            .prop_map(|(old_name, new_name)| ColumnModification::Rename { old_name, new_name })
    }

    // ========================================================================
    // Property Tests
    // ========================================================================

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: CREATE TABLE SQL contains all column names from TableInfo
        #[test]
        fn prop_create_table_contains_all_column_names(
            table in arb_table_info(),
            db_type in arb_database_type()
        ) {
            let sql = generate_create_table_sql(&table, db_type);

            // Verify all column names appear in the generated SQL
            for col in &table.columns {
                let quoted_name = quote_identifier(&col.name, db_type);
                prop_assert!(
                    sql.contains(&quoted_name),
                    "Generated SQL should contain column name '{}' (quoted: '{}'), but got: {}",
                    col.name, quoted_name, sql
                );
            }
        }

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: CREATE TABLE SQL contains all column data types
        #[test]
        fn prop_create_table_contains_all_column_types(
            table in arb_table_info(),
            db_type in arb_database_type()
        ) {
            // Skip PostgreSQL auto-increment columns as they use SERIAL type
            let should_skip = db_type == DatabaseType::PostgreSQL 
                && table.columns.iter().any(|c| c.is_auto_increment);
            
            if !should_skip {
                let sql = generate_create_table_sql(&table, db_type);

                // Verify all column data types appear in the generated SQL
                for col in &table.columns {
                    // For PostgreSQL auto-increment, the type becomes SERIAL
                    if db_type == DatabaseType::PostgreSQL && col.is_auto_increment {
                        prop_assert!(
                            sql.contains("SERIAL"),
                            "Generated SQL should contain SERIAL for auto-increment column, but got: {}",
                            sql
                        );
                    } else {
                        prop_assert!(
                            sql.contains(&col.data_type),
                            "Generated SQL should contain data type '{}', but got: {}",
                            col.data_type, sql
                        );
                    }
                }
            }
        }

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: CREATE TABLE SQL contains the table name
        #[test]
        fn prop_create_table_contains_table_name(
            table in arb_table_info(),
            db_type in arb_database_type()
        ) {
            let sql = generate_create_table_sql(&table, db_type);
            let quoted_name = quote_identifier(&table.name, db_type);

            prop_assert!(
                sql.contains(&quoted_name),
                "Generated SQL should contain table name '{}' (quoted: '{}'), but got: {}",
                table.name, quoted_name, sql
            );
            prop_assert!(
                sql.starts_with("CREATE TABLE"),
                "Generated SQL should start with 'CREATE TABLE', but got: {}",
                sql
            );
        }

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: ALTER TABLE ADD generates valid SQL with column name and type
        #[test]
        fn prop_alter_table_add_contains_column_info(
            table_name in arb_identifier(),
            modification in arb_column_modification_add(),
            db_type in arb_database_type()
        ) {
            let sql = generate_alter_table_sql(&table_name, &modification, db_type);

            if let ColumnModification::Add(col) = &modification {
                let quoted_table = quote_identifier(&table_name, db_type);
                let quoted_col = quote_identifier(&col.name, db_type);

                prop_assert!(
                    sql.contains("ALTER TABLE"),
                    "Generated SQL should contain 'ALTER TABLE', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_table),
                    "Generated SQL should contain table name '{}', but got: {}",
                    quoted_table, sql
                );
                prop_assert!(
                    sql.contains("ADD COLUMN"),
                    "Generated SQL should contain 'ADD COLUMN', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_col),
                    "Generated SQL should contain column name '{}', but got: {}",
                    quoted_col, sql
                );
                prop_assert!(
                    sql.contains(&col.data_type),
                    "Generated SQL should contain data type '{}', but got: {}",
                    col.data_type, sql
                );
            }
        }

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: ALTER TABLE DROP generates valid SQL with column name
        #[test]
        fn prop_alter_table_drop_contains_column_name(
            table_name in arb_identifier(),
            modification in arb_column_modification_drop(),
            db_type in arb_database_type()
        ) {
            let sql = generate_alter_table_sql(&table_name, &modification, db_type);

            if let ColumnModification::Drop(col_name) = &modification {
                let quoted_table = quote_identifier(&table_name, db_type);
                let quoted_col = quote_identifier(col_name, db_type);

                prop_assert!(
                    sql.contains("ALTER TABLE"),
                    "Generated SQL should contain 'ALTER TABLE', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_table),
                    "Generated SQL should contain table name '{}', but got: {}",
                    quoted_table, sql
                );
                prop_assert!(
                    sql.contains("DROP COLUMN"),
                    "Generated SQL should contain 'DROP COLUMN', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_col),
                    "Generated SQL should contain column name '{}', but got: {}",
                    quoted_col, sql
                );
            }
        }

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: ALTER TABLE MODIFY generates valid SQL (MySQL)
        #[test]
        fn prop_alter_table_modify_mysql(
            table_name in arb_identifier(),
            modification in arb_column_modification_modify()
        ) {
            let sql = generate_alter_table_sql(&table_name, &modification, DatabaseType::MySQL);

            if let ColumnModification::Modify(col) = &modification {
                let quoted_table = quote_identifier(&table_name, DatabaseType::MySQL);
                let quoted_col = quote_identifier(&col.name, DatabaseType::MySQL);

                prop_assert!(
                    sql.contains("ALTER TABLE"),
                    "Generated SQL should contain 'ALTER TABLE', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_table),
                    "Generated SQL should contain table name '{}', but got: {}",
                    quoted_table, sql
                );
                prop_assert!(
                    sql.contains("MODIFY COLUMN"),
                    "Generated SQL should contain 'MODIFY COLUMN', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_col),
                    "Generated SQL should contain column name '{}', but got: {}",
                    quoted_col, sql
                );
                prop_assert!(
                    sql.contains(&col.data_type),
                    "Generated SQL should contain data type '{}', but got: {}",
                    col.data_type, sql
                );
            }
        }

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: ALTER TABLE MODIFY generates valid SQL (PostgreSQL)
        #[test]
        fn prop_alter_table_modify_postgres(
            table_name in arb_identifier(),
            modification in arb_column_modification_modify()
        ) {
            let sql = generate_alter_table_sql(&table_name, &modification, DatabaseType::PostgreSQL);

            if let ColumnModification::Modify(col) = &modification {
                let quoted_table = quote_identifier(&table_name, DatabaseType::PostgreSQL);
                let quoted_col = quote_identifier(&col.name, DatabaseType::PostgreSQL);

                prop_assert!(
                    sql.contains("ALTER TABLE"),
                    "Generated SQL should contain 'ALTER TABLE', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_table),
                    "Generated SQL should contain table name '{}', but got: {}",
                    quoted_table, sql
                );
                prop_assert!(
                    sql.contains("ALTER COLUMN"),
                    "Generated SQL should contain 'ALTER COLUMN', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_col),
                    "Generated SQL should contain column name '{}', but got: {}",
                    quoted_col, sql
                );
                prop_assert!(
                    sql.contains(&col.data_type),
                    "Generated SQL should contain data type '{}', but got: {}",
                    col.data_type, sql
                );
            }
        }

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: ALTER TABLE RENAME generates valid SQL
        #[test]
        fn prop_alter_table_rename_contains_both_names(
            table_name in arb_identifier(),
            modification in arb_column_modification_rename(),
            db_type in arb_database_type()
        ) {
            let sql = generate_alter_table_sql(&table_name, &modification, db_type);

            if let ColumnModification::Rename { old_name, new_name } = &modification {
                let quoted_table = quote_identifier(&table_name, db_type);
                let quoted_old = quote_identifier(old_name, db_type);
                let quoted_new = quote_identifier(new_name, db_type);

                prop_assert!(
                    sql.contains("ALTER TABLE"),
                    "Generated SQL should contain 'ALTER TABLE', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_table),
                    "Generated SQL should contain table name '{}', but got: {}",
                    quoted_table, sql
                );
                prop_assert!(
                    sql.contains("RENAME COLUMN"),
                    "Generated SQL should contain 'RENAME COLUMN', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_old),
                    "Generated SQL should contain old column name '{}', but got: {}",
                    quoted_old, sql
                );
                prop_assert!(
                    sql.contains(&quoted_new),
                    "Generated SQL should contain new column name '{}', but got: {}",
                    quoted_new, sql
                );
            }
        }

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: CREATE TABLE with foreign keys includes FOREIGN KEY constraint
        #[test]
        fn prop_create_table_with_fk_contains_constraint(
            table in arb_table_info_with_fk(),
            db_type in arb_database_type()
        ) {
            let sql = generate_create_table_sql(&table, db_type);

            // Verify foreign key constraints are included
            for fk in &table.foreign_keys {
                let quoted_ref_table = quote_identifier(&fk.referenced_table, db_type);
                
                prop_assert!(
                    sql.contains("FOREIGN KEY"),
                    "Generated SQL should contain 'FOREIGN KEY' for table with foreign keys, but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains("REFERENCES"),
                    "Generated SQL should contain 'REFERENCES', but got: {}",
                    sql
                );
                prop_assert!(
                    sql.contains(&quoted_ref_table),
                    "Generated SQL should contain referenced table '{}', but got: {}",
                    quoted_ref_table, sql
                );

                // Check ON DELETE if specified
                if let Some(on_delete) = &fk.on_delete {
                    prop_assert!(
                        sql.contains(&format!("ON DELETE {}", on_delete)),
                        "Generated SQL should contain 'ON DELETE {}', but got: {}",
                        on_delete, sql
                    );
                }

                // Check ON UPDATE if specified
                if let Some(on_update) = &fk.on_update {
                    prop_assert!(
                        sql.contains(&format!("ON UPDATE {}", on_update)),
                        "Generated SQL should contain 'ON UPDATE {}', but got: {}",
                        on_update, sql
                    );
                }
            }
        }

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: NOT NULL constraint is included for non-nullable columns
        #[test]
        fn prop_create_table_not_null_constraint(
            table in arb_table_info(),
            db_type in arb_database_type()
        ) {
            let sql = generate_create_table_sql(&table, db_type);

            // Count non-nullable columns
            let non_nullable_count = table.columns.iter().filter(|c| !c.nullable).count();
            
            // Count NOT NULL occurrences in SQL
            let not_null_count = sql.matches("NOT NULL").count();

            // Each non-nullable column should have NOT NULL
            prop_assert!(
                not_null_count >= non_nullable_count,
                "Generated SQL should have at least {} 'NOT NULL' constraints for non-nullable columns, but found {}: {}",
                non_nullable_count, not_null_count, sql
            );
        }

        /// **Validates: Requirements 5.2, 5.3**
        /// Property: DEFAULT values are included when specified
        #[test]
        fn prop_create_table_default_values(
            table in arb_table_info(),
            db_type in arb_database_type()
        ) {
            // Skip PostgreSQL auto-increment columns as they don't include default values
            let columns_with_defaults: Vec<_> = table.columns.iter()
                .filter(|c| c.default_value.is_some())
                .filter(|c| !(db_type == DatabaseType::PostgreSQL && c.is_auto_increment))
                .collect();

            if !columns_with_defaults.is_empty() {
                let sql = generate_create_table_sql(&table, db_type);

                for col in columns_with_defaults {
                    if let Some(default) = &col.default_value {
                        prop_assert!(
                            sql.contains(&format!("DEFAULT {}", default)),
                            "Generated SQL should contain 'DEFAULT {}' for column '{}', but got: {}",
                            default, col.name, sql
                        );
                    }
                }
            }
        }
    }
}


// ============================================================================
// Views, Functions, Procedures, Triggers
// ============================================================================

pub async fn list_views(
    conn: Arc<dyn DatabaseConnection>,
    database: &str,
) -> Result<Vec<String>, DbError> {
    match conn.db_type() {
        DatabaseType::MySQL => {
            use mysql_async::prelude::*;
            let mysql_conn = conn.as_any().downcast_ref::<MySqlConnection>()
                .ok_or_else(|| DbError::schema("Invalid connection type"))?;
            let mut c = mysql_conn.get_conn().await?;
            let use_db = format!("USE `{}`", database.replace('`', "``"));
            c.query_drop(&use_db).await.map_err(|e| DbError::schema(e.to_string()))?;
            let rows: Vec<Option<String>> = c.query("SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE()").await.map_err(|e| DbError::schema(e.to_string()))?;
            Ok(rows.into_iter().flatten().collect())
        }
        DatabaseType::PostgreSQL => {
            let pg_conn = conn.as_any().downcast_ref::<PostgresConnection>()
                .ok_or_else(|| DbError::schema("Invalid connection type"))?;
            let client = pg_conn.get_client().await;
            let rows = client.query(
                "SELECT viewname FROM pg_views WHERE schemaname = $1",
                &[&database],
            ).await.map_err(|e| DbError::schema(e.to_string()))?;
            Ok(rows.iter().map(|r| r.get::<_, String>(0)).collect())
        }
        DatabaseType::SQLite => {
            let sqlite_conn = conn.as_any().downcast_ref::<SqliteConnection>()
                .ok_or_else(|| DbError::schema("Invalid connection type"))?;
            let conn_guard = sqlite_conn.get_connection().lock().map_err(|e| DbError::schema(e.to_string()))?;
            let mut stmt = conn_guard.prepare("SELECT name FROM sqlite_master WHERE type='view' ORDER BY name")
                .map_err(|e| DbError::schema(e.to_string()))?;
            let names: Vec<String> = stmt.query_map([], |row| row.get(0))
                .map_err(|e| DbError::schema(e.to_string()))?
                .filter_map(|r| r.ok())
                .collect();
            Ok(names)
        }
    }
}

pub async fn list_functions(
    conn: Arc<dyn DatabaseConnection>,
    database: &str,
) -> Result<Vec<String>, DbError> {
    match conn.db_type() {
        DatabaseType::MySQL => {
            use mysql_async::prelude::*;
            let mysql_conn = conn.as_any().downcast_ref::<MySqlConnection>()
                .ok_or_else(|| DbError::schema("Invalid connection type"))?;
            let mut c = mysql_conn.get_conn().await?;
            let use_db = format!("USE `{}`", database.replace('`', "``"));
            c.query_drop(&use_db).await.map_err(|e| DbError::schema(e.to_string()))?;
            let rows: Vec<Option<String>> = c.query("SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'FUNCTION'").await.map_err(|e| DbError::schema(e.to_string()))?;
            Ok(rows.into_iter().flatten().collect())
        }
        DatabaseType::PostgreSQL => {
            let pg_conn = conn.as_any().downcast_ref::<PostgresConnection>()
                .ok_or_else(|| DbError::schema("Invalid connection type"))?;
            let client = pg_conn.get_client().await;
            let rows = client.query(
                "SELECT routine_name FROM information_schema.routines WHERE routine_schema = $1 AND routine_type = 'FUNCTION'",
                &[&database],
            ).await.map_err(|e| DbError::schema(e.to_string()))?;
            Ok(rows.iter().map(|r| r.get::<_, String>(0)).collect())
        }
        DatabaseType::SQLite => Ok(vec![]),
    }
}

pub async fn list_procedures(
    conn: Arc<dyn DatabaseConnection>,
    database: &str,
) -> Result<Vec<String>, DbError> {
    match conn.db_type() {
        DatabaseType::MySQL => {
            use mysql_async::prelude::*;
            let mysql_conn = conn.as_any().downcast_ref::<MySqlConnection>()
                .ok_or_else(|| DbError::schema("Invalid connection type"))?;
            let mut c = mysql_conn.get_conn().await?;
            let use_db = format!("USE `{}`", database.replace('`', "``"));
            c.query_drop(&use_db).await.map_err(|e| DbError::schema(e.to_string()))?;
            let rows: Vec<Option<String>> = c.query("SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE'").await.map_err(|e| DbError::schema(e.to_string()))?;
            Ok(rows.into_iter().flatten().collect())
        }
        DatabaseType::PostgreSQL => {
            let pg_conn = conn.as_any().downcast_ref::<PostgresConnection>()
                .ok_or_else(|| DbError::schema("Invalid connection type"))?;
            let client = pg_conn.get_client().await;
            let rows = client.query(
                "SELECT routine_name FROM information_schema.routines WHERE routine_schema = $1 AND routine_type = 'PROCEDURE'",
                &[&database],
            ).await.map_err(|e| DbError::schema(e.to_string()))?;
            Ok(rows.iter().map(|r| r.get::<_, String>(0)).collect())
        }
        DatabaseType::SQLite => Ok(vec![]),
    }
}

pub async fn list_triggers(
    conn: Arc<dyn DatabaseConnection>,
    database: &str,
) -> Result<Vec<String>, DbError> {
    match conn.db_type() {
        DatabaseType::MySQL => {
            use mysql_async::prelude::*;
            let mysql_conn = conn.as_any().downcast_ref::<MySqlConnection>()
                .ok_or_else(|| DbError::schema("Invalid connection type"))?;
            let mut c = mysql_conn.get_conn().await?;
            let use_db = format!("USE `{}`", database.replace('`', "``"));
            c.query_drop(&use_db).await.map_err(|e| DbError::schema(e.to_string()))?;
            let rows: Vec<Option<String>> = c.query("SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()").await.map_err(|e| DbError::schema(e.to_string()))?;
            Ok(rows.into_iter().flatten().collect())
        }
        DatabaseType::PostgreSQL => {
            let pg_conn = conn.as_any().downcast_ref::<PostgresConnection>()
                .ok_or_else(|| DbError::schema("Invalid connection type"))?;
            let client = pg_conn.get_client().await;
            let rows = client.query(
                "SELECT DISTINCT trigger_name FROM information_schema.triggers WHERE trigger_schema = $1",
                &[&database],
            ).await.map_err(|e| DbError::schema(e.to_string()))?;
            Ok(rows.iter().map(|r| r.get::<_, String>(0)).collect())
        }
        DatabaseType::SQLite => {
            let sqlite_conn = conn.as_any().downcast_ref::<SqliteConnection>()
                .ok_or_else(|| DbError::schema("Invalid connection type"))?;
            let conn_guard = sqlite_conn.get_connection().lock().map_err(|e| DbError::schema(e.to_string()))?;
            let mut stmt = conn_guard.prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name")
                .map_err(|e| DbError::schema(e.to_string()))?;
            let names: Vec<String> = stmt.query_map([], |row| row.get(0))
                .map_err(|e| DbError::schema(e.to_string()))?
                .filter_map(|r| r.ok())
                .collect();
            Ok(names)
        }
    }
}
