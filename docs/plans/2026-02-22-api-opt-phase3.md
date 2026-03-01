# Phase 3: Template Variables + Scripts + Cookies

## Task 7: Environment Variable Template Engine

**Files:**
- Create: `src/modules/api-tester/utils/template.ts`
- Modify: `src/modules/api-tester/ApiTester.tsx` (apply template before send)

**Step 1: Create template engine**

```typescript
// src/modules/api-tester/utils/template.ts

export function resolveTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
}

export function resolveHeaders(headers: Record<string, string>, variables: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    resolved[resolveTemplate(k, variables)] = resolveTemplate(v, variables);
  }
  return resolved;
}

// Extract variable names from text for highlighting
export function extractVariables(text: string): { name: string; start: number; end: number }[] {
  const vars: { name: string; start: number; end: number }[] = [];
  const re = /\{\{(\w+)\}\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    vars.push({ name: m[1], start: m.index, end: m.index + m[0].length });
  }
  return vars;
}
```

**Step 2: Apply template resolution in handleSend**

In `ApiTester.tsx`, before sending the request:
```typescript
import { resolveTemplate, resolveHeaders } from './utils/template';

// In handleSend, after building finalUrl/finalHeaders/finalBody:
const envVars = store.variables.reduce((acc, v) => {
  if (v.enabled) acc[v.key] = v.value;
  return acc;
}, {} as Record<string, string>);

finalUrl = resolveTemplate(finalUrl, envVars);
finalBody = resolveTemplate(finalBody, envVars);
headersObj = resolveHeaders(headersObj, envVars);
```

**Step 3: Highlight {{variables}} in URL input**

Create a styled URL input that renders `{{xxx}}` in orange. Use an overlay approach:
- The actual `<input>` is transparent text
- Behind it, a `<div>` renders the same text with `<span className="text-orange-500">` around `{{xxx}}` matches

```tsx
function UrlInputWithHighlight({ value, onChange, onKeyDown, placeholder }: {
  value: string; onChange: (v: string) => void; onKeyDown: (e: React.KeyboardEvent) => void; placeholder: string;
}) {
  const parts = value.split(/(\{\{\w+\}\})/g);
  return (
    <div className="url-input-wrapper relative flex-1">
      <div className="url-highlight absolute inset-0 px-3 py-2 pointer-events-none whitespace-pre font-mono text-sm overflow-hidden">
        {parts.map((part, i) =>
          part.match(/^\{\{\w+\}\}$/)
            ? <span key={i} className="text-orange-500 font-semibold">{part}</span>
            : <span key={i} className="invisible">{part}</span>
        )}
      </div>
      <input className="url-input relative bg-transparent" value={value}
        onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} />
    </div>
  );
}
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(api-tester): add {{variable}} template engine with URL highlighting"
```

---

## Task 8: Script Enhancement

**Files:**
- Modify: `src/modules/api-tester/utils/scripting.ts`
- Modify: `src/modules/api-tester/components/ScriptEditor.tsx` (show logs)

**Step 1: Add chain assertions to pm.response**

In `scripting.ts`, enhance the `pm.response` object:

```typescript
// Replace pm.response with enhanced version:
response: context.response ? {
  code: context.response.status,
  status: context.response.status,
  body: context.response.body,
  json: () => { try { return JSON.parse(context.response!.body); } catch { return null; } },
  headers: context.response.headers,
  responseTime: context.response.time,
  to: {
    have: {
      status: (code: number) => {
        if (context.response!.status !== code)
          throw new Error(`Expected status ${code}, got ${context.response!.status}`);
      },
      header: (key: string, value?: string) => {
        const h = context.response!.headers[key] || context.response!.headers[key.toLowerCase()];
        if (!h) throw new Error(`Header "${key}" not found`);
        if (value !== undefined && h !== value)
          throw new Error(`Expected header "${key}" to be "${value}", got "${h}"`);
      },
      jsonBody: (path: string, expected?: any) => {
        const body = JSON.parse(context.response!.body);
        const val = path.split('.').reduce((o, k) => o?.[k], body);
        if (expected !== undefined && JSON.stringify(val) !== JSON.stringify(expected))
          throw new Error(`Expected ${path} = ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
      },
    },
    be: {
      ok: context.response!.status >= 200 && context.response!.status < 300
        ? undefined
        : (() => { throw new Error(`Expected 2xx, got ${context.response!.status}`); })(),
    },
  },
} : null,
```

**Step 2: Add pm.collectionVariables**

```typescript
const collectionVars: Record<string, string> = {};

