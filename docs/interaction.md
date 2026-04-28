# 交互规则

## 核心原则

**终端输入直接发送到 PTY，由 Claude CLI 处理；应用级快捷键由 DOM 捕获期监听器处理。**

```
用户按键 → DOM 捕获期 → useAppShortcuts.handleKeydown
                  ↓
         匹配应用快捷键？
         ├─ 是 → 执行应用操作（阻止默认行为）
         └─ 否 → xterm.js.onData → PTY → Claude CLI
```

## 快捷键处理架构

### 三种输入场景

| 场景 | 焦点位置 | 事件流 | 处理机制 |
|------|---------|--------|----------|
| **1. 终端聚焦** | xterm.js | DOM keydown（捕获期） → handleKeydown → xterm.js | 应用快捷键优先，终端按键传给 PTY |
| **2. 网页内容聚焦** | 其他 UI 元素 | DOM keydown（捕获期） → handleKeydown | 应用快捷键生效 |
| **3. 标题栏点击** | 窗口框架 | Window.onFocusChanged → Webview.setFocus | 恢复 webview 焦点，DOM 快捷键重新生效 |

### 关键技术：DOM 捕获期监听

```typescript
// src/App.vue
window.addEventListener('keydown', handleKeydown, true)
//                                              ^^^^
//                                         捕获期（true）
```

**事件传播顺序**：
```
1. 捕获期（由外向内）：Window → Document → 目标元素
2. 目标期：目标元素自身处理
3. 冒泡期（由内向外）：目标元素 → Document → Window
```

使用捕获期（`true`）确保 `handleKeydown` **在 xterm.js 处理之前**执行，能够正确拦截应用快捷键。

### 窗口焦点恢复

```typescript
// src/composables/useAppShortcuts.ts
async function setupFocusRecovery() {
  const win = getCurrentWindow()
  unlistenFocus = await win.onFocusChanged(({ payload: focused }) => {
    if (focused) {
      // 窗口获得焦点时，恢复 webview 焦点
      getCurrentWebview().setFocus().catch(() => {})
    }
  })
}
```

**触发场景**：
- 用户点击标题栏拖动窗口
- 用户双击标题栏最大化/还原
- 用户 Alt+Tab 切换回应用

## 应用级快捷键

所有应用级快捷键定义在 `src/composables/useAppShortcuts.ts`：

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| Alt+N | 新建会话 | 仅终端视图有效 |
| Alt+R | 重启会话 | 仅终端视图有效 |
| Ctrl+Shift+N | 新建应用实例 | 启动独立的进程实例 |
| Ctrl+Shift+← | 窗口左移半屏 | 将窗口移动到屏幕左半边 |
| Ctrl+Shift+→ | 窗口右移半屏 | 将窗口移动到屏幕右半边 |
| Ctrl+Shift+R | 重启应用 | 清理所有 PTY 并刷新页面 |
| Ctrl+, | 打开设置 | 打开全局设置浮层 |
| Ctrl+Plus / Ctrl+= | 增大字体 | 终端字体 +1 |
| Ctrl+Minus | 缩小字体 | 终端字体 -1 |
| Ctrl+0 | 重置字体 | 终端字体恢复为 12 |

**终端视图可见性检查**：
部分快捷键（Alt+N、Alt+R）仅在终端视图可见时生效，避免在 Welcome/Projects 视图中误触发。

**实现代码**：
```typescript
async function handleKeydown(e: KeyboardEvent) {
  const ctrl = e.ctrlKey || e.metaKey
  const shift = e.shiftKey
  const key = e.key

  // Ctrl+Shift+N — 新建窗口
  if (ctrl && shift && key === 'N') {
    e.preventDefault()
    e.stopPropagation()
    openNewWindow()
    return
  }

  // ... 其他快捷键处理
}
```

## 终端快捷键（Claude CLI 处理）

终端内的快捷键由 xterm.js 原生处理，通过 `onData` 发送到 PTY：

### xterm.js 数据流

```typescript
// src/components/XTermTerminal.vue
term.onData(data => {
  const instance = terminalInstances.get(tabId)
  if (instance) {
    ptyInput(instance.ptyId, data)  // 发送到 PTY
  }
})
```

### Claude CLI 常用快捷键

