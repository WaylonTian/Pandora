# Pandora — Tech Stack & Build

## Frontend
- React 19 + TypeScript 5.8 (strict mode)
- Vite 7 (dev port 1420, path alias `@/` → `./src/*`)
- Tailwind CSS 4 (CSS variables, `@custom-variant dark`)
- shadcn/ui (Radix primitives, `components.json` configured)
- Zustand 5 (no middleware — manual localStorage persistence, key prefix `pandora-*`)
- dockview-react 4 (draggable panel layout)
- Monaco Editor 0.52 (SQL editor, script editor)
- i18n: custom store with `useT()` hook / `t()` function, files in `src/i18n/{en,zh}.ts`

## Backend (Rust)
- Tauri 2 (Rust 2021 edition)
- reqwest 0.12 (HTTP client)
- rusqlite 0.32 bundled (local app storage)
- mysql_async 0.34, tokio-postgres 0.7 (DB connections)
- tokio 1 full (async runtime)
- serde + serde_json (serialization)
- Plugin system: local HTTP server + iframe sandbox + utools-shim compatibility layer

## Common Commands

```sh
# Frontend dev server (browser-only, no Tauri)
npm run dev

# Full Tauri dev (Windows only — requires PowerShell/cmd, not WSL)
npm run tauri dev

# Production build (Windows only)
npm run tauri build

# TypeScript check
npx tsc --noEmit

# Rust tests (run from src-tauri/ in Windows)
cargo test

# Playwright E2E (run in WSL)
# npx playwright test
```

## Key Constraints
- Tauri builds require Windows (PowerShell/cmd) — WSL lacks GTK/WebKit
- Playwright E2E tests run in WSL
- No ESLint/Prettier configured — style by convention
- No frontend test framework in main branch yet (Vitest recommended if added)
- Windows path: `D:\workspace\pandora` / WSL: `/mnt/d/workspace/pandora`
