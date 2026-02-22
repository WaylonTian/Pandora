# Phase 1: Rust Backend — Plugin Infrastructure

## Task 1: Asar Archive Parser

**Files:**
- Create: `src-tauri/src/plugin/asar.rs`
- Create: `src-tauri/src/plugin/mod.rs`

**Step 1: Add dependencies to Cargo.toml**

Add to `[dependencies]`:
```toml
byteorder = "1"
```

**Step 2: Implement asar header parser**

The asar format is:
- 4 bytes: header size (uint32 LE) — actually a pickle: 4 bytes data size, 4 bytes header string size, 4 bytes header string size again, then header JSON string
- Header JSON: `{"files": {"filename": {"offset": "0", "size": 123}}}` for files, `{"files": {...}}` for directories

Create `src-tauri/src/plugin/asar.rs`:

```rust
use byteorder::{LittleEndian, ReadBytesExt};
use serde::Deserialize;
use std::collections::HashMap;
use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
struct AsarNode {
    files: Option<HashMap<String, AsarNode>>,
    offset: Option<String>,
    size: Option<u64>,
}

pub fn extract_asar(asar_path: &Path, dest: &Path) -> Result<(), String> {
    let mut file = File::open(asar_path).map_err(|e| format!("Failed to open asar: {e}"))?;

    // Read pickle header: data_size(4) + header_size(4) + header_size(4) + header_json
    file.read_u32::<LittleEndian>().map_err(|e| e.to_string())?;
    let header_size = file.read_u32::<LittleEndian>().map_err(|e| e.to_string())?;
    file.read_u32::<LittleEndian>().map_err(|e| e.to_string())?;
    let json_size = file.read_u32::<LittleEndian>().map_err(|e| e.to_string())?;

    let mut header_json = vec![0u8; json_size as usize];
    file.read_exact(&mut header_json).map_err(|e| e.to_string())?;
    let header_str = String::from_utf8(header_json).map_err(|e| e.to_string())?;
    let root: AsarNode = serde_json::from_str(&header_str).map_err(|e| e.to_string())?;

    // Content starts after the full header (aligned to 4 bytes)
    let content_offset = 4 + header_size as u64 + 4;

    std::fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    extract_node(&mut file, &root, dest, content_offset)
}

fn extract_node(
    file: &mut File,
    node: &AsarNode,
    dest: &Path,
    content_offset: u64,
) -> Result<(), String> {
    if let Some(ref files) = node.files {
        for (name, child) in files {
            let child_path = dest.join(name);
            if child.files.is_some() {
                std::fs::create_dir_all(&child_path).map_err(|e| e.to_string())?;
                extract_node(file, child, &child_path, content_offset)?;
            } else if let (Some(offset_str), Some(size)) = (&child.offset, child.size) {
                let offset: u64 = offset_str.parse().map_err(|e: std::num::ParseIntError| e.to_string())?;
                file.seek(SeekFrom::Start(content_offset + offset)).map_err(|e| e.to_string())?;
                let mut buf = vec![0u8; size as usize];
                file.read_exact(&mut buf).map_err(|e| e.to_string())?;
                if let Some(parent) = child_path.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                std::fs::write(&child_path, buf).map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}
```

**Step 3: Create plugin module**

Create `src-tauri/src/plugin/mod.rs`:
```rust
pub mod asar;
pub mod manager;
pub mod db;
pub mod marketplace;
```

**Step 4: Register module in lib.rs**

Add `mod plugin;` at top of `src-tauri/src/lib.rs`.

**Step 5: Commit**
```bash
git add -A && git commit -m "feat(plugin): add asar archive parser"
```

---

## Task 2: Plugin Manager — Install/Uninstall/List

**Files:**
- Create: `src-tauri/src/plugin/manager.rs`

**Step 1: Implement plugin manager**

