# Pandora Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a unified developer toolbox desktop app integrating API testing, DB management, toolkit utilities, and script runner with dockview-based draggable layout.

**Architecture:** Tauri 2 desktop app with React 19 frontend. Dockview provides IntelliJ-style panel layout. Four core modules (API tester, DB manager, toolkit, script runner) are embedded as React components registered into dockview panels. Rust backend handles HTTP requests, DB connections, script execution, and system operations.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vite 7, Zustand, Tailwind CSS, shadcn/ui, dockview, Monaco Editor, reqwest, mysql_async, tokio-postgres, rusqlite

---

## Phase 1: Project Scaffolding + Dockview Layout

### Task 1: Initialize Tauri 2 + React 19 + Vite 7 project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`, `src-tauri/build.rs`

**Step 1: Create Tauri project**

```bash
cd /mnt/d/workspace/pandora
npm create tauri-app@latest . -- --template react-ts --manager npm
```

If directory not empty, init manually or clear first.

**Step 2: Update package.json**

Add dependencies:
```bash
npm install zustand dockview dockview-react @monaco-editor/react tailwindcss @tailwindcss/vite
npm install -D @types/react @types/react-dom typescript
```

**Step 3: Configure vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
```

**Step 4: Configure tauri.conf.json**

Set productName to "Pandora", identifier to "com.pandora.app", window size 1400x900, minWidth 1000, minHeight 700.

**Step 5: Verify dev server starts**

```bash
npm run tauri dev
```

Expected: Tauri window opens with default React page.

**Step 6: Commit**

```bash
git init && git add -A && git commit -m "feat: init tauri 2 + react 19 + vite 7 project"
```

---

### Task 2: Setup Tailwind CSS + shadcn/ui

**Files:**
- Create: `src/index.css` (Tailwind directives + CSS variables)
- Create: `components.json` (shadcn config)
- Create: `src/lib/utils.ts` (cn utility)

**Step 1: Setup Tailwind CSS**

Add to `src/index.css`:
```css
@import "tailwindcss";
```

**Step 2: Init shadcn/ui**

```bash
npx shadcn@latest init
```

Select: TypeScript, Default style, Slate base color, CSS variables yes, alias `@/components`.

**Step 3: Add basic shadcn components**

```bash
npx shadcn@latest add button input label
```

**Step 4: Verify styles work**

Update App.tsx with a shadcn Button, confirm it renders with correct styles.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: setup tailwind css + shadcn/ui"
```

---

### Task 3: Integrate dockview layout system

**Files:**
- Create: `src/App.tsx` (root with dockview)
- Create: `src/layouts/DockLayout.tsx` (dockview wrapper)
- Create: `src/layouts/panels.ts` (panel registry)
- Create: `src/stores/layout.ts` (layout persistence store)

**Step 1: Create panel registry**

```ts
// src/layouts/panels.ts
import { type IDockviewPanelProps } from "dockview-react";

export interface PanelDefinition {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType<IDockviewPanelProps>;
}

const registry = new Map<string, PanelDefinition>();

export function registerPanel(def: PanelDefinition) {
  registry.set(def.id, def);
}

export function getPanel(id: string) {
  return registry.get(id);
}

export function getAllPanels() {
  return Array.from(registry.values());
}
```

**Step 2: Create DockLayout wrapper**

```tsx
// src/layouts/DockLayout.tsx
import { DockviewReact, type DockviewReadyEvent, type IDockviewPanelProps } from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { getPanel, getAllPanels } from "./panels";
import { useLayoutStore } from "@/stores/layout";

function PanelRenderer(props: IDockviewPanelProps) {
  const panel = getPanel(props.params.panelId as string);
  if (!panel) return <div>Unknown panel</div>;
  const Component = panel.component;
  return <Component {...props} />;
}

const components = { default: PanelRenderer };

export function DockLayout() {
  const { saveLayout } = useLayoutStore();

  const onReady = (event: DockviewReadyEvent) => {
    const saved = useLayoutStore.getState().serializedLayout;
    if (saved) {
      try { event.api.fromJSON(saved); return; } catch { /* fallback */ }
    }
    // Default layout: add all registered panels
    const panels = getAllPanels();
    panels.forEach((p, i) => {
      event.api.addPanel({
        id: p.id,
        title: p.title,
        component: "default",
        params: { panelId: p.id },
        position: i === 0 ? undefined : { referencePanel: panels[0].id, direction: "right" },
      });
    });

    event.api.onDidLayoutChange(() => {
      saveLayout(event.api.toJSON());
    });
  };

  return (
    <DockviewReact
      className="h-screen w-screen"
      components={components}
      onReady={onReady}
    />
  );
}
```

