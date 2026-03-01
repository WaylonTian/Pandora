# System Architecture

## High-Level Architecture

Pandora is a Tauri 2 desktop app with a Rust backend and React frontend, following a modular panel-based architecture.

```mermaid
graph TB
    subgraph Frontend["Frontend (React 19 + TypeScript)"]
        Main["main.tsx — Entry Point"]
        App["App.tsx — DockviewReact Shell"]
        Sidebar["Sidebar.tsx — Navigation"]
        subgraph Modules["Feature Modules"]
            API["API Tester"]
            DB["DB Manager"]
            TK["Toolkit"]
            SR["Script Runner"]
        end
        subgraph Shared["Shared"]
            RL["ResizableLayout / ResizableSplit"]
            UI["ui/ (button, card, input, label)"]
            I18N["i18n (en/zh)"]
        end
    end
    subgraph Backend["Backend (Rust / Tauri 2)"]
        Lib["lib.rs — Command Hub"]
        subgraph RustMods["Modules"]
            Storage["storage/ — API Tester SQLite"]
            DBMod["db/ — Multi-DB Engine"]
            HTTP["http/ — HTTP Client"]
            Script["script/ — Process Runner"]
            System["system/ — OS Utilities"]
            Plugin["plugin/ — uTools Runtime"]
        end
    end
    Main --> App
    App --> Sidebar
    App --> Modules
    Modules --> Shared
    Modules -->|"invoke()"| Lib
    Lib --> RustMods
```

## Frontend Architecture

### Panel System (Two-Layer Layout)

1. **Top-level**: `dockview-react` manages module tabs (drag, split, rearrange)
2. **Module-internal**: Custom `ResizableLayout` / `ResizableSplit` for sidebars and split panes

```mermaid
graph LR
    Main["main.tsx"] -->|"registerPanel() ×4"| Registry["panels.ts"]
    App["App.tsx"] -->|queries| Registry
    App -->|renders| DV["DockviewReact"]
    DV -->|"component='default'"| PR["PanelRenderer"]
    PR -->|"getPanel(id)"| Registry
```

### State Management

Each module owns its state via Zustand stores. No global Redux-style store.

| Store | Scope | Persistence |
|-------|-------|-------------|
| `useThemeStore` | Global | localStorage `pandora-theme` |
| `useLayoutStore` | Global | localStorage `pandora-layout` |
| `useI18nStore` | Global | localStorage `pandora-locale` |
| `api-tester/store.ts` | Module | Tauri backend (SQLite) |
| `api-tester/stores/tabs.ts` | Module | In-memory |
| `api-tester/stores/settings.ts` | Module | localStorage |
| `db-manager/store/index.ts` | Module | Tauri backend (JSON files) |
| `toolkit/stores/plugin-store.ts` | Module | Tauri backend (JSON + SQLite) |
| `script-runner/store.ts` | Module | Tauri backend (filesystem) |

### Module Structure Convention

```
src/modules/<name>/
├── <Name>.tsx           # Main component
├── <Name>Panel.tsx      # Dockview wrapper (thin)
├── store.ts             # Zustand store
├── stores/              # Additional stores (optional)
├── components/          # Sub-components
├── utils/               # Pure utility functions
├── hooks/               # Custom React hooks (optional)
├── lib/                 # Non-React libraries (optional)
└── styles/              # CSS modules (optional)
```

## Backend Architecture

### Module Responsibility Map

```mermaid
graph TB
    subgraph lib["lib.rs — AppState"]
        AS["AppState {<br/>db: Mutex&lt;AppDatabase&gt;<br/>db_state: DbState<br/>processes: ProcessMap}"]
    end
    subgraph storage["storage/ — API Tester Data"]
        S["Collections · Requests · Environments<br/>Variables · History · Cookies"]
    end
    subgraph db["db/ — Multi-DB Engine"]
        D1["connection.rs — MySQL/PG/SQLite pools"]
        D2["query.rs — SQL exec & statement splitting"]
        D3["schema.rs — DDL, table info, indexes"]
        D4["sql_builder.rs — SELECT/UPDATE builders"]
        D5["types.rs — 20+ core data types"]
        D6["config.rs — JSON file persistence"]
        D7["commands.rs — Tauri command layer"]
    end
    subgraph plugin["plugin/ — uTools Runtime"]
        P1["manager.rs — Install/uninstall/registry"]
        P2["marketplace.rs — Scrape u-tools.cn"]
        P3["db.rs — Per-plugin SQLite"]
        P4["asar.rs — .upxs extraction"]
        P5["server.rs — Local HTTP for plugin assets"]
        P6["commands.rs — 55+ Tauri commands"]
        P7["sharp/screen/simulate/node_bridge/ubrowser/ffmpeg"]
    end
    subgraph script["script/ — Process Runner"]
        SC["Runtime detection · Process spawn/kill · File storage"]
    end
    subgraph http["http/"]
        H["send_request (reqwest)"]
    end
    subgraph system["system/"]
        SY["IP info · Hosts file"]
    end
    lib --> storage
    lib --> db
    lib --> plugin
    lib --> script
    lib --> http
    lib --> system
```

### Data Persistence Strategy

| Data | Storage | Location |
|------|---------|----------|
| API collections, requests, envs, cookies, history | SQLite (AppDatabase) | `~/.pandora/pandora.db` |
| DB Manager connections, favorites, query history | JSON files (FileConfigStore) | `~/.pandora/db-manager/` |
| Plugin registry | JSON file | `~/.pandora/plugins/registry.json` |
| Plugin data (utools.db) | Per-plugin SQLite | `~/.pandora/plugins/<id>/utools.db` |
| Script files | Filesystem | `~/.pandora/scripts/` |
| Dockview layout, theme, locale | localStorage | Browser storage |

## Communication Pattern

```mermaid
sequenceDiagram
    participant R as React Component
    participant S as Zustand Store
    participant I as Tauri IPC
    participant C as #[tauri::command]
    participant D as Database/FS

    R->>S: action()
    S->>I: invoke("cmd", {args})
    I->>C: Deserialized args
    C->>D: Query/Write
    D-->>C: Result
    C-->>I: Ok(data) / Err(String)
    I-->>S: Promise resolves
    S-->>R: State update → re-render
```

## Plugin System Architecture

```mermaid
graph TB
    subgraph Frontend
        TL["ToolkitLayout"] --> PC["PluginContainer (iframe)"]
        PC -->|"srcdoc + shim injection"| Shim["utools-shim.ts + node-shim.ts"]
        Shim -->|postMessage| Bridge["bridge.ts"]
    end
    subgraph Backend
        Bridge -->|"invoke()"| Cmds["plugin/commands.rs"]
        Cmds --> Mgr["manager.rs"]
        Cmds --> PDB["db.rs (per-plugin SQLite)"]
        Cmds --> Srv["server.rs (local HTTP)"]
        Mgr --> Asar["asar.rs"]
    end
    Mkt["marketplace.rs"] -->|"HTTP scrape"| Ext["u-tools.cn"]
```
