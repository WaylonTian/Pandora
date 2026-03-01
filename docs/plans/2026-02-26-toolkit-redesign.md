# Toolkit 模块整体翻新实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Toolkit 从 12 个简陋工具翻新为 29 个工具的精致开发者工具箱，采用网格首页 + 沉浸式工具页布局。

**Architecture:** 首页网格展示所有工具（按 8+1 分类），点击进入沉浸式工具页。统一设计系统提供共享组件，每个工具自由布局。Zustand store 管理收藏/最近使用/工具状态持久化。图标使用 lucide-react。

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Zustand 5, lucide-react, Tauri 2 (Rust)

**设计文档:** `docs/plans/2026-02-26-toolkit-redesign-design.md`

---

## Phase 1: 基础设施（框架 + 设计系统 + 首页）

### Task 1: 安装依赖 + 新分类接口

**Files:**
- Modify: `package.json` — 添加 `lucide-react`
- Modify: `src/modules/toolkit/plugin-interface.ts` — 新分类 + description + icon 类型变更

**Steps:**

1. 安装 lucide-react:
```bash
npm install lucide-react
```

2. 修改 `plugin-interface.ts`，更新 Category 类型和 ToolPlugin 接口:
```typescript
import type { ComponentType } from "react";

export type Category = "encoding" | "crypto" | "text" | "generator" | "datetime" | "number" | "network" | "system";

export interface ToolPlugin {
  id: string;
  name: string;           // i18n key
  description: string;    // i18n key（新增）
  icon: ComponentType<{ className?: string }>;  // Lucide 组件
  category: Category;
  component: ComponentType;
}
```

保留 `registerTool`、`getTools`、`getToolsByCategory` 不变。

3. Commit: `feat(toolkit): 新增 lucide-react 依赖，更新工具注册接口`

---

### Task 2: Toolkit Store（收藏 + 最近使用 + 工具状态持久化）

**Files:**
- Create: `src/modules/toolkit/stores/toolkit-store.ts`

**Steps:**

1. 创建 store:
```typescript
import { create } from "zustand";

interface ToolkitState {
  favorites: string[];
  recentUsed: string[];
  toolStates: Record<string, unknown>;
  toggleFavorite: (id: string) => void;
  addRecent: (id: string) => void;
  getToolState: <T>(id: string) => T | undefined;
  setToolState: <T>(id: string, state: T) => void;
}

const STORAGE_KEY = "pandora-toolkit";

function loadState(): Partial<ToolkitState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveState(state: ToolkitState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    favorites: state.favorites,
    recentUsed: state.recentUsed,
    toolStates: state.toolStates,
  }));
}

export const useToolkitStore = create<ToolkitState>((set, get) => {
  const saved = loadState();
  return {
    favorites: saved.favorites || [],
    recentUsed: saved.recentUsed || [],
    toolStates: saved.toolStates || {},
    toggleFavorite: (id) => set((s) => {
      const next = s.favorites.includes(id)
        ? { favorites: s.favorites.filter((f) => f !== id) }
        : { favorites: [...s.favorites, id] };
      const ns = { ...s, ...next };
      saveState(ns as ToolkitState);
      return next;
    }),
    addRecent: (id) => set((s) => {
      const next = { recentUsed: [id, ...s.recentUsed.filter((r) => r !== id)].slice(0, 10) };
      const ns = { ...s, ...next };
      saveState(ns as ToolkitState);
      return next;
    }),
    getToolState: <T,>(id: string) => get().toolStates[id] as T | undefined,
    setToolState: <T,>(id: string, state: T) => set((s) => {
      const next = { toolStates: { ...s.toolStates, [id]: state } };
      const ns = { ...s, ...next };
      saveState(ns as ToolkitState);
      return next;
    }),
  };
});
```

2. Commit: `feat(toolkit): 添加 toolkit store（收藏/最近使用/状态持久化）`

---

### Task 3: 统一设计系统组件

**Files:**
- Create: `src/modules/toolkit/components/ToolPage.tsx`
- Create: `src/modules/toolkit/components/TextInput.tsx`
- Create: `src/modules/toolkit/components/TextOutput.tsx`
- Create: `src/modules/toolkit/components/ActionBar.tsx`
- Create: `src/modules/toolkit/components/FileDropZone.tsx`
- Create: `src/modules/toolkit/components/ResultCard.tsx`
- Modify: `src/modules/toolkit/components/CopyButton.tsx` — 用 Lucide icon 替换 emoji

