# AGENTS.md — Pandora Developer Toolbox

> Pandora is a Tauri 2 desktop app — a unified developer toolbox combining API Testing, Database Management, Utility Tools, and Script Execution in an IntelliJ-style draggable panel interface.

## Project Overview

- **Stack**: Tauri 2 (Rust backend) + React 19 + TypeScript 5.8 + Vite 7 + Tailwind CSS 4 + Zustand 5 + dockview-react 4 + Monaco Editor
- **Identifier**: `com.pandora.app`, version `0.1.0`
- **Platform**: Windows primary (Tauri builds on Windows; WSL for dev tooling)
- **Size**: ~35K LOC (11K Rust + 24K TypeScript)
- **i18n**: English + Chinese (Zustand-based, `src/i18n/`)
- **Theme**: Dark/light via HSL CSS variables (shadcn/ui compatible), dark default

## Build & Run Rules

- **⚠️ ALWAYS use Windows commands**: All compilation, running, and shell commands MUST be executed via `cmd.exe /c "..."` (Windows). Never use bare Linux commands for build/run tasks. This is a hard rule.
- **Compile and run Tauri/Rust**: Always use Windows (PowerShell/cmd). WSL lacks GTK/WebKit.
- **Frontend dev**: `npm run dev` (Vite on port 1420)
- **Full app**: `npm run tauri dev` (from Windows)
- **Build**: `tsc && vite build` → Tauri bundles
- **Path alias**: `@/` → `src/`

## Directory Structure

```
pandora/
├── src/                          # Frontend (React + TypeScript)
│   ├── main.tsx                  # Entry: registers panels + tools
│   ├── App.tsx                   # DockviewReact shell + Sidebar
│   ├── index.css                 # Tailwind + HSL theme variables
│   ├── components/               # Shared components
│   │   ├── Sidebar.tsx           # App navigation (4 modules + theme/locale)
│   │   ├── ResizableLayout.tsx   # Horizontal resizable sidebar
│   │   ├── ResizableSplit.tsx    # Vertical resizable split
│   │   └── ui/                   # Primitives (button, card, input, label)
│   ├── layouts/panels.ts         # Panel registry (registerPanel/getPanel)
│   ├── stores/                   # Global stores (theme, layout)
│   ├── i18n/                     # en.ts, zh.ts, store.ts
│   ├── lib/utils.ts              # cn() helper (clsx + tailwind-merge)
│   └── modules/
│       ├── api-tester/           # HTTP client (Postman-style)
│       │   ├── ApiTester.tsx     # Main (819 LOC)
│       │   ├── store.ts          # Collections, requests, envs, history, cookies
│       │   ├── stores/           # tabs.ts, settings.ts
│       │   ├── components/       # 17 components (CollectionTree, BodyEditor, etc.)
│       │   ├── utils/            # openapi, scripting, template, codegen, diff, tools
│       │   └── styles/
│       ├── db-manager/           # Multi-DB management (MySQL/PG/SQLite)
│       │   ├── DbManager.tsx     # Main (515 LOC)
│       │   ├── store/index.ts    # Connections, queries, results (1094 LOC)
│       │   ├── components/       # 20+ components
│       │   ├── hooks/            # useTheme, useAppState
│       │   └── lib/              # sqlCompletion.ts
│       ├── toolkit/              # Dev tools + uTools plugin runtime
│       │   ├── ToolkitLayout.tsx # Grid layout with tool sidebar
│       │   ├── plugin-interface.ts # Tool registration API
│       │   ├── register.ts       # Registers 12 built-in tools
│       │   ├── tools/            # 12 tool components
│       │   ├── plugin-runtime/   # iframe sandbox, bridge, shims
│       │   ├── stores/           # plugin-store.ts
│       │   └── components/       # Marketplace, InstalledPlugins, etc.
│       └── script-runner/        # Multi-runtime script execution
│           ├── ScriptRunner.tsx  # Three-panel layout
│           ├── store.ts          # File mgmt, runtime detection, process control
│           ├── components/       # ScriptSidebar, ScriptToolbar, OutputPanel
│           └── templates.ts
├── src-tauri/                    # Backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Tauri entry
│   │   ├── lib.rs               # AppState + all command registrations
│   │   ├── storage/mod.rs       # API Tester SQLite (collections, requests, etc.)
│   │   ├── http/mod.rs          # HTTP client (reqwest)
│   │   ├── script/mod.rs        # Process runner (runtime detection, spawn/kill)
│   │   ├── system/mod.rs        # IP info, hosts file
│   │   ├── db/                  # Multi-DB engine (7 files, ~7.8K LOC)
│   │   │   ├── types.rs         # 20+ core types (ConnectionConfig, QueryResult, etc.)
│   │   │   ├── connection.rs    # MySQL/PG/SQLite connection management
│   │   │   ├── query.rs         # SQL execution + statement splitting
│   │   │   ├── schema.rs        # DDL generation, table info, indexes
│   │   │   ├── sql_builder.rs   # SELECT/UPDATE query builders
│   │   │   ├── config.rs        # JSON file persistence
│   │   │   └── commands.rs      # Tauri command layer
│   │   └── plugin/              # uTools runtime (12 files, ~1.6K LOC)
│   │       ├── commands.rs      # 55+ Tauri commands
│   │       ├── manager.rs       # Install/uninstall/registry
│   │       ├── marketplace.rs   # Scrape u-tools.cn
│   │       ├── db.rs            # Per-plugin SQLite
│   │       ├── asar.rs          # .upxs extraction
│   │       ├── server.rs        # Local HTTP for plugin assets
│   │       ├── sharp.rs         # Image processing
│   │       ├── screen.rs        # Display/cursor/color APIs
│   │       ├── simulate.rs      # Keyboard/mouse simulation
│   │       ├── node_bridge.rs   # Node.js fs/os shims
│   │       ├── ubrowser.rs      # Headless browser ops
│   │       └── ffmpeg.rs        # FFmpeg integration
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/plans/                   # Design docs and implementation plans
├── .agents/summary/              # Generated documentation (this system)
└── .worktrees/                   # Git worktrees (gitignored)
```

