# Script Runner Enhancement Plan

## Overview
Enhance the Script Runner module with: JSON argument input, proper New File dialog, file drag-and-drop, working directory fix, argument presets, ANSI color rendering, and sidebar quick-run.

---

## Phase 1: Working Directory Fix (Backend + Frontend)

### Task 1.1: Default working_dir to script's parent directory
File: `src-tauri/src/script/mod.rs` — `start_script()` and `execute_script()`
- When `working_dir` is `None`, compute parent dir from `script_path` and set as `current_dir`
- Same logic for both `execute_script` and `start_script`

### Task 1.2: Frontend — show effective working dir
File: `src/modules/script-runner/components/ScriptToolbar.tsx`
- When `config?.working_dir` is null, display script's parent dir (derived from `activeFilePath`) as the effective dir, styled as muted/italic to indicate "default"
- Add a "Reset" button (×) next to working dir that clears `working_dir` back to null (= use default)

---

## Phase 2: JSON Argument Input

### Task 2.1: Extend ScriptConfig with args mode
File: `src-tauri/src/script/mod.rs` — `ScriptConfig`
```rust
pub struct ScriptConfig {
    pub last_args: Option<String>,
    pub args_mode: Option<String>,      // "text" | "json" | "file" | "stdin"
    pub args_json: Option<String>,       // JSON content when mode != "text"
    pub working_dir: Option<String>,
    pub env: HashMap<String, String>,
    pub runtime_override: Option<String>,
}
```
Frontend `store.ts` `ScriptConfig` interface mirrors this.

### Task 2.2: Backend — handle JSON args modes in start_script
File: `src-tauri/src/script/mod.rs`
- New param `args_mode: Option<String>` and `args_json: Option<String>` on `start_script` / `execute_script`
- `"text"` (default): current behavior, split by whitespace
- `"json"`: pass entire JSON string as single CLI argument
- `"file"`: write JSON to temp file, pass temp file path as argument
- `"stdin"`: pipe JSON to child process stdin after spawn

### Task 2.3: Frontend — args mode switcher + JSON editor
File: `src/modules/script-runner/components/ScriptToolbar.tsx`
- Replace single args `<input>` with a mode-aware component:
  - Mode selector: dropdown/segmented control with icons for `Text | JSON | File | Stdin`
  - `text` mode: current input (unchanged)
  - `json/file/stdin` modes: click input area to open a popover/modal with Monaco Editor (language=json, height ~200px, minimap off)
- JSON editor has validation indicator (✓/✗) via Monaco markers
- Save to `args_json` + `args_mode` in meta on blur/close

### Task 2.4: Argument Presets
File: `src-tauri/src/script/mod.rs` — extend `ScriptConfig`:
```rust
pub args_presets: Option<HashMap<String, ArgsPreset>>,
```
```rust
pub struct ArgsPreset {
    pub args_mode: String,
    pub args_text: Option<String>,
    pub args_json: Option<String>,
}
```
Frontend `ScriptToolbar.tsx`:
- Preset dropdown next to args area: lists saved presets by name
- "Save as Preset" button (prompts for name, saves current args config)
- "Manage Presets" opens list with rename/delete
- Selecting a preset loads its args_mode + content into the toolbar

---

## Phase 3: New File Dialog

### Task 3.1: NewFileDialog component
New file: `src/modules/script-runner/components/NewFileDialog.tsx`
- Modal overlay (same pattern as `EnvVarsInline`)
- Fields:
  - **File name** input with auto-extension: typing "test" with Python selected → shows "test.py" preview
  - **Target directory** selector: dropdown/tree built from `fileTree`, default = scriptsDir root, supports selecting any subfolder
  - **Template** selector: grid/list of templates grouped by runtime (from `templates.ts`), with code preview on hover/select
  - **Runtime** auto-detected from extension, shown as badge
- Buttons: Create (primary), Cancel
- Keyboard: Enter to create, Escape to cancel

### Task 3.2: Replace all window.prompt/confirm calls
Files: `ScriptSidebar.tsx`, `ScriptToolbar.tsx`
- `handleNewFile` → open `NewFileDialog` instead of `window.prompt`
- `handleNewFolder` → inline input in sidebar (like VS Code: click 📁+, an input appears in the tree at current location)
- `handleRename` → inline edit in FileTreeNode (double-click or F2 triggers inline rename input)
- `handleDelete` / toolbar delete → custom confirm dialog component (small modal with message + Cancel/Delete buttons)

### Task 3.3: i18n keys
Files: `src/i18n/en.ts`, `src/i18n/zh.ts`
Add keys for: `scriptRunner.newFileDialog.title`, `.fileName`, `.targetDir`, `.template`, `.preview`, `.create`, `scriptRunner.confirmDeleteTitle`, `scriptRunner.confirmDeleteMsg`, `scriptRunner.inlineRename`, `scriptRunner.argsMode.*`, `scriptRunner.presets.*`