**Step 3: Create layout store**

```ts
// src/stores/layout.ts
import { create } from "zustand";

interface LayoutState {
  serializedLayout: unknown | null;
  saveLayout: (layout: unknown) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  serializedLayout: JSON.parse(localStorage.getItem("pandora-layout") || "null"),
  saveLayout: (layout) => {
    localStorage.setItem("pandora-layout", JSON.stringify(layout));
    set({ serializedLayout: layout });
  },
}));
```

**Step 4: Wire up App.tsx**

```tsx
// src/App.tsx
import { DockLayout } from "@/layouts/DockLayout";
import "./index.css";

export default function App() {
  return <DockLayout />;
}
```

**Step 5: Add a placeholder panel to verify**

Create `src/modules/welcome/WelcomePanel.tsx` with a simple "Welcome to Pandora" message. Register it in `src/main.tsx`.

**Step 6: Verify dockview renders**

```bash
npm run tauri dev
```

Expected: Window shows dockview with Welcome panel, panel can be dragged/resized.

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: integrate dockview layout system with persistence"
```

---

## Phase 2: Rust Backend Foundation

### Task 4: Setup Rust module structure

**Files:**
- Modify: `src-tauri/Cargo.toml` (add all dependencies)
- Create: `src-tauri/src/lib.rs` (module declarations + Tauri setup)
- Create: `src-tauri/src/http/mod.rs` (HTTP client)
- Create: `src-tauri/src/db/mod.rs` (DB connection manager)
- Create: `src-tauri/src/db/mysql.rs`, `db/postgres.rs`, `db/sqlite.rs`
- Create: `src-tauri/src/script/mod.rs` (script executor)
- Create: `src-tauri/src/system/mod.rs` (hosts, IP, etc.)
- Create: `src-tauri/src/storage/mod.rs` (local SQLite for app data)

**Step 1: Update Cargo.toml**

Add dependencies from both GetMan and DBLite:
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json"] }
rusqlite = { version = "0.32", features = ["bundled"] }
mysql_async = "0.34"
tokio-postgres = "0.7"
tokio = { version = "1", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
dirs = "5"
thiserror = "1.0"
uuid = { version = "1.0", features = ["v4", "serde"] }
async-trait = "0.1"
hex = "0.4"
log = "0.4"
```

**Step 2: Create module stubs**

Each module file with a placeholder public function. `lib.rs` declares all modules and registers empty Tauri command handlers.

**Step 3: Verify compilation**

```bash
cd src-tauri && cargo check
```

Expected: Compiles without errors.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: setup rust backend module structure"
```

---

### Task 5: Migrate GetMan HTTP backend

**Files:**
- Copy & adapt: `GetMan/src-tauri/src/http.rs` → `src-tauri/src/http/mod.rs`
- Copy & adapt: `GetMan/src-tauri/src/db.rs` (the app-data SQLite part) → `src-tauri/src/storage/mod.rs`
- Modify: `src-tauri/src/lib.rs` (register HTTP commands)

**Step 1: Copy http.rs logic**

Adapt the `send_request` function from GetMan. Keep the same `HttpResponse` struct.

**Step 2: Copy app-data storage logic**

Adapt GetMan's `db.rs` for collections, requests, environments, variables, history storage. This is the app's own SQLite DB, not user DB connections.

**Step 3: Register all HTTP + storage Tauri commands**

Same commands as GetMan's lib.rs: `get_collections`, `create_collection`, `save_request`, `send_request`, `get_history`, etc.

**Step 4: Verify compilation**

```bash
cargo check
```

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: migrate getman http backend"
```