**Steps:**

1. `ToolPage.tsx` — 工具页面容器（标题 + 返回 + 收藏 + 内容区）:
```typescript
// Props: toolId, title, children
// 顶部栏: [← ArrowLeft] title [Star 收藏按钮]
// 内容区: children（全宽自适应）
// 点击返回调用 onBack callback
```

2. `TextInput.tsx` — 统一输入 textarea:
```typescript
// Props: value, onChange, placeholder, rows?, className?
// 统一样式: font-mono, border, rounded-lg, bg-muted/50
```

3. `TextOutput.tsx` — 只读输出 + 复制按钮:
```typescript
// Props: value, placeholder?, rows?, className?
// 右上角 CopyButton（value 非空时显示）
```

4. `ActionBar.tsx` — 操作按钮栏:
```typescript
// Props: children (按钮们)
// 统一 flex gap-2 布局，按钮统一样式
```

5. `FileDropZone.tsx` — 文件拖拽区域:
```typescript
// Props: onFile(file: File), accept?, children?
// 虚线边框，拖拽高亮，点击也可选择文件
```

6. `ResultCard.tsx` — 结果展示卡片:
```typescript
// Props: label, value, copyable?
// 带标签的结果行，可选复制按钮
```

7. 更新 `CopyButton.tsx` 使用 Lucide `Copy` / `Check` 图标替换 emoji。

8. Commit: `feat(toolkit): 统一设计系统组件`

---

### Task 4: 首页网格布局 + 路由

**Files:**
- Rewrite: `src/modules/toolkit/ToolkitLayout.tsx`
- Create: `src/modules/toolkit/components/ToolkitHome.tsx`
- Create: `src/modules/toolkit/components/ToolCard.tsx`

**Steps:**

1. `ToolCard.tsx` — 工具卡片组件:
```typescript
// Props: tool (ToolPlugin), isFavorite, onToggleFavorite, onClick
// 卡片: Lucide icon + 名称 + 描述
// hover: translateY(-2px) + shadow 加深
// 右上角: 收藏星标（hover 时显示，已收藏时常显）
// 插件卡片: 左下角 "插件" 小标签
```

2. `ToolkitHome.tsx` — 首页:
```typescript
// 顶部: 搜索栏 + [📋管理按钮] [🏪市场按钮]
// 收藏区: 横向卡片行（可折叠，空时隐藏）
// 最近使用: 横向卡片行（可折叠，空时隐藏）
// 分类网格: 8 个分类，每个分类标题 + 卡片网格（3~5 列自适应）
// 插件分类: 标题旁 Beta 徽章
// 搜索时: 过滤所有工具，平铺显示
```

3. `ToolkitLayout.tsx` — 改为首页/工具页切换:
```typescript
// state: { view: "home" } | { view: "tool", id: string } | { view: "plugin", id } | { view: "marketplace" } | { view: "installed" }
// view === "home" → <ToolkitHome />
// view === "tool" → <ToolPage><ActiveComponent /></ToolPage>
// view === "plugin" → <ToolPage><PluginContainer /></ToolPage>
// view === "marketplace" → <ToolPage><Marketplace /></ToolPage>
// view === "installed" → <ToolPage><InstalledPlugins /></ToolPage>
```

4. Commit: `feat(toolkit): 首页网格布局 + 工具页路由`

---

### Task 5: 更新 register.ts + i18n（现有 12 个工具迁移）

**Files:**
- Modify: `src/modules/toolkit/register.ts` — 所有工具加 description + Lucide icon
- Modify: `src/i18n/en.ts` — 添加 description keys + 新分类 keys
- Modify: `src/i18n/zh.ts` — 同上中文

**Steps:**

