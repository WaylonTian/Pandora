---
inclusion: auto
name: data-models
description: Rust structs, TypeScript interfaces, and SQLite schemas. Use when working with data types, database operations, or API contracts.
---
# Data Models

## API Tester (storage/mod.rs)
```rust
struct Collection { id: Option<i64>, name: String, parent_id: Option<i64>, sort_order: i32 }
struct ApiRequest { id: Option<i64>, collection_id: Option<i64>, name: String, method: String, url: String, headers: String/*JSON*/, body: String, body_type: String }
struct Environment { id: Option<i64>, name: String, is_active: bool }
struct Variable { id: Option<i64>, environment_id: i64, key: String, value: String, enabled: bool }
struct HistoryItem { id: Option<i64>, method: String, url: String, status_code: Option<i32>, response_time: Option<i64>, created_at: Option<String> }
struct Cookie { id: Option<i64>, domain: String, name: String, value: String, path: String, expires: Option<String>, http_only: bool, secure: bool }
struct HttpResponse { status: u16, headers: HashMap<String, String>, body: String, time_ms: u64 }
```

## DB Manager (db/types.rs)
```rust
enum DatabaseType { MySQL, PostgreSQL, SQLite }
struct ConnectionConfig { id: String/*UUID*/, name: String, db_type: DatabaseType, host: Option<String>, port: Option<u16>, username: Option<String>, password: Option<String>, database: String, file_path: Option<String> }
struct QueryResult { columns: Vec<ColumnInfo>, rows: Vec<Vec<Value>>, affected_rows: Option<u64>, execution_time_ms: u64 }
enum Value { Null, Bool(bool), Int(i64), Float(f64), Text(String), Bytes(Vec<u8>) }
struct ColumnInfo { name: String, data_type: String, nullable: bool }
struct TableInfo { name: String, columns: Vec<ColumnDefinition>, indexes: Vec<IndexInfo>, foreign_keys: Vec<ForeignKeyInfo> }
struct ColumnDefinition { name: String, data_type: String, nullable: bool, default_value: Option<String>, is_primary_key: bool, is_auto_increment: bool }
enum DbError { ConnectionError{message,details?}, QueryError{message,line?,column?}, SchemaError{message}, ConfigError{message}, ValidationError{message,field?} }
```

## Plugin (plugin/)
```rust
struct InstalledPlugin { id: String, name: String, version: String, description: String, logo: Option<String>, path: String, manifest: PluginManifest, enabled: bool, installed_at: String }
struct PluginManifest { main: Option<String>, logo: Option<String>, preload: Option<String>, features: Vec<PluginFeature> }
struct DbDoc { _id: String, _rev: Option<String>, data: serde_json::Value }
```

## Script Runner (script/mod.rs)
```rust
struct FileEntry { name: String, path: String, is_dir: bool, children: Option<Vec<FileEntry>> }
struct RuntimeInfo { name: String, command: String, version: String }
struct ScriptOutput { stdout: String, stderr: String, exit_code: Option<i32> }
```

## SQLite Schema (pandora.db)
```sql
CREATE TABLE collections (id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER REFERENCES collections(id), sort_order INTEGER DEFAULT 0);
CREATE TABLE requests (id INTEGER PRIMARY KEY, collection_id INTEGER REFERENCES collections(id), name TEXT, method TEXT, url TEXT, headers TEXT, body TEXT, body_type TEXT);
CREATE TABLE environments (id INTEGER PRIMARY KEY, name TEXT, is_active BOOLEAN DEFAULT 0);
CREATE TABLE variables (id INTEGER PRIMARY KEY, environment_id INTEGER REFERENCES environments(id), key TEXT, value TEXT, enabled BOOLEAN DEFAULT 1);
CREATE TABLE history (id INTEGER PRIMARY KEY, method TEXT, url TEXT, status_code INTEGER, response_time INTEGER, created_at TEXT);
CREATE TABLE cookies (id INTEGER PRIMARY KEY, domain TEXT, name TEXT, value TEXT, path TEXT, expires TEXT, http_only BOOLEAN, secure BOOLEAN);
```

## Plugin DB Schema (per-plugin utools.db)
```sql
CREATE TABLE docs (_id TEXT PRIMARY KEY, _rev TEXT, data TEXT);
CREATE TABLE attachments (doc_id TEXT, name TEXT, mime TEXT, data BLOB, PRIMARY KEY(doc_id, name));
```

## Frontend Key Interfaces
```typescript
interface ToolPlugin { id: string; name: string; icon: string; category: "encoding"|"crypto"|"network"|"text"|"other"; component: ComponentType }
interface PanelDefinition { id: string; title: string; component: ComponentType<IDockviewPanelProps> }
// Template: resolveTemplate("{{baseUrl}}/api", vars) → resolved string
// Plugin bridge: iframe postMessage {type:"utools-call", pluginId, id, method, args} ↔ {type:"utools-response", id, result/error}
```
