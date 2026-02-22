# Script Runner Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the script runner module from localStorage-based toy to a file-system-backed, streaming-execution, professional script management tool.

**Architecture:** Backend (Rust) provides file operations, metadata persistence, and streaming process execution via Tauri events. Frontend (React/TypeScript) rewrites the store to be file-system-backed, adds a file tree sidebar, resizable editor/output split, args/env/working-dir configuration, and execution history.

**Tech Stack:** Rust (Tauri v2 backend), React 19, TypeScript, Zustand, Monaco Editor, Tailwind CSS v4

**Worktree:** `/mnt/d/workspace/pandora/.worktrees/script-runner` on branch `feature/script-runner-redesign`

---

### Task 1: Backend — File Operation Functions

**Files:**
- Modify: `src-tauri/src/script/mod.rs`

**Step 1: Add new types and file operation functions**

Add these types after existing types:

```rust
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ScriptMeta {
    pub scripts_dir: String,
    pub scripts: HashMap<String, ScriptConfig>,
    pub global_env: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ScriptConfig {
    pub last_args: Option<String>,
    pub working_dir: Option<String>,
    pub env: HashMap<String, String>,
    pub runtime_override: Option<String>,
}
```

Add these functions:

```rust
pub fn get_default_scripts_dir() -> String {
    let home = dirs::home_dir().unwrap_or_default();
    home.join(".pandora").join("scripts").to_string_lossy().to_string()
}

pub fn list_script_files(dir: &str) -> Result<Vec<FileEntry>, String> {
    // Recursive scan, dirs first then files, alphabetical
    // Skip hidden files and .pandora-scripts.json
}

pub fn read_script_file(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

pub fn write_script_file(path: &str, content: &str) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(path, content).map_err(|e| e.to_string())
}

pub fn create_script_file(dir: &str, name: &str) -> Result<String, String> {
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let path = std::path::Path::new(dir).join(name);
    std::fs::write(&path, "").map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

pub fn delete_script_file(path: &str) -> Result<(), String> {
    let p = std::path::Path::new(path);
    if p.is_dir() { std::fs::remove_dir(p) } else { std::fs::remove_file(p) }
        .map_err(|e| e.to_string())
}

pub fn rename_script_file(old: &str, new_path: &str) -> Result<(), String> {
    std::fs::rename(old, new_path).map_err(|e| e.to_string())
}

pub fn create_script_folder(path: &str) -> Result<(), String> {
    std::fs::create_dir_all(path).map_err(|e| e.to_string())
}

pub fn read_script_meta(dir: &str) -> Result<ScriptMeta, String> {
    let meta_path = std::path::Path::new(dir).join(".pandora-scripts.json");
    if !meta_path.exists() {
        return Ok(ScriptMeta { scripts_dir: dir.to_string(), ..Default::default() });
    }
    let content = std::fs::read_to_string(&meta_path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn write_script_meta(dir: &str, meta: &ScriptMeta) -> Result<(), String> {
    let meta_path = std::path::Path::new(dir).join(".pandora-scripts.json");
    let content = serde_json::to_string_pretty(meta).map_err(|e| e.to_string())?;
    std::fs::write(meta_path, content).map_err(|e| e.to_string())
}
```

**Step 2: Verify compilation**

Run: `cd /mnt/d/workspace/pandora/.worktrees/script-runner/src-tauri && cargo check 2>&1`
Expected: Compiles (warnings OK)

**Step 3: Commit**

```bash
cd /mnt/d/workspace/pandora/.worktrees/script-runner
git add -A && git commit -m "feat(script-runner): add file operation and metadata functions"
```

---

### Task 2: Backend — Streaming Execution

**Files:**
- Modify: `src-tauri/src/script/mod.rs`

**Step 1: Add ProcessMap type and streaming functions**

Add to script/mod.rs:

```rust
use std::sync::Arc;
use tokio::sync::Mutex as TokioMutex;
use tokio::io::{AsyncBufReadExt, BufReader};
use tauri::Emitter;

pub type ProcessMap = Arc<TokioMutex<HashMap<u32, tokio::process::Child>>>;

pub fn new_process_map() -> ProcessMap {
    Arc::new(TokioMutex::new(HashMap::new()))
}
```

