---
inclusion: fileMatch
fileMatchPattern: ["**/*.tsx", "**/*.ts", "!**/src-tauri/**"]
---
# Frontend Conventions

## Component Patterns
- Functional React with hooks only, no class components
- Tailwind utility classes, `cn()` from `@/lib/utils` for conditional merging
- Inline SVG icon components (no icon library like lucide/heroicons)
- shadcn/ui primitives in `src/components/ui/` (Button, Card, Input, Label)

## State Management
- Zustand `create<T>((set, get) => ({...}))` — no middleware
- Global stores: `useThemeStore`, `useLayoutStore`, `useI18nStore` (localStorage, prefix `pandora-*`)
- Module stores: backed by Tauri `invoke()` calls to SQLite/JSON/filesystem
- No Redux, no React Context for state

## i18n
- `useT()` hook returns `t(key, params?)` function
- Keys follow `module.component.key` pattern (e.g., `toolkit.jsonTool.title`)
- Translations in `src/i18n/en.ts` and `src/i18n/zh.ts`
- All user-facing strings must have i18n keys in both files

## Module Components
| Module | Main Component | LOC | Key Sub-components |
|--------|---------------|-----|-------------------|
| API Tester | `ApiTester.tsx` | 819 | CollectionTree, BodyEditor, KeyValueEditor, ImportApiModal, CookieManager, ScriptEditor, CodeGenModal, EnvironmentManager, CollectionRunner, WebSocketPanel |
| DB Manager | `DbManager.tsx` | 515 | DatabaseTree, SqlEditor, QueryResult, DataBrowser, TableDesigner, ConnectionDialog, ERDiagram, DataImport, DataGenerator |
| Toolkit | `ToolkitLayout.tsx` | 134 | 12 built-in tools + PluginContainer, Marketplace, InstalledPlugins |
| Script Runner | `ScriptRunner.tsx` | 108 | ScriptSidebar, ScriptToolbar, OutputPanel |

## Tool Registration (Toolkit)
```typescript
// In register.ts
registerTool({ id: "json", name: "toolkit.jsonTool.title", icon: "{}", category: "text", component: JsonTool });
// Categories: "encoding" | "crypto" | "network" | "text" | "other"
```

## Panel Registration (main.tsx)
```typescript
registerPanel({ id: "api-tester", title: "API Tester", component: ApiTesterPanel });
// Keyboard: Ctrl+1/2/3/4 switches panels
```

## Adding a New Module
1. Create `src/modules/<name>/` with `<Name>.tsx` + `<Name>Panel.tsx` + `store.ts`
2. `main.tsx` — `registerPanel({ id, title, component })`
3. `Sidebar.tsx` — Add to `modules` array with inline SVG icon
4. `App.tsx` — Add keyboard shortcut in `useEffect`
5. `src/i18n/en.ts` + `zh.ts` — Add all strings

## Template Variables
```typescript
resolveTemplate("{{baseUrl}}/api/users", { baseUrl: "https://api.example.com" })
// Syntax: {{variableName}} — resolved from active environment variables
```
