use rusqlite::{Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// Data types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Collection {
    pub id: Option<i64>,
    pub name: String,
    pub parent_id: Option<i64>,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiRequest {
    pub id: Option<i64>,
    pub collection_id: Option<i64>,
    pub name: String,
    pub method: String,
    pub url: String,
    pub headers: String,
    pub body: String,
    pub body_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Environment {
    pub id: Option<i64>,
    pub name: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Variable {
    pub id: Option<i64>,
    pub environment_id: i64,
    pub key: String,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub id: Option<i64>,
    pub method: String,
    pub url: String,
    pub status_code: Option<i32>,
    pub response_time: Option<i64>,
    pub created_at: Option<String>,
}

pub struct AppDatabase {
    conn: Connection,
}

impl AppDatabase {
    pub fn new() -> Result<Self> {
        let path = Self::get_db_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        let conn = Connection::open(&path)?;
        let db = Self { conn };
        db.init_tables()?;
        Ok(db)
    }

    fn get_db_path() -> PathBuf {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("pandora")
            .join("pandora.db")
    }

    fn init_tables(&self) -> Result<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS collections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                parent_id INTEGER,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                collection_id INTEGER,
                name TEXT NOT NULL,
                method TEXT DEFAULT 'GET',
                url TEXT,
                headers TEXT,
                body TEXT,
                body_type TEXT DEFAULT 'none',
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS environments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                is_active INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS variables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                environment_id INTEGER NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                enabled INTEGER DEFAULT 1
            );
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                method TEXT,
                url TEXT,
                status_code INTEGER,
                response_time INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS scripts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                runtime TEXT NOT NULL,
                content TEXT,
                file_path TEXT,
                group_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );"
        )
    }

    // Collections
    pub fn get_collections(&self) -> Result<Vec<Collection>> {
        let mut stmt = self.conn.prepare("SELECT id, name, parent_id, sort_order FROM collections ORDER BY sort_order")?;
        let rows = stmt.query_map([], |row| {
            Ok(Collection {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                parent_id: row.get(2)?,
                sort_order: row.get(3)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_collection(&self, name: &str, parent_id: Option<i64>) -> Result<i64> {
        self.conn.execute("INSERT INTO collections (name, parent_id) VALUES (?1, ?2)", (name, parent_id))?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn delete_collection(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM requests WHERE collection_id = ?1", [id])?;
        self.conn.execute("DELETE FROM collections WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn rename_collection(&self, id: i64, name: &str) -> Result<()> {
        self.conn.execute("UPDATE collections SET name = ?1 WHERE id = ?2", (name, id))?;
        Ok(())
    }

    // Requests
    pub fn get_requests(&self, collection_id: Option<i64>) -> Result<Vec<ApiRequest>> {
        let sql = if collection_id.is_some() {
            "SELECT id, collection_id, name, method, url, headers, body, body_type FROM requests WHERE collection_id = ?1 ORDER BY sort_order"
        } else {
            "SELECT id, collection_id, name, method, url, headers, body, body_type FROM requests ORDER BY sort_order"
        };
        let mut stmt = self.conn.prepare(sql)?;
        let rows = if let Some(cid) = collection_id {
            stmt.query_map([cid], |row| Ok(Self::map_request(row)))?
                .collect::<Result<Vec<_>>>()
        } else {
            stmt.query_map([], |row| Ok(Self::map_request(row)))?
                .collect::<Result<Vec<_>>>()
        };
        rows
    }

    fn map_request(row: &rusqlite::Row) -> ApiRequest {
        ApiRequest {
            id: Some(row.get(0).unwrap()),
            collection_id: row.get(1).unwrap(),
            name: row.get(2).unwrap(),
            method: row.get(3).unwrap(),
            url: row.get(4).unwrap(),
            headers: row.get::<_, Option<String>>(5).unwrap().unwrap_or_default(),
            body: row.get::<_, Option<String>>(6).unwrap().unwrap_or_default(),
            body_type: row.get(7).unwrap(),
        }
    }

    pub fn save_request(&self, req: &ApiRequest) -> Result<i64> {
        if let Some(id) = req.id {
            self.conn.execute(
                "UPDATE requests SET name=?1, method=?2, url=?3, headers=?4, body=?5, body_type=?6, collection_id=?7 WHERE id=?8",
                (&req.name, &req.method, &req.url, &req.headers, &req.body, &req.body_type, &req.collection_id, id),
            )?;
            Ok(id)
        } else {
            self.conn.execute(
                "INSERT INTO requests (collection_id, name, method, url, headers, body, body_type) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                (&req.collection_id, &req.name, &req.method, &req.url, &req.headers, &req.body, &req.body_type),
            )?;
            Ok(self.conn.last_insert_rowid())
        }
    }

    pub fn delete_request(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM requests WHERE id = ?1", [id])?;
        Ok(())
    }

    // Environments
    pub fn get_environments(&self) -> Result<Vec<Environment>> {
        let mut stmt = self.conn.prepare("SELECT id, name, is_active FROM environments")?;
        let rows = stmt.query_map([], |row| {
            Ok(Environment {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                is_active: row.get::<_, i32>(2)? == 1,
            })
        })?;
        rows.collect()
    }

    pub fn create_environment(&self, name: &str) -> Result<i64> {
        self.conn.execute("INSERT INTO environments (name) VALUES (?1)", [name])?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn set_active_environment(&self, id: i64) -> Result<()> {
        self.conn.execute("UPDATE environments SET is_active = 0", [])?;
        self.conn.execute("UPDATE environments SET is_active = 1 WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn delete_environment(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM variables WHERE environment_id = ?1", [id])?;
        self.conn.execute("DELETE FROM environments WHERE id = ?1", [id])?;
        Ok(())
    }

    // Variables
    pub fn get_variables(&self, environment_id: i64) -> Result<Vec<Variable>> {
        let mut stmt = self.conn.prepare("SELECT id, environment_id, key, value, enabled FROM variables WHERE environment_id = ?1")?;
        let rows = stmt.query_map([environment_id], |row| {
            Ok(Variable {
                id: Some(row.get(0)?),
                environment_id: row.get(1)?,
                key: row.get(2)?,
                value: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                enabled: row.get::<_, i32>(4)? == 1,
            })
        })?;
        rows.collect()
    }

    pub fn save_variable(&self, var: &Variable) -> Result<i64> {
        if let Some(id) = var.id {
            self.conn.execute(
                "UPDATE variables SET key=?1, value=?2, enabled=?3 WHERE id=?4",
                (&var.key, &var.value, var.enabled as i32, id),
            )?;
            Ok(id)
        } else {
            self.conn.execute(
                "INSERT INTO variables (environment_id, key, value, enabled) VALUES (?1, ?2, ?3, ?4)",
                (var.environment_id, &var.key, &var.value, var.enabled as i32),
            )?;
            Ok(self.conn.last_insert_rowid())
        }
    }

    pub fn delete_variable(&self, id: i64) -> Result<()> {
        self.conn.execute("DELETE FROM variables WHERE id = ?1", [id])?;
        Ok(())
    }

    // History
    pub fn get_history(&self) -> Result<Vec<HistoryItem>> {
        let mut stmt = self.conn.prepare("SELECT id, method, url, status_code, response_time, created_at FROM history ORDER BY created_at DESC LIMIT 100")?;
        let rows = stmt.query_map([], |row| {
            Ok(HistoryItem {
                id: Some(row.get(0)?),
                method: row.get(1)?,
                url: row.get(2)?,
                status_code: row.get(3)?,
                response_time: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;
        rows.collect()
    }

    pub fn add_history(&self, method: &str, url: &str, status_code: i32, response_time: i64) -> Result<()> {
        self.conn.execute(
            "INSERT INTO history (method, url, status_code, response_time) VALUES (?1, ?2, ?3, ?4)",
            (method, url, status_code, response_time),
        )?;
        Ok(())
    }

    pub fn clear_history(&self) -> Result<()> {
        self.conn.execute("DELETE FROM history", [])?;
        Ok(())
    }
}