---

## Phase 4: File Drag & Drop

### Task 4.1: External file drop into sidebar/editor
File: `src/modules/script-runner/ScriptRunner.tsx`
- Wrap main container with `onDragOver` / `onDrop` handlers
- On drop: read `DataTransfer.files`, for each file:
  - Copy to `scriptsDir` via `invoke('write_script_file', { path: scriptsDir + '/' + file.name, content })` (read content via FileReader)
  - If file already exists, prompt to overwrite or rename
  - After copy, reload file tree and open the file
- Visual feedback: show a drop overlay ("Drop files here to import") when dragging over

### Task 4.2: Internal file tree drag to move
File: `src/modules/script-runner/components/ScriptSidebar.tsx` — `FileTreeNode`
- Add `draggable={true}` to file/folder nodes
- `onDragStart`: store dragged entry path in a ref/state
- `onDragOver` on folder nodes: highlight as drop target (add border/bg class)
- `onDrop` on folder nodes: call `store.renameFile(draggedPath, targetFolder + '/' + fileName)` to move
- Prevent dropping a folder into itself or its children
- Visual: insertion indicator line between items, folder highlight on hover

---

## Phase 5: Output & UX Enhancements

### Task 5.1: ANSI color rendering
File: `src/modules/script-runner/components/OutputPanel.tsx`
- Install `ansi-to-html` (or implement lightweight ANSI→HTML converter, ~50 lines for basic 16-color support)
- Replace `stripAnsi()` + plain text rendering with HTML rendering:
  - Convert ANSI sequences to `<span style="color:...">` segments
  - Use `dangerouslySetInnerHTML` on a container (content is from local script output, safe)
- Keep `stripAnsi` for copy-to-clipboard functionality

### Task 5.2: Sidebar right-click "Run" option
File: `src/modules/script-runner/components/ScriptSidebar.tsx` — context menu
- Add "Run" option to file context menu (not folders)
- On click: `store.openFile(path)` then `store.startScript()`
- Add "Run with Args..." option: opens file, focuses args input

### Task 5.3: Import external scripts
File: `src/modules/script-runner/components/ScriptSidebar.tsx`
- Add "Import File" button next to "New File" / "📁+"
- Uses `@tauri-apps/plugin-dialog` `open()` with file filters (`.js,.py,.sh,.ps1`)
- Reads selected file content, copies to scriptsDir, opens it

---

## Phase 6: i18n & Polish

### Task 6.1: Complete i18n coverage
Files: `src/i18n/en.ts`, `src/i18n/zh.ts`
- All new UI strings from phases 1-5
- Args mode labels: Text / JSON / File / Stdin
- Dialog titles, button labels, tooltips, placeholder text

### Task 6.2: Keyboard shortcuts
File: `src/modules/script-runner/ScriptRunner.tsx`
- `Ctrl+N` → open NewFileDialog
- `Ctrl+Shift+K` → clear output
- `Ctrl+Shift+C` → stop script (when running)

---

## Implementation Order Summary

| Phase | Tasks | Scope | Estimated Effort |
|-------|-------|-------|-----------------|
| 1 | Working dir fix | Rust + Toolbar | Small |
| 2 | JSON args + presets | Rust + Toolbar + Store | Medium |
| 3 | New File dialog + replace prompts | New component + Sidebar + Toolbar | Medium |
| 4 | Drag & drop | ScriptRunner + Sidebar | Medium |
| 5 | ANSI + quick-run + import | OutputPanel + Sidebar | Small-Medium |
| 6 | i18n + shortcuts | i18n files + ScriptRunner | Small |

## Files Changed Summary

**New files:**
- `src/modules/script-runner/components/NewFileDialog.tsx`
- `src/modules/script-runner/components/ConfirmDialog.tsx` (small reusable confirm modal)
- `src/modules/script-runner/utils/ansi.ts` (ANSI→HTML converter, if not using npm package)

**Modified files:**
- `src-tauri/src/script/mod.rs` — ScriptConfig fields, working_dir default, stdin pipe, temp file args
- `src-tauri/src/lib.rs` — update command signatures if params change
- `src/modules/script-runner/store.ts` — ScriptConfig interface, startScript args
- `src/modules/script-runner/components/ScriptToolbar.tsx` — args mode switcher, JSON editor, presets, working dir display
- `src/modules/script-runner/components/ScriptSidebar.tsx` — drag-drop, inline rename, context menu run, import, NewFileDialog integration
- `src/modules/script-runner/components/OutputPanel.tsx` — ANSI rendering
- `src/modules/script-runner/ScriptRunner.tsx` — external drop zone, keyboard shortcuts
- `src/i18n/en.ts`, `src/i18n/zh.ts` — new keys
