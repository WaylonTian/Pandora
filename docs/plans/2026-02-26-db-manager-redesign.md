# DB Manager 整体翻新实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 整体翻新 DB Manager 的五大区域（连接、SQL Query、数据库树、元数据、Filter），修复已知 bug，UI/UX 对标 Navicat 风格。

**Architecture:** 前后端同步改造。后端修复 db context 切换 bug、新增 SSH/SSL 支持和查询取消；前端重写连接弹窗、数据库树、Filter 组件，增强 SQL 编辑器和元数据面板。

**Tech Stack:** Tauri 2 (Rust) + React 19 + TypeScript + Monaco Editor + Tailwind CSS + Zustand

---

## Task 1: 修复 DB Context 切换 Bug（后端）

**问题：** `list_tables_mysql` 执行 `USE db` 改变了连接的 database context，导致后续 `execute_query` 在错误的 db 上执行。

**Files:**
- Modify: `src-tauri/src/db/commands.rs` — `execute_query`、`execute_batch`、`get_table_info`、`get_table_ddl`、`get_table_stats`、`explain_query` 增加可选 `database` 参数
- Modify: `src-tauri/src/db/schema.rs` — `list_tables_mysql`、`get_table_info_mysql` 等函数在操作前先 `USE database`
- Modify: `src-tauri/src/db/query.rs` — `execute_mysql` 在执行前根据 database 参数切换 context
- Modify: `src-tauri/src/lib.rs` — 更新 invoke_handler 注册（如有新命令）

**Steps:**
1. 给 `execute_query`、`execute_batch` 命令增加可选参数 `database: Option<String>`，在执行 SQL 前先发送 `USE {database}`（MySQL）或 `SET search_path TO {database}`（PG）
2. 同样处理 `get_table_info`、`get_table_ddl`、`get_table_stats`、`explain_query`
3. 前端 `tauriCommands` 对应函数签名增加 `database?` 参数
4. 前端 store 中所有调用这些命令的地方，传入当前 tab 关联的 database
5. 提交：`fix: 修复多数据库切换时 SQL 执行上下文错误`

---

## Task 2: 修复 ConnectionDialog Backdrop 关闭 + database 字段改为可选

**问题：** 点击弹窗外部区域就关闭了；database 是必填但应该可选。

**Files:**
- Modify: `src/modules/db-manager/components/ConnectionDialog.tsx`
  - 移除 `handleBackdropClick` 中的 `onClose()` 调用，改为空操作或仅阻止冒泡
  - `database` 字段的 `required` 改为 false，`validateForm` 中移除 database 必填校验
  - 对 MySQL/PG：database 输入框 placeholder 改为 "可选，留空连接后选择"
- Modify: `src-tauri/src/db/types.rs` — `ConnectionConfig.database` 从 `String` 改为 `Option<String>`
- Modify: `src-tauri/src/db/connection.rs` — 连接创建时 database 为空则不指定默认 db
- Modify: `src-tauri/src/db/types.rs` — `validate()` 移除 database 必填校验
- Modify: `src/modules/db-manager/store/index.ts` — `ConnectionConfig.database` 改为 `string | undefined`

**Steps:**
1. 后端：`ConnectionConfig.database` 改为 `Option<String>`，更新 validate、连接创建逻辑
2. 前端：ConnectionDialog 移除 backdrop 关闭，database 改为可选
3. 前端：store 中 ConnectionConfig 类型同步更新
4. 提交：`fix: 连接弹窗点击外部不再关闭 + database 字段改为可选`

---

## Task 3: ConnectionDialog 增加 SSH 隧道和 SSL/TLS 配置

**Files:**
- Modify: `src-tauri/src/db/types.rs` — ConnectionConfig 增加 SSH 和 SSL 字段
- Modify: `src-tauri/src/db/connection.rs` — 连接创建时处理 SSH 隧道（用 `async-ssh2-tokio` 或 `russh`）和 SSL
- Modify: `src-tauri/Cargo.toml` — 添加 SSH/SSL 依赖
- Modify: `src/modules/db-manager/store/index.ts` — TS 类型同步
- Modify: `src/modules/db-manager/components/ConnectionDialog.tsx` — 新增"高级"折叠区域

**新增字段（ConnectionConfig）：**
```rust
// SSH Tunnel
pub ssh_enabled: bool,
pub ssh_host: Option<String>,
pub ssh_port: Option<u16>,       // 默认 22
pub ssh_username: Option<String>,
pub ssh_auth_type: Option<String>, // "password" | "key"
pub ssh_password: Option<String>,
pub ssh_key_path: Option<String>,

// SSL/TLS
pub ssl_enabled: bool,
pub ssl_ca_cert: Option<String>,   // 文件路径
pub ssl_client_cert: Option<String>,
pub ssl_client_key: Option<String>,
pub ssl_skip_verify: bool,
```

