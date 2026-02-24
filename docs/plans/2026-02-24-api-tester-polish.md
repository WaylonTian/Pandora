# API Tester Polish — 8 Fixes

## Task 1: Collection count includes children
File: `CollectionTree.tsx` line 38
Change `node.requests.length` → recursive count function that sums requests in node + all descendant children.

## Task 2: Add missing i18n key `apiTester.newSubfolder`
Files: `src/i18n/en.ts`, `src/i18n/zh.ts`
Add `'apiTester.newSubfolder': 'New Subfolder'` / `'新建子目录'`.
Also fix line 790 in ApiTester.tsx: replace `prompt()` with inline input (same pattern as collection add).

## Task 3: Simplify toolbar buttons
File: `ApiTester.tsx` breadcrumb-right (lines ~609-623)
- Remove: "Copy as cURL" button, Tools button, Import cURL button (separate)
- Merge: Import cURL into Import OpenAPI dialog (single "Import" button, dialog has tabs/options for curl/OpenAPI/file)
- Keep: Import (one button), Generate Code, WebSocket, Collection Runner

## Task 4: Fix WebSocket toggle — add back button
File: `ApiTester.tsx` line ~599
Currently `showWebSocket ? <WebSocketPanel /> : ...` replaces everything including toolbar.
Fix: Add a header bar inside the WebSocket branch with a back/close button that calls `setShowWebSocket(false)`.

## Task 5: Fix Collection Runner button overflow
File: `styles/CollectionRunner.css`
`.run-btn` has `margin-left: auto` inside flex `.runner-config`. Add `flex-shrink: 0` and ensure parent doesn't overflow. May need `overflow: hidden` or `max-width` on dialog.

## Task 6: Remove Save button + Ctrl+S
File: `ApiTester.tsx`
- Remove save button from breadcrumb-right (line ~622)
- Remove Ctrl+S handler (line ~156)
- Keep autoSave logic (already works)

## Task 7: Remove Env selector from toolbar
File: `ApiTester.tsx` breadcrumb-right
- Remove env `<select>` dropdown (line ~618-621)
- Remove env manage button (line ~621)
- Environment management is now in sidebar Environments tab

## Task 8: Remove Settings button
File: `ApiTester.tsx` breadcrumb-right (line ~623)
Remove settings icon button. No settings panel exists.
