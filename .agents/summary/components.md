# Components

## Frontend Modules

### 1. API Tester (`src/modules/api-tester/`)

Full-featured HTTP client (Postman-style). The largest frontend module.

**Main**: `ApiTester.tsx` (819 LOC) — Monolithic component handling request building, response display, collections sidebar, environment management.

**Components** (17 files):
- `CollectionTree.tsx` — Recursive tree with 3-level nesting, drag context menu
- `EnvironmentManager.tsx` — CRUD for environments with active toggle
- `EnvironmentEditor.tsx` — Key-value variable editor per environment
- `KeyValueEditor.tsx` — Reusable KV table (headers, params, form-data)
- `BodyEditor.tsx` — Request body with Monaco (JSON/XML/text/form-data)
- `ScriptEditor.tsx` — Pre-request / post-response script editor
- `ImportApiModal.tsx` — OpenAPI/Swagger import (JSON + YAML, URL fetch)
- `ImportCurlModal.tsx` — cURL command parser
- `CookieManager.tsx` — Domain-based cookie CRUD
- `CollectionRunner.tsx` — Batch run all requests in a collection
- `WebSocketPanel.tsx` — WebSocket connection testing
- `TimingChart.tsx` — Response timing visualization
- `DiffViewer.tsx` — Response diff comparison
- `JsonTreeView.tsx` — Collapsible JSON tree renderer
- `CodeGenModal.tsx` — Code generation (cURL, JS, Python, Go, Rust, Java, PHP)
- `ToolsPanel.tsx` — Utility tools (Base64, URL encode, UUID, hash, JWT, timestamp)
- `SettingsModal.tsx` — API tester preferences
- `Icons.tsx` — SVG icon components

**Utils** (6 files):
- `openapi.ts` — OpenAPI/Swagger parser with `$ref` resolution, YAML support, example generation
- `scripting.ts` — Pre/post script execution with `pm.*` API (test, expect, environment, request, response)
- `template.ts` — `{{variable}}` template resolution for URLs and headers
- `codegen.ts` — Multi-language code generation from request definitions
- `diff.ts` — Text and JSON diff algorithms (LCS-based)
- `tools.ts` — Utility functions (Base64, URL encode, UUID, hash, JWT parse, timestamp)

**Stores** (3 files):
- `store.ts` — Main store: collections, requests, environments, variables, history, cookies (Tauri-backed)
- `stores/tabs.ts` — Tab management (open requests as tabs)
- `stores/settings.ts` — UI preferences (sidebar width, response view mode)

### 2. DB Manager (`src/modules/db-manager/`)

Multi-database management tool supporting MySQL, PostgreSQL, and SQLite.

**Main**: `DbManager.tsx` (515 LOC) — Layout with database tree sidebar, tab-based content area.

**Components** (20 files):
- `DatabaseTree.tsx` — Connection/database/table tree with context menus
- `ConnectionDialog.tsx` — Connection config form (MySQL/PG/SQLite)
- `SqlEditor.tsx` — Monaco-based SQL editor with completion, formatting, explain
- `QueryResult.tsx` — Result grid with sorting, export (CSV/JSON)
- `DataBrowser.tsx` — Table data viewer with pagination, filtering, inline editing
- `TableDesigner.tsx` — Visual table/column designer with DDL preview
- `TableStructure.tsx` — Column/index/FK metadata viewer
- `TableMetaPanel.tsx` — Table metadata summary
- `TabBar.tsx` — Tab management with context menu, dropdown overflow
- `DataImport.tsx` — CSV/JSON import wizard
- `DataGenerator.tsx` — Fake data generation per column rules
- `DataMasking.tsx` — PII masking rules (email, phone, name, etc.)
- `QueryHistory.tsx` — Searchable query history with replay
- `QueryDiff.tsx` — Row-level diff comparison
- `ExplainPanel.tsx` — Query execution plan visualization
- `SlowQueryLog.tsx` — Slow query detection and logging
- `ERDiagram.tsx` — Entity-relationship diagram (canvas-based)
- `TableSpaceAnalyzer.tsx` — Table size analysis
- `CodeGenerator.tsx` — ORM code generation (TypeScript, Rust, Python, Go)
- `Favorites.tsx` — Saved queries and tables
- `ConfirmDialog.tsx` — Reusable confirmation dialog with hook
- `ErrorBoundary.tsx` — React error boundary with recovery UI
- `LoadingOverlay.tsx` — Loading states with hook
- `Layout.tsx` — Re-exports ResizableLayout (legacy)

**Hooks** (2 files):
- `useTheme.ts` — Theme detection and application (system/dark/light)
- `useAppState.ts` — Persistent app state (tabs, sidebar width, debounced save)

