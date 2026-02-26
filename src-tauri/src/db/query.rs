// Database Manager - Query Execution Module
// This module handles SQL query execution including single and batch execution,
// SQL statement splitting, and result formatting.

use super::connection::{
    DatabaseConnection, MySqlConnection, PostgresConnection,
    SqliteConnection,
};
use super::types::{ColumnInfo, DatabaseType, DbError, QueryResult, Value};
use std::sync::Arc;
use std::time::Instant;

// ============================================================================
// Query Executor Trait
// ============================================================================

/// Trait defining the query execution interface
#[async_trait::async_trait]
pub trait QueryExecutor: Send + Sync {
    /// Executes a single SQL statement
    async fn execute(&self, conn: Arc<dyn DatabaseConnection>, sql: &str) -> Result<QueryResult, DbError>;

    /// Executes a single SQL statement with optional database context
    async fn execute_with_database(&self, conn: Arc<dyn DatabaseConnection>, sql: &str, database: Option<&str>) -> Result<QueryResult, DbError>;

    /// Executes multiple SQL statements in batch
    async fn execute_batch(
        &self,
        conn: Arc<dyn DatabaseConnection>,
        statements: Vec<&str>,
    ) -> Result<Vec<QueryResult>, DbError>;
}

// ============================================================================
// SQL Statement Splitting
// ============================================================================

/// State machine for SQL statement parsing
#[derive(Debug, Clone, Copy, PartialEq)]
enum ParseState {
    /// Normal SQL code
    Normal,
    /// Inside a single-quoted string literal
    SingleQuote,
    /// Inside a double-quoted identifier
    DoubleQuote,
    /// Inside a single-line comment (-- or #)
    LineComment,
    /// Inside a multi-line comment (/* */)
    BlockComment,
    /// After seeing a backslash in a string (escape sequence)
    Escape,
}

/// Splits a SQL string into individual statements
/// 
/// This function handles:
/// - Semicolon-separated statements
/// - String literals (single and double quotes)
/// - Single-line comments (-- and #)
/// - Multi-line comments (/* */)
/// - Escape sequences within strings
pub fn split_sql_statements(sql: &str) -> Vec<String> {
    let mut statements = Vec::new();
    let mut current_statement = String::new();
    let mut state = ParseState::Normal;
    let mut prev_state = ParseState::Normal; // For escape sequences
    let mut chars = sql.chars().peekable();

    while let Some(c) = chars.next() {
        match state {
            ParseState::Normal => {
                match c {
                    ';' => {
                        // End of statement
                        let trimmed = current_statement.trim().to_string();
                        if !trimmed.is_empty() {
                            statements.push(trimmed);
                        }
                        current_statement.clear();
                    }
                    '\'' => {
                        current_statement.push(c);
                        state = ParseState::SingleQuote;
                    }
                    '"' => {
                        current_statement.push(c);
                        state = ParseState::DoubleQuote;
                    }
                    '-' => {
                        if chars.peek() == Some(&'-') {
                            chars.next(); // consume second '-'
                            state = ParseState::LineComment;
                        } else {
                            current_statement.push(c);
                        }
                    }
                    '#' => {
                        // MySQL-style single-line comment
                        state = ParseState::LineComment;
                    }
                    '/' => {
                        if chars.peek() == Some(&'*') {
                            chars.next(); // consume '*'
                            state = ParseState::BlockComment;
                        } else {
                            current_statement.push(c);
                        }
                    }
                    _ => {
                        current_statement.push(c);
                    }
                }
            }
            ParseState::SingleQuote => {
                current_statement.push(c);
                match c {
                    '\'' => {
                        // Check for escaped quote ('')
                        if chars.peek() == Some(&'\'') {
                            current_statement.push(chars.next().unwrap());
                        } else {
                            state = ParseState::Normal;
                        }
                    }
                    '\\' => {
                        prev_state = ParseState::SingleQuote;
                        state = ParseState::Escape;
                    }
                    _ => {}
                }
            }
            ParseState::DoubleQuote => {
                current_statement.push(c);
                match c {
                    '"' => {
                        // Check for escaped quote ("")
                        if chars.peek() == Some(&'"') {
                            current_statement.push(chars.next().unwrap());
                        } else {
                            state = ParseState::Normal;
                        }
                    }
                    '\\' => {
                        prev_state = ParseState::DoubleQuote;
                        state = ParseState::Escape;
                    }
                    _ => {}
                }
            }
            ParseState::LineComment => {
                // Line comments end at newline
                if c == '\n' {
                    current_statement.push(c);
                    state = ParseState::Normal;
                }
                // Don't add comment content to statement
            }
            ParseState::BlockComment => {
                if c == '*' && chars.peek() == Some(&'/') {
                    chars.next(); // consume '/'
                    state = ParseState::Normal;
                }
                // Don't add comment content to statement
            }
            ParseState::Escape => {
                // After backslash, consume the next character and return to previous state
                current_statement.push(c);
                state = prev_state;
            }
        }
    }

    // Add the last statement if not empty
    let trimmed = current_statement.trim().to_string();
    if !trimmed.is_empty() {
        statements.push(trimmed);
    }

    statements
}

