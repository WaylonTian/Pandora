# Data Models

## Backend Data Models (Rust)

### API Tester Models (`storage/mod.rs`)

```rust
struct Collection {
    id: Option<i64>,
    name: String,
    parent_id: Option<i64>,   // Nested collections (max 3 levels)
    sort_order: i32,
}

struct ApiRequest {
    id: Option<i64>,
    collection_id: Option<i64>,
    name: String,
    method: String,            // GET, POST, PUT, DELETE, PATCH, etc.
    url: String,
    headers: String,           // JSON-serialized
    body: String,
    body_type: String,         // json, form-data, x-www-form-urlencoded, raw, none
}

struct Environment {
    id: Option<i64>,
    name: String,
    is_active: bool,           // Only one active at a time
}

struct Variable {
    id: Option<i64>,
    environment_id: i64,
    key: String,
    value: String,
    enabled: bool,
}

struct HistoryItem {
    id: Option<i64>,
    method: String,
    url: String,
    status_code: Option<i32>,
    response_time: Option<i64>,
    created_at: Option<String>,
}

struct Cookie {
    id: Option<i64>,
    domain: String,
    name: String,
    value: String,
    path: String,
    expires: Option<String>,
    http_only: bool,
    secure: bool,
}
```

### DB Manager Models (`db/types.rs`)

```rust
enum DatabaseType { MySQL, PostgreSQL, SQLite }

struct ConnectionConfig {
    id: String,                // UUID v4
    name: String,
    db_type: DatabaseType,
    host: Option<String>,
    port: Option<u16>,
    username: Option<String>,
    password: Option<String>,
    database: String,
    file_path: Option<String>, // SQLite only
}

struct QueryResult {
    columns: Vec<ColumnInfo>,
    rows: Vec<Vec<Value>>,
    affected_rows: Option<u64>,
    execution_time_ms: u64,
}

enum Value { Null, Bool(bool), Int(i64), Float(f64), Text(String), Bytes(Vec<u8>) }

struct ColumnInfo { name: String, data_type: String, nullable: bool }

struct TableInfo {
    name: String,
    columns: Vec<ColumnDefinition>,
    indexes: Vec<IndexInfo>,
    foreign_keys: Vec<ForeignKeyInfo>,
}

struct ColumnDefinition {
    name: String,
    data_type: String,
    nullable: bool,
    default_value: Option<String>,
    is_primary_key: bool,
    is_auto_increment: bool,
}

struct ExplainResult { nodes: Vec<ExplainNode> }
struct ExplainNode { operation: String, detail: String, rows: Option<u64>, cost: Option<f64>, children: Vec<ExplainNode> }

// App State
struct WindowState { width: f64, height: f64 }
struct TabState { id: String, tab_type: TabType, title: String, connection_id: Option<String> }
enum TabType { Query, Table, Designer }
struct QueryHistoryItem { sql: String, connection_id: String, execution_time_ms: u64, timestamp: String, success: bool }
struct FavoriteItem { id: String, name: String, favorite_type: FavoriteType, content: String, connection_id: Option<String> }
enum FavoriteType { Query, Table }

// Error types
enum DbError {
    ConnectionError { message, details? },
    QueryError { message, line?, column? },
    SchemaError { message },
    ConfigError { message },
    ValidationError { message, field? },
}
```

### Plugin Models (`plugin/`)

```rust
// manager.rs
struct PluginManifest { main: Option<String>, logo: Option<String>, preload: Option<String>, features: Vec<PluginFeature> }
struct PluginFeature { code: String, explain: Option<String>, icon: Option<String>, cmds: Vec<serde_json::Value> }
struct InstalledPlugin { id: String, name: String, version: String, description: String, logo: Option<String>, path: String, manifest: PluginManifest, enabled: bool, installed_at: String }

// marketplace.rs
struct MarketPlugin { name: String, description: String, logo: String, plugin_id: String }
struct MarketPluginDetail { name: String, description: String, version: String, size: String, download_url: Option<String>, developer: String, rating: String, users: String, detail_html: String }

// db.rs
struct DbDoc { _id: String, _rev: Option<String>, data: serde_json::Value }
```

### Script Runner Models (`script/mod.rs`)

```rust
struct FileEntry { name: String, path: String, is_dir: bool, children: Option<Vec<FileEntry>> }
struct RuntimeInfo { name: String, command: String, version: String }
struct ScriptOutput { stdout: String, stderr: String, exit_code: Option<i32> }
struct ScriptMeta { runtime: Option<String>, env_vars: Option<HashMap<String, String>> }
struct ScriptConfig { runtime: String, args: Vec<String>, env: HashMap<String, String> }
```

### HTTP Models (`http/mod.rs`)

```rust
struct HttpResponse { status: u16, headers: HashMap<String, String>, body: String, time_ms: u64 }
```

### System Models (`system/mod.rs`)

```rust
struct IpInfo { name: String, ip: String }
```

## Frontend Data Models (TypeScript)

Frontend models mirror backend structs via Tauri's serde serialization. Key additional frontend-only types:

```typescript
// Plugin interface
interface ToolPlugin { id: string; name: string; icon: string; category: "encoding"|"crypto"|"network"|"text"|"other"; component: ComponentType }

// Panel system
interface PanelDefinition { id: string; title: string; component: ComponentType<IDockviewPanelProps> }

// Plugin runtime
interface PluginManifest { main?: string; logo?: string; preload?: string; features: PluginFeature[]; pluginSetting?: any }
interface PluginFeature { code: string; explain?: string; icon?: string; cmds: any[] }
interface InstalledPlugin { id: string; name: string; version: string; description: string; logo?: string; path: string; manifest: PluginManifest; enabled: boolean; installed_at: string }
interface MarketPlugin { name: string; description: string; logo: string; plugin_id: string }
interface MarketPluginDetail { name: string; description: string; version: string; size: string; download_url?: string; developer: string; rating: string; users: string; detail_html: string }
```

## Database Schema (SQLite — pandora.db)

```sql
-- Collections (nested via parent_id, max 3 levels)
CREATE TABLE collections (id INTEGER PRIMARY KEY, name TEXT, parent_id INTEGER REFERENCES collections(id), sort_order INTEGER DEFAULT 0);

-- API Requests
CREATE TABLE requests (id INTEGER PRIMARY KEY, collection_id INTEGER REFERENCES collections(id), name TEXT, method TEXT, url TEXT, headers TEXT, body TEXT, body_type TEXT);

-- Environments (one active at a time)
CREATE TABLE environments (id INTEGER PRIMARY KEY, name TEXT, is_active BOOLEAN DEFAULT 0);

-- Variables (per environment)
CREATE TABLE variables (id INTEGER PRIMARY KEY, environment_id INTEGER REFERENCES environments(id), key TEXT, value TEXT, enabled BOOLEAN DEFAULT 1);

-- History
CREATE TABLE history (id INTEGER PRIMARY KEY, method TEXT, url TEXT, status_code INTEGER, response_time INTEGER, created_at TEXT);

-- Cookies
CREATE TABLE cookies (id INTEGER PRIMARY KEY, domain TEXT, name TEXT, value TEXT, path TEXT, expires TEXT, http_only BOOLEAN, secure BOOLEAN);
```

## Plugin Database Schema (per-plugin utools.db)

```sql
-- Key-value document store (uTools db API compatible)
CREATE TABLE docs (_id TEXT PRIMARY KEY, _rev TEXT, data TEXT);

-- Binary attachments
CREATE TABLE attachments (doc_id TEXT, name TEXT, mime TEXT, data BLOB, PRIMARY KEY(doc_id, name));
```