## Architecture

### Two-Layer Layout System
1. **Top-level**: `dockview-react` — draggable/splittable module tabs
2. **Module-internal**: `ResizableLayout` / `ResizableSplit` — sidebars and split panes

### State Management
- Global: `useThemeStore`, `useLayoutStore`, `useI18nStore` (localStorage)
- Per-module: Zustand stores backed by Tauri IPC (SQLite/JSON/filesystem)
- No global Redux store

### Frontend↔Backend Communication
All via `invoke()` from `@tauri-apps/api/core`. Commands defined as `#[tauri::command]` in Rust, registered in `lib.rs`. Errors returned as `Result<T, String>`.

### Plugin System
- Plugins run in iframe sandbox with injected `utools-shim.ts`
- Communication via `postMessage` → `bridge.ts` → `invoke()` → Rust commands
- Per-plugin SQLite database for uTools `db.*` API compatibility
- Local HTTP server serves plugin static assets
- Marketplace data scraped from u-tools.cn

### Data Persistence
| Data | Backend | Location |
|------|---------|----------|
| API Tester (collections, requests, envs, cookies) | SQLite | `~/.pandora/pandora.db` |
| DB Manager (connections, favorites, history) | JSON files | `~/.pandora/db-manager/` |
| Plugin registry | JSON | `~/.pandora/plugins/registry.json` |
| Plugin data | Per-plugin SQLite | `~/.pandora/plugins/<id>/utools.db` |
| Scripts | Filesystem | `~/.pandora/scripts/` |
| UI state (layout, theme, locale) | localStorage | Browser |

## Module Conventions

### File Structure Pattern
```
src/modules/<name>/
├── <Name>.tsx           # Main component
├── <Name>Panel.tsx      # Thin dockview wrapper
├── store.ts             # Zustand store
├── stores/              # Additional stores (optional)
├── components/          # Sub-components
├── utils/               # Pure functions
├── hooks/               # React hooks (optional)
└── styles/              # CSS (optional)
```

### Coding Patterns
- **Components**: Functional React with hooks, no class components
- **State**: Zustand `create<T>((set, get) => ({...}))` pattern
- **Styling**: Tailwind utility classes, `cn()` for conditional merging
- **Icons**: Inline SVG components (no icon library)
- **IPC**: `invoke("command_name", { args })` with `.map_err(|e| e.to_string())` on Rust side
- **i18n**: `useT()` hook returns `t(key, params?)` function; keys in `en.ts`/`zh.ts`
- **Errors**: Rust uses `Result<T, String>` for Tauri commands; DB Manager has rich `DbError` enum internally

## Key Interfaces

### Panel Registration (main.tsx)
```typescript
registerPanel({ id: "api-tester", title: "API Tester", component: ApiTesterPanel });
```

### Tool Registration (register.ts)
```typescript
registerTool({ id: "json", name: "toolkit.jsonTool.title", icon: "{}", category: "text", component: JsonTool });
```

### Template Variables
```typescript
resolveTemplate("{{baseUrl}}/api/users", { baseUrl: "https://api.example.com" })
// → "https://api.example.com/api/users"
```

## Git Workflow

- **master**: Stable branch
- **Feature branches**: `feature/<name>` developed in `.worktrees/<name>` via git worktrees
- **Active branches**: `feature/api-tester-optimization`, `feature/toolkit-plugin-system`, `feature/script-runner-redesign`, `feature/api-tester-ui-redesign`

## Detailed Documentation

For deeper analysis, see `.agents/summary/`:
- `index.md` — Documentation navigation guide
- `architecture.md` — Full architecture with Mermaid diagrams
- `components.md` — All components with LOC and responsibilities
- `interfaces.md` — Complete Tauri command reference (100+ commands)
- `data_models.md` — All Rust structs, TS interfaces, DB schemas
- `workflows.md` — 7 key workflows as sequence diagrams
- `dependencies.md` — All 36 dependencies with purposes
- `review_notes.md` — Consistency/completeness review + recommendations
