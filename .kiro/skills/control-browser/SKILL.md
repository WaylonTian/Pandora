---
name: "control-browser"
description: "当需要使用浏览器、操作网页、验证前端效果、截图测试时使用。触发词：浏览器, 打开网页, 截图, 页面验证, playwright, chrome"
---

# 操作浏览器

使用 `playwright` MCP server 提供的工具：`execute_script`、`get_page_layout`、`switch_tab`、`close_tab`。

## 快速决策

| 情况 | 做法 |
|------|------|
| 服务器没启动 | 检查并启动开发服务器 |
| 需要登录 | 调用 `account-password-query` 获取账号密码 |
| 点击后等 API | `async with page.expect_response("**/api/xxx"):` |
| 页面有 WebSocket/轮询 | **禁止** `networkidle`，用 `domcontentloaded` |
| 多 tab 操作 | 用 `switch_tab` / `close_tab` 切换 |
| 截图后 | 截图图片直接在响应中返回显示 |
| 陌生页面/元素太多 | 先用 `get_page_layout` 看布局，再精准扫描目标区域 |

## 推荐工作流：先看布局再精准操作

面对陌生页面时，不要直接扫全页面元素（可能返回 1000+ 个），用逐层下钻的方式：

1. `get_page_layout` → 了解页面有哪些区域，拿到选择器
2. `get_page_layout(scope=".some-region")` → 下钻到目标区域看子布局
3. `execute_script(capture_interactive_elements=".target-region")` → 只扫目标区域的可交互元素

返回的 `selector` 可直接传给 `capture_interactive_elements` 使用。

## 脚本编写要点

预置变量：`page`, `context`, `browser`, `temp_dir`
辅助函数：`await screenshot(name)`, `log(message)`

```python
await page.goto("http://localhost:5173/app/")
await page.wait_for_load_state("domcontentloaded")
await page.locator("#username").fill("admin")
await page.locator("#password").fill("123456")
await page.locator("#login-btn").click()
await page.wait_for_url("**/dashboard")
await screenshot("01_login_success.jpg")
```

## 等待策略

Playwright 内置自动等待：`click()` 自动等可见可点击，`fill()` 自动等可编辑。

需要手动等待的场景：

| 场景 | 方法 |
|------|------|
| 页面加载 | `await page.wait_for_load_state("domcontentloaded")` |
| 元素出现 | `await page.wait_for_selector(".modal")` |
| URL 变化 | `await page.wait_for_url("**/dashboard")` |
| 点击后等 API | `async with page.expect_response("**/api/submit") as r:` |

### ⚠️ 禁止

```python
# ❌ WebSocket/轮询会卡死
await page.wait_for_load_state("networkidle")

# ❌ 浪费时间
await page.wait_for_timeout(3000)

# ❌ 多余（click 已自动等待）
await page.wait_for_selector("#btn")
await page.click("#btn")
```

## 标准流程

1. 检查开发服务器是否运行，未运行则启动（确认 `ready in` / `Local:` / `listening on`）
2. 确定 URL：读 `vite.config.ts` 的 `base` + `server.port`
3. 执行操作并截图验证
4. 查看返回的截图和 `console_logs`，检查是否有错误

## 常见错误

| 错误 | 解决 |
|------|------|
| `TimeoutError` | 检查选择器、用 `wait_for_selector` |
| `Target closed` | 重新连接或 `switch_tab` |
| `Element not visible` | `scroll_into_view_if_needed()` |
| `networkidle timeout` | 改用 `domcontentloaded` |
| `strict mode violation` | 用更精确的选择器或 `.first` |

## 截图时机

页面加载完成 ✅ | 登录后 ✅ | 关键交互后 ✅ | 出错时 ✅ | 中间过渡状态 ❌

## 强制规则

1. 修改 `.vue/.jsx/.tsx/.css/.html` 后必须截图验证
2. 截图直接显示在响应中，仔细查看内容
3. 服务器启动、登录都自动处理，不问用户
4. 发现问题修复后重新验证，最多 2 次