Add `start_script` function:
- Resolves runtime, creates Command with piped stdout/stderr
- Sets working_dir and env vars
- Spawns process, gets PID
- Stores child (after taking stdout/stderr handles) in ProcessMap
- Spawns tokio tasks to read stdout/stderr line-by-line via BufReader
- Each line: `app.emit("script-stdout", json!({"pid": pid, "line": line}))`
- Spawns wait task: on exit emits `script-exit` with `{"pid": pid, "exit_code": code, "duration_ms": ms}`
- Returns pid

Add `kill_script` function:
- Gets child from ProcessMap by pid
- Calls `child.kill().await`
- Removes from map

**Step 2: Modify existing `execute_script` to accept env parameter**

Add `env: HashMap<String, String>` parameter. Before spawning, call `command.envs(&env)`.

**Step 3: Verify compilation**

Run: `cd /mnt/d/workspace/pandora/.worktrees/script-runner/src-tauri && cargo check 2>&1`

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(script-runner): streaming execution with process management"
```

---

### Task 3: Backend — Register Commands in lib.rs

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add ProcessMap to AppState**

```rust
pub struct AppState {
    pub db: Mutex<AppDatabase>,
    pub db_state: DbState,
    pub processes: script::ProcessMap,
}
```

Initialize in `run()`: `processes: script::new_process_map()`

**Step 2: Add all new tauri commands**

Add these commands:
- `get_scripts_dir()` → `String`
- `set_scripts_dir(path)` → validate dir exists
- `list_script_files(dir)` → `Vec<FileEntry>`
- `read_script_file(path)` → `String`
- `write_script_file(path, content)` → `()`
- `create_script_file(dir, name)` → `String`
- `delete_script_file(path)` → `()`
- `rename_script_file(old_path, new_path)` → `()`
- `create_script_folder(path)` → `()`
- `read_script_meta(dir)` → `ScriptMeta`
- `write_script_meta(dir, meta)` → `()`
- `start_script(app, state, runtime, script_path, args, working_dir, env)` → `u32`
- `kill_script(state, pid)` → `()`

**Step 3: Register in invoke_handler**

Add all new command names to the `tauri::generate_handler![]` macro.

**Step 4: Update existing `run_script` command**

Add `env: HashMap<String, String>` parameter, pass to `execute_script`.

**Step 5: Verify compilation**

Run: `cd /mnt/d/workspace/pandora/.worktrees/script-runner/src-tauri && cargo check 2>&1`

**Step 6: Commit**

```bash
git add -A && git commit -m "feat(script-runner): register all new backend commands"
```

---

### Task 4: Frontend — Store Rewrite

**Files:**
- Rewrite: `src/modules/script-runner/store.ts`

**Step 1: Rewrite store with file-system-backed state**

Key state fields:
- `scriptsDir`, `fileTree`, `activeFilePath`, `openFileContent`
- `meta` (ScriptMeta), `runtimes` (RuntimeInfo[])
- `runningProcess` (pid, stdout, stderr, scriptPath, startTime) | null
- `executionHistory` (ExecutionRecord[], max 50, persisted in localStorage)
- `searchQuery`

Key actions:
- `init()`: load scriptsDir from localStorage or default, ensure dir exists, load tree + meta + runtimes, set up Tauri event listeners
- `openFile(path)`: read file, set active
- `saveFile(path, content)`: write file
- `createFile(dir, name)`: create + reload tree + open
- `deleteFile(path)`: delete + reload tree + clear if active
- `startScript()`: resolve runtime/args/env from meta, invoke start_script
- `stopScript()`: invoke kill_script
- Event listeners: append stdout/stderr lines to runningProcess, on exit create ExecutionRecord

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(script-runner): rewrite store with file-system backend"
```

---

### Task 5: Frontend — Templates

**Files:**
- Create: `src/modules/script-runner/templates.ts`

**Step 1: Create templates file**

