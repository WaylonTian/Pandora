---
inclusion: fileMatch
fileMatchPattern: ["**/*.rs", "**/Cargo.toml"]
---
# Rust Backend Conventions

## Module Map
- `lib.rs` — AppState definition + all `#[tauri::command]` registrations in `invoke_handler`
- `storage/mod.rs` — API Tester SQLite (AppDatabase struct, single Connection)
- `db/` — Multi-DB engine: `types.rs` (20+ types), `connection.rs` (MySQL/PG/SQLite pools), `query.rs` (SQL exec + statement splitting), `schema.rs` (DDL + table info), `sql_builder.rs` (SELECT/UPDATE builders), `config.rs` (JSON persistence), `commands.rs` (Tauri layer)
- `plugin/` — uTools runtime: `commands.rs` (55+ commands), `manager.rs` (install/registry), `marketplace.rs` (scrape u-tools.cn), `db.rs` (per-plugin SQLite), `asar.rs` (.upxs extraction), `server.rs` (local HTTP), `sharp.rs` (image), `screen.rs` (display), `simulate.rs` (input), `node_bridge.rs` (fs/os shims), `ubrowser.rs`, `ffmpeg.rs`
- `script/mod.rs` — Runtime detection, process spawn/kill, file storage
- `http/mod.rs` — reqwest wrapper (single `send_request`)
- `system/mod.rs` — IP info, hosts file

## Patterns
- All commands: `#[tauri::command] fn name(state: State<AppState>, ...) -> Result<T, String>`
- Error conversion: `.map_err(|e| e.to_string())`
- DB Manager uses `DbError` enum internally, converted to String at command boundary
- AppDatabase uses `Mutex<Connection>` (single-threaded SQLite access)
- DB Manager connections use async drivers (mysql_async, tokio-postgres) behind `DbState`
- New commands must be added to `invoke_handler![]` macro in `lib.rs`

## Adding a New Command
1. Define `#[tauri::command]` function
2. Add to `invoke_handler![]` in `lib.rs`
3. Call from frontend: `invoke("command_name", { args })`