```rust
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginFeature {
    pub code: String,
    pub explain: Option<String>,
    pub icon: Option<String>,
    pub cmds: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub main: Option<String>,
    pub logo: Option<String>,
    pub preload: Option<String>,
    pub features: Vec<PluginFeature>,
    #[serde(rename = "pluginSetting")]
    pub plugin_setting: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPlugin {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub logo: Option<String>,
    pub path: String,
    pub manifest: PluginManifest,
    pub enabled: bool,
    pub installed_at: String,
}

fn plugins_dir() -> PathBuf {
    let base = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("pandora").join("plugins")
}

fn registry_path() -> PathBuf {
    plugins_dir().join("registry.json")
}

fn load_registry() -> Vec<InstalledPlugin> {
    let path = registry_path();
    if path.exists() {
        let data = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        vec![]
    }
}

fn save_registry(plugins: &[InstalledPlugin]) -> Result<(), String> {
    let path = registry_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(plugins).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn install_plugin(upxs_path: &Path, name: &str, version: &str, description: &str) -> Result<InstalledPlugin, String> {
    let id = slug_from_name(name);
    let dest = plugins_dir().join(&id);

    if dest.exists() {
        fs::remove_dir_all(&dest).map_err(|e| e.to_string())?;
    }

    super::asar::extract_asar(upxs_path, &dest)?;

    let manifest_path = dest.join("plugin.json");
    if !manifest_path.exists() {
        fs::remove_dir_all(&dest).ok();
        return Err("plugin.json not found in package".into());
    }

    let manifest_str = fs::read_to_string(&manifest_path).map_err(|e| e.to_string())?;
    let manifest: PluginManifest = serde_json::from_str(&manifest_str).map_err(|e| e.to_string())?;

    let plugin = InstalledPlugin {
        id: id.clone(),
        name: name.to_string(),
        version: version.to_string(),
        description: description.to_string(),
        logo: manifest.logo.clone(),
        path: dest.to_string_lossy().to_string(),
        manifest,
        enabled: true,
        installed_at: chrono::Utc::now().to_rfc3339(),
    };

    let mut registry = load_registry();
    registry.retain(|p| p.id != id);
    registry.push(plugin.clone());
    save_registry(&registry)?;

    Ok(plugin)
}

pub fn uninstall_plugin(id: &str) -> Result<(), String> {
    let mut registry = load_registry();
    if let Some(plugin) = registry.iter().find(|p| p.id == id) {
        let path = Path::new(&plugin.path);
        if path.exists() {
            fs::remove_dir_all(path).map_err(|e| e.to_string())?;
        }
    }
    registry.retain(|p| p.id != id);
    save_registry(&registry)?;

    // Also remove plugin db
    let db_dir = plugins_dir().parent().unwrap().join("plugin-db").join(id);
    if db_dir.exists() {
        fs::remove_dir_all(db_dir).ok();
    }
    Ok(())
}

pub fn list_plugins() -> Vec<InstalledPlugin> {
    load_registry()
}

pub fn get_plugin(id: &str) -> Option<InstalledPlugin> {
    load_registry().into_iter().find(|p| p.id == id)
}

pub fn toggle_plugin(id: &str, enabled: bool) -> Result<(), String> {
    let mut registry = load_registry();
    if let Some(p) = registry.iter_mut().find(|p| p.id == id) {
        p.enabled = enabled;
    }
    save_registry(&registry)
}

fn slug_from_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(plugin): add plugin manager (install/uninstall/list)"
```

---

## Task 3: Plugin Document Database (utools.db compatible)

**Files:**
- Create: `src-tauri/src/plugin/db.rs`

**Step 1: Implement per-plugin document store**

This simulates uTools' nosql document DB using SQLite. Each plugin gets its own SQLite file.

```rust
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
    format!("{}-{}", n, uuid::Uuid::new_v4().to_string().replace("-", "").get(..12).unwrap_or("000000000000"))
}

pub fn put(plugin_id: &str, doc: DbDoc) -> Result<DbResult, String> {
    let conn = open_db(plugin_id)?;
    let data_json = serde_json::to_string(&doc.data).map_err(|e| e.to_string())?;

    // Check if exists
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
    let mut stmt = if let Some(p) = prefix {
        let mut s = conn.prepare("SELECT id, rev, data FROM docs WHERE id LIKE ?1").map_err(|e| e.to_string())?;
        let rows = s.query_map(params![format!("{}%", p)], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, String>(2)?))
        }).map_err(|e| e.to_string())?;
        return collect_docs(rows);
    } else {
        conn.prepare("SELECT id, rev, data FROM docs").map_err(|e| e.to_string())?
    };
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
```

**Step 2: Commit**
```bash
git add -A && git commit -m "feat(plugin): add plugin document database (utools.db compatible)"
```

---

## Task 4: Marketplace Scraper

