# Interfaces & APIs

## Tauri IPC Commands

All frontend↔backend communication uses `invoke()` from `@tauri-apps/api/core`. Commands are registered in `lib.rs` via `#[tauri::command]` and exposed through `tauri::Builder::invoke_handler`.

### API Tester Commands (storage/)

| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `get_collections` | — | `Vec<Collection>` | List all collections |
| `create_collection` | `name, parent_id?` | `i64` | Create collection (nested) |
| `delete_collection` | `id` | `()` | Delete collection + children |
| `rename_collection` | `id, name` | `()` | Rename collection |
| `get_requests` | `collection_id?` | `Vec<ApiRequest>` | List requests in collection |
| `save_request` | `request: ApiRequest` | `i64` | Create/update request |
| `delete_request` | `id` | `()` | Delete request |
| `get_environments` | — | `Vec<Environment>` | List environments |
| `create_environment` | `name` | `i64` | Create environment |
| `set_active_environment` | `id` | `()` | Set active environment |
| `delete_environment` | `id` | `()` | Delete environment |
| `get_variables` | `environment_id` | `Vec<Variable>` | List variables |
| `save_variable` | `variable: Variable` | `()` | Save variable |
| `delete_variable` | `id` | `()` | Delete variable |
| `get_history` | — | `Vec<HistoryItem>` | Get request history |
| `clear_history` | — | `()` | Clear all history |
| `get_cookies` | `domain` | `Vec<Cookie>` | Get cookies for domain |
| `set_cookie` | `cookie: Cookie` | `()` | Set cookie |
| `delete_cookie` | `id` | `()` | Delete cookie |
| `clear_domain_cookies` | `domain` | `()` | Clear domain cookies |
| `send_http_request` | `method, url, headers, body` | `HttpResponse` | Execute HTTP request |

### DB Manager Commands (db/)

| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `create_connection` | `config: ConnectionConfig` | `String` | Register connection |
| `test_connection` | `config: ConnectionConfig` | `()` | Test connectivity |
| `connect` | `connection_id` | `()` | Open connection |
| `disconnect` | `connection_id` | `()` | Close connection |
| `execute_query` | `connection_id, sql` | `Vec<QueryResult>` | Execute SQL |
| `execute_batch` | `connection_id, statements` | `Vec<QueryResult>` | Batch execute |
| `list_databases` | `connection_id` | `Vec<String>` | List databases |
| `list_tables` | `connection_id, database?` | `Vec<String>` | List tables |
| `get_table_info` | `connection_id, table, database?` | `TableInfo` | Table metadata |
| `get_table_ddl` | `connection_id, table, database?` | `String` | Table DDL |
| `get_table_stats` | `connection_id, table, database?` | `TableStats` | Table statistics |
| `batch_import` | `connection_id, table, columns, rows` | `usize` | Bulk import |
| `explain_query` | `connection_id, sql` | `ExplainResult` | Query plan |
| `analyze_explain_plan` | `plan: ExplainResult` | `Vec<String>` | Plan analysis |
| `save_connection_config` | `config` | `()` | Persist config |
| `load_connection_configs` | — | `Vec<ConnectionConfig>` | Load configs |
| `delete_connection_config` | `id` | `()` | Delete config |
| `save_favorite` | `item: FavoriteItem` | `()` | Save favorite |
| `load_favorites` | — | `Vec<FavoriteItem>` | Load favorites |
| `delete_favorite` | `id` | `()` | Delete favorite |

### Plugin Commands (plugin/) — 55+ commands

**Core Plugin Management**:
`plugin_list`, `plugin_get`, `plugin_uninstall`, `plugin_toggle`, `plugin_install_from_market`, `plugin_install_from_file`

**Plugin Database**:
`plugin_db_put`, `plugin_db_get`, `plugin_db_remove`, `plugin_db_all`, `plugin_db_put_attachment`, `plugin_db_get_attachment`

**Marketplace**:
`marketplace_search`, `marketplace_topic`, `marketplace_detail`

**System APIs** (uTools compatibility):
`plugin_get_path`, `plugin_shell_show_item`, `plugin_show_open_dialog`, `plugin_show_save_dialog`, `plugin_screen_capture`, `plugin_shell_trash_item`, `plugin_shell_beep`, `plugin_get_native_id`, `plugin_get_app_name`, `plugin_is_dev`, `plugin_get_file_icon`, `plugin_get_copyed_files`, `plugin_paste_file`, `plugin_paste_image`, `plugin_read_file`, `plugin_write_shim`, `plugin_server_port`

