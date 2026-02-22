# Script Runner Redesign

## Overview
Full redesign of the script runner module. Replace localStorage-based script storage with real filesystem-backed scripts, add streaming execution, and significantly improve the UI.

## Storage Model

### File-based Scripts
- Default directory: `~/.pandora/scripts/` (auto-created on first use)
- Scripts stored as real files with proper extensions (.js, .py, .sh, .ps1)
- Subdirectories = folders in the UI file tree
- Metadata file `.pandora-scripts.json` at scripts dir root stores per-script config:
  ```json
  {
    "scriptsDir": "~/.pandora/scripts",
    "scripts": {
      "my-script.js": {
        "lastArgs": "--port 3000",
        "workingDir": "/home/user/project",
        "env": { "NODE_ENV": "development" },
        "runtimeOverride": null
      }
    },
    "globalEnv": { "DEBUG": "1" }
  }
  ```
- Runtime inferred from extension by default, can be overridden per-script
- Scripts dir configurable via settings (folder picker dialog)

### Migration
- On first load, migrate existing localStorage scripts to files in default dir
- Remove localStorage data after successful migration

## Backend Changes (Rust)

### New Commands
| Command | Params | Returns | Description |
|---------|--------|---------|-------------|
| `get_scripts_dir` | — | `String` | Get current scripts directory |
| `set_scripts_dir` | `path: String` | `()` | Set scripts directory |
| `list_script_files` | `dir: String` | `Vec<FileEntry>` | Recursive dir scan |
| `read_script_file` | `path: String` | `String` | Read file content |
| `write_script_file` | `path: String, content: String` | `()` | Save file |
| `create_script_file` | `dir: String, name: String` | `String` | Create file, return path |
| `delete_script_file` | `path: String` | `()` | Delete file |
| `rename_script_file` | `old: String, new: String` | `()` | Rename/move file |
| `create_script_folder` | `path: String` | `()` | Create subdirectory |
| `read_script_meta` | `dir: String` | `ScriptMeta` | Read .pandora-scripts.json |
| `write_script_meta` | `dir: String, meta: ScriptMeta` | `()` | Write .pandora-scripts.json |

### Modified Commands
| Command | Change |
|---------|--------|
| `run_script` → `start_script` | Returns `pid: u32`. Spawns process, streams stdout/stderr via Tauri events |
| `kill_script` (new) | `pid: u32`. Sends SIGTERM, force kill after 5s |

### Types
```rust
struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    extension: Option<String>,
    children: Option<Vec<FileEntry>>,  // populated if is_dir
}

struct ScriptMeta {
    scripts_dir: String,
    scripts: HashMap<String, ScriptConfig>,
    global_env: HashMap<String, String>,
}

struct ScriptConfig {
    last_args: Option<String>,
    working_dir: Option<String>,
    env: HashMap<String, String>,
    runtime_override: Option<String>,
}
```

### Streaming Execution
- `start_script` spawns child process, stores PID in `AppState`
- Spawns tokio tasks to read stdout/stderr line-by-line
- Emits `script-stdout`, `script-stderr` events with `{ pid, line }` payload
- Emits `script-exit` event with `{ pid, exit_code, duration_ms }` on completion
- `kill_script` sends SIGTERM (SIGKILL on Windows), waits 5s, then force kills
- `run_script` env param: merge global_env + script env + system env

## Frontend Changes

### Store Rewrite (`store.ts`)
- Remove localStorage-based script storage
- State: `scriptsDir`, `fileTree`, `activeFilePath`, `openFiles`, `meta`, `runningProcesses`, `executionHistory`
- Actions: `loadFileTree()`, `openFile(path)`, `saveFile(path, content)`, `createFile(dir, name)`, `deleteFile(path)`, `renameFile(old, new)`, `createFolder(path)`, `updateMeta(path, config)`, `startScript(path)`, `stopScript(pid)`, `setScriptsDir(path)`
- Listen to Tauri events for streaming output
- Execution history: last 50 runs, persisted in meta

### Component Structure
```
ScriptRunner.tsx (main layout)
├── ScriptSidebar.tsx
│   ├── Search input
│   ├── FileTree.tsx (recursive, with folder expand/collapse)
│   └── Footer: dir path + settings gear
├── ScriptToolbar.tsx
│   ├── Left: filename (editable), runtime badge
│   ├── Center: args input, working dir display
│   └── Right: env button, run/stop button, delete
├── ScriptEditor.tsx (Monaco wrapper)
└── OutputPanel.tsx
    ├── Tab bar: Output | History
    ├── OutputView.tsx (ANSI color support, auto-scroll)
    └── HistoryView.tsx (list of past runs)
```

### UI Details

**Sidebar (left, ~200px)**
- Top: search input + "New File" button + "New Folder" button
- File tree with indentation, folder collapse/expand arrows
- File icons colored by language (JS=yellow, PY=blue, SH=green, PS1=blue)
- Right-click context menu: Rename, Delete, Open in File Manager, Copy Path
- Bottom: current dir path (truncated), gear icon to change dir

**Toolbar (top bar of editor area)**
- Script name: inline editable text
- Runtime: small badge auto-detected from extension, clickable to override
- Args input: text field, placeholder "Arguments...", auto-saves per script
- Working dir: shows path, click to change via folder picker
- Env vars button: opens modal with key-value editor (global + script-level tabs)
- Run/Stop button: green "▶ Run" / red "■ Stop"
- Delete button: icon only, with confirmation

**Editor/Output Split**
- Vertical split with draggable divider
- Default ratio: 65% editor / 35% output
- Double-click divider to toggle output maximize/restore

**Output Panel**
- Tab: "Output" (current/last run) | "History" (past runs list)
- Output view: monospace, ANSI color rendering, auto-scroll (toggleable)
- Top-right tools: Clear, Copy All, Search toggle, Auto-scroll toggle
- Status bar: exit code badge (green/red), duration, timestamp
- History view: table with columns: Script, Time, Exit Code, Duration. Click to view output.

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Enter` | Run script |
| `Ctrl/Cmd + Shift + K` | Clear output |
| `Ctrl/Cmd + Shift + C` | Stop running script |
| `Ctrl/Cmd + N` | New script file |

### Templates
On new file creation, offer template selection:
- **Blank** (default)
- **Node.js**: HTTP request, file processing, JSON manipulation
- **Python**: HTTP request, file processing, data parsing
- **Bash**: File operations, system info
- **PowerShell**: System admin, file operations

Templates are hardcoded strings in a `templates.ts` file, not user-customizable.

## Implementation Order

### Phase 1: Backend Foundation
1. New file operation commands (list/read/write/create/delete/rename)
2. Script metadata read/write commands
3. Scripts dir get/set with default dir creation
4. Register all new commands in lib.rs

### Phase 2: Streaming Execution
5. Refactor `run_script` → `start_script` with PID tracking
6. Implement stdout/stderr streaming via Tauri events
7. Implement `kill_script` command
8. Add env vars parameter to execution

### Phase 3: Frontend Store
9. Rewrite store.ts with file-based model
10. Add Tauri event listeners for streaming output
11. Migrate from localStorage on first load

### Phase 4: Frontend UI
12. ScriptSidebar with FileTree component
13. ScriptToolbar with args, working dir, env vars
14. OutputPanel with resizable split, ANSI rendering, tabs
15. HistoryView component
16. Context menus and keyboard shortcuts

### Phase 5: Polish
17. Templates for new file creation
18. File icons by language
19. Settings for scripts directory
20. i18n for all new strings
