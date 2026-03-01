---
inclusion: always
---
# Pandora — Architecture & Design Patterns

## Two-Layer Layout System
1. **Top-level**: `dockview-react` manages module tabs (drag, split, rearrange). Panels registered in `main.tsx` via `registerPanel()`.
2. **Module-internal**: `ResizableLayout` (horizontal sidebar) / `ResizableSplit` (vertical split) for internal layouts. NOT dockview.

## State Management
- Global: `useThemeStore` (dark/light), `useLayoutStore` (dockview serialization), `useI18nStore` (locale) — all localStorage
- Per-module: Zustand stores backed by Tauri IPC (SQLite/JSON/filesystem)
- Pattern: `create<State>((set, get) => ({...}))` — no middleware, manual persistence
- No global Redux store

## Frontend↔Backend Communication
All via `invoke()` from `@tauri-apps/api/core`:
```typescript
const result = await invoke("command_name", { arg1, arg2 });
```
Rust side: `#[tauri::command] fn cmd(state: State<AppState>, arg1: T) -> Result<R, String>`
Errors always `.map_err(|e| e.to_string())`

## AppState (lib.rs)
```rust
pub struct AppState {
    pub db: Mutex<AppDatabase>,      // API Tester SQLite
    pub db_state: DbState,           // DB Manager connection pool
    pub processes: script::ProcessMap, // Script Runner processes
}
```

## Data Persistence
| Data | Storage | Location |
|------|---------|----------|
| API collections, requests, envs, cookies, history | SQLite | `~/.pandora/pandora.db` |
| DB Manager connections, favorites, query history | JSON files | `~/.pandora/db-manager/` |
| Plugin registry | JSON | `~/.pandora/plugins/registry.json` |
| Plugin data (utools.db) | Per-plugin SQLite | `~/.pandora/plugins/<id>/utools.db` |
| Scripts | Filesystem | `~/.pandora/scripts/` |
| Dockview layout, theme, locale | localStorage | Browser |

## Plugin System
- Plugins run in **iframe sandbox** with injected `utools-shim.ts`
- Communication: iframe `postMessage` → `bridge.ts` → `invoke()` → Rust `plugin/commands.rs`
- Per-plugin SQLite for uTools `db.*` API compatibility
- Local HTTP server (`plugin/server.rs`) serves plugin static assets
- Marketplace scraped from u-tools.cn
- `.upxs` files = asar format, extracted by `plugin/asar.rs`

## Module Structure Convention
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

## Coding Patterns
- Functional React with hooks only, no class components
- Tailwind utility classes, `cn()` for conditional merging
- Inline SVG icon components (no icon library)
- i18n: `useT()` hook → `t(key, params?)`, keys in `en.ts`/`zh.ts`
- DB Manager has rich `DbError` enum; other modules use plain `String` errors