**Input Simulation**:
`plugin_simulate_keyboard_tap`, `plugin_simulate_mouse_move`, `plugin_simulate_mouse_click`, `plugin_simulate_mouse_double_click`, `plugin_simulate_mouse_right_click`

**Screen/Display**:
`plugin_get_primary_display`, `plugin_get_all_displays`, `plugin_get_cursor_screen_point`, `plugin_screen_color_pick`, `plugin_get_display_nearest_point`, `plugin_screen_to_dip_point`, `plugin_dip_to_screen_point`

**Image Processing (sharp)**:
`sharp_metadata`, `sharp_resize`, `sharp_rotate`, `sharp_flip`, `sharp_crop`, `sharp_blur`, `sharp_grayscale`, `sharp_to_format`, `sharp_to_base64`

**FFmpeg**: `ffmpeg_is_available`, `ffmpeg_run`, `ffmpeg_probe`

**UBrowser**: `ubrowser_run`

### Script Runner Commands

| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `list_script_files` | — | `Vec<FileEntry>` | List script files |
| `create_script_file` | `name, content` | `()` | Create script |
| `delete_script_file` | `path` | `()` | Delete script |
| `rename_script_file` | `old, new` | `()` | Rename script |
| `read_script_file` | `path` | `String` | Read content |
| `write_script_file` | `path, content` | `()` | Write content |
| `create_script_folder` | `name` | `()` | Create folder |
| `read_script_meta` | `path` | `ScriptMeta` | Read metadata |
| `write_script_meta` | `path, meta` | `()` | Write metadata |
| `run_script` | `path, runtime, env_vars?` | `ScriptOutput` | Execute script |
| `list_runtimes` | — | `Vec<RuntimeInfo>` | Detect runtimes |
| `start_script` | `path, runtime, env_vars?` | `String` | Start streaming |
| `kill_script` | `pid` | `()` | Kill process |

### System Commands

| Command | Args | Returns | Description |
|---------|------|---------|-------------|
| `get_local_ips` | — | `Vec<IpInfo>` | Local network IPs |
| `get_public_ip` | — | `String` | Public IP |
| `read_hosts_file` | — | `String` | Read hosts file |
| `write_hosts_file` | `content` | `()` | Write hosts file |

## Frontend Interfaces

### Plugin System Interface

```typescript
interface ToolPlugin {
  id: string;
  name: string;        // i18n key
  icon: string;
  category: "encoding" | "crypto" | "network" | "text" | "other";
  component: ComponentType;
}

// Registration API
registerTool(tool: ToolPlugin): void
getTools(): ToolPlugin[]
getToolsByCategory(): Map<string, ToolPlugin[]>
```

### Panel Registration Interface

```typescript
interface PanelDefinition {
  id: string;
  title: string;
  component: ComponentType<IDockviewPanelProps>;
}

registerPanel(def: PanelDefinition): void
getPanel(id: string): PanelDefinition | undefined
getAllPanels(): PanelDefinition[]
```

### Template Engine

```typescript
// Resolves {{variable}} placeholders
resolveTemplate(text: string, variables: Record<string, string>): string
resolveHeaders(headers: Record<string, string>, variables: Record<string, string>): Record<string, string>
```

### Plugin Bridge (postMessage Protocol)

```
Frontend (iframe) → Parent:
  { type: "utools-ready", pluginId }
  { type: "utools-resize", pluginId, height }
  { type: "utools-call", pluginId, id, method, args }

Parent → Frontend (iframe):
  { type: "utools-response", id, result?, error? }
```

Methods routed: `db.put`, `db.get`, `db.remove`, `db.bulkDocs`, `db.allDocs`, `db.postAttachment`, `db.getAttachment`, `getPath`, `shellShowItemInFolder`, `showOpenDialog`, `showSaveDialog`, `screenCapture`, `shellTrashItem`, `shellBeep`, `getNativeId`, `getAppName`, `isDev`, `getFileIcon`, `getCopyedFiles`, `pasteFile`, `pasteImage`, `readFile`, `simulateKeyboardTap`, `simulateMouseMove`, `simulateMouseClick`, `getPrimaryDisplay`, `getAllDisplays`, `getCursorScreenPoint`, `screenColorPick`, etc.
