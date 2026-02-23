# API Tester UI Redesign — Postman-Style

## Goal
Redesign the API Tester module UI to closely match Postman's layout and interaction patterns.

## Changes

### 1. Sidebar: 3-Tab Navigation
- Horizontal tabs at top: **Collections** | **Environments** | **History**
- Collections tab: search box, collection tree with hover ⭐ and ⋯ (three-dot menu)
- Environments tab: Globals at top, then environment list; selecting one shows variable editor in main area
- History tab: existing history list (no changes)

### 2. Environments Inline Editor
- When an environment is selected in sidebar, main area shows variable editor (replaces request editor)
- Table columns: checkbox | Variable | Type (default/secret dropdown) | Initial value | Current value
- "Add new variable" placeholder row at bottom
- Filter/search input above table
- Globals is a special always-present entry at top of list
- Clicking a request or switching to Collections tab restores request editor

### 3. Layout Restructure
- Tab bar at very top (request tabs with method color + name + close + dirty indicator)
- Breadcrumb row: collection path (e.g. `AI / login`) + toolbar icons (import/export/codegen/tools/websocket/runner) + env selector + settings
- Request row: Method dropdown + URL input + **Send** button (blue, prominent)
- Request config tabs: Params | Auth | Headers(N) | Body | Scripts
- Green dot on tabs that have content (params with values, headers with custom values, body not none, auth not none, scripts with content)

### 4. Params & Headers Table
- Table mode: checkbox | Key | Value | Description columns
- **Bulk Edit** toggle: switches to plain text mode (`key:value` per line)
- **Key-Value Edit** button to switch back
- Headers show count in tab: `Headers (7)`
- Hidden auto-generated headers with "N hidden" indicator

### 5. Body Editor
- Radio buttons: none | form-data | x-www-form-urlencoded | **raw** | binary | GraphQL
- When **raw** selected, show sub-type dropdown: JSON | Text | JavaScript | HTML | XML
- Dropdown controls Monaco editor syntax highlighting language
- form-data and x-www-form-urlencoded use same table UI as Params
- **Body editor height is manually resizable** via drag handle at bottom
- Language-to-Content-Type mapping:
  - JSON → application/json
  - Text → text/plain
  - JavaScript → application/javascript
  - HTML → text/html
  - XML → application/xml

### 6. Response Area Style
- Status info on same line as response tabs, right-aligned: `200 OK  320ms  1.2KB`
- Status code color: green (2xx), yellow (3xx), red (4xx/5xx)
- Duration and size in muted color
- View toggles and search on second row

### 7. Three-Dot Menu on Collections
- Hover on collection/request shows ⋯ button
- Click opens context menu with existing actions (Add request, Add folder, Rename, Delete for collections; Open, Duplicate, Delete for requests)
- No new menu items, just better trigger UX

## Non-Goals
- No Flows tab
- No Fork/Share/Move in context menu
- No Settings tab in request config
- No Presets dropdown for headers (keep simple)