1. 更新 `register.ts`，为每个现有工具指定 Lucide 图标和 description:
```typescript
import { Braces, Clock, Regex, FileCode2, Link, Binary, Fingerprint, Palette, Hash, KeyRound, Globe, FileEdit } from "lucide-react";

registerTool({ id: "json", name: "toolkit.jsonTool.title", description: "toolkit.jsonTool.desc", icon: Braces, category: "text", component: JsonTool });
registerTool({ id: "timestamp", ..., icon: Clock, category: "datetime", ... });
registerTool({ id: "regex", ..., icon: Regex, category: "text", ... });
registerTool({ id: "base64", ..., icon: FileCode2, category: "encoding", ... });
registerTool({ id: "url-codec", ..., icon: Link, category: "encoding", ... });
registerTool({ id: "base-converter", ..., icon: Binary, category: "number", ... });
registerTool({ id: "uuid", ..., icon: Fingerprint, category: "generator", ... });
registerTool({ id: "color", ..., icon: Palette, category: "other" → 去掉 other, 放 "generator", ... });
registerTool({ id: "crypto", ..., icon: Hash, category: "crypto", ... });
registerTool({ id: "jwt", ..., icon: KeyRound, category: "crypto", ... });
registerTool({ id: "ip-info", ..., icon: Globe, category: "network", ... });
registerTool({ id: "hosts", ..., icon: FileEdit, category: "network", ... });
```

2. i18n 添加所有 description keys 和新分类名称。

3. 修复 ColorTool 和 JwtTool 和 BaseConverterTool 缺失的 i18n。

4. Commit: `feat(toolkit): 迁移现有工具到新注册接口 + i18n 补全`

---

## Phase 2: 增强现有工具

### Task 6: Base64 修复 UTF-8 + 文件支持

**Files:**
- Rewrite: `src/modules/toolkit/tools/base64-tool.tsx`

**Steps:**
1. 用 `TextEncoder`/`TextDecoder` 替换 `btoa`/`atob` 以支持 UTF-8。
2. 添加文件编解码（FileDropZone 拖入文件 → Base64，Base64 → 下载文件）。
3. 使用 TextInput/TextOutput/ActionBar 统一设计系统组件。
4. Commit: `feat(toolkit): Base64 支持 UTF-8 和文件编解码`

---

### Task 7: JSON 工具增强

**Files:**
- Rewrite: `src/modules/toolkit/tools/json-tool.tsx`

**Steps:**
1. 保留格式化/压缩/验证。
2. 新增: JSONPath 查询、转义/去转义、JSON↔YAML 转换、JSON↔XML 转换。
3. 用 Tab 切换不同功能面板。
4. 需要安装: `yaml`（YAML 解析）。
5. Commit: `feat(toolkit): JSON 工具增强（JSONPath/转义/YAML/XML 转换）`

---

### Task 8: 时间戳工具增强

**Files:**
- Rewrite: `src/modules/toolkit/tools/timestamp-tool.tsx`

**Steps:**
1. 添加时区选择下拉框。
2. 添加时间计算器（日期 ± 天/小时/分钟）。
3. 支持毫秒/秒切换。
4. 常用格式模板（ISO 8601、RFC 2822 等）。
5. Commit: `feat(toolkit): 时间戳工具增强（时区/计算器/格式模板）`

---

### Task 9: 正则工具增强

**Files:**
- Rewrite: `src/modules/toolkit/tools/regex-tool.tsx`

**Steps:**
1. 添加替换功能（输入替换文本，显示替换结果）。
2. 添加常用正则模板下拉（邮箱、手机号、URL、IP 等）。
3. 分组高亮显示。
4. Commit: `feat(toolkit): 正则工具增强（替换/模板/分组高亮）`

---

### Task 10: 哈希工具增强

**Files:**
- Rewrite: `src/modules/toolkit/tools/crypto-tool.tsx`
- Create: `src-tauri/src/toolkit/mod.rs` — 新增 Rust 端 MD5/SM3 哈希 + 文件哈希命令
- Modify: `src-tauri/src/lib.rs` — 注册新命令
- Modify: `src-tauri/Cargo.toml` — 添加 `md-5`, `sm3` crate

**Steps:**
1. Rust 端新增 `toolkit` 模块，实现:
   - `toolkit_hash_text(algorithm, text) → String` — 支持 MD5/SHA1/SHA256/SHA512/SM3
   - `toolkit_hash_file(algorithm, path) → String` — 文件哈希
2. 前端: 支持所有算法选择，文本哈希 + 文件拖入哈希 + 批量模式。
3. Commit: `feat(toolkit): 哈希工具增强（MD5/SM3/文件哈希/批量）`

