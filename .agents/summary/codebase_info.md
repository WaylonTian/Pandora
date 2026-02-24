# Codebase Information

## Project Identity

- **Name**: Pandora
- **Version**: 0.1.0
- **Identifier**: com.pandora.app
- **Category**: DeveloperTool
- **Description**: Unified developer toolbox — API Testing, DB Management, Utility Tools & Script Runner

## Technology Stack

### Backend (Rust / Tauri 2)
- **Framework**: Tauri 2 (desktop app shell)
- **Language**: Rust (2021 edition)
- **Database**: rusqlite 0.32 (bundled SQLite), mysql_async 0.34, tokio-postgres 0.7
- **HTTP**: reqwest 0.12
- **Async**: tokio 1 (full features)
- **Serialization**: serde 1 + serde_json 1
- **Image Processing**: image 0.25, base64 0.22
- **Archive**: zip 2, flate2 1, byteorder 1 (asar parsing)
- **Platform**: winapi 0.3 (Windows-specific: input simulation, screen capture, DPI)

### Frontend (React / TypeScript)
- **UI Framework**: React 19.1 + ReactDOM 19.1
- **Language**: TypeScript 5.8
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4 (@tailwindcss/vite plugin)
- **State Management**: Zustand 5
- **Panel System**: dockview-react 4 (IntelliJ-style draggable tabs)
- **Code Editor**: Monaco Editor 0.52 (@monaco-editor/react 4.7)
- **SQL Formatting**: sql-formatter 15.7
- **YAML Parsing**: js-yaml 4.1
- **Tauri APIs**: @tauri-apps/api 2, plugin-dialog 2, plugin-fs 2, plugin-opener 2

### Design System
- **Fonts**: IBM Plex Sans (UI), JetBrains Mono (code)
- **Theme**: HSL CSS variable system (shadcn/ui compatible), dark mode default
- **Components**: Radix UI primitives (label, slot), class-variance-authority, tailwind-merge
- **Path Alias**: `@/` → `src/`

## Build & Run

- **Dev**: `npm run dev` (Vite on port 1420) + `npm run tauri dev`
- **Build**: `tsc && vite build` → Tauri bundles
- **Platform**: Windows primary (WSL for dev tooling, Windows for Tauri builds)
- **Window**: 1400×900 default, 1000×700 minimum

## Repository

- **Branches**: `master`, `feature/api-tester-optimization`, `feature/toolkit-plugin-system`, `feature/script-runner-redesign`, `feature/api-tester-ui-redesign`
- **Worktrees**: `.worktrees/` (gitignored) for parallel feature development
- **i18n**: English (`en.ts`) + Chinese (`zh.ts`), Zustand-based locale store

## Codebase Size

- **Rust Backend**: ~11,166 LOC
- **Frontend**: ~23,767 LOC
- **Total Source LOC**: ~34,933
