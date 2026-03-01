use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct DbDoc {
    pub _id: String,
    pub _rev: Option<String>,
    #[serde(flatten)]
    pub data: serde_json::Map<String, Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DbResult {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rev: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ok: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

fn db_path(plugin_id: &str) -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("pandora").join("plugin-db").join(plugin_id)
}

fn open_db(plugin_id: &str) -> Result<Connection, String> {
    let dir = db_path(plugin_id);
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let conn = Connection::open(dir.join("docs.db")).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS docs (id TEXT PRIMARY KEY, rev INTEGER DEFAULT 1, data TEXT NOT NULL);
         CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, data BLOB NOT NULL, mime TEXT NOT NULL);"
    ).map_err(|e| e.to_string())?;
    Ok(conn)
}

fn make_rev(n: i64) -> String {
    format!("{}-{}", n, &uuid::Uuid::new_v4().to_string().replace('-', "")[..12])
}

pub fn put(plugin_id: &str, doc: DbDoc) -> Result<DbResult, String> {
    let conn = open_db(plugin_id)?;
    let data_json = serde_json::to_string(&doc.data).map_err(|e| e.to_string())?;

    let existing: Option<i64> = conn
        .query_row("SELECT rev FROM docs WHERE id = ?1", params![doc._id], |r| r.get(0))
        .ok();

    let new_rev = match existing {
        Some(rev) => {
            conn.execute("UPDATE docs SET rev = ?1, data = ?2 WHERE id = ?3", params![rev + 1, data_json, doc._id])
                .map_err(|e| e.to_string())?;
            rev + 1
        }
        None => {
            conn.execute("INSERT INTO docs (id, rev, data) VALUES (?1, 1, ?2)", params![doc._id, data_json])
                .map_err(|e| e.to_string())?;
            1
        }
    };

    Ok(DbResult { id: doc._id, rev: Some(make_rev(new_rev)), ok: Some(true), error: None, message: None })
}

pub fn get(plugin_id: &str, id: &str) -> Result<Option<Value>, String> {
    let conn = open_db(plugin_id)?;
    let result = conn.query_row(
        "SELECT id, rev, data FROM docs WHERE id = ?1", params![id],
        |row| {
            let id: String = row.get(0)?;
            let rev: i64 = row.get(1)?;
            let data: String = row.get(2)?;
            Ok((id, rev, data))
        }
    );

    match result {
        Ok((id, rev, data)) => {
            let mut doc: serde_json::Map<String, Value> = serde_json::from_str(&data).unwrap_or_default();
            doc.insert("_id".into(), Value::String(id));
            doc.insert("_rev".into(), Value::String(make_rev(rev)));
            Ok(Some(Value::Object(doc)))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn remove(plugin_id: &str, id: &str) -> Result<DbResult, String> {
    let conn = open_db(plugin_id)?;
    let affected = conn.execute("DELETE FROM docs WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    if affected > 0 {
        Ok(DbResult { id: id.to_string(), rev: None, ok: Some(true), error: None, message: None })
    } else {
        Ok(DbResult { id: id.to_string(), rev: None, ok: None, error: Some(true), message: Some("not found".into()) })
    }
}

pub fn all_docs(plugin_id: &str, prefix: Option<&str>) -> Result<Vec<Value>, String> {
    let conn = open_db(plugin_id)?;
    if let Some(p) = prefix {
        let mut stmt = conn.prepare("SELECT id, rev, data FROM docs WHERE id LIKE ?1").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![format!("{}%", p)], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, String>(2)?))
        }).map_err(|e| e.to_string())?;
        return collect_docs(rows);
    }
    let mut stmt = conn.prepare("SELECT id, rev, data FROM docs").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, String>(2)?))
    }).map_err(|e| e.to_string())?;
    collect_docs(rows)
}

fn collect_docs(rows: impl Iterator<Item = Result<(String, i64, String), rusqlite::Error>>) -> Result<Vec<Value>, String> {
    let mut docs = vec![];
    for row in rows {
        let (id, rev, data) = row.map_err(|e| e.to_string())?;
        let mut doc: serde_json::Map<String, Value> = serde_json::from_str(&data).unwrap_or_default();
        doc.insert("_id".into(), Value::String(id));
        doc.insert("_rev".into(), Value::String(make_rev(rev)));
        docs.push(Value::Object(doc));
    }
    Ok(docs)
}

pub fn post_attachment(plugin_id: &str, id: &str, data: Vec<u8>, mime: &str) -> Result<DbResult, String> {
    let conn = open_db(plugin_id)?;
    conn.execute("INSERT OR REPLACE INTO attachments (id, data, mime) VALUES (?1, ?2, ?3)", params![id, data, mime])
        .map_err(|e| e.to_string())?;
    Ok(DbResult { id: id.to_string(), rev: None, ok: Some(true), error: None, message: None })
}

pub fn get_attachment(plugin_id: &str, id: &str) -> Result<Option<Vec<u8>>, String> {
    let conn = open_db(plugin_id)?;
    match conn.query_row("SELECT data FROM attachments WHERE id = ?1", params![id], |r| r.get(0)) {
        Ok(data) => Ok(Some(data)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}