**UI 设计（Navicat 风格）：**
- 弹窗底部增加"SSH"和"SSL"两个折叠 section
- SSH section：启用开关 → host/port/username → 认证方式切换（密码/密钥文件）
- SSL section：启用开关 → CA 证书/客户端证书/客户端密钥（文件选择按钮）→ 跳过验证 checkbox
- SQLite 时隐藏 SSH/SSL section

**Steps:**
1. 后端：types.rs 增加字段，connection.rs 实现 SSH 隧道建立逻辑
2. 前端：store 类型同步，ConnectionDialog 增加高级配置 UI
3. i18n：en.ts/zh.ts 增加 SSH/SSL 相关文案
4. 提交：`feat: 连接配置支持 SSH 隧道和 SSL/TLS`

---

## Task 4: 数据库树重设计 — 懒加载 + 搜索 + 丰富右键菜单

**Files:**
- Rewrite: `src/modules/db-manager/components/DatabaseTree.tsx`
- Modify: `src/modules/db-manager/store/index.ts` — 增加 loadedDatabases Set、搜索过滤状态

**行为重设计：**
- 连接展开 → 显示所有 db 名称，但 db 节点默认"未加载"状态（无展开箭头，灰色图标）
- 点击/双击 db → 首次加载表列表 → 变为"已加载"（有箭头，正常图标），结果缓存
- 右键 db → "刷新" 清除缓存重新加载
- 已加载 db 折叠/展开不重新请求

**搜索框：**
- 树顶部增加搜索输入框，实时过滤 db 名和表名
- 匹配时自动展开父节点

**右键菜单增强：**
- 连接节点：连接/断开、刷新、编辑、删除
- 数据库节点：刷新、新建查询、复制名称
- 表节点：查看数据、查看结构、复制表名、生成 `SELECT * FROM table LIMIT 100`、截断表、删除表

**对象类型分组（Navicat 风格）：**
- db 下分组显示：Tables / Views / Functions / Procedures / Triggers
- 后端需新增命令：`list_views`、`list_functions`、`list_procedures`、`list_triggers`

**Steps:**
1. 后端：schema.rs 新增 list_views/list_functions/list_procedures/list_triggers，commands.rs 注册
2. 前端 store：增加 loadedDatabases、treeSearchQuery 状态和 action
3. 重写 DatabaseTree 组件：懒加载逻辑、搜索框、对象分组、增强右键菜单
4. i18n 增加新文案
5. 提交：`feat: 数据库树重设计 - 懒加载/搜索/对象分组/增强右键`

---

## Task 5: SQL Editor 修复光标 Bug + 查询取消 + 补全增强

**Files:**
- Modify: `src/modules/db-manager/components/SqlEditor.tsx` — 修复 Monaco 补全光标问题
- Modify: `src/modules/db-manager/lib/sqlCompletion.ts` — 基于 schema 动态补全
- Modify: `src/modules/db-manager/store/index.ts` — 增加 cancelQuery action
- New: `src-tauri/src/db/cancel.rs` — 查询取消逻辑
- Modify: `src-tauri/src/db/commands.rs` — 新增 `cancel_query` 命令
- Modify: `src-tauri/src/lib.rs` — 注册 cancel_query

**光标 Bug 修复：**
- 排查 sqlCompletion provider 的 `insertText` 和 `range` 配置
- 确保补全项的 `insertTextRules` 正确设置，不干扰光标位置

**查询取消：**
- 后端：MySQL 用 `KILL QUERY {thread_id}`，PG 用 `SELECT pg_cancel_backend({pid})`，SQLite 用 `sqlite3_interrupt`
- 需要在 execute 时记录 thread_id/pid，cancel 时用另一个连接发送取消命令
- 前端：执行中显示"取消"按钮，点击调用 `cancel_query`

**补全增强：**
- sqlCompletion.ts 接收当前连接的 schema 信息（已加载的 tables、columns）
- 动态注册表名、列名补全项
- 输入 `tablename.` 时自动补全该表的列名

**Steps:**
1. 修复 Monaco 补全光标 bug
2. 后端实现 cancel_query
3. 前端 store 增加 cancelQuery，SqlEditor 增加取消按钮
4. sqlCompletion 增强为 schema-aware
5. 提交：`feat: SQL 编辑器修复光标 + 查询取消 + 智能补全`

---

## Task 6: QueryResult 增强 — INSERT 导出 + 大文本展开

**Files:**
- Modify: `src/modules/db-manager/components/QueryResult.tsx`
  - 新增 `generateInsertSQL()` 函数和导出按钮
  - 单元格点击展开：超长内容截断显示，点击弹出 Monaco 只读查看器
- New: `src/modules/db-manager/components/CellDetailModal.tsx` — 单元格详情弹窗

**INSERT 导出：**
```typescript
function generateInsertSQL(result: QueryResult, tableName: string): string {
  const cols = result.columns.map(c => c.name).join(', ');
  return result.rows.map(row => {
    const vals = row.map(v => v === null ? 'NULL' : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v));
    return `INSERT INTO ${tableName} (${cols}) VALUES (${vals.join(', ')});`;
  }).join('\n');
}
```