Export `templates` object keyed by runtime (node, python, bash, powershell), each with array of `{ label, ext, content }`.

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(script-runner): add script templates"
```

---

### Task 6: Frontend — ScriptSidebar Component

**Files:**
- Create: `src/modules/script-runner/components/ScriptSidebar.tsx`

**Step 1: Implement sidebar**

- ~208px wide, border-r, flex column
- Top: search input + new file button + new folder button
- Middle: recursive FileTree (folders expand/collapse, files open on click, active highlighted)
- Search filters tree by name
- Right-click context menu: Rename, Delete
- Bottom: scriptsDir path + gear icon to change dir
- New file: shows template picker dialog, then window.prompt for name
- New folder: window.prompt for name

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(script-runner): add file tree sidebar"
```

---

### Task 7: Frontend — ScriptToolbar Component

**Files:**
- Create: `src/modules/script-runner/components/ScriptToolbar.tsx`

**Step 1: Implement toolbar**

- Left: filename (editable input), runtime badge (auto-detected, click to override)
- Center: args input (auto-saves to meta on blur), working dir (click to change)
- Right: env vars button, run/stop button, delete button
- Keyboard: Ctrl/Cmd+Enter to run

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(script-runner): add script toolbar"
```

---

### Task 8: Frontend — OutputPanel Component

**Files:**
- Create: `src/modules/script-runner/components/OutputPanel.tsx`

**Step 1: Implement output panel**

- Tab bar: Output | History
- Output tab: shows current/last run output, monospace, stderr in red, status bar with exit code + duration
- History tab: list of past runs, click to view
- Tools: clear, copy, auto-scroll toggle
- Strip ANSI codes with regex

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(script-runner): add output panel with history"
```

---

### Task 9: Frontend — EnvVarsModal Component

**Files:**
- Create: `src/modules/script-runner/components/EnvVarsModal.tsx`

**Step 1: Implement env vars modal**

- Two tabs: Global | Script
- Key-value pair editor with add/delete rows
- Save calls store.setGlobalEnv or store.updateMeta

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(script-runner): add environment variables modal"
```

---

### Task 10: Frontend — Main ScriptRunner Rewrite

**Files:**
- Rewrite: `src/modules/script-runner/ScriptRunner.tsx`

**Step 1: Rewrite main layout**

- ScriptSidebar (left) + editor area (right)
- Editor area: ScriptToolbar (top) + Monaco Editor + drag handle + OutputPanel (bottom)
- Resizable vertical split via mousedown/mousemove/mouseup on drag handle
- Default split: 65% editor / 35% output
- Monaco: value from store, onChange debounced save, language from extension
- Empty state when no file active

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(script-runner): rewrite main layout with resizable split"
```

---

### Task 11: i18n — Add New Translation Keys

**Files:**
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/en.ts`

**Step 1: Add all new scriptRunner.* keys**

Keep existing keys, add new ones for: newFile, newFolder, search, args, workingDir, envVars, globalEnv, scriptEnv, output, history, clearOutput, copyOutput, autoScroll, stop, run, running, selectOrCreate, rename, delete, confirmDelete, changeDir, exitCode, duration, noHistory, save, cancel, addRow, template, fileName, folderName.

**Step 2: Commit**

```bash
git add -A && git commit -m "feat(script-runner): add i18n keys for redesigned UI"
```

---

### Task 12: Verify & Final Commit

**Step 1: Run cargo check**

```bash
cd /mnt/d/workspace/pandora/.worktrees/script-runner/src-tauri && cargo check 2>&1
```

**Step 2: Run TypeScript check**

```bash
cd /mnt/d/workspace/pandora/.worktrees/script-runner && npx tsc --noEmit 2>&1
```

**Step 3: Fix any errors, commit fixes**

**Step 4: Start dev server and visually verify**

```bash
cd /mnt/d/workspace/pandora/.worktrees/script-runner && npx vite --port 5174
```

Open http://localhost:5174, navigate to Script Runner panel, verify:
- File tree sidebar loads (may be empty on first run)
- Can create new file from template
- Editor loads file content
- Can run script and see streaming output
- Args, env vars, working dir work
- History tab shows past runs
- Resizable split works
- Light/dark theme works
