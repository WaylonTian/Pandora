---
inclusion: auto
name: tauri-commands
description: Tauri IPC command reference. Use when creating, modifying, or debugging invoke() calls between frontend and Rust backend.
---
# Tauri Command Reference

## API Tester Commands (storage/)
| Command | Args | Returns |
|---------|------|---------|
| `get_collections` | — | `Vec<Collection>` |
| `create_collection` | `name, parent_id?` | `i64` |
| `delete_collection` | `id` | `()` |
| `rename_collection` | `id, name` | `()` |
| `get_requests` | `collection_id?` | `Vec<ApiRequest>` |
| `save_request` | `request: ApiRequest` | `i64` |
| `delete_request` | `id` | `()` |
| `get_environments` | — | `Vec<Environment>` |
| `create_environment` | `name` | `i64` |
| `set_active_environment` | `id` | `()` |
| `delete_environment` | `id` | `()` |
| `get_variables` | `environment_id` | `Vec<Variable>` |
| `save_variable` | `variable` | `()` |
| `delete_variable` | `id` | `()` |
| `get_history` | — | `Vec<HistoryItem>` |
| `clear_history` | — | `()` |
| `get_cookies` | `domain` | `Vec<Cookie>` |
| `set_cookie` | `cookie` | `()` |
| `delete_cookie` | `id` | `()` |
| `clear_domain_cookies` | `domain` | `()` |
| `send_http_request` | `method, url, headers, body` | `HttpResponse` |

## DB Manager Commands (db/)
| Command | Args | Returns |
|---------|------|---------|
| `create_connection` | `config: ConnectionConfig` | `String` |
| `test_connection` | `config: ConnectionConfig` | `()` |
| `connect` | `connection_id` | `()` |
| `disconnect` | `connection_id` | `()` |
| `execute_query` | `connection_id, sql` | `Vec<QueryResult>` |
| `execute_batch` | `connection_id, statements` | `Vec<QueryResult>` |
| `list_databases` | `connection_id` | `Vec<String>` |
| `list_tables` | `connection_id, database?` | `Vec<String>` |
| `get_table_info` | `connection_id, table, database?` | `TableInfo` |
| `get_table_ddl` | `connection_id, table, database?` | `String` |
| `get_table_stats` | `connection_id, table, database?` | `TableStats` |
| `batch_import` | `connection_id, table, columns, rows` | `usize` |
| `explain_query` | `connection_id, sql` | `ExplainResult` |
| `save_connection_config` / `load_connection_configs` / `delete_connection_config` | config CRUD |
| `save_favorite` / `load_favorites` / `delete_favorite` | favorites CRUD |

## Plugin Commands (plugin/) — 55+ commands
**Core**: `plugin_list`, `plugin_get`, `plugin_uninstall`, `plugin_toggle`, `plugin_install_from_market`, `plugin_install_from_file`
**DB**: `plugin_db_put`, `plugin_db_get`, `plugin_db_remove`, `plugin_db_all`, `plugin_db_put_attachment`, `plugin_db_get_attachment`
**Marketplace**: `marketplace_search`, `marketplace_topic`, `marketplace_detail`
**System**: `plugin_get_path`, `plugin_shell_show_item`, `plugin_show_open_dialog`, `plugin_show_save_dialog`, `plugin_screen_capture`, `plugin_shell_trash_item`, `plugin_shell_beep`, `plugin_read_file`, `plugin_write_shim`, `plugin_server_port`
**Input**: `plugin_simulate_keyboard_tap`, `plugin_simulate_mouse_move/click/double_click/right_click`
**Screen**: `plugin_get_primary_display`, `plugin_get_all_displays`, `plugin_get_cursor_screen_point`, `plugin_screen_color_pick`
**Sharp**: `sharp_metadata/resize/rotate/flip/crop/blur/grayscale/to_format/to_base64`
**FFmpeg**: `ffmpeg_is_available`, `ffmpeg_run`, `ffmpeg_probe`

## Script Runner Commands
| Command | Args | Returns |
|---------|------|---------|
| `list_script_files` | — | `Vec<FileEntry>` |
| `create_script_file` | `name, content` | `()` |
| `read_script_file` / `write_script_file` | `path` / `path, content` | `String` / `()` |
| `delete_script_file` / `rename_script_file` | path ops | `()` |
| `run_script` | `path, runtime, env_vars?` | `ScriptOutput` |
| `start_script` | `path, runtime, env_vars?` | `String` (pid) |
| `kill_script` | `pid` | `()` |
| `list_runtimes` | — | `Vec<RuntimeInfo>` |

## System Commands
`get_local_ips` → `Vec<IpInfo>`, `get_public_ip` → `String`, `read_hosts_file` → `String`, `write_hosts_file(content)` → `()`