---

### Task 6: Migrate DBLite database backend

**Files:**
- Copy & adapt: `DBLite/src-tauri/src/connection.rs` → `src-tauri/src/db/connection.rs`
- Copy & adapt: `DBLite/src-tauri/src/query.rs` → `src-tauri/src/db/query.rs`
- Copy & adapt: `DBLite/src-tauri/src/schema.rs` → `src-tauri/src/db/schema.rs`
- Copy & adapt: `DBLite/src-tauri/src/types.rs` → `src-tauri/src/db/types.rs`
- Copy & adapt: `DBLite/src-tauri/src/config.rs` → `src-tauri/src/db/config.rs`
- Copy & adapt: `DBLite/src-tauri/src/sql_builder.rs` → `src-tauri/src/db/sql_builder.rs`
- Copy & adapt: `DBLite/src-tauri/src/commands.rs` → `src-tauri/src/db/commands.rs`
- Modify: `src-tauri/src/lib.rs` (register DB commands)

**Step 1: Copy all DB module files**

Adapt module paths and imports. The `AppState` from DBLite's commands.rs needs to be merged with the global AppState.

**Step 2: Register DB Tauri commands**

Add all DBLite commands: `create_connection`, `test_connection`, `connect`, `execute_query`, `list_databases`, `list_tables`, etc.

**Step 3: Verify compilation**

```bash
cargo check
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: migrate dblite database backend"
```

---

### Task 7: Add script executor backend

**Files:**
- Create: `src-tauri/src/script/mod.rs`

**Step 1: Implement script executor**

```rust
// Core: spawn child process with selected runtime, capture stdout/stderr
use std::process::Stdio;
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, BufReader};

#[derive(serde::Serialize)]
pub struct ScriptOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub duration_ms: u64,
}

pub async fn execute_script(
    runtime: &str,  // "node", "python", "bash", "powershell", etc.
    script_path: &str,
    args: Vec<String>,
    working_dir: Option<String>,
) -> Result<ScriptOutput, String> {
    // Resolve runtime command, spawn process, collect output
}
```

**Step 2: Add Tauri commands**

`run_script`, `list_runtimes` (detect installed runtimes), `kill_script`.

**Step 3: Verify compilation**

