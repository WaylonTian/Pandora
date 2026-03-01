# Redis Manager — Design Document

## 定位
Pandora 第五个模块，独立于 db-manager，专注 Redis KV 数据库的连接管理、数据浏览和操作。参考 Another Redis Desktop Manager (ARDM)。

## MVP 范围

### 连接管理
- Standalone 模式（host/port/password/db 0-15）
- 连接测试（PING）
- JSON 持久化 `~/.pandora/redis-manager/connections.json`
- 多连接同时打开

### Key 浏览器
- SCAN 分页加载（不用 KEYS *）
- 按 `:` 分隔符自动树形分组
- glob pattern 过滤
- 显示 key 类型图标 + TTL
- 新增 / 删除 / 重命名 key

### 值查看器（5 种类型 + 多格式）
- String → 多格式切换（Text / JSON / Hex / Binary），Monaco 编辑器
- Hash → 表格（field/value），增删改 field
- List → 有序列表，push/pop/remove
- Set → 成员列表，add/remove
- ZSet → score+member 表格，排序/修改 score
- TTL 查看/修改/移除

### CLI Console
- 命令输入 + 结果展示
- 命令历史（上下键）

## UI 布局

```
ResizableLayout (水平拖拽, defaultSidebarWidth=260)
├── sidebar: ConnectionList + KeyBrowser
└── main: ResizableSplit (垂直拖拽, defaultTopRatio=0.65)
    ├── top: ValueViewer (Key 详情/编辑)
    └── bottom: CliConsole
```

复用 `@/components/ResizableLayout` 和 `@/components/ResizableSplit`。

## 技术方案

### Rust 后端
- crate: `redis` (tokio-comp, aio)
- 目录: `src-tauri/src/redis/` (mod.rs, types.rs, connection.rs, commands.rs, config.rs)
- 连接管理: `MultiplexedConnection` per connection

### 前端
- 目录: `src/modules/redis-manager/`
- Store: Zustand，与 db-manager 模式一致
- UI: 复用 ResizableLayout / ResizableSplit / shadcn primitives

### 数据模型
```rust
struct RedisConnectionConfig { id, name, host, port, password?, database(u8) }
struct KeyInfo { key, key_type, ttl, size }
struct ScanResult { cursor, keys: Vec<KeyInfo> }
enum RedisValue { String(Vec<u8>), Hash, List, Set, ZSet, None }
```

### 持久化
- 连接配置: `~/.pandora/redis-manager/connections.json`

## 注册清单
- main.tsx: registerPanel
- Sidebar.tsx: Redis 图标
- App.tsx: Ctrl+5 快捷键
- i18n/en.ts + zh.ts: redisManager.* 文案
- Cargo.toml: redis 依赖
- lib.rs: mod redis + AppState + invoke_handler
