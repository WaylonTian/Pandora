# Pandora Documentation Index

> **For AI Assistants**: This is the primary entry point. Read this file first to understand what documentation is available. Consult the relevant file based on the user's question.

## Quick Reference

| Question Type | Consult |
|--------------|---------|
| What tech stack / dependencies? | [codebase_info.md](codebase_info.md), [dependencies.md](dependencies.md) |
| How is the app structured? | [architecture.md](architecture.md) |
| What does module X do? | [components.md](components.md) |
| What Tauri commands exist? | [interfaces.md](interfaces.md) |
| What data types / DB schema? | [data_models.md](data_models.md) |
| How does feature X work? | [workflows.md](workflows.md) |
| What are the known issues? | [review_notes.md](review_notes.md) |

## Documentation Files

### [codebase_info.md](codebase_info.md)
Project identity, technology stack (Tauri 2 + React 19 + Rust), build commands, repository structure, codebase size (~35K LOC).

### [architecture.md](architecture.md)
System architecture with Mermaid diagrams: two-layer panel system (dockview + ResizableLayout), Zustand state management, backend module map, data persistence strategy, IPC communication pattern, plugin system architecture.

### [components.md](components.md)
All 4 frontend modules (API Tester: 17 components + 6 utils; DB Manager: 20 components + 2 hooks; Toolkit: 12 tools + plugin runtime; Script Runner: 3 components) and 6 backend modules with LOC and responsibilities.

### [interfaces.md](interfaces.md)
Complete Tauri IPC command reference: 20 API Tester, 20 DB Manager, 55+ Plugin, 12 Script Runner, 4 System commands. Frontend interfaces and plugin bridge protocol.

### [data_models.md](data_models.md)
All Rust structs and TypeScript interfaces. SQLite schemas for pandora.db and per-plugin utools.db.

### [workflows.md](workflows.md)
7 key workflows as Mermaid sequence diagrams: app startup, API request execution, plugin install/run, DB query, script execution, Swagger import, theme/i18n toggle.

### [dependencies.md](dependencies.md)
Complete dependency inventory: 18 Rust crates and 18 frontend packages, categorized with purpose descriptions.

### [review_notes.md](review_notes.md)
Consistency check (5 issues), completeness check (7 gaps), and 6 recommendations.