**Files:**
- Create: `src-tauri/src/plugin/marketplace.rs`

**Step 1: Implement marketplace HTML scraper**

Uses reqwest to fetch uTools plugin pages and extract plugin info via simple string parsing (no heavy HTML parser dependency).

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketPlugin {
    pub name: String,
    pub description: String,
    pub url: String,
    pub detail_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketPluginDetail {
    pub name: String,
    pub description: String,
    pub version: String,
    pub size: String,
    pub download_url: Option<String>,
    pub developer: String,
    pub rating: String,
    pub users: String,
    pub detail_html: String,
}

pub async fn search_plugins(query: &str) -> Result<Vec<MarketPlugin>, String> {
    let url = format!("https://www.u-tools.cn/plugins/search/?q={}", urlencoding::encode(query));
    let html = reqwest::get(&url).await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?;
    Ok(parse_plugin_list(&html))
}

pub async fn list_topic(topic_id: u32) -> Result<Vec<MarketPlugin>, String> {
    let url = format!("https://www.u-tools.cn/plugins/topic/{}/", topic_id);
    let html = reqwest::get(&url).await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?;
    Ok(parse_plugin_list(&html))
}

pub async fn get_plugin_detail(name: &str) -> Result<MarketPluginDetail, String> {
    let url = format!("https://www.u-tools.cn/plugins/detail/{}/", urlencoding::encode(name));
    let html = reqwest::get(&url).await.map_err(|e| e.to_string())?
        .text().await.map_err(|e| e.to_string())?;
    parse_plugin_detail(&html, name)
}

pub async fn download_plugin(download_url: &str, dest: &std::path::Path) -> Result<(), String> {
    let resp = reqwest::get(download_url).await.map_err(|e| e.to_string())?;
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(dest, bytes).map_err(|e| e.to_string())
}

fn parse_plugin_list(html: &str) -> Vec<MarketPlugin> {
    // Parse <a> links to /plugins/detail/NAME/ with adjacent text
    let mut plugins = vec![];
    for line in html.lines() {
        if let Some(start) = line.find("/plugins/detail/") {
            let rest = &line[start + 16..];
            if let Some(end) = rest.find('/') {
                let name = urlencoding::decode(&rest[..end]).unwrap_or_default().to_string();
                if !name.is_empty() && !plugins.iter().any(|p: &MarketPlugin| p.name == name) {
                    plugins.push(MarketPlugin {
                        name: name.clone(),
                        description: String::new(),
                        url: format!("https://www.u-tools.cn/plugins/detail/{}/", urlencoding::encode(&name)),
                        detail_url: format!("https://www.u-tools.cn/plugins/detail/{}/", urlencoding::encode(&name)),
                    });
                }
            }
        }
    }
    plugins
}

fn parse_plugin_detail(html: &str, name: &str) -> Result<MarketPluginDetail, String> {
    let download_url = html.lines()
        .find(|l| l.contains("res.u-tools.cn/plugins/") && l.contains(".upxs"))
        .and_then(|l| {
            let start = l.find("https://res.u-tools.cn")?;
            let rest = &l[start..];
            let end = rest.find('"').or_else(|| rest.find('\''))?;
            Some(rest[..end].to_string())
        });

    // Extract version, size, etc. from meta text
    let extract_after = |label: &str| -> String {
        html.lines()
            .skip_while(|l| !l.contains(label))
            .nth(1)
            .map(|l| l.trim().replace("<br>", "").replace("</div>", "").replace("</span>", ""))
            .unwrap_or_default()
            .trim().to_string()
    };

    Ok(MarketPluginDetail {
        name: name.to_string(),
        description: String::new(),
        version: extract_after("版本"),
        size: extract_after("大小"),
        download_url,
        developer: String::new(),
        rating: String::new(),
        users: String::new(),
        detail_html: String::new(),
    })
}
```

**Step 2: Add urlencoding dependency**

Add to Cargo.toml:
```toml
urlencoding = "2"
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(plugin): add marketplace scraper"
```

---

## Task 5: Tauri Commands for Plugin System

**Files:**
- Create: `src-tauri/src/plugin/commands.rs`
- Modify: `src-tauri/src/plugin/mod.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Create Tauri command wrappers**

```rust
use super::{manager, db, marketplace};
use serde_json::Value;
use std::path::PathBuf;

// Plugin management
#[tauri::command]
pub fn plugin_list() -> Vec<manager::InstalledPlugin> {
    manager::list_plugins()
}

#[tauri::command]
pub fn plugin_get(id: String) -> Option<manager::InstalledPlugin> {
    manager::get_plugin(&id)
}

#[tauri::command]
pub fn plugin_uninstall(id: String) -> Result<(), String> {
    manager::uninstall_plugin(&id)
}

#[tauri::command]
pub fn plugin_toggle(id: String, enabled: bool) -> Result<(), String> {
    manager::toggle_plugin(&id, enabled)
}

#[tauri::command]
pub async fn plugin_install_from_market(name: String) -> Result<manager::InstalledPlugin, String> {
    let detail = marketplace::get_plugin_detail(&name).await?;
    let download_url = detail.download_url.ok_or("No download URL found")?;

    let tmp = std::env::temp_dir().join(format!("pandora-{}.upxs", uuid::Uuid::new_v4()));
    marketplace::download_plugin(&download_url, &tmp).await?;

    let result = manager::install_plugin(&tmp, &name, &detail.version, &detail.size);
    std::fs::remove_file(&tmp).ok();
    result
}

#[tauri::command]
pub async fn plugin_install_from_file(path: String) -> Result<manager::InstalledPlugin, String> {
    manager::install_plugin(&PathBuf::from(&path), "local-plugin", "0.0.0", "")
}

// Plugin DB
#[tauri::command]
pub fn plugin_db_put(plugin_id: String, doc: db::DbDoc) -> Result<db::DbResult, String> {
    db::put(&plugin_id, doc)
}

#[tauri::command]
pub fn plugin_db_get(plugin_id: String, id: String) -> Result<Option<Value>, String> {
    db::get(&plugin_id, &id)
}

#[tauri::command]
pub fn plugin_db_remove(plugin_id: String, id: String) -> Result<db::DbResult, String> {
    db::remove(&plugin_id, &id)
}

#[tauri::command]
pub fn plugin_db_all(plugin_id: String, prefix: Option<String>) -> Result<Vec<Value>, String> {
    db::all_docs(&plugin_id, prefix.as_deref())
}

#[tauri::command]
pub fn plugin_db_put_attachment(plugin_id: String, id: String, data: Vec<u8>, mime: String) -> Result<db::DbResult, String> {
    db::post_attachment(&plugin_id, &id, data, &mime)
}

#[tauri::command]
pub fn plugin_db_get_attachment(plugin_id: String, id: String) -> Result<Option<Vec<u8>>, String> {
    db::get_attachment(&plugin_id, &id)
}

// Marketplace
#[tauri::command]
pub async fn marketplace_search(query: String) -> Result<Vec<marketplace::MarketPlugin>, String> {
    marketplace::search_plugins(&query).await
}

#[tauri::command]
pub async fn marketplace_topic(topic_id: u32) -> Result<Vec<marketplace::MarketPlugin>, String> {
    marketplace::list_topic(topic_id).await
}

#[tauri::command]
pub async fn marketplace_detail(name: String) -> Result<marketplace::MarketPluginDetail, String> {
    marketplace::get_plugin_detail(&name).await
}
```

**Step 2: Update mod.rs**

```rust
pub mod asar;
pub mod manager;
pub mod db;
pub mod marketplace;
pub mod commands;
```

**Step 3: Register commands in lib.rs**

Add to `invoke_handler` in `src-tauri/src/lib.rs`:
```rust
plugin::commands::plugin_list,
plugin::commands::plugin_get,
plugin::commands::plugin_uninstall,
plugin::commands::plugin_toggle,
plugin::commands::plugin_install_from_market,
plugin::commands::plugin_install_from_file,
plugin::commands::plugin_db_put,
plugin::commands::plugin_db_get,
plugin::commands::plugin_db_remove,
plugin::commands::plugin_db_all,
plugin::commands::plugin_db_put_attachment,
plugin::commands::plugin_db_get_attachment,
plugin::commands::marketplace_search,
plugin::commands::marketplace_topic,
plugin::commands::marketplace_detail,
```

**Step 4: Verify compilation**
```bash
cd src-tauri && cargo check
```

**Step 5: Commit**
```bash
git add -A && git commit -m "feat(plugin): add Tauri commands for plugin system"
```