**Store**: `store/index.ts` (1094 LOC) — Zustand store managing connections, queries, results, tabs, schema operations.

**Lib**: `lib/sqlCompletion.ts` — Monaco SQL completion provider (table/column suggestions).

### 3. Toolkit (`src/modules/toolkit/`)

Developer utility tools + uTools-compatible plugin runtime.

**Main**: `ToolkitLayout.tsx` (134 LOC) — Grid layout with tool sidebar, built-in tools + installed plugins.

**Built-in Tools** (12 files in `tools/`):
- `json-tool.tsx` — JSON formatter/minifier
- `timestamp-tool.tsx` — Unix timestamp ↔ date converter
- `regex-tool.tsx` — Regex tester with match highlighting
- `base64-tool.tsx` — Base64 encode/decode
- `url-codec-tool.tsx` — URL encode/decode
- `base-converter-tool.tsx` — Number base converter (bin/oct/dec/hex)
- `uuid-tool.tsx` — UUID v4 generator
- `color-tool.tsx` — Color picker (HEX/RGB/HSL converter)
- `crypto-tool.tsx` — Hash generator (MD5, SHA-1/256/512)
- `jwt-tool.tsx` — JWT decoder
- `ip-info-tool.tsx` — Local/public IP display
- `hosts-editor-tool.tsx` — System hosts file editor

**Plugin Runtime** (`plugin-runtime/`):
- `PluginContainer.tsx` — iframe sandbox for running uTools plugins
- `bridge.ts` — postMessage bridge routing calls to Tauri backend
- `utools-shim.ts` — Injected JS providing `window.utools.*` API
- `node-shim.ts` — Node.js module shims (fs, path, os, crypto)
- `types.ts` — Plugin manifest and marketplace type definitions

**Components**:
- `Marketplace.tsx` — Plugin marketplace browser (scraped from u-tools.cn)
- `InstalledPlugins.tsx` — Installed plugin management
- `ToolLayout.tsx` — Shared tool wrapper with title
- `CopyButton.tsx` — Copy-to-clipboard button

**Plugin Interface**: `plugin-interface.ts` — Tool registration system (registerTool/getTools/getToolsByCategory).

**Store**: `stores/plugin-store.ts` — Marketplace data, installed plugins, cache management.

### 4. Script Runner (`src/modules/script-runner/`)

Multi-runtime script execution environment.

**Main**: `ScriptRunner.tsx` (108 LOC) — Three-panel layout: file sidebar, editor, output.

**Components**:
- `ScriptSidebar.tsx` — File tree with create/rename/delete
- `ScriptToolbar.tsx` — Runtime selector, run/stop buttons, environment variables
- `OutputPanel.tsx` — Streaming output with ANSI strip

**Store**: `store.ts` (318 LOC) — File management, runtime detection, process control, history.

**Templates**: `templates.ts` — Default script templates per language.

## Shared Components (`src/components/`)

- `Sidebar.tsx` — App-level navigation sidebar (4 module icons + theme/locale toggles)
- `ResizableLayout.tsx` — Horizontal resizable sidebar layout (extracted from DB Manager)
- `ResizableSplit.tsx` — Vertical resizable split pane
- `ui/button.tsx` — Button component (CVA variants)
- `ui/card.tsx` — Card component
- `ui/input.tsx` — Input component
- `ui/label.tsx` — Label component (Radix)

## Backend Modules

### storage/ (386 LOC)
API Tester's SQLite database. Manages: Collections (nested via parent_id), ApiRequests, Environments, Variables, HistoryItems, Cookies. Single `AppDatabase` struct with `rusqlite::Connection`.

### db/ (7,870 LOC — largest backend module)
Multi-database engine. Key types: `DatabaseType` (MySQL/PostgreSQL/SQLite), `ConnectionConfig`, `QueryResult`, `TableInfo`, `ColumnDefinition`, `DbError`. Features: connection pooling, SQL statement splitting, DDL generation, query explain, batch import, favorites, config persistence.

### plugin/ (1,597 LOC)
uTools plugin runtime backend. 55+ Tauri commands covering: plugin install/uninstall, marketplace scraping, per-plugin SQLite DB, asar extraction, local HTTP server, image processing (sharp), screen/display APIs, keyboard/mouse simulation, Node.js fs/os shims, ubrowser operations, ffmpeg integration.

### script/ (395 LOC)
Script execution engine. Runtime detection (Node.js, Python, Deno, Bun, etc.), process spawn with stdout/stderr streaming, file-based script storage with metadata.

### http/ (66 LOC)
HTTP client wrapper around reqwest. Single `send_request` function returning `HttpResponse { status, headers, body, time_ms }`.

### system/ (47 LOC)
OS utilities: local/public IP detection, hosts file read/write.