| 快捷键 | 功能 | 由谁处理 |
|--------|------|----------|
| Ctrl+C | 取消输入/生成 | xterm.js → PTY → Claude CLI |
| Ctrl+D | 退出 Claude Code | xterm.js → PTY → Claude CLI |
| Ctrl+L | 清屏 | xterm.js → PTY → Claude CLI |
| Ctrl+R | 反向搜索历史 | xterm.js → PTY → Claude CLI |
| Ctrl+B | 后台运行任务 | xterm.js → PTY → Claude CLI |
| Ctrl+W | 删除前一个单词 | xterm.js → `\x17` → PTY |
| Alt+P | 切换模型 | xterm.js → PTY → Claude CLI |
| Alt+T | 扩展思考 | xterm.js → PTY → Claude CLI |
| Ctrl+A/E | 行首/行尾 | xterm.js → PTY → Claude CLI |
| Ctrl+K/U | 删除到行尾/行首 | xterm.js → PTY → Claude CLI |

### Ctrl+W 特殊处理

**Tauri vs Electron**：

| 框架 | Ctrl+W 行为 | 处理方式 |
|------|-------------|----------|
| Electron | 浏览器内核会拦截关闭标签页 | 需要 `before-input-event` 手动拦截 |
| Tauri | 无特殊绑定，正常传递到 webview | xterm.js 原生处理即可 |

**Tauri 中的处理流程**：
```
用户按 Ctrl+W
  ↓
xterm.js 内部处理
  ↓
term.onData('\x17')  // 自动转换为 ASCII 0x17
  ↓
ptyInput('\x17')
  ↓
PTY → Claude CLI
  ↓
readline 删除前一个单词
```

**无需额外代码** — xterm.js 会自动将 Ctrl+W 转换为 `\x17` 字符。

### Ctrl+V 粘贴处理

```typescript
// src/components/XTermTerminal.vue
term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 'v') {
    event.preventDefault()
    readText().then(text => {
      if (text) term.paste(text)
    })
    return false  // 阻止 xterm.js 处理
  }
  return true  // 其他按键交给 xterm.js
})
```

## Slash 命令

在 Claude CLI 中输入 `/` 触发：

- `/clear` — 清除对话
- `/compact` — 压缩上下文
- `/help` — 显示帮助
- `/cost` — 显示费用
- `/model` — 切换模型
- `/config` — 打开配置
- `/init` — 初始化项目
- `/memory` — 内存管理

GUI 层不处理这些命令，完全由 Claude CLI 处理。

## Bash 模式

输入 `!` 开头进入 Bash 模式：

```
! npm test
! git status
```

输出添加到对话上下文，支持 Ctrl+B 后台运行。

## 多行输入

Claude CLI 支持：

| 方法 | 快捷键 |
|------|--------|
| 快速转义 | `\` + Enter |
| Alt 键 | Alt+Enter（需配置） |
| Shift+Enter | Shift+Enter（部分终端支持） |
| 控制序列 | Ctrl+J |

## 视图切换

| 场景 | 触发 |
|------|------|
| 启动无收藏 | → WelcomeView |
| 启动有收藏 | → ProjectSelectView |
| 选择项目 | → TerminalView |
| 点击返回 | → ProjectSelectView |
| Escape（终端） | Claude CLI 处理（不退出视图） |

## 鼠标交互

- **文本选择**：xterm.js 原生支持
- **链接点击**：WebLinksAddon 处理
- **复制粘贴**：
  - Ctrl+C/V（需聚焦终端）
  - 右键菜单（系统上下文菜单）
- **侧边栏**：点击外部区域关闭侧边栏

## 与 Electron 架构的差异

| 特性 | Electron | Tauri |
|------|----------|-------|
| 快捷键拦截 | `before-input-event` | DOM 捕获期监听 |
| Ctrl+W 处理 | 需手动拦截发送 | xterm.js 原生处理 |
| 焦点恢复 | webContents.focus | Webview.setFocus |
| 事件系统 | ipcMain/ipcRenderer | invoke/listen |
| 进程通信 | webContents.send | emit |

## GUI 增强边界

| 增强 | 做 | 不做 |
|------|----|----|
| 终端主题 | 浅色 + 预设 | AI 补全 |
| 多终端 | 标签切换 | 复杂布局 |
| 会话历史 | SerializeAddon | 导出文件 |
| 项目收藏 | 快速切换 cwd | 拖拽排序 |
| 快捷命令 | 命令面板（Phase 3） | 拦截 Claude 命令 |
| 搜索 | SearchAddon | 高级过滤 |