**大文本展开（CellDetailModal）：**
- 点击超长单元格 → 弹出模态框
- 内容用 Monaco Editor 只读模式渲染
- 自动检测 JSON 并格式化 + 语法高亮
- 支持复制按钮

**Steps:**
1. QueryResult 增加 INSERT 导出
2. 创建 CellDetailModal 组件
3. QueryResult 表格单元格增加点击展开逻辑
4. i18n 增加文案
5. 提交：`feat: 查询结果支持 INSERT 导出和大文本展开查看`

---

## Task 7: 元数据面板修复 + 重设计

**问题：** TableMetaPanel 不显示；TableStructure 和 TableMetaPanel 职责重叠。

**Files:**
- Modify: `src/modules/db-manager/components/TableMetaPanel.tsx` — 修复渲染条件 bug，重设计为统一元数据视图
- Delete or deprecate: `src/modules/db-manager/components/TableStructure.tsx` — 功能合并到 TableMetaPanel
- Modify: `src/modules/db-manager/DbManager.tsx` — 调整 TableMetaPanel 的挂载位置和条件

**重设计：**
- 统一为右侧可折叠面板，三个子 tab：
  - **结构（Columns）**：列名、类型、约束、注释、默认值，表格形式
  - **索引 & 外键**：合并展示 indexes 和 foreign keys
  - **DDL**：Monaco Editor 只读模式渲染，语法高亮 + 一键复制
- 顶部显示表统计信息栏：行数、数据大小（调用已有 `get_table_stats`）
- 修复数据加载：排查 `useActiveTab()` 和 `useActualConnectionId()` 返回值是否正确

**Steps:**
1. 排查并修复 TableMetaPanel 不显示的 bug（渲染条件、数据加载）
2. 重写 TableMetaPanel：三个子 tab + 统计信息 + DDL 语法高亮
3. DbManager.tsx 中移除 TableStructure 引用，统一用 TableMetaPanel
4. i18n 增加文案
5. 提交：`feat: 元数据面板重设计 - 统一视图/DDL 高亮/表统计`

---

## Task 8: Filter 可视化条件构建器（Navicat 风格）

**Files:**
- New: `src/modules/db-manager/components/FilterBuilder.tsx` — 可视化条件构建器
- Modify: `src/modules/db-manager/components/DataBrowser.tsx` — 替换原有 WHERE 文本输入

**UI 设计：**
```
┌─────────┬──────────┬────────────┬──────────┬───┐
│ 列名 ▼  │ 运算符 ▼ │ 值          │ AND/OR ▼ │ ✕ │
├─────────┼──────────┼────────────┼──────────┼───┤
│ name    │ LIKE     │ %john%     │ AND      │ ✕ │
│ age     │ >=       │ 18         │          │ ✕ │
└─────────┴──────────┴────────────┴──────────┴───┘
                              [+ 添加条件] [应用] [清除]
```

**FilterBuilder 组件：**
- Props：`columns: ColumnInfo[]`（从当前表获取）、`onApply: (where: string) => void`、`onClear: () => void`
- 列名下拉：从 columns 自动填充
- 运算符：`=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`, `NOT LIKE`, `IN`, `NOT IN`, `IS NULL`, `IS NOT NULL`, `BETWEEN`
- `IS NULL`/`IS NOT NULL` 时隐藏值输入框
- `BETWEEN` 时显示两个值输入框
- `IN`/`NOT IN` 时值输入框 placeholder 提示 "val1, val2, val3"
- 逻辑连接：AND / OR 下拉（最后一行不显示）
- 底部保留"高级模式"切换按钮，切回原始 WHERE 文本输入

**Steps:**
1. 创建 FilterBuilder 组件
2. DataBrowser Toolbar 中集成 FilterBuilder，替换原有文本输入
3. 保留高级模式切换
4. i18n 增加文案
5. 提交：`feat: Navicat 风格可视化 Filter 条件构建器`

---

## Task 执行顺序和依赖关系

```
Task 1 (DB Context Bug)  ──→ Task 2 (ConnectionDialog 修复) ──→ Task 3 (SSH/SSL)
                          ──→ Task 4 (数据库树)
                          ──→ Task 5 (SQL Editor)
                          ──→ Task 6 (QueryResult)
                          ──→ Task 7 (元数据面板)
                          ──→ Task 8 (Filter)
```

- Task 1 是基础，必须先做（其他 task 依赖正确的 db context）
- Task 2 依赖 Task 1（database 改为 Option 影响后端类型）
- Task 3 依赖 Task 2（在 ConnectionDialog 基础上加 SSH/SSL）
- Task 4-8 依赖 Task 1，彼此之间可并行

## 全局注意事项

- 所有用户可见文案必须同时更新 `src/i18n/en.ts` 和 `src/i18n/zh.ts`
- UI 风格对标 Navicat：简洁、直觉化、紧凑布局、清晰的视觉层级
- 每个 Task 完成后创建 git commit
- 日志使用 debug 级别，不使用 warn
