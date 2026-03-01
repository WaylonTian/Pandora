# Pandora — 开发者日常工具集合平台

## 概述

Pandora 是一个桌面端开发者工具集合平台，将 API 测试、数据库管理、实用小工具、脚本执行器等日常开发工具整合到一个统一界面中，支持 IntelliJ 风格的窗口拖拽布局。

## 核心决策

| 决策项 | 选择 | 理由 |
|---|---|---|
| 与现有项目关系 | 嵌入式，代码迁移到 pandora | 技术栈一致，迁移成本低，深度集成更容易 |
| 布局系统 | dockview | React 原生支持，拖拽/分割/标签页/浮动窗口，开箱即用 |
| 插件架构 | 内置优先 + 约定式扩展 | 先做好核心，定义接口后再开放扩展 |
| 脚本执行器 | 多语言，调用系统运行时 | 实现简单，覆盖面广，无需内嵌运行时 |
| 第一版范围 | 核心四模块 | 先做扎实，后续按路线图迭代 |

## 技术栈

| 层级 | 技术 |
|---|---|
| 桌面框架 | Tauri 2 (Rust) |
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 7 |
| 状态管理 | Zustand |
| 样式方案 | Tailwind CSS |
| UI 组件 | shadcn/ui |
| 布局系统 | dockview |
| 代码编辑器 | Monaco Editor |
| 后端 HTTP | reqwest |
| 后端 DB 驱动 | mysql_async + tokio-postgres + rusqlite |

## 第一版（V1）— 核心四模块

### 1. 布局框架

基于 dockview 的可拖拽窗口系统：
- 面板可自由拖拽、分割、合并、浮动
- 标签页支持（同一区域多个面板切换）
- 布局持久化（保存/恢复用户自定义布局）
- 预设布局模板（默认、紧凑、宽屏等）

### 2. API 测试模块（迁移自 GetMan）

- HTTP 请求：GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS
- 请求体编辑：JSON/Form Data/Raw/Binary
- 响应美化：JSON 格式化、语法高亮、树形展示
- 集合管理：树形结构、拖拽排序、文件夹组织
- 环境变量：多环境切换、`{{variable}}` 插值
- 历史记录：自动保存、一键恢复
- WebSocket 支持
- 请求时序可视化
- 代码生成（10 种语言）
- 导入：Postman 集合、OpenAPI、cURL
- Pre/Post 脚本

### 3. 数据库管理模块（迁移自 DBLite）

- 支持 MySQL、PostgreSQL、SQLite
- 连接管理：配置持久化、连接测试
- SQL 编辑器：Monaco Editor、语法高亮
- 多条 SQL 批量执行
- 查询结果表格展示、排序
- 查询历史记录
- 数据导出：CSV、JSON
- 树形数据库/表浏览
- 表结构查看

### 4. 小工具集

统一的插件接口，每个工具实现：`{ name, icon, component, category }`

第一版内置工具：
- **JSON** — 格式化、压缩、校验、JSON ↔ 其他格式转换
- **时间戳** — 时间戳 ↔ 日期互转、时区转换、当前时间戳
- **Base64** — 编码/解码、文件 Base64
- **加解密** — MD5、SHA 系列、AES、RSA、HMAC
- **URL 编解码**
- **IP 信息展示** — 本机 IP、公网 IP、IP 归属地查询
- **Hosts 编辑** — 读取/编辑系统 hosts 文件，快速切换
- **UUID 生成器**

### 5. 脚本执行器

- 脚本管理：导入文件 / 手动创建 / 分组管理
- 执行器选择：Node.js / Python / Bash / PowerShell / 自定义
- 自动检测系统已安装的运行时
- 实时输出：stdout/stderr 流式展示
- 执行历史记录
- 脚本编辑器（Monaco Editor）

## 项目结构（预期）

```
pandora/
├── src/                          # React 前端
│   ├── main.tsx                  # 入口
│   ├── App.tsx                   # 根组件 + dockview 布局
│   ├── layouts/                  # 布局配置与管理
│   ├── modules/                  # 核心模块
│   │   ├── api-tester/           # API 测试（迁移自 GetMan）
│   │   ├── db-manager/           # 数据库管理（迁移自 DBLite）
│   │   ├── toolkit/              # 小工具集
│   │   │   ├── plugin-interface.ts  # 插件接口定义
│   │   │   ├── json/
│   │   │   ├── timestamp/
│   │   │   ├── base64/
│   │   │   ├── crypto/
│   │   │   ├── url-codec/
│   │   │   ├── ip-info/
│   │   │   ├── hosts-editor/
│   │   │   └── uuid/
│   │   └── script-runner/        # 脚本执行器
│   ├── components/               # 共享 UI 组件（shadcn/ui）
│   ├── stores/                   # Zustand 状态管理
│   ├── hooks/                    # 共享 hooks
│   └── lib/                      # 工具函数
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   ├── lib.rs                # Tauri 入口
│   │   ├── http/                 # HTTP 请求（迁移自 GetMan）
│   │   ├── db/                   # 数据库操作（迁移自 DBLite）
│   │   ├── script/               # 脚本执行（进程管理）
│   │   ├── system/               # 系统操作（hosts、IP 等）
│   │   └── storage/              # 本地数据持久化
│   ├── Cargo.toml
│   └── tauri.conf.json
├── docs/
│   └── plans/
└── package.json
```

## 路线图

### V2 — 扩展工具

- [ ] 正则表达式测试器（实时匹配、分组高亮、常用模板）
- [ ] Cron 表达式解析器（可视化下次执行时间）
- [ ] Diff 对比工具（文本/JSON 对比）
- [ ] 颜色工具（取色器、HEX/RGB/HSL 转换、调色板）
- [ ] Markdown 预览（实时渲染）

### V3 — 高级功能

- [ ] SSH 终端（内置远程连接）
- [ ] Redis 客户端
- [ ] 插件系统开放（用户自定义插件目录、插件加载机制）
- [ ] 插件市场（在线发现/安装社区插件）

### V4 — 平台化

- [ ] macOS / Linux 支持
- [ ] 国际化 (i18n)
- [ ] 主题系统（自定义主题）
- [ ] 数据同步（可选，导入/导出配置）
- [ ] 快捷键全局自定义