/// Joins SQL statements back together with semicolons
pub fn join_sql_statements(statements: &[String]) -> String {
    statements.join("; ")
}

// ============================================================================
// Default Query Executor Implementation
// ============================================================================

/// Default implementation of QueryExecutor
pub struct DefaultQueryExecutor;

impl DefaultQueryExecutor {
    /// Creates a new DefaultQueryExecutor
    pub fn new() -> Self {
        Self
    }
}

impl Default for DefaultQueryExecutor {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl QueryExecutor for DefaultQueryExecutor {
    async fn execute(&self, conn: Arc<dyn DatabaseConnection>, sql: &str) -> Result<QueryResult, DbError> {
        let start = Instant::now();

        let result = match conn.db_type() {
            DatabaseType::MySQL => execute_mysql(conn, sql).await,
            DatabaseType::PostgreSQL => execute_postgres(conn, sql).await,
            DatabaseType::SQLite => execute_sqlite(conn, sql).await,
        };

        // Add execution time to result
        result.map(|mut r| {
            r.execution_time_ms = start.elapsed().as_millis() as u64;
            r
        })
    }

    async fn execute_with_database(&self, conn: Arc<dyn DatabaseConnection>, sql: &str, database: Option<&str>) -> Result<QueryResult, DbError> {
        let start = Instant::now();
        let result = match conn.db_type() {
            DatabaseType::MySQL => execute_mysql_with_db(conn, sql, database).await,
            DatabaseType::PostgreSQL => execute_postgres_with_db(conn, sql, database).await,
            DatabaseType::SQLite => execute_sqlite(conn, sql).await,
        };
        result.map(|mut r| {
            r.execution_time_ms = start.elapsed().as_millis() as u64;
            r
        })
    }

