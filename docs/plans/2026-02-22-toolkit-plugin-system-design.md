# Toolkit 优化 + uTools 插件兼容系统设计

## 概述

对 Pandora 的 Toolkit 模块进行全面优化，核心目标：
1. 兼容 uTools 插件格式，可直接加载运行 uTools 生态中的插件
2. 内置插件市场，从 uTools 官方市场搜索、下载、安装插件
3. 优化现有内置工具的交互体验
4. 新增高频实用工具
5. 统一架构，内置工具和外部插件共存

## 架构设计

```
┌─────────────────────────────────────────────┐
│  Pandora (Tauri + React)                    │
│                                             │
│  ┌──────────┐  ┌─────────────────────────┐  │
│  │ 插件市场  │  │ 插件运行容器             │  │
│  │ (搜索/   │  │  ┌─────────────────┐    │  │
│  │  安装/   │  │  │ iframe 沙箱      │    │  │
│  │  管理)   │  │  │  index.html     │    │  │
│  │          │  │  │  + utools shim  │    │  │
│  └──────────┘  │  │  + preload shim │    │  │
│                │  └────────┬────────┘    │  │
│  ┌──────────┐  │           │ postMessage │  │
│  │ 插件存储  │  │  ┌────────▼────────┐    │  │
│  │ (本地DB) │◄─┤  │ Bridge Host     │    │  │
│  └──────────┘  │  │ (API 兼容层)     │    │  │
│                │  └────────┬────────┘    │  │
│                │           │ invoke      │  │
│                │  ┌────────▼────────┐    │  │
│                │  │ Tauri Backend   │    │  │
│                │  │ (fs/clipboard/  │    │  │
│                │  │  shell/etc)     │    │  │
│                └──┴─────────────────┴────┘  │
└─────────────────────────────────────────────┘
```

- 内置工具：React 组件直接渲染（零开销）
- uTools 插件：iframe 沙箱加载，通过 postMessage 桥接 API

## 插件包格式与安装

### .upxs 解包

uTools 的 `.upxs` 文件是 Electron asar 归档格式。Tauri 后端用 Rust 实现 asar 解包。

### 安装流程

```
用户点击安装
  → 从 res.u-tools.cn 下载 .upxs
  → Tauri 后端 Rust 解包 asar
  → 读取 plugin.json 验证合法性
  → 存储到 ~/.pandora/plugins/{plugin-id}/
  → 本地 DB 注册插件元数据
  → UI 刷新
```

### 本地目录结构

```
~/.pandora/
├── plugins/
│   ├── markdown-note/
│   │   ├── plugin.json
│   │   ├── index.html
│   │   └── ...
│   └── json-editor/
│       └── ...
├── plugin-db/          # 每个插件独立数据库
│   ├── markdown-note/
│   └── json-editor/
└── plugins-registry.json  # 已安装插件索引
```

## uTools API 兼容层

### P0 — 核心 API（90% 插件依赖）

| API | 实现方式 |
|-----|---------|
| `utools.onPluginEnter(cb)` | iframe 加载后 postMessage 触发 |
| `utools.onPluginOut(cb)` | 插件 tab 关闭/切换时触发 |
| `utools.db.put/get/remove/allDocs/bulkDocs` | Tauri 后端 SQLite，每插件独立库 |
| `utools.db.promises.*` | 同上 async 版本 |
| `utools.dbStorage.setItem/getItem/removeItem` | 基于 db 的 KV 封装 |
| `utools.copyText(text)` | Tauri clipboard API |
| `utools.copyImage(path\|base64)` | Tauri clipboard API |
| `utools.showNotification(text)` | Tauri notification API |
| `utools.getPath(name)` | Tauri path API |
| `utools.shellOpenExternal(url)` | Tauri shell open |
| `utools.shellOpenPath(path)` | Tauri shell open |
| `utools.getUser()` | 本地模拟用户 |
| `utools.isDarkColors()` | 读取 Pandora 主题状态 |

### P1 — 增强 API

| API | 实现方式 |
|-----|---------|
| `utools.setExpendHeight(h)` | postMessage 调整 iframe 高度 |
| `utools.showMainWindow()` / `hideMainWindow()` | Tauri 窗口控制 |
| `utools.hideMainWindowPasteText(text)` | 隐藏窗口 + 模拟粘贴 |
| `utools.redirect(code, payload)` | Pandora 内切换插件功能 |
| `utools.onMainPush(cb, onSelect)` | 搜索框推送 |
| `utools.db.postAttachment/getAttachment` | Tauri fs 二进制存储 |

### P2 — preload.js 兼容

```
preload.js 中的 require() 调用
  → 静态分析提取 require 的模块
  → 常用 Node.js 模块（fs, path, os, child_process, crypto）
    在 Tauri Rust 侧实现
  → IPC bridge 暴露为同步/异步 API
  → 注入 shimmed require() 到 iframe
```

Electron 模块映射：
- `clipboard` → Tauri clipboard
- `nativeImage` → Rust image 库

### 不兼容

- `utools.ubrowser` — 可编程浏览器，暂不实现
- `utools.pay` — 支付系统，不适用

## 插件市场

### 数据来源

第一版直接爬取 uTools 官方市场：
- 列表：`u-tools.cn/plugins/topic/{id}/` 解析 HTML
- 详情：`u-tools.cn/plugins/detail/{name}/` 解析 HTML
- 下载：从详情页提取 `res.u-tools.cn/plugins/xxx.upxs` 链接
- 本地缓存避免频繁请求

### 市场 UI

- 搜索栏 + 分类标签（最受欢迎/程序员必备/高效办公/AI/图像视频/系统工具）
- 插件卡片：图标、名称、简介、评分、用户数、大小
- 详情页：截图、介绍、安装按钮、兼容性标识
- 已安装管理：启用/禁用、卸载、数据清理、本地导入

## 内置工具优化

### 交互体验

- 所有输出区增加一键复制按钮
- 输入输出互换按钮
- 拖拽文件到输入区
- 操作历史记录（最近 20 条）

### 通用组件抽象

- `ToolLayout` — 标题 + 操作栏 + 内容区骨架
- `CodeArea` — 带行号、高亮、复制的输入/输出区
- `ActionBar` — 操作按钮组统一样式

### 新增内置工具

- 正则表达式测试器
- 颜色转换器（HEX/RGB/HSL）
- JWT 解码器
- Cron 表达式解析
- 进制转换（2/8/10/16）
- 文本 Diff 对比
- 二维码生成/识别

### 搜索与导航

- 侧边栏搜索框（模糊匹配）
- 最近使用列表
- 收藏置顶
- `Ctrl+K` 全局搜索

## 整体 UI 布局

```
┌─ 侧边栏 ──────────┬─ 主内容区 ──────────────────┐
│                    │                              │
│ 🔍 搜索工具        │  [当前选中的工具/插件内容]     │
│                    │                              │
│ ⭐ 收藏            │  内置工具: React 组件直接渲染   │
│ 🕐 最近使用        │  uTools 插件: iframe 渲染      │
│                    │                              │
│ ── 内置工具 ──     │                              │
│  {} JSON           │                              │
│  T  时间戳         │                              │
│  ...               │                              │
│                    │                              │
│ ── 已安装插件 ──   │                              │
│  📝 Markdown 笔记  │                              │
│  🔐 编码小助手     │                              │
│  ...               │                              │
│                    │                              │
│ ── 插件市场 ──     │                              │
│  🏪 浏览市场       │                              │
└────────────────────┴──────────────────────────────┘
```
