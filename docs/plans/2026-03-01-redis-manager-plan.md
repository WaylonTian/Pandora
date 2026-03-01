# Redis Manager Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Redis Manager module to Pandora — connection management, key browser with tree view, value viewer/editor for all 5 Redis types, and a CLI console.

**Architecture:** Independent module under `src/modules/redis-manager/` (frontend) and `src-tauri/src/redis/` (backend). Uses `redis` crate with async multiplexed connections. Reuses `ResizableLayout` + `ResizableSplit` for consistent UI. Zustand store follows db-manager pattern.

**Tech Stack:** Tauri 2, React 19, TypeScript, Zustand, redis crate (tokio-comp + aio), serde

---

## Task 1: Rust Backend — Types & Config

**Files:**
- Create: `src-tauri/src/redis/mod.rs`
- Create: `src-tauri/src/redis/types.rs`
- Create: `src-tauri/src/redis/config.rs`

**Step 1: Create `src-tauri/src/redis/mod.rs`**

```rust
pub mod types;
pub mod config;
pub mod connection;
pub mod commands;
```

**Step 2: Create `src-tauri/src/redis/types.rs`**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisConnectionConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub password: Option<String>,
    pub database: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyInfo {
    pub key: String,
    pub key_type: String,
    pub ttl: i64,
    pub size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub cursor: u64,
    pub keys: Vec<KeyInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum RedisValue {
    String(Vec<u8>),
    Hash(Vec<(String, String)>),
    List(Vec<String>),
    Set(Vec<String>),
    ZSet(Vec<(String, f64)>),
    None,
}
```

**Step 3: Create `src-tauri/src/redis/config.rs`**

Follow db-manager's `config.rs` pattern — JSON file persistence to `~/.pandora/redis-manager/connections.json`.

```rust
use super::types::RedisConnectionConfig;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ConnectionsData {
    pub connections: Vec<RedisConnectionConfig>,
}

pub fn get_config_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?
        .join("redis-manager");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

pub fn save_connections(app: &tauri::AppHandle, configs: &[RedisConnectionConfig]) -> Result<(), String> {
    let path = get_config_dir(app)?.join("connections.json");
    let data = ConnectionsData { connections: configs.to_vec() };
    fs::write(&path, serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

pub fn load_connections(app: &tauri::AppHandle) -> Result<Vec<RedisConnectionConfig>, String> {
    let path = get_config_dir(app)?.join("connections.json");
    if !path.exists() { return Ok(vec![]); }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let data: ConnectionsData = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(data.connections)
}

pub fn delete_connection(app: &tauri::AppHandle, id: &str) -> Result<(), String> {
    let mut conns = load_connections(app)?;
    conns.retain(|c| c.id != id);
    save_connections(app, &conns)
}
```

**Step 4: Commit**

```bash
git add src-tauri/src/redis/
git commit -m "feat(redis): add types and config modules"
```

---

## Task 2: Rust Backend — Connection Manager

**Files:**
- Create: `src-tauri/src/redis/connection.rs`

**Step 1: Create connection manager**

Manages a `HashMap<String, MultiplexedConnection>` behind a `tokio::sync::RwLock`. Each connection keyed by config ID.

```rust
use redis::aio::MultiplexedConnection;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct RedisState {
    connections: Arc<RwLock<HashMap<String, MultiplexedConnection>>>,
}

impl RedisState {
    pub fn new() -> Self {
        Self { connections: Arc::new(RwLock::new(HashMap::new())) }
    }

    pub async fn connect(&self, id: &str, config: &super::types::RedisConnectionConfig) -> Result<(), String> {
        let url = if let Some(ref pw) = config.password {
            format!("redis://:{}@{}:{}/{}", pw, config.host, config.port, config.database)
        } else {
            format!("redis://{}:{}/{}", config.host, config.port, config.database)
        };
        let client = redis::Client::open(url).map_err(|e| e.to_string())?;
        let con = client.get_multiplexed_tokio_connection().await.map_err(|e| e.to_string())?;
        self.connections.write().await.insert(id.to_string(), con);
        Ok(())
    }

    pub async fn disconnect(&self, id: &str) {
        self.connections.write().await.remove(id);
    }

    pub async fn get_connection(&self, id: &str) -> Result<MultiplexedConnection, String> {
        self.connections.read().await.get(id).cloned()
            .ok_or_else(|| format!("Connection '{}' not found", id))
    }

    pub async fn test_connection(config: &super::types::RedisConnectionConfig) -> Result<(), String> {
        let url = if let Some(ref pw) = config.password {
            format!("redis://:{}@{}:{}/{}", pw, config.host, config.port, config.database)
        } else {
            format!("redis://{}:{}/{}", config.host, config.port, config.database)
        };
        let client = redis::Client::open(url).map_err(|e| e.to_string())?;
        let mut con = client.get_multiplexed_tokio_connection().await.map_err(|e| e.to_string())?;
        redis::cmd("PING").query_async::<String>(&mut con).await.map_err(|e| e.to_string())?;
        Ok(())
    }
}
```

**Step 2: Commit**

```bash
git add src-tauri/src/redis/connection.rs
git commit -m "feat(redis): add connection manager with multiplexed connections"
```

---

## Task 3: Rust Backend — Tauri Commands

**Files:**
- Create: `src-tauri/src/redis/commands.rs`
- Modify: `src-tauri/src/lib.rs` — add `mod redis`, extend `AppState`, register commands
- Modify: `src-tauri/Cargo.toml` — add `redis` dependency

**Step 1: Add redis dependency to Cargo.toml**

Add under `[dependencies]`:
```toml
redis = { version = "0.27", features = ["tokio-comp", "aio"] }
```

**Step 2: Create `src-tauri/src/redis/commands.rs`**

All Tauri commands. Each takes `State<AppState>` and delegates to `RedisState`.

Commands to implement:
- `redis_save_config` / `redis_load_configs` / `redis_delete_config` — config CRUD via `config.rs`
- `redis_test_connection` — static PING test
- `redis_connect` / `redis_disconnect` — open/close connection
- `redis_scan_keys` — SCAN with pattern, returns `ScanResult` with type+ttl per key
- `redis_get_key_value` — GET/HGETALL/LRANGE/SMEMBERS/ZRANGE based on TYPE
- `redis_set_string` — SET key value
- `redis_delete_keys` — DEL key [key...]
- `redis_rename_key` — RENAME
- `redis_set_ttl` — EXPIRE / PERSIST (ttl=-1 means remove)
- `redis_get_server_info` — INFO command
- `redis_execute_command` — raw command execution for CLI console
- `redis_hash_set` / `redis_hash_del` — HSET / HDEL
- `redis_list_push` / `redis_list_remove` — LPUSH/RPUSH / LREM
- `redis_set_add` / `redis_set_remove` — SADD / SREM
- `redis_zset_add` / `redis_zset_remove` — ZADD / ZREM

Each command follows this pattern:
```rust
#[tauri::command]
pub async fn redis_test_connection(config: RedisConnectionConfig) -> Result<(), String> {
    RedisState::test_connection(&config).await
}

#[tauri::command]
pub async fn redis_connect(id: String, config: RedisConnectionConfig, state: State<'_, AppState>) -> Result<(), String> {
    state.redis_state.connect(&id, &config).await
}

#[tauri::command]
pub async fn redis_scan_keys(id: String, cursor: u64, pattern: String, count: u64, state: State<'_, AppState>) -> Result<ScanResult, String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    let (new_cursor, keys): (u64, Vec<String>) = redis::cmd("SCAN")
        .arg(cursor).arg("MATCH").arg(&pattern).arg("COUNT").arg(count)
        .query_async(&mut con).await.map_err(|e| e.to_string())?;
    // For each key, get TYPE and TTL
    let mut key_infos = Vec::new();
    for key in keys {
        let key_type: String = redis::cmd("TYPE").arg(&key).query_async(&mut con).await.unwrap_or_default();
        let ttl: i64 = redis::cmd("TTL").arg(&key).query_async(&mut con).await.unwrap_or(-2);
        let size: i64 = redis::cmd("MEMORY").arg("USAGE").arg(&key).query_async(&mut con).await.unwrap_or(-1);
        key_infos.push(KeyInfo { key, key_type, ttl, size });
    }
    Ok(ScanResult { cursor: new_cursor, keys: key_infos })
}

#[tauri::command]
pub async fn redis_execute_command(id: String, command: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut con = state.redis_state.get_connection(&id).await?;
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() { return Err("Empty command".into()); }
    let mut cmd = redis::cmd(parts[0]);
    for arg in &parts[1..] { cmd.arg(*arg); }
    let val: redis::Value = cmd.query_async(&mut con).await.map_err(|e| e.to_string())?;
    Ok(format_redis_value(&val))
}
```

**Step 3: Modify `src-tauri/src/lib.rs`**

Add at top:
```rust
mod redis;
```

Extend `AppState`:
```rust
pub struct AppState {
    pub db: Mutex<AppDatabase>,
    pub db_state: DbState,
    pub processes: script::ProcessMap,
    pub redis_state: redis::connection::RedisState,
}
```

In `.manage(AppState { ... })` add:
```rust
redis_state: redis::connection::RedisState::new(),
```

In `.invoke_handler(tauri::generate_handler![...])` add all `redis::commands::*` commands.

**Step 4: Commit**

```bash
git add src-tauri/
git commit -m "feat(redis): add Tauri commands and wire into AppState"
```

---

## Task 4: Frontend — Module Registration & Wiring

**Files:**
- Create: `src/modules/redis-manager/RedisManagerPanel.tsx`
- Create: `src/modules/redis-manager/RedisManager.tsx` (placeholder)
- Modify: `src/main.tsx` — import + registerPanel
- Modify: `src/components/Sidebar.tsx` — add Redis icon + module entry
- Modify: `src/App.tsx` — add Ctrl+5 shortcut
- Modify: `src/i18n/en.ts` — add `sidebar.redisManager` + initial keys
- Modify: `src/i18n/zh.ts` — same

**Step 1: Create panel wrapper**

`src/modules/redis-manager/RedisManagerPanel.tsx`:
```tsx
import type { IDockviewPanelProps } from "dockview-react";
import { RedisManager } from "./RedisManager";

export function RedisManagerPanel(_props: IDockviewPanelProps) {
  return <RedisManager />;
}
```

**Step 2: Create placeholder main component**

`src/modules/redis-manager/RedisManager.tsx`:
```tsx
export function RedisManager() {
  return <div className="p-4 text-muted-foreground">Redis Manager — coming soon</div>;
}
```

**Step 3: Register panel in `src/main.tsx`**

Add import and registration:
```typescript
import { RedisManagerPanel } from "./modules/redis-manager/RedisManagerPanel";
registerPanel({ id: "redis-manager", title: "Redis Manager", component: RedisManagerPanel });
```

**Step 4: Add to Sidebar**

In `src/components/Sidebar.tsx`, add Redis icon SVG and module entry:
```tsx
const RedisIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 2-8 4.5v11L12 22l8-4.5v-11Z"/>
    <path d="m12 22v-11"/>
    <path d="m20 6.5-8 4.5-8-4.5"/>
  </svg>
);

// Add to modules array:
{ id: "redis-manager", label: "Redis Manager", icon: RedisIcon },
```

**Step 5: Add Ctrl+5 shortcut in `src/App.tsx`**

In the keyboard handler switch, add:
```typescript
case "5": e.preventDefault(); handlePanelSelect("redis-manager"); break;
```

**Step 6: Add i18n keys**

In `en.ts` before `// === App ===`:
```typescript
// === Redis Manager ===
"sidebar.redisManager": "Redis Manager",
"redisManager.connections": "Connections",
"redisManager.newConnection": "New Connection",
"redisManager.editConnection": "Edit Connection",
"redisManager.testConnection": "Test Connection",
"redisManager.connect": "Connect",
"redisManager.disconnect": "Disconnect",
"redisManager.deleteConnection": "Delete Connection",
"redisManager.keyBrowser": "Key Browser",
"redisManager.filter": "Filter keys...",
"redisManager.loadMore": "Load More",
"redisManager.noKeys": "No keys found",
"redisManager.value": "Value",
"redisManager.type": "Type",
"redisManager.ttl": "TTL",
"redisManager.size": "Size",
"redisManager.save": "Save",
"redisManager.delete": "Delete",
"redisManager.rename": "Rename",
"redisManager.addKey": "Add Key",
"redisManager.cli": "CLI",
"redisManager.executeCommand": "Execute",
"redisManager.connectionName": "Connection Name",
"redisManager.host": "Host",
"redisManager.port": "Port",
"redisManager.password": "Password",
"redisManager.database": "Database",
"redisManager.format.text": "Text",
"redisManager.format.json": "JSON",
"redisManager.format.hex": "Hex",
"redisManager.format.binary": "Binary",
```

In `zh.ts` same keys with Chinese values.

**Step 7: Commit**

```bash
git add src/modules/redis-manager/ src/main.tsx src/components/Sidebar.tsx src/App.tsx src/i18n/
git commit -m "feat(redis): register module panel, sidebar, shortcut, i18n"
```

---

## Task 5: Frontend — Zustand Store

**Files:**
- Create: `src/modules/redis-manager/store.ts`

**Step 1: Create store**

Follow db-manager pattern: interfaces at top, `tauriCommands` object, `create<State>()`.

```typescript
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

// --- Interfaces (mirror Rust types) ---
export interface RedisConnectionConfig {
  id: string; name: string; host: string; port: number;
  password?: string; database: number;
}
export interface KeyInfo { key: string; key_type: string; ttl: number; size: number; }
export interface ScanResult { cursor: number; keys: KeyInfo[]; }
export interface RedisValue {
  type: 'String' | 'Hash' | 'List' | 'Set' | 'ZSet' | 'None';
  data: any;
}
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

// --- Tauri IPC wrappers ---
const cmd = {
  saveConfig: (config: RedisConnectionConfig) => invoke('redis_save_config', { config }),
  loadConfigs: () => invoke<RedisConnectionConfig[]>('redis_load_configs'),
  deleteConfig: (id: string) => invoke('redis_delete_config', { id }),
  testConnection: (config: RedisConnectionConfig) => invoke('redis_test_connection', { config }),
  connect: (id: string, config: RedisConnectionConfig) => invoke('redis_connect', { id, config }),
  disconnect: (id: string) => invoke('redis_disconnect', { id }),
  scanKeys: (id: string, cursor: number, pattern: string, count: number) =>
    invoke<ScanResult>('redis_scan_keys', { id, cursor, pattern, count }),
  getKeyValue: (id: string, key: string) => invoke<RedisValue>('redis_get_key_value', { id, key }),
  setString: (id: string, key: string, value: string) => invoke('redis_set_string', { id, key, value }),
  deleteKeys: (id: string, keys: string[]) => invoke('redis_delete_keys', { id, keys }),
  renameKey: (id: string, key: string, newKey: string) => invoke('redis_rename_key', { id, key, newKey }),
  setTtl: (id: string, key: string, ttl: number) => invoke('redis_set_ttl', { id, key, ttl }),
  executeCommand: (id: string, command: string) => invoke<string>('redis_execute_command', { id, command }),
  getServerInfo: (id: string) => invoke<string>('redis_get_server_info', { id }),
  hashSet: (id: string, key: string, field: string, value: string) => invoke('redis_hash_set', { id, key, field, value }),
  hashDel: (id: string, key: string, field: string) => invoke('redis_hash_del', { id, key, field }),
  listPush: (id: string, key: string, value: string, head: boolean) => invoke('redis_list_push', { id, key, value, head }),
  listRemove: (id: string, key: string, value: string, count: number) => invoke('redis_list_remove', { id, key, value, count }),
  setAdd: (id: string, key: string, member: string) => invoke('redis_set_add', { id, key, member }),
  setRemove: (id: string, key: string, member: string) => invoke('redis_set_remove', { id, key, member }),
  zsetAdd: (id: string, key: string, member: string, score: number) => invoke('redis_zset_add', { id, key, member, score }),
  zsetRemove: (id: string, key: string, member: string) => invoke('redis_zset_remove', { id, key, member }),
};

// --- Store ---
interface RedisStore {
  // Connection state
  configs: RedisConnectionConfig[];
  connectionStatus: Record<string, ConnectionStatus>;
  activeConnectionId: string | null;
  // Key browser state
  keys: KeyInfo[];
  scanCursor: number;
  scanPattern: string;
  selectedKey: string | null;
  selectedKeyValue: RedisValue | null;
  // CLI state
  cliHistory: string[];
  cliOutput: string[];
  // Actions
  loadConfigs: () => Promise<void>;
  saveConfig: (config: RedisConnectionConfig) => Promise<void>;
  deleteConfig: (id: string) => Promise<void>;
  testConnection: (config: RedisConnectionConfig) => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  scanKeys: (reset?: boolean) => Promise<void>;
  setScanPattern: (pattern: string) => void;
  selectKey: (key: string) => Promise<void>;
  executeCommand: (command: string) => Promise<void>;
}

export const useRedisStore = create<RedisStore>((set, get) => ({
  configs: [], connectionStatus: {}, activeConnectionId: null,
  keys: [], scanCursor: 0, scanPattern: '*', selectedKey: null, selectedKeyValue: null,
  cliHistory: [], cliOutput: [],

  loadConfigs: async () => {
    const configs = await cmd.loadConfigs();
    set({ configs });
  },
  saveConfig: async (config) => {
    await cmd.saveConfig(config);
    await get().loadConfigs();
  },
  deleteConfig: async (id) => {
    await cmd.deleteConfig(id);
    set(s => ({ configs: s.configs.filter(c => c.id !== id) }));
  },
  testConnection: async (config) => { await cmd.testConnection(config); },
  connect: async (id) => {
    const config = get().configs.find(c => c.id === id);
    if (!config) throw new Error('Config not found');
    set(s => ({ connectionStatus: { ...s.connectionStatus, [id]: 'connecting' } }));
    try {
      await cmd.connect(id, config);
      set(s => ({ connectionStatus: { ...s.connectionStatus, [id]: 'connected' }, activeConnectionId: id, keys: [], scanCursor: 0 }));
      await get().scanKeys(true);
    } catch (e) {
      set(s => ({ connectionStatus: { ...s.connectionStatus, [id]: 'disconnected' } }));
      throw e;
    }
  },
  disconnect: async (id) => {
    await cmd.disconnect(id);
    set(s => ({ connectionStatus: { ...s.connectionStatus, [id]: 'disconnected' },
      ...(s.activeConnectionId === id ? { activeConnectionId: null, keys: [], selectedKey: null, selectedKeyValue: null } : {}) }));
  },
  scanKeys: async (reset) => {
    const { activeConnectionId: id, scanPattern, scanCursor, keys } = get();
    if (!id) return;
    const cursor = reset ? 0 : scanCursor;
    const result = await cmd.scanKeys(id, cursor, scanPattern, 200);
    set({ keys: reset ? result.keys : [...keys, ...result.keys], scanCursor: result.cursor });
  },
  setScanPattern: (pattern) => set({ scanPattern: pattern }),
  selectKey: async (key) => {
    const id = get().activeConnectionId;
    if (!id) return;
    const value = await cmd.getKeyValue(id, key);
    set({ selectedKey: key, selectedKeyValue: value });
  },
  executeCommand: async (command) => {
    const id = get().activeConnectionId;
    if (!id) return;
    set(s => ({ cliHistory: [...s.cliHistory, command] }));
    try {
      const result = await cmd.executeCommand(id, command);
      set(s => ({ cliOutput: [...s.cliOutput, `> ${command}`, result] }));
    } catch (e: any) {
      set(s => ({ cliOutput: [...s.cliOutput, `> ${command}`, `(error) ${e}`] }));
    }
  },
}));

export { cmd as tauriCommands };
```

**Step 2: Commit**

```bash
git add src/modules/redis-manager/store.ts
git commit -m "feat(redis): add Zustand store with all IPC wrappers"
```

---

## Task 6: Frontend — Main Layout & Connection List

**Files:**
- Create: `src/modules/redis-manager/components/Layout.tsx`
- Create: `src/modules/redis-manager/components/ConnectionList.tsx`
- Create: `src/modules/redis-manager/components/ConnectionDialog.tsx`
- Modify: `src/modules/redis-manager/RedisManager.tsx` — replace placeholder

**Step 1: Create Layout re-export**

`src/modules/redis-manager/components/Layout.tsx`:
```tsx
import { ResizableLayout } from "@/components/ResizableLayout";
export { ResizableLayout as AppLayout };
```

**Step 2: Create ConnectionList**

Shows saved connections with status indicators. Connect/disconnect/edit/delete actions. "New Connection" button at top.

**Step 3: Create ConnectionDialog**

Modal form with fields: name, host, port, password, database (0-15). Test Connection button. Save/Cancel.

**Step 4: Wire RedisManager.tsx**

```tsx
import { AppLayout } from "./components/Layout";
import { ResizableSplit } from "@/components/ResizableSplit";
import { ConnectionList } from "./components/ConnectionList";
import { KeyBrowser } from "./components/KeyBrowser";
import { ValueViewer } from "./components/ValueViewer";
import { CliConsole } from "./components/CliConsole";
import { useRedisStore } from "./store";

export function RedisManager() {
  const activeConnectionId = useRedisStore(s => s.activeConnectionId);

  const sidebar = (
    <div className="h-full flex flex-col">
      <ConnectionList />
      {activeConnectionId && <KeyBrowser />}
    </div>
  );

  const main = activeConnectionId ? (
    <ResizableSplit
      top={<ValueViewer />}
      bottom={<CliConsole />}
      defaultTopRatio={0.65}
    />
  ) : (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      Select a connection to start
    </div>
  );

  return <AppLayout sidebar={sidebar} main={main} defaultSidebarWidth={260} />;
}
```

**Step 5: Commit**

```bash
git add src/modules/redis-manager/
git commit -m "feat(redis): add main layout, connection list, connection dialog"
```

---

## Task 7: Frontend — Key Browser (Tree View)

**Files:**
- Create: `src/modules/redis-manager/components/KeyBrowser.tsx`

**Step 1: Implement KeyBrowser**

- Search input with glob pattern filter
- Tree view grouping keys by `:` separator (e.g. `user:1:name` → `user` > `1` > `name`)
- Each leaf shows type icon (S/H/L/Z/Set) + TTL badge
- "Load More" button when `scanCursor !== 0`
- Click key → `selectKey(key)` in store
- Right-click context menu: Delete / Rename / Set TTL

Build tree from flat key list:
```typescript
function buildTree(keys: KeyInfo[]): TreeNode[] {
  const root: Record<string, any> = {};
  for (const k of keys) {
    const parts = k.key.split(':');
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      if (!node[parts[i]]) node[parts[i]] = i === parts.length - 1 ? k : {};
      node = node[parts[i]];
    }
  }
  // Convert to array recursively
}
```

**Step 2: Commit**

```bash
git add src/modules/redis-manager/components/KeyBrowser.tsx
git commit -m "feat(redis): add key browser with tree view and SCAN pagination"
```

---

## Task 8: Frontend — Value Viewer

**Files:**
- Create: `src/modules/redis-manager/components/ValueViewer.tsx`
- Create: `src/modules/redis-manager/components/StringViewer.tsx`
- Create: `src/modules/redis-manager/components/HashViewer.tsx`
- Create: `src/modules/redis-manager/components/ListViewer.tsx`
- Create: `src/modules/redis-manager/components/SetViewer.tsx`
- Create: `src/modules/redis-manager/components/ZSetViewer.tsx`

**Step 1: Create ValueViewer (router)**

Shows key name, type badge, TTL, and format dropdown in a toolbar. Routes to type-specific sub-viewer based on `selectedKeyValue.type`.

**Step 2: Create type-specific viewers**

- **StringViewer**: Textarea/Monaco with format dropdown (Text/JSON/Hex/Binary). Save button.
- **HashViewer**: Table with field/value columns. Add/edit/delete field buttons.
- **ListViewer**: Ordered list with index. Push (head/tail) / Remove buttons.
- **SetViewer**: Member list. Add / Remove buttons.
- **ZSetViewer**: Table with member/score columns, sortable. Add / Remove / Edit score.

All viewers use shadcn `Button`, `Input` from `@/components/ui/`.

**Step 3: Commit**

```bash
git add src/modules/redis-manager/components/
git commit -m "feat(redis): add value viewer with all 5 type-specific editors"
```

---

## Task 9: Frontend — CLI Console

**Files:**
- Create: `src/modules/redis-manager/components/CliConsole.tsx`

**Step 1: Implement CLI Console**

- Output area (scrollable, monospace, auto-scroll to bottom)
- Input with `>` prompt prefix
- Up/Down arrow for command history navigation
- Enter to execute → `executeCommand()` in store
- Results formatted with Redis-style output

**Step 2: Commit**

```bash
git add src/modules/redis-manager/components/CliConsole.tsx
git commit -m "feat(redis): add CLI console with history navigation"
```

---

## Task 10: Integration & Verification

**Step 1: Verify Rust compiles**

Run (from Windows): `cd src-tauri && cargo check`
Expected: no errors

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Manual test**

Run: `npm run tauri dev`
- Verify Redis Manager appears in sidebar with icon
- Verify Ctrl+5 opens Redis Manager panel
- Test connection dialog opens/closes
- Connect to a local Redis instance
- Browse keys, view values, use CLI

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(redis): complete Redis Manager MVP"
```