---

### Task 11: 颜色工具 i18n + UUID/JWT/进制转换 i18n 补全

**Files:**
- Modify: `src/modules/toolkit/tools/color-tool.tsx` — 添加 useT()
- Modify: `src/modules/toolkit/tools/jwt-tool.tsx` — 添加 useT()
- Modify: `src/modules/toolkit/tools/base-converter-tool.tsx` — 添加 useT()
- Modify: `src/i18n/en.ts`, `src/i18n/zh.ts`

**Steps:**
1. 为三个硬编码英文的工具添加 i18n。
2. 使用统一设计系统组件重构 UI。
3. Commit: `fix(toolkit): 补全 ColorTool/JwtTool/BaseConverter 的 i18n`

---

## Phase 3: 新增工具 — 编码转换

### Task 12: Unicode 转换工具

**Files:**
- Create: `src/modules/toolkit/tools/unicode-tool.tsx`
- Modify: `src/modules/toolkit/register.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/zh.ts`

**功能:** Unicode ↔ 中文/文本双向转换，emoji 查看，HTML/CSS 实体转换。

Commit: `feat(toolkit): 新增 Unicode 转换工具`

---

### Task 13: HTML 编解码工具

**Files:**
- Create: `src/modules/toolkit/tools/html-codec-tool.tsx`

**功能:** HTML 实体编码/解码（`&lt;` ↔ `<`）。

Commit: `feat(toolkit): 新增 HTML 编解码工具`

---

### Task 14: Hex/String 转换工具

**Files:**
- Create: `src/modules/toolkit/tools/hex-string-tool.tsx`

**功能:** 十六进制 ↔ 字符串互转。

Commit: `feat(toolkit): 新增 Hex/String 转换工具`

---

### Task 15: ASCII 编码转换工具

**Files:**
- Create: `src/modules/toolkit/tools/ascii-tool.tsx`

**功能:** 十进制/十六进制/八进制/二进制/字符串互转表格。

Commit: `feat(toolkit): 新增 ASCII 编码转换工具`

---

## Phase 4: 新增工具 — 加密哈希

### Task 16: 加密/解密工具（AES/DES/SM4）

**Files:**
- Create: `src/modules/toolkit/tools/encrypt-tool.tsx`
- Modify: `src-tauri/src/toolkit/mod.rs` — 新增加密解密命令
- Modify: `src-tauri/Cargo.toml` — 添加 `aes`, `des`, `sm4`, `block-modes` 等 crate

**功能:** AES/DES/SM4 加密解密，支持 ECB/CBC 模式，Base64/Hex 输出。

Commit: `feat(toolkit): 新增加密/解密工具（AES/DES/SM4）`

---

### Task 17: Bcrypt 工具

**Files:**
- Create: `src/modules/toolkit/tools/bcrypt-tool.tsx`
- Modify: `src-tauri/src/toolkit/mod.rs`
- Modify: `src-tauri/Cargo.toml` — 添加 `bcrypt` crate

**功能:** Bcrypt 加密（设置 rounds）+ 验证（输入明文和哈希值比对）。

Commit: `feat(toolkit): 新增 Bcrypt 加密/验证工具`

---

## Phase 5: 新增工具 — 文本处理

### Task 18: 文本处理工具

**Files:**
- Create: `src/modules/toolkit/tools/text-process-tool.tsx`

**功能:** Tab 切换多个子功能 — 大小写转换、去重、排序、字符统计、添加行号、过滤空行、中英文标点转换。

Commit: `feat(toolkit): 新增文本处理工具`

---

### Task 19: 文本 Diff 对比工具

**Files:**
- Create: `src/modules/toolkit/tools/diff-tool.tsx`

**依赖:** `npm install diff`

**功能:** 左右双栏输入，行级/单词级差异对比，高亮显示增删改。

Commit: `feat(toolkit): 新增文本 Diff 对比工具`

---

### Task 20: 变量名格式转换工具

**Files:**
- Create: `src/modules/toolkit/tools/naming-tool.tsx`

**功能:** 输入变量名，同时显示 camelCase/snake_case/kebab-case/PascalCase/UPPER_CASE/lower case 结果，每个可复制。

Commit: `feat(toolkit): 新增变量名格式转换工具`

---