    async fn execute_batch(
        &self,
        conn: Arc<dyn DatabaseConnection>,
        statements: Vec<&str>,
    ) -> Result<Vec<QueryResult>, DbError> {
        let mut results = Vec::with_capacity(statements.len());

        for sql in statements {
            let result = self.execute(conn.clone(), sql).await?;
            results.push(result);
        }

        Ok(results)
    }
}

// ============================================================================
// MySQL Query Execution
// ============================================================================

async fn execute_mysql(conn: Arc<dyn DatabaseConnection>, sql: &str) -> Result<QueryResult, DbError> {
    use mysql_async::prelude::*;

    // Downcast to MySqlConnection
    let mysql_conn = conn
        .as_any()
        .downcast_ref::<MySqlConnection>()
        .ok_or_else(|| DbError::query("Invalid connection type for MySQL query"))?;

    let mut conn = mysql_conn.get_conn().await?;

    // Determine if this is a SELECT query
    let sql_upper = sql.trim().to_uppercase();
    let is_select = sql_upper.starts_with("SELECT")
        || sql_upper.starts_with("SHOW")
        || sql_upper.starts_with("DESCRIBE")
        || sql_upper.starts_with("EXPLAIN");

    if is_select {
        // Execute as query and fetch results
        let result: Vec<mysql_async::Row> = conn.query(sql).await.map_err(|e| {
            DbError::query(format!("MySQL query error: {}", e))
        })?;

        if result.is_empty() {
            return Ok(QueryResult::empty());
        }

        // Get column information from the first row
        let columns: Vec<ColumnInfo> = result
            .first()
            .map(|row| {
                row.columns_ref()
                    .iter()
                    .map(|col| ColumnInfo {
                        name: col.name_str().to_string(),
                        data_type: format!("{:?}", col.column_type()),
                    })
                    .collect()
            })
            .unwrap_or_default();

        // Convert rows to Values
        let rows: Vec<Vec<Value>> = result
            .into_iter()
            .map(|row| mysql_row_to_values(row))
            .collect();

        Ok(QueryResult {
            columns,
            rows,
            affected_rows: 0,
            execution_time_ms: 0,
        })
    } else {
        // Execute as statement (INSERT, UPDATE, DELETE, etc.)
        let _result = conn.exec_drop(sql, ()).await.map_err(|e| {
            DbError::query(format!("MySQL execution error: {}", e))
        })?;

        // Get affected rows from connection info
        let affected_rows = conn.affected_rows();

        Ok(QueryResult::affected(affected_rows, 0))
    }
}


async fn execute_mysql_with_db(conn: Arc<dyn DatabaseConnection>, sql: &str, database: Option<&str>) -> Result<QueryResult, DbError> {
    use mysql_async::prelude::*;
    let mysql_conn = conn
        .as_any()
        .downcast_ref::<MySqlConnection>()
        .ok_or_else(|| DbError::query("Invalid connection type for MySQL query"))?;
    let mut c = mysql_conn.get_conn().await?;
    if let Some(db) = database {
        if !db.is_empty() {
            let use_db = format!("USE `{}`", db.replace('`', "``"));
            c.query_drop(&use_db).await.map_err(|e| DbError::query(format!("Failed to switch database: {}", e)))?;
        }
    }
    // Reuse same connection for the actual query
    let sql_upper = sql.trim().to_uppercase();
    let is_select = sql_upper.starts_with("SELECT")
        || sql_upper.starts_with("SHOW")
        || sql_upper.starts_with("DESCRIBE")
        || sql_upper.starts_with("EXPLAIN");
    if is_select {
        let result: Vec<mysql_async::Row> = c.query(sql).await.map_err(|e| DbError::query(format!("MySQL query error: {}", e)))?;
        if result.is_empty() { return Ok(QueryResult::empty()); }
        let columns: Vec<ColumnInfo> = result.first().map(|row| {
            row.columns_ref().iter().map(|col| ColumnInfo {
                name: col.name_str().to_string(),
                data_type: format!("{:?}", col.column_type()),
            }).collect()
        }).unwrap_or_default();
        let rows: Vec<Vec<Value>> = result.into_iter().map(|row| mysql_row_to_values(row)).collect();
        Ok(QueryResult { columns, rows, affected_rows: 0, execution_time_ms: 0 })
    } else {
        let _result = c.exec_drop(sql, ()).await.map_err(|e| DbError::query(format!("MySQL execution error: {}", e)))?;
        Ok(QueryResult::affected(c.affected_rows(), 0))
    }
}
fn mysql_row_to_values(row: mysql_async::Row) -> Vec<Value> {
    use mysql_async::Value as MysqlValue;

    (0..row.len())
        .map(|i| {
            let val: MysqlValue = row.get(i).unwrap_or(MysqlValue::NULL);
            match val {
                MysqlValue::NULL => Value::Null,
                MysqlValue::Int(v) => Value::Integer(v),
                MysqlValue::UInt(v) => Value::Integer(v as i64),
                MysqlValue::Float(v) => Value::Float(v as f64),
                MysqlValue::Double(v) => Value::Float(v),
                MysqlValue::Bytes(v) => {
                    // Try to convert to string, otherwise keep as bytes
                    match String::from_utf8(v.clone()) {
                        Ok(s) => Value::String(s),
                        Err(_) => Value::Bytes(v),
                    }
                }
                MysqlValue::Date(year, month, day, hour, min, sec, _micro) => {
                    Value::String(format!(
                        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
                        year, month, day, hour, min, sec
                    ))
                }
                MysqlValue::Time(neg, days, hours, mins, secs, _micro) => {
                    let sign = if neg { "-" } else { "" };
                    Value::String(format!(
                        "{}{}:{:02}:{:02}",
                        sign,
                        days * 24 + hours as u32,
                        mins,
                        secs
                    ))
                }
            }
        })
        .collect()
}

// ============================================================================
// PostgreSQL Query Execution
// ============================================================================

async fn execute_postgres(conn: Arc<dyn DatabaseConnection>, sql: &str) -> Result<QueryResult, DbError> {
    // Downcast to PostgresConnection
    let pg_conn = conn
        .as_any()
        .downcast_ref::<PostgresConnection>()
        .ok_or_else(|| DbError::query("Invalid connection type for PostgreSQL query"))?;

    let client = pg_conn.client();
    let client = client.lock().await;

    // Determine if this is a SELECT query
    let sql_upper = sql.trim().to_uppercase();
    let is_select = sql_upper.starts_with("SELECT")
        || sql_upper.starts_with("SHOW")
        || sql_upper.starts_with("EXPLAIN");

    if is_select {
        // Execute as query and fetch results
        let rows = client.query(sql, &[]).await.map_err(|e| {
            parse_postgres_error(e)
        })?;

        if rows.is_empty() {
            return Ok(QueryResult::empty());
        }

        // Get column information
        let columns: Vec<ColumnInfo> = rows
            .first()
            .map(|row| {
                row.columns()
                    .iter()
                    .map(|col| ColumnInfo {
                        name: col.name().to_string(),
                        data_type: col.type_().name().to_string(),
                    })
                    .collect()
            })
            .unwrap_or_default();

        // Convert rows to Values
        let result_rows: Vec<Vec<Value>> = rows
            .into_iter()
            .map(|row| postgres_row_to_values(&row))
            .collect();

        Ok(QueryResult {
            columns,
            rows: result_rows,
            affected_rows: 0,
            execution_time_ms: 0,
        })
    } else {
        // Execute as statement (INSERT, UPDATE, DELETE, etc.)
        let affected_rows = client.execute(sql, &[]).await.map_err(|e| {
            parse_postgres_error(e)
        })?;

        Ok(QueryResult::affected(affected_rows, 0))
    }
}

fn postgres_row_to_values(row: &tokio_postgres::Row) -> Vec<Value> {
    (0..row.len())
        .map(|i| {
            let col_type = row.columns()[i].type_();

            // Handle different PostgreSQL types
            if let Ok(v) = row.try_get::<_, Option<bool>>(i) {
                return v.map(Value::Bool).unwrap_or(Value::Null);
            }
            if let Ok(v) = row.try_get::<_, Option<i16>>(i) {
                return v.map(|x| Value::Integer(x as i64)).unwrap_or(Value::Null);
            }
            if let Ok(v) = row.try_get::<_, Option<i32>>(i) {
                return v.map(|x| Value::Integer(x as i64)).unwrap_or(Value::Null);
            }
            if let Ok(v) = row.try_get::<_, Option<i64>>(i) {
                return v.map(Value::Integer).unwrap_or(Value::Null);
            }
            if let Ok(v) = row.try_get::<_, Option<f32>>(i) {
                return v.map(|x| Value::Float(x as f64)).unwrap_or(Value::Null);
            }
            if let Ok(v) = row.try_get::<_, Option<f64>>(i) {
                return v.map(Value::Float).unwrap_or(Value::Null);
            }
            if let Ok(v) = row.try_get::<_, Option<String>>(i) {
                return v.map(Value::String).unwrap_or(Value::Null);
            }
            if let Ok(v) = row.try_get::<_, Option<Vec<u8>>>(i) {
                return v.map(Value::Bytes).unwrap_or(Value::Null);
            }

            // Fallback: try to get as string representation
            Value::String(format!("<{}>", col_type.name()))
        })
        .collect()
}

fn parse_postgres_error(e: tokio_postgres::Error) -> DbError {
    if let Some(db_error) = e.as_db_error() {
        let message = db_error.message().to_string();
        let line = db_error.line().map(|l| l as u32);
        let column = db_error.position().map(|p| match p {
            tokio_postgres::error::ErrorPosition::Original(pos) => *pos as u32,
            tokio_postgres::error::ErrorPosition::Internal { position, .. } => *position as u32,
        });

        if let (Some(l), Some(c)) = (line, column) {
            DbError::query_with_location(message, l, c)
        } else {
            DbError::query(message)
        }
    } else {
        DbError::query(e.to_string())
    }
}


async fn execute_postgres_with_db(conn: Arc<dyn DatabaseConnection>, sql: &str, database: Option<&str>) -> Result<QueryResult, DbError> {
    let pg_conn = conn
        .as_any()
        .downcast_ref::<PostgresConnection>()
        .ok_or_else(|| DbError::query("Invalid connection type for PostgreSQL query"))?;
    let client = pg_conn.client();
    let client = client.lock().await;
    if let Some(db) = database {
        if !db.is_empty() {
            let set_schema = format!("SET search_path TO \"{}\"", db.replace('"', "\"\""));
            client.execute(&*set_schema, &[]).await.map_err(|e| DbError::query(format!("Failed to switch schema: {}", e)))?;
        }
    }
    let sql_upper = sql.trim().to_uppercase();
    let is_select = sql_upper.starts_with("SELECT")
        || sql_upper.starts_with("SHOW")
        || sql_upper.starts_with("EXPLAIN");
    if is_select {
        let rows = client.query(sql, &[]).await.map_err(|e| parse_postgres_error(e))?;
        if rows.is_empty() { return Ok(QueryResult::empty()); }
        let columns: Vec<ColumnInfo> = rows.first().map(|row| {
            row.columns().iter().map(|col| ColumnInfo {
                name: col.name().to_string(),
                data_type: col.type_().name().to_string(),
            }).collect()
        }).unwrap_or_default();
        let result_rows: Vec<Vec<Value>> = rows.into_iter().map(|row| postgres_row_to_values(&row)).collect();
        Ok(QueryResult { columns, rows: result_rows, affected_rows: 0, execution_time_ms: 0 })
    } else {
        let affected = client.execute(sql, &[]).await.map_err(|e| parse_postgres_error(e))?;
        Ok(QueryResult::affected(affected, 0))
    }
}
// ============================================================================
// SQLite Query Execution
// ============================================================================

async fn execute_sqlite(conn: Arc<dyn DatabaseConnection>, sql: &str) -> Result<QueryResult, DbError> {
    // Downcast to SqliteConnection
    let sqlite_conn = conn
        .as_any()
        .downcast_ref::<SqliteConnection>()
        .ok_or_else(|| DbError::query("Invalid connection type for SQLite query"))?;

    let connection = sqlite_conn.connection();
    let sql_owned = sql.to_string();

    // SQLite operations are blocking, so we use spawn_blocking
    let result = tokio::task::spawn_blocking(move || {
        let conn = connection.blocking_lock();

        // Determine if this is a SELECT query
        let sql_upper = sql_owned.trim().to_uppercase();
        let is_select = sql_upper.starts_with("SELECT")
            || sql_upper.starts_with("PRAGMA")
            || sql_upper.starts_with("EXPLAIN");

        if is_select {
            execute_sqlite_query(&conn, &sql_owned)
        } else {
            execute_sqlite_statement(&conn, &sql_owned)
        }
    })
    .await
    .map_err(|e| DbError::query(format!("Task join error: {}", e)))?;

    result
}

fn execute_sqlite_query(conn: &rusqlite::Connection, sql: &str) -> Result<QueryResult, DbError> {
    let mut stmt = conn.prepare(sql).map_err(|e| {
        parse_sqlite_error(e)
    })?;

    // Get column information
    let column_count = stmt.column_count();
    let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    
    let columns: Vec<ColumnInfo> = column_names
        .iter()
        .map(|name| ColumnInfo {
            name: name.clone(),
            data_type: "UNKNOWN".to_string(), // SQLite is dynamically typed
        })
        .collect();

    // Execute query and collect rows
    let rows: Result<Vec<Vec<Value>>, DbError> = stmt
        .query_map([], |row| {
            let values: Vec<Value> = (0..column_count)
                .map(|i| sqlite_value_to_value(row.get_ref(i).unwrap_or(rusqlite::types::ValueRef::Null)))
                .collect();
            Ok(values)
        })
        .map_err(|e| parse_sqlite_error(e))?
        .map(|r| r.map_err(|e| parse_sqlite_error(e)))
        .collect();

    Ok(QueryResult {
        columns,
        rows: rows?,
        affected_rows: 0,
        execution_time_ms: 0,
    })
}

fn execute_sqlite_statement(conn: &rusqlite::Connection, sql: &str) -> Result<QueryResult, DbError> {
    let affected_rows = conn.execute(sql, []).map_err(|e| {
        parse_sqlite_error(e)
    })?;

    Ok(QueryResult::affected(affected_rows as u64, 0))
}

fn sqlite_value_to_value(val: rusqlite::types::ValueRef) -> Value {
    match val {
        rusqlite::types::ValueRef::Null => Value::Null,
        rusqlite::types::ValueRef::Integer(v) => Value::Integer(v),
        rusqlite::types::ValueRef::Real(v) => Value::Float(v),
        rusqlite::types::ValueRef::Text(v) => {
            Value::String(String::from_utf8_lossy(v).to_string())
        }
        rusqlite::types::ValueRef::Blob(v) => Value::Bytes(v.to_vec()),
    }
}

fn parse_sqlite_error(e: rusqlite::Error) -> DbError {
    match e {
        rusqlite::Error::SqliteFailure(err, msg) => {
            let message = msg.unwrap_or_else(|| err.to_string());
            DbError::query(message)
        }
        rusqlite::Error::SqlInputError { error: _, msg, sql: _, offset } => {
            // Calculate line and column from offset
            let line = 1u32; // SQLite doesn't provide line info directly
            let column = offset as u32;
            DbError::query_with_location(msg, line, column)
        }
        _ => DbError::query(e.to_string()),
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ========================================================================
    // Property-Based Tests for SQL Statement Splitting
    // **Validates: Requirements 3.5**
    // Property 5: SQL Statement Splitting
    // ========================================================================

    mod property_tests {
        use super::*;
        use proptest::prelude::*;

        /// Strategy to generate simple SQL identifiers (alphanumeric, no special chars)
        fn simple_identifier() -> impl Strategy<Value = String> {
            "[a-zA-Z][a-zA-Z0-9_]{0,15}".prop_map(|s| s)
        }

        /// Strategy to generate simple SQL statements without semicolons, quotes, or comments
        fn simple_sql_statement() -> impl Strategy<Value = String> {
            (simple_identifier(), simple_identifier()).prop_map(|(table, col)| {
                format!("SELECT {} FROM {}", col, table)
            })
        }

        /// Strategy to generate multiple simple SQL statements
        fn multiple_simple_statements(max_count: usize) -> impl Strategy<Value = Vec<String>> {
            prop::collection::vec(simple_sql_statement(), 1..=max_count)
        }

        /// Property: Empty input produces empty output
        /// **Validates: Requirements 3.5**
        #[test]
        fn prop_empty_input_produces_empty_output() {
            // Empty string should produce empty result
            let result = split_sql_statements("");
            assert!(result.is_empty(), "Empty input should produce empty output");

            // Whitespace-only should also produce empty result
            let result = split_sql_statements("   \n\t  ");
            assert!(result.is_empty(), "Whitespace-only input should produce empty output");
        }

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(100))]

            /// Property: For simple SQL statements (no semicolons in content),
            /// splitting and joining preserves the essential content.
            /// **Validates: Requirements 3.5**
            #[test]
            fn prop_split_join_preserves_content(statements in multiple_simple_statements(5)) {
                // Join statements with semicolons
                let joined = statements.join("; ");

                // Split them back
                let split_result = split_sql_statements(&joined);

                // The number of statements should match
                prop_assert_eq!(
                    split_result.len(),
                    statements.len(),
                    "Number of statements should be preserved after split"
                );

                // Each statement should match (after trimming whitespace)
                for (original, split) in statements.iter().zip(split_result.iter()) {
                    prop_assert_eq!(
                        original.trim(),
                        split.trim(),
                        "Statement content should be preserved"
                    );
                }
            }

            /// Property: For simple SQL (no strings/comments containing semicolons),
            /// number of statements equals number of semicolons + 1
            /// **Validates: Requirements 3.5**
            #[test]
            fn prop_statement_count_matches_semicolons(statements in multiple_simple_statements(10)) {
                // Join with semicolons (n statements -> n-1 semicolons between them)
                let joined = statements.join(";");

                // Count semicolons in the joined string
                let semicolon_count = joined.chars().filter(|&c| c == ';').count();

                // Split the statements
                let split_result = split_sql_statements(&joined);

                // For simple SQL without strings/comments, statements = semicolons + 1
                // But since we join with semicolons between statements (not after),
                // and split removes trailing empty statements, we should have:
                // n statements joined with n-1 semicolons -> n statements after split
                prop_assert_eq!(
                    split_result.len(),
                    semicolon_count + 1,
                    "Number of statements should equal semicolons + 1 for simple SQL"
                );
            }

            /// Property: Splitting a single statement (no semicolons) returns exactly one statement
            /// **Validates: Requirements 3.5**
            #[test]
            fn prop_single_statement_returns_one(statement in simple_sql_statement()) {
                let result = split_sql_statements(&statement);
                prop_assert_eq!(
                    result.len(),
                    1,
                    "Single statement without semicolon should return exactly one statement"
                );
                prop_assert_eq!(
                    result[0].trim(),
                    statement.trim(),
                    "Single statement content should be preserved"
                );
            }

            /// Property: join_sql_statements is the inverse of split_sql_statements
            /// for simple SQL (modulo whitespace normalization)
            /// **Validates: Requirements 3.5**
            #[test]
            fn prop_join_is_inverse_of_split(statements in multiple_simple_statements(5)) {
                // Join statements
                let joined = join_sql_statements(&statements);

                // Split them back
                let split_result = split_sql_statements(&joined);

                // Join again
                let rejoined = join_sql_statements(&split_result);

                // The rejoined result should match the original join
                // (since our statements don't have trailing/leading whitespace issues)
                prop_assert_eq!(
                    joined,
                    rejoined,
                    "join(split(join(statements))) should equal join(statements)"
                );
            }

            /// Property: Statements with string literals containing semicolons are handled correctly
            /// **Validates: Requirements 3.5**
            #[test]
            fn prop_string_literals_preserve_semicolons(
                table in simple_identifier(),
                value_before in "[a-zA-Z0-9 ]{1,10}",
                value_after in "[a-zA-Z0-9 ]{1,10}"
            ) {
                // Create a statement with a semicolon inside a string literal
                let sql = format!(
                    "SELECT * FROM {} WHERE name = '{}; {}'; SELECT 1",
                    table, value_before, value_after
                );

                let result = split_sql_statements(&sql);

                // Should split into exactly 2 statements (semicolon in string is not a delimiter)
                prop_assert_eq!(
                    result.len(),
                    2,
                    "Semicolon inside string literal should not split the statement"
                );

                // First statement should contain the full string literal
                prop_assert!(
                    result[0].contains(&format!("'{}; {}'", value_before, value_after)),
                    "String literal with semicolon should be preserved"
                );
            }
        }
    }

    // ========================================================================
    // SQL Statement Splitting Tests
    // ========================================================================

    #[test]
    fn test_split_simple_statements() {
        let sql = "SELECT * FROM users; SELECT * FROM orders;";
        let statements = split_sql_statements(sql);
        assert_eq!(statements.len(), 2);
        assert_eq!(statements[0], "SELECT * FROM users");
        assert_eq!(statements[1], "SELECT * FROM orders");
    }

    #[test]
    fn test_split_single_statement() {
        let sql = "SELECT * FROM users";
        let statements = split_sql_statements(sql);
        assert_eq!(statements.len(), 1);
        assert_eq!(statements[0], "SELECT * FROM users");
    }

    #[test]
    fn test_split_with_string_literals() {
        let sql = "SELECT * FROM users WHERE name = 'John;Doe'; SELECT 1;";
        let statements = split_sql_statements(sql);
        assert_eq!(statements.len(), 2);
        assert_eq!(statements[0], "SELECT * FROM users WHERE name = 'John;Doe'");
        assert_eq!(statements[1], "SELECT 1");
    }

    #[test]
    fn test_split_with_double_quotes() {
        let sql = r#"SELECT * FROM "table;name"; SELECT 1;"#;
        let statements = split_sql_statements(sql);
        assert_eq!(statements.len(), 2);
        assert_eq!(statements[0], r#"SELECT * FROM "table;name""#);
        assert_eq!(statements[1], "SELECT 1");
    }

    #[test]
    fn test_split_with_line_comments() {
        let sql = "SELECT * FROM users; -- this is a comment\nSELECT 1;";
        let statements = split_sql_statements(sql);
        assert_eq!(statements.len(), 2);
        assert_eq!(statements[0], "SELECT * FROM users");
    }

    #[test]
    fn test_split_with_block_comments() {
        let sql = "SELECT * FROM users /* comment; with semicolon */; SELECT 1;";
        let statements = split_sql_statements(sql);
        assert_eq!(statements.len(), 2);
        assert_eq!(statements[0], "SELECT * FROM users");
        assert_eq!(statements[1], "SELECT 1");
    }

    #[test]
    fn test_split_with_escaped_quotes() {
        let sql = "SELECT * FROM users WHERE name = 'O''Brien'; SELECT 1;";
        let statements = split_sql_statements(sql);
        assert_eq!(statements.len(), 2);
        assert_eq!(statements[0], "SELECT * FROM users WHERE name = 'O''Brien'");
        assert_eq!(statements[1], "SELECT 1");
    }

    #[test]
    fn test_split_empty_string() {
        let sql = "";
        let statements = split_sql_statements(sql);
        assert!(statements.is_empty());
    }

    #[test]
    fn test_split_whitespace_only() {
        let sql = "   \n\t  ";
        let statements = split_sql_statements(sql);
        assert!(statements.is_empty());
    }

    #[test]
    fn test_split_with_mysql_hash_comment() {
        let sql = "SELECT 1; # MySQL comment\nSELECT 2;";
        let statements = split_sql_statements(sql);
        assert_eq!(statements.len(), 2);
        assert_eq!(statements[0], "SELECT 1");
    }

    #[test]
    fn test_split_multiline_statement() {
        let sql = "SELECT\n  *\nFROM\n  users;\nSELECT 1;";
        let statements = split_sql_statements(sql);
        assert_eq!(statements.len(), 2);
        assert!(statements[0].contains("SELECT"));
        assert!(statements[0].contains("FROM"));
        assert!(statements[0].contains("users"));
    }

    #[test]
    fn test_split_with_backslash_escape() {
        let sql = r"SELECT * FROM users WHERE name = 'John\'s'; SELECT 1;";
        let statements = split_sql_statements(sql);
        assert_eq!(statements.len(), 2);
        assert!(statements[0].contains(r"'John\'s'"));
    }

    // ========================================================================
    // Join Statements Tests
    // ========================================================================

    #[test]
    fn test_join_statements() {
        let statements = vec![
            "SELECT * FROM users".to_string(),
            "SELECT * FROM orders".to_string(),
        ];
        let joined = join_sql_statements(&statements);
        assert_eq!(joined, "SELECT * FROM users; SELECT * FROM orders");
    }

    #[test]
    fn test_join_empty_statements() {
        let statements: Vec<String> = vec![];
        let joined = join_sql_statements(&statements);
        assert_eq!(joined, "");
    }

    #[test]
    fn test_join_single_statement() {
        let statements = vec!["SELECT 1".to_string()];
        let joined = join_sql_statements(&statements);
        assert_eq!(joined, "SELECT 1");
    }

    // ========================================================================
    // QueryResult Tests
    // ========================================================================

    #[test]
    fn test_query_result_empty() {
        let result = QueryResult::empty();
        assert!(result.columns.is_empty());
        assert!(result.rows.is_empty());
        assert_eq!(result.affected_rows, 0);
        assert!(result.validate());
    }

    #[test]
    fn test_query_result_affected() {
        let result = QueryResult::affected(5, 100);
        assert!(result.columns.is_empty());
        assert!(result.rows.is_empty());
        assert_eq!(result.affected_rows, 5);
        assert_eq!(result.execution_time_ms, 100);
        assert!(result.validate());
    }

    // ========================================================================
    // DefaultQueryExecutor Tests
    // ========================================================================

    #[test]
    fn test_default_query_executor_creation() {
        let _executor = DefaultQueryExecutor::new();
        // Just verify it can be created
    }

    #[test]
    fn test_default_query_executor_default() {
        let _executor = DefaultQueryExecutor::default();
        // Just verify it can be created via Default trait
    }
}
