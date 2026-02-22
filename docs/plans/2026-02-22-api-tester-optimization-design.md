# API Tester 优化设计

## 概述

对 Pandora 的 API Tester 模块进行全面优化，对标 Postman 核心功能。

## 1. 可拖拽布局

### 通用组件提取
- 从 DB Manager 的 `AppLayout` 提取为 `src/components/ResizableLayout.tsx`（左右分割）
- 新建 `src/components/ResizableSplit.tsx`（上下分割）
- API Tester、Toolkit、Script Runner 统一复用

### API Tester 布局改造
- 侧边栏：左右拖拽调整宽度（默认 260px，范围 180-500px）
- 请求/响应面板：上下拖拽调整比例（默认 50/50）
- 替换现有 CSS 硬编码布局

## 2. Collection 文件夹嵌套（最多 3 层）

- 后端 `collections` 表已支持 `parent_id`
- 前端改为递归树组件，最多 3 层嵌套
- 支持展开/折叠、右键菜单（新建子文件夹、重命名、删除）
- 拖拽请求到文件夹中

## 3. 环境变量模板语法

- URL、Headers、Body 中支持 `{{variableName}}` 语法
- 发送前自动替换为当前环境变量值
- URL 输入框中 `{{xxx}}` 高亮为橙色
- 变量来源：当前环境的 Variables

## 4. 脚本增强

在现有 `pm.*` API 基础上增加：
- `pm.response.to.have.status(code)` 链式断言
- `pm.response.to.have.header(key)` 链式断言
- `pm.collectionVariables.get/set` 集合级变量
- console.log 输出展示在测试结果面板

## 5. Cookie 管理器

- Tauri 后端新增 Cookie Store（SQLite 表）
- 发送请求时自动匹配 domain 附加 Cookie 头
- 收到响应时解析 Set-Cookie 并存入
- Cookie Manager 弹窗：查看/编辑/删除，按域名分组
- 工具栏 🍪 按钮

## 6. Swagger URL 全量导入

- ImportApiModal 新增 "URL 导入" tab
- 输入 Swagger/OpenAPI URL，后端拉取内容
- 增强 parseOpenAPI：支持 YAML（js-yaml）、$ref 引用解析
- 自动拼接 baseUrl + path 为完整 URL
- 根据 schema 自动生成示例请求 Body
- 每个 tag 变成一个文件夹
