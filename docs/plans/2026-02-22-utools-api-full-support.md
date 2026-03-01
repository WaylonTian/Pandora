# uTools API Full Support Design

## Decisions
- ubrowser: Tauri WebviewWindowBuilder hidden windows
- Sharp: Rust `image` crate
- FFmpeg: system command, prompt install if missing
- Simulate: Windows `SendInput` API
- Screen: Windows API (`EnumDisplayMonitors`, `GetCursorPos`, `GetPixel`)
- createBrowserWindow: Tauri WebviewWindowBuilder
- Mock: payment, fetchUserServerTemporaryToken, AI, readCurrentFolderPath, readCurrentBrowserUrl

## Architecture

4 layers:
1. **Shim** (`utools-shim.ts` / `node-shim.ts`) — `window.utools.*` proxy in iframe, postMessage to host
2. **Bridge** (`bridge.ts`) — host-side message router → Tauri invoke
3. **Command** (Rust `commands.rs` + new modules) — Tauri commands
4. **Native** (Rust, Windows API / system tools) — low-level

New Rust modules:
- `simulate.rs` — keyboard/mouse via `SendInput` (winapi crate)
- `screen.rs` — display info, color pick, cursor, DPI (winapi)
- `sharp.rs` — image processing (`image` crate)
- `ffmpeg.rs` — audio/video (system ffmpeg command)
- `ubrowser.rs` — programmable browser state machine

## P1 — Basic Completion (~15 APIs, no new crates)

### Window
- `subInputFocus/Blur/Select` — bridge event to ToolkitLayout sub-input component
- `outPlugin()` — switch back to tool list
- `showSaveDialog(opts)` — PowerShell SaveFileDialog
- `findInPage(text)/stopFindInPage()` — iframe window.find()
- `getWindowType()` — return "main"

### System
- `shellTrashItem(path)` — PowerShell recycle bin delete
- `shellBeep()` — Windows MessageBeep
- `getNativeId()` — window HWND
- `getAppName()` — "Pandora"
- `isDev()` — cfg(debug_assertions)
- `getFileIcon(path)` — Windows SHGetFileInfo → base64 PNG

### Copy/Input
- `getCopyedFiles()` — read clipboard file list via PowerShell
- `hideMainWindowPasteFile/Image` — clipboard write + SendKeys Ctrl+V

### Features
- `getFeatures/setFeature/removeFeature` — persist to plugin registry

## P2 — Native Capabilities (~17 APIs, winapi crate)

### Simulate (5)
- `simulateKeyboardTap(key, ...modifiers)` — KEYBDINPUT + SendInput
- `simulateMouseMove(x, y)` — MOUSEINPUT absolute
- `simulateMouseClick(x, y)` — move + left click
- `simulateMouseDoubleClick(x, y)` — move + double click
- `simulateMouseRightClick(x, y)` — move + right click

### Screen (12)
- `screenColorPick(cb)` — fullscreen transparent overlay + GetPixel
- `getPrimaryDisplay()` — EnumDisplayMonitors + GetMonitorInfo
- `getAllDisplays()` — same, all monitors
- `getCursorScreenPoint()` — GetCursorPos → {x, y}
- `getDisplayNearestPoint(point)` — compute from getAllDisplays
- `getDisplayMatching(rect)` — compute from getAllDisplays
- `screenToDipPoint/dipToScreenPoint` — GetDpiForMonitor conversion
- `screenToDipRect/dipToScreenRect` — same for rects
- `desktopCaptureSources(opts)` — BitBlt window/screen thumbnails

## P3 — Heavy Modules (3 modules)

### ubrowser
- Rust: WebviewWindowBuilder creates hidden window, maintains operation queue
- Shim: `utools.ubrowser.goto(url).css().evaluate().run()` builds op chain
- `run()` serializes ops → Rust executes sequentially via evaluate_script
- Methods: goto, css, evaluate, click, input, wait, screenshot, pdf, cookies, setCookies, hide/show, viewport, press, value, check, scroll, download, useragent, hover, file, drop, focus, paste, markdown, device, when, end, devTools, dblclick, mousedown, mouseup

### createBrowserWindow + sendToParent
- WebviewWindowBuilder::new() with injected communication bridge
- sendToParent via Tauri events between windows

### Sharp (image crate)
- Node bridge: `require('sharp')` returns chainable API
- Methods: resize, rotate, flip, crop, blur, sharpen, grayscale, toFormat, metadata, composite
- I/O: file paths or base64

## P4 — External Dependencies (1 module)

### FFmpeg
- Detect `ffmpeg` in PATH
- Missing → error with install instructions (winget/choco/scoop)
- Present → Command::new("ffmpeg") with args
- Node bridge: `require('ffmpeg')` or utools.ffmpeg

## Mock (deferred)
- `isPurchasedUser()` → true
- `openPurchase/Payment()` → no-op
- `fetchUserPayments()` → []
- `fetchUserServerTemporaryToken()` → error "Not supported"
- `ai()` / `allAiModels()` → deferred
- `readCurrentFolderPath()` → "" (needs accessibility API)
- `readCurrentBrowserUrl()` → "" (needs accessibility API)
