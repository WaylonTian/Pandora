# API Tester UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign API Tester UI to match Postman's layout and interaction patterns.

**Architecture:** Refactor the monolithic ApiTester.tsx into a cleaner layout with restructured sidebar (3 tabs), Postman-style request editor (prominent Send button, radio body types, raw sub-type dropdown), table-mode KV editors with bulk edit toggle, inline environment editor, and response status bar alignment.

**Tech Stack:** React 19, Zustand, Monaco Editor, Tailwind CSS v4, i18n (useT hook)

**Worktree:** `/mnt/d/workspace/pandora/.worktrees/api-tester-ui` on branch `feature/api-tester-ui-redesign`

**Dev server port:** 5175

---

### Task 1: KeyValueEditor — Table Mode + Bulk Edit Toggle

**Files:**
- Modify: `src/modules/api-tester/components/KeyValueEditor.tsx`
- Modify: `src/modules/api-tester/styles/components.css`

**What to do:**
1. Add `bulkMode` state toggle (default false)
2. Table mode (bulkMode=false): render as proper HTML table with columns: checkbox | Key | Value | Description | ⋯ (delete). Add column headers row. Style like Postman's table with borders, hover highlight.
3. Bulk Edit mode (bulkMode=true): render a textarea where each line is `key:value`. Parse back on switch.
4. Toggle button in top-right: "Bulk Edit" / "Key-Value Edit"
5. Add `showDescription` prop (default true) — Params need it, some uses may not.

**Verify:** `npx tsc --noEmit`
**Commit:** `refactor(api-tester): KV editor with table mode and bulk edit toggle`

---

### Task 2: BodyEditor — Raw Sub-Type Dropdown + Monaco + Resizable Height

**Files:**
- Modify: `src/modules/api-tester/components/BodyEditor.tsx`
- Modify: `src/modules/api-tester/styles/components.css`

**What to do:**
1. Change body type options to: none | form-data | x-www-form-urlencoded | raw | binary | GraphQL. Remove separate "json" type — JSON is now a raw sub-type.
2. When `raw` is selected, show dropdown to the right: JSON | Text | JavaScript | HTML | XML
3. Replace `<textarea>` with Monaco Editor for raw/json content. Set Monaco language based on raw sub-type (json/plaintext/javascript/html/xml).
4. Add a drag handle at the bottom of the body editor area. Track height in state, apply via inline style. Min 100px, max 600px.
5. form-data and x-www-form-urlencoded: use the updated KeyValueEditor from Task 1.
6. Map raw sub-type to Content-Type header: JSON→application/json, Text→text/plain, JavaScript→application/javascript, HTML→text/html, XML→application/xml.

**Verify:** `npx tsc --noEmit`
**Commit:** `refactor(api-tester): body editor with raw sub-types, Monaco, resizable height`

---

### Task 3: Sidebar — 3-Tab Navigation (Collections / Environments / History)

**Files:**
- Modify: `src/modules/api-tester/ApiTester.tsx` (sidebar section)
- Modify: `src/modules/api-tester/styles/api-tester.css`

**What to do:**
1. Change `sidebarTab` state from `'collections' | 'history'` to `'collections' | 'environments' | 'history'`.
2. Render 3 horizontal tabs at sidebar top: Collections | Environments | History. Style as small pill/underline tabs.
3. Collections tab: keep existing CollectionTree.
4. Environments tab: render environment list in sidebar (Globals at top, then env names). Clicking an env sets `selectedEnvId` state and switches main area to env editor (Task 5).
5. History tab: keep existing history list.

**Verify:** `npx tsc --noEmit`
**Commit:** `refactor(api-tester): sidebar with 3-tab navigation`

---

### Task 4: CollectionTree — Three-Dot Menu on Hover

**Files:**
- Modify: `src/modules/api-tester/components/CollectionTree.tsx`
- Modify: `src/modules/api-tester/styles/components.css`

**What to do:**
1. On collection/request items, show a `⋯` button on hover (right side, opacity 0 → 1 on hover).
2. Clicking `⋯` opens the same context menu that right-click does (reuse existing `onContextMenu` handler).
3. Style: small muted button, appears on row hover.

**Verify:** `npx tsc --noEmit`
**Commit:** `refactor(api-tester): three-dot menu on collection tree items`

---

### Task 5: Environment Inline Editor

