# Pandora — Project Structure

```
├── src/                        # Frontend (React + TypeScript)
│   ├── App.tsx                 # Root: Sidebar + DockviewReact layout
│   ├── main.tsx                # Entry: panel registration, tool registration, React mount
│   ├── index.css               # Global styles, CSS variables (light/dark), Tailwind
│   ├── components/             # Shared components
│   │   ├── ui/                 # shadcn/ui primitives (Button, Input, etc.)
│   │   ├── Sidebar.tsx         # Left nav with module icons + theme toggle
│   │   └── Resizable*.tsx      # Resizable split pane utilities
│   ├── stores/                 # Shared Zustand stores (layout, theme)
│   ├── i18n/                   # Internationalization (en.ts, zh.ts, store.ts)
│   ├── layouts/                # Panel registry (panels.ts)
│   ├── lib/                    # Shared utilities (cn() helper)
│   └── modules/                # Feature modules (each self-contained)
│       ├── api-tester/         # HTTP API testing
│       ├── db-manager/         # Database management
│       ├── script-runner/      # Script execution
│       └── toolkit/            # Utility tools + plugin system
│
├── src-tauri/                  # Backend (Rust + Tauri 2)
│   ├── src/
│   │   ├── lib.rs              # AppState, all #[tauri::command] fns, invoke_handler registration
│   │   ├── main.rs             # Entry point
│   │   ├── http/               # HTTP client (reqwest)
│   │   ├── db/                 # DB connections (SQLite/MySQL/PostgreSQL), query engine
│   │   ├── script/             # Script execution, runtime detection, process management
│   │   ├── storage/            # Local SQLite app database (collections, requests, etc.)
│   │   ├── system/             # System utilities (IP, hosts file)
│   │   └── plugin/             # Plugin system (marketplace, sandbox, utools shim, node bridge)
│   ├── Cargo.toml
│   └── tauri.conf.json
│
└── .worktrees/                 # Git worktrees for isolated feature development
```

## Module Convention
Each module in `src/modules/{name}/` follows this structure:
- `{Name}Panel.tsx` — Thin dockview wrapper (receives `IDockviewPanelProps`, renders main component)
- `{Name}.tsx` — Main component with all business logic
- `store.ts` or `stores/` — Zustand state
- `components/` — Sub-components
- `styles/`, `utils/`, `hooks/` — Optional supporting directories

## Adding a New Module (checklist)
1. `main.tsx` — `registerPanel({ id, title, component })`
2. `Sidebar.tsx` — Add to `modules` array with inline SVG icon
3. `App.tsx` — Add keyboard shortcut in `useEffect`
4. `src/i18n/en.ts` + `zh.ts` — Add all user-facing strings

## Tauri Command Registration
New Rust commands must be:
1. Defined with `#[tauri::command]`
2. Added to `invoke_handler` in `lib.rs`
3. Called from frontend via `safeInvoke` (with browser fallback) or direct `invoke` (Tauri-only features)