// Add to pm object:
collectionVariables: {
  get: (key: string) => collectionVars[key] || '',
  set: (key: string, value: string) => { collectionVars[key] = value; },
},
```

Return `collectionVars` in `ScriptResult` so the caller can persist them.

**Step 3: Show console.log output in ScriptEditor**

In `ScriptEditor.tsx`, add a "Console" section below test results:
```tsx
{lastTestResults && logs.length > 0 && (
  <div className="console-output">
    <div className="section-title">Console</div>
    {logs.map((log, i) => (
      <div key={i} className="console-line font-mono text-xs">{log}</div>
    ))}
  </div>
)}
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(api-tester): enhance pm.* script API with chain assertions and console output"
```

---

## Task 9: Cookie Manager — Backend

**Files:**
- Create: `src-tauri/src/storage/cookies.rs` or add to `src-tauri/src/storage/mod.rs`
- Modify: `src-tauri/src/lib.rs` (register commands)

**Step 1: Add cookie table to AppDatabase**

In `storage/mod.rs`, add to `init_tables`:
```sql
CREATE TABLE IF NOT EXISTS cookies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    path TEXT DEFAULT '/',
    expires TEXT,
    http_only INTEGER DEFAULT 0,
    secure INTEGER DEFAULT 0,
    UNIQUE(domain, name, path)
);
```

**Step 2: Add cookie CRUD methods**

```rust
pub fn get_cookies_for_domain(&self, domain: &str) -> Result<Vec<Cookie>> {
    // SELECT * FROM cookies WHERE domain = ?1 OR domain matches subdomain
}

pub fn set_cookies_from_header(&self, domain: &str, set_cookie_header: &str) -> Result<()> {
    // Parse Set-Cookie header, upsert into cookies table
}

pub fn get_all_cookies(&self) -> Result<Vec<Cookie>> { ... }
pub fn delete_cookie(&self, id: i64) -> Result<()> { ... }
pub fn clear_cookies_for_domain(&self, domain: &str) -> Result<()> { ... }
```

**Step 3: Add Tauri commands**

```rust
#[tauri::command]
fn get_cookies(state: State<AppState>, domain: Option<String>) -> Result<Vec<Cookie>, String> { ... }

#[tauri::command]
fn delete_cookie(state: State<AppState>, id: i64) -> Result<(), String> { ... }

#[tauri::command]
fn clear_domain_cookies(state: State<AppState>, domain: String) -> Result<(), String> { ... }
```

**Step 4: Commit**
```bash
git add -A && git commit -m "feat(api-tester): add cookie store backend"
```

---

## Task 10: Cookie Manager — Frontend + Auto Cookie Handling

**Files:**
- Create: `src/modules/api-tester/components/CookieManager.tsx`
- Modify: `src/modules/api-tester/store.ts` (cookie handling in send flow)
- Modify: `src/modules/api-tester/ApiTester.tsx` (add cookie manager button + modal)

**Step 1: Auto-attach cookies on send**

In `store.ts`, before sending request:
```typescript
// Extract domain from URL
const url = new URL(requestUrl);
const cookies = await invoke<Cookie[]>('get_cookies', { domain: url.hostname });
if (cookies.length > 0) {
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  headers['Cookie'] = cookieHeader;
}
```

After receiving response:
```typescript
// Parse Set-Cookie from response headers
const setCookie = response.headers['set-cookie'] || response.headers['Set-Cookie'];
if (setCookie) {
  await invoke('set_cookies_from_response', { domain: url.hostname, header: setCookie });
}
```

**Step 2: Create CookieManager modal**

```tsx
// src/modules/api-tester/components/CookieManager.tsx
// - List all cookies grouped by domain
// - Each cookie shows: name, value, path, expires
// - Delete individual cookie button
// - Clear all cookies for a domain button
// - Search/filter
```

**Step 3: Add 🍪 button to toolbar in ApiTester.tsx**

```tsx
<button className="icon-btn" onClick={() => setShowCookieManager(true)} title="Cookies">🍪</button>
{showCookieManager && <CookieManager onClose={() => setShowCookieManager(false)} />}
```

**Step 4: Verify full build**
```bash
npx tsc --noEmit
cd src-tauri && cargo check
```

**Step 5: Commit**
```bash
git add -A && git commit -m "feat(api-tester): add cookie manager with auto cookie handling"
```