```bash
cargo check
```

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add script executor backend"
```

---

### Task 8: Add system utilities backend

**Files:**
- Create: `src-tauri/src/system/mod.rs`

**Step 1: Implement system commands**

- `get_local_ip` — get local network IPs
- `get_public_ip` — call external API (e.g. httpbin.org/ip)
- `read_hosts` — read system hosts file
- `write_hosts` — write system hosts file (with admin elevation)

**Step 2: Register Tauri commands**

**Step 3: Verify compilation + Commit**

```bash
cargo check
git add -A && git commit -m "feat: add system utilities backend"
```

---

## Phase 3: Frontend Module Migration

### Task 9: Migrate API Tester module (GetMan frontend)

**Files:**
- Create: `src/modules/api-tester/` directory
- Copy & adapt: `GetMan/src/App.tsx` → split into modular components under `src/modules/api-tester/`
- Copy & adapt: `GetMan/src/store.ts` → `src/modules/api-tester/store.ts`
- Copy & adapt: `GetMan/src/stores/tabs.ts` → `src/modules/api-tester/tabs-store.ts`
- Copy & adapt: `GetMan/src/stores/settings.ts` → `src/stores/settings.ts` (shared)
- Copy: `GetMan/src/components/*` → `src/modules/api-tester/components/`
- Copy: `GetMan/src/utils/*` → `src/modules/api-tester/utils/`
- Create: `src/modules/api-tester/ApiTesterPanel.tsx` (dockview panel wrapper)

**Step 1: Copy all GetMan frontend files**

Restructure into `src/modules/api-tester/`. Update all import paths. Replace CSS with Tailwind equivalents where possible.

**Step 2: Create ApiTesterPanel.tsx**

Wrap the main API tester component as a dockview panel:
```tsx
import { type IDockviewPanelProps } from "dockview-react";
import { ApiTester } from "./ApiTester";

export function ApiTesterPanel(_props: IDockviewPanelProps) {
  return <ApiTester />;
}
```

**Step 3: Register panel**

In `src/main.tsx`, register the API tester panel with dockview.

**Step 4: Verify API tester renders in dockview**

```bash
npm run tauri dev
```

Expected: API tester panel shows in dockview, can be dragged/resized.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: migrate api tester module from getman"
```

---

### Task 10: Migrate DB Manager module (DBLite frontend)

**Files:**
- Create: `src/modules/db-manager/` directory
- Copy & adapt: `DBLite/src/App.tsx` → `src/modules/db-manager/DbManager.tsx`
- Copy & adapt: `DBLite/src/store/index.ts` → `src/modules/db-manager/store.ts`
- Copy: `DBLite/src/components/*` → `src/modules/db-manager/components/`
- Copy: `DBLite/src/hooks/*` → `src/modules/db-manager/hooks/`
- Copy: `DBLite/src/lib/sqlCompletion.ts` → `src/modules/db-manager/lib/`
- Create: `src/modules/db-manager/DbManagerPanel.tsx` (dockview panel wrapper)

**Step 1: Copy all DBLite frontend files**

Restructure into `src/modules/db-manager/`. Update import paths. DBLite already uses Tailwind + shadcn, so less adaptation needed.

**Step 2: Move shared shadcn components**

Move `ui/button.tsx`, `ui/input.tsx`, `ui/label.tsx`, `ui/card.tsx` to `src/components/ui/` (shared).

**Step 3: Create DbManagerPanel.tsx**

Same pattern as ApiTesterPanel.

**Step 4: Register panel + verify**

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: migrate db manager module from dblite"
```

---

### Task 11: Build Toolkit module

**Files:**
- Create: `src/modules/toolkit/plugin-interface.ts`
- Create: `src/modules/toolkit/ToolkitPanel.tsx`
- Create: `src/modules/toolkit/ToolkitLayout.tsx` (tool selector + content area)
- Create: `src/modules/toolkit/tools/json-tool.tsx`
- Create: `src/modules/toolkit/tools/timestamp-tool.tsx`
- Create: `src/modules/toolkit/tools/base64-tool.tsx`
- Create: `src/modules/toolkit/tools/crypto-tool.tsx`
- Create: `src/modules/toolkit/tools/url-codec-tool.tsx`
- Create: `src/modules/toolkit/tools/ip-info-tool.tsx`
- Create: `src/modules/toolkit/tools/hosts-editor-tool.tsx`
- Create: `src/modules/toolkit/tools/uuid-tool.tsx`

**Step 1: Define plugin interface**

```ts
// src/modules/toolkit/plugin-interface.ts
export interface ToolPlugin {
  id: string;
  name: string;
  icon: string;
  category: "encoding" | "crypto" | "network" | "text" | "other";
  component: React.ComponentType;
}
```

**Step 2: Implement tools one by one**

Each tool is a self-contained React component. Start with JSON tool (format/compress/validate), then timestamp, base64, etc. Each tool: textarea input → process → textarea output pattern.

**Step 3: Create ToolkitLayout**

Left sidebar with tool list (grouped by category), right side shows selected tool.

**Step 4: Register panel + verify**

**Step 5: Commit per tool or batch**

```bash
git add -A && git commit -m "feat: add toolkit module with 8 built-in tools"
```

---

### Task 12: Build Script Runner module

**Files:**
- Create: `src/modules/script-runner/ScriptRunnerPanel.tsx`
- Create: `src/modules/script-runner/store.ts`
- Create: `src/modules/script-runner/components/ScriptList.tsx`
- Create: `src/modules/script-runner/components/ScriptEditor.tsx`
- Create: `src/modules/script-runner/components/OutputConsole.tsx`

**Step 1: Create script runner store**

Zustand store for: scripts list, active script, execution state, output history.

**Step 2: Build ScriptList component**

List of saved scripts with: name, runtime icon, last run time. Actions: add, import file, delete, run.

**Step 3: Build ScriptEditor component**

Monaco Editor for editing scripts. Runtime selector dropdown (auto-detect available runtimes from backend).

**Step 4: Build OutputConsole component**

Scrollable output area showing stdout (white) and stderr (red). Execution time and exit code display.

**Step 5: Wire up to Tauri backend**

Call `run_script` command, stream output to console.

**Step 6: Register panel + verify**

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add script runner module"
```

---

## Phase 4: Polish + Integration

### Task 13: Global navigation + panel management

**Files:**
- Create: `src/components/Sidebar.tsx` (global sidebar with module icons)
- Create: `src/components/StatusBar.tsx` (bottom status bar)
- Modify: `src/App.tsx` (add sidebar + status bar around dockview)

**Step 1: Build Sidebar**

Vertical icon bar (left edge) with icons for each module: API Tester, DB Manager, Toolkit, Script Runner. Click opens/focuses the corresponding dockview panel.

**Step 2: Build StatusBar**

Bottom bar showing: app version, active connections count, last script run status.

**Step 3: Wire up panel open/focus logic**

Sidebar click → if panel exists, focus it; if not, add it to dockview.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add global sidebar and status bar"
```

---

### Task 14: Theme system (dark/light)

**Files:**
- Modify: `src/index.css` (dark/light CSS variables)
- Create: `src/stores/theme.ts`
- Modify: `src/components/Sidebar.tsx` (add theme toggle)

**Step 1: Setup CSS variables for both themes**

Reuse DBLite's existing CSS variable system. Add dockview theme overrides.

**Step 2: Create theme store**

Persist to localStorage, default to system preference.

**Step 3: Add toggle to sidebar**

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add dark/light theme support"
```

---

### Task 15: Settings + keyboard shortcuts

**Files:**
- Create: `src/modules/settings/SettingsPanel.tsx`
- Modify: `src/stores/settings.ts` (global settings)

**Step 1: Build settings panel**

General settings: theme, language (future), default layout. Per-module settings delegated to each module.

**Step 2: Add global keyboard shortcuts**

`Ctrl+1/2/3/4` to switch modules, `Ctrl+,` for settings.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add settings panel and keyboard shortcuts"
```

---

### Task 16: Build + package

**Files:**
- Modify: `src-tauri/tauri.conf.json` (bundle config, icons)
- Create: app icons

**Step 1: Configure bundle settings**

Set category, description, icon paths.

**Step 2: Build release**

```bash
npm run tauri build
```

**Step 3: Test the built executable**

Verify all four modules work in the release build.

**Step 4: Commit + tag**

```bash
git add -A && git commit -m "feat: configure build and packaging"
git tag v0.1.0
```

---

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-3 | Project scaffolding + dockview layout |
| 2 | 4-8 | Rust backend (HTTP, DB, script, system) |
| 3 | 9-12 | Frontend modules (API, DB, toolkit, scripts) |
| 4 | 13-16 | Polish (sidebar, theme, settings, build) |

## Key Source Files Reference

**GetMan (to migrate):**
- `GetMan/src/App.tsx` — 34KB, main UI (needs splitting)
- `GetMan/src/store.ts` — 8.6KB, Zustand store
- `GetMan/src/components/` — 20 component files
- `GetMan/src-tauri/src/lib.rs` — Tauri commands
- `GetMan/src-tauri/src/http.rs` — HTTP client
- `GetMan/src-tauri/src/db.rs` — App data SQLite

**DBLite (to migrate):**
- `DBLite/src/App.tsx` — 23KB, main UI
- `DBLite/src/store/index.ts` — 31KB, Zustand store
- `DBLite/src/components/` — 30 component files
- `DBLite/src-tauri/src/` — 9 Rust files (connection, query, schema, types, config, sql_builder, commands)