**Files:**
- Create: `src/modules/api-tester/components/EnvironmentEditor.tsx`
- Modify: `src/modules/api-tester/ApiTester.tsx`
- Modify: `src/modules/api-tester/styles/api-tester.css`

**What to do:**
1. New `EnvironmentEditor` component: takes `envId` prop.
2. Renders: env name as title, filter/search input, variable table (checkbox | Variable | Type dropdown [default/secret] | Initial value | Current value | ⋯ delete).
3. "Add new variable" placeholder row at bottom.
4. Auto-save on change (debounced 500ms), same pattern as existing EnvironmentManager.
5. In ApiTester.tsx: when `sidebarTab === 'environments'` and an env is selected, render `<EnvironmentEditor>` in main area instead of request editor. Clicking a request or switching to Collections tab restores request editor.
6. Add "Globals" as a special entry — store global variables with `environment_id = 0` or a dedicated globals mechanism.

**Verify:** `npx tsc --noEmit`
**Commit:** `feat(api-tester): inline environment variable editor`

---

### Task 6: Request Layout — Postman-Style

**Files:**
- Modify: `src/modules/api-tester/ApiTester.tsx`
- Modify: `src/modules/api-tester/styles/api-tester.css`

**What to do:**
1. Restructure main content area layout:
   - Row 1: Breadcrumb (collection path) + toolbar icons (import/export/codegen/tools/ws/runner) + env selector + settings
   - Row 2: Method dropdown + URL input + **Send** button (blue, prominent, like Postman)
   - Row 3: Request config tabs with green dot indicators
   - Row 4: Request editor area
   - Row 5: Response area
2. Send button: blue background, white text, larger than current, with dropdown arrow for future options.
3. Method dropdown: styled inside the URL bar (left side), like Postman.
4. Move tab bar to very top of main content (above breadcrumb).

**Verify:** `npx tsc --noEmit`
**Commit:** `refactor(api-tester): Postman-style request layout with prominent Send button`

---

### Task 7: Green Dot Indicators on Request Tabs

**Files:**
- Modify: `src/modules/api-tester/ApiTester.tsx`

**What to do:**
1. Add green dot (●) next to tab names when they have content:
   - Params: any param with non-empty key
   - Auth: authType !== 'none'
   - Headers: any custom header with non-empty key
   - Body: bodyType !== 'none'
   - Scripts: preScript or testScript non-empty
2. Show header count: `Headers (N)` where N = number of enabled headers with keys.
3. Green dot: small 6px circle, `bg-green-500`, inline after tab text.

**Verify:** `npx tsc --noEmit`
**Commit:** `feat(api-tester): green dot indicators on request config tabs`

---

### Task 8: Response Area — Status Bar Alignment

**Files:**
- Modify: `src/modules/api-tester/ApiTester.tsx`
- Modify: `src/modules/api-tester/styles/api-tester.css`

**What to do:**
1. Move status info (status code, duration, size) to the same line as response tabs, right-aligned.
2. Status code color: green (2xx), yellow (3xx), red (4xx/5xx).
3. Duration and size in muted color.
4. View toggles (Pretty/Raw/Tree) and search on second row below tabs.

**Verify:** `npx tsc --noEmit`
**Commit:** `refactor(api-tester): response area status bar alignment`

---

### Task 9: i18n Keys + Final Polish

**Files:**
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/en.ts`
- Modify: various components for any missing i18n keys

**What to do:**
1. Add any new i18n keys needed (bulk edit, key-value edit, raw sub-types, environment editor labels, etc.)
2. Final CSS polish: consistent spacing, hover states, transitions.
3. Remove the old `EnvironmentManager` modal usage if fully replaced by inline editor (or keep as fallback).

**Verify:** `npx tsc --noEmit`, start dev server on port 5175, Playwright smoke test.
**Commit:** `feat(api-tester): i18n keys and final polish for Postman-style UI`

---

### Task 10: Playwright Verification

**What to do:**
1. Start dev server: `npx vite --port 5175`
2. Write Playwright test checking:
   - 3 sidebar tabs visible (Collections/Environments/History)
   - Method+URL+Send layout
   - Request tabs with green dots
   - Body type radio buttons
   - Bulk Edit toggle on KV editor
   - No console errors
3. Fix any issues found.
4. Clean up test files.

**Commit:** Final fixes if any.