## Phase 6: 新增工具 — 生成器 + 时间

### Task 21: 随机字符串生成器

**Files:**
- Create: `src/modules/toolkit/tools/random-string-tool.tsx`

**功能:** 自定义长度、字符集（大小写字母/数字/特殊字符）、批量生成。

Commit: `feat(toolkit): 新增随机字符串生成器`

---

### Task 22: 二维码生成/解析工具

**Files:**
- Create: `src/modules/toolkit/tools/qrcode-tool.tsx`

**依赖:** `npm install qrcode jsqr`

**功能:** 文本 → 二维码图片（可下载），图片上传 → 解析二维码内容。

Commit: `feat(toolkit): 新增二维码生成/解析工具`

---

### Task 23: Cron 表达式解析工具

**Files:**
- Create: `src/modules/toolkit/tools/cron-tool.tsx`

**依赖:** `npm install cron-parser`

**功能:** 输入 Cron 表达式，显示人类可读描述 + 下 N 次执行时间，常用模板快捷选择。

Commit: `feat(toolkit): 新增 Cron 表达式解析工具`

---

## Phase 7: 新增工具 — 网络

### Task 24: 端口扫描/占用查看工具

**Files:**
- Create: `src/modules/toolkit/tools/port-tool.tsx`
- Modify: `src-tauri/src/toolkit/mod.rs` — 新增端口扫描命令

**Rust 端:**
- `toolkit_scan_ports(host, start_port, end_port) → Vec<u16>` — TCP 连接扫描
- `toolkit_list_listening_ports() → Vec<{port, pid, process_name}>` — 调用 `netstat` 解析

Commit: `feat(toolkit): 新增端口扫描/占用查看工具`

---

## Phase 8: 新增工具 — 系统工具（桌面独有）

### Task 25: 屏幕取色器工具

**Files:**
- Create: `src/modules/toolkit/tools/color-picker-tool.tsx`

**功能:** 调用已有 `plugin_screen_color_pick` 命令，点击取色按钮后获取光标位置颜色，显示 HEX/RGB/HSL，历史记录列表。

Commit: `feat(toolkit): 新增屏幕取色器工具`

---

### Task 26: 图片处理工具

**Files:**
- Create: `src/modules/toolkit/tools/image-tool.tsx`

**功能:** 复用已有 `sharp_*` 命令。拖入图片 → 显示元信息，提供 resize/旋转/裁剪/模糊/灰度/格式转换操作，预览 + 下载。

Commit: `feat(toolkit): 新增图片处理工具`

---

### Task 27: 文件哈希校验工具

**Files:**
- Create: `src/modules/toolkit/tools/file-hash-tool.tsx`

**功能:** FileDropZone 拖入文件，调用 Task 10 中的 `toolkit_hash_file` 命令，同时计算 MD5/SHA1/SHA256 显示，支持校验值比对。

Commit: `feat(toolkit): 新增文件哈希校验工具`

---

### Task 28: 环境变量查看器

**Files:**
- Create: `src/modules/toolkit/tools/env-viewer-tool.tsx`
- Modify: `src-tauri/src/toolkit/mod.rs` — 新增环境变量命令

**Rust 端:**
- `toolkit_get_env_vars() → Vec<{key, value}>` — `std::env::vars()`
- `toolkit_get_path_dirs() → Vec<String>` — 解析 PATH

**前端:** 搜索过滤 + PATH 目录列表展开。

Commit: `feat(toolkit): 新增环境变量查看器`

---

## Phase 9: 收尾

### Task 29: 全量 i18n 校验 + 中文翻译补全

**Files:**
- Modify: `src/i18n/zh.ts` — 确保所有新增 key 都有中文翻译

**Steps:**
1. 对比 en.ts 和 zh.ts 的 toolkit 相关 key，补全缺失。
2. Commit: `fix(toolkit): 补全所有中文翻译`

---

### Task 30: 清理 + 最终验证

**Steps:**
1. 删除不再使用的旧 `ToolLayout.tsx`（如果已被 ToolPage 替代）。
2. 运行 `npx tsc --noEmit` 确保无类型错误。
3. 运行 `npm run dev` 验证首页网格、工具切换、收藏、最近使用、状态持久化。
4. Commit: `chore(toolkit): 清理旧代码，翻新完成`
