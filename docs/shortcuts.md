# 快捷键方案设计

## 设计原则

1. **修饰键语义分层**：Ctrl+Shift+* 用于应用级操作（CLI 无此组合，零冲突），Alt+* 用于会话/标签级操作，Ctrl+* 用于高频通用操作（字体、设置）
2. **平台惯例优先**：标签切换用 Ctrl+Tab（浏览器/IDE 通用），关闭标签用 Alt+W（避免与 CLI 的 Ctrl+W 删词冲突）
3. **助记映射**：键字母与功能对应（S=Sessions, N=New, R=Restart, W=Window/Close, H=Home）
4. **CLI 零侵入**：应用快捷键不占用 Claude CLI 已使用的 Ctrl+* 和 Alt+* 键位；CLI 快捷键直接穿透到终端
5. **跨平台 Mod**：文档中所有 Ctrl 在 Mac 上为 Cmd，通过 `e.ctrlKey || e.metaKey` 统一处理

## 修饰键分层

| 修饰键前缀 | 用途 | CLI 冲突风险 |
|-----------|------|-------------|
| Ctrl+Shift+* | 应用管理（窗口、面板、重启） | 无（CLI 不使用三键组合） |
| Alt+* | 会话/标签操作 | 低（避开 CLI 已用的 Alt+P/T/O/B/F） |
| Ctrl+* | 通用高频操作 | 低（仅用于字体、设置等非 CLI 键位） |

## 应用快捷键

### 窗口管理

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| Ctrl+Shift+N | 新建窗口 | 跨应用通用惯例 |
| Ctrl+Shift+← | 窗口左半屏 | 分屏工作流 |
| Ctrl+Shift+→ | 窗口右半屏 | 分屏工作流 |
| Ctrl+Shift+R | 重启应用 | 开发调试用 |

### 视图导航

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| Ctrl+Shift+H | 切换首页/终端 | H=Home |
| Ctrl+, | 切换设置面板 | VS Code / Firefox 通用惯例 |
| Ctrl+Shift+/ | 显示快捷键面板 | / 是 shortcuts 的首字母 |
| Ctrl+Shift+S | 切换 Sessions 面板 | S=Sessions，最高频面板需要键盘直达 |

### 字体缩放

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| Ctrl+= | 增大字体 | 浏览器通用 |
| Ctrl+- | 缩小字体 | 浏览器通用 |
| Ctrl+0 | 重置字体 | 浏览器通用 |

## 会话与标签管理

> 全局生效，任何视图下均可触发。

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| Alt+N | 新建会话 | N=New |
| Alt+R | 重启会话 | R=Restart |
| Alt+W | 关闭当前标签 | W=Window/Close；使用 Alt 前缀避免与 CLI 的 Ctrl+W（删词）冲突；关闭后自动聚焦到相邻标签 |
| Ctrl+Tab | 切换到下一个标签（循环） | 浏览器/IDE/终端通用惯例 |
| Ctrl+Shift+Tab | 切换到上一个标签（循环） | 与 Ctrl+Tab 配对 |
| Alt+↑ | 切换到上一个标签（备选） | 方向键语义直观 |
| Alt+↓ | 切换到下一个标签（备选） | 方向键语义直观 |

## Claude CLI 快捷键（终端穿透）

> 以下快捷键直接传递到 xterm.js → PTY → Claude CLI，应用层不做拦截。

### 会话控制

| 快捷键 | 功能 |
|--------|------|
| Ctrl+C | 取消当前输入或生成 |
| Ctrl+D | 退出 Claude Code |
| Ctrl+L | 清屏并重绘 |
| Ctrl+R | 反向搜索历史 |
| Ctrl+B | 后台运行任务 |
| Ctrl+O | 切换 Transcript 查看器 |
| Ctrl+T | 切换任务列表 |
| Esc Esc | 回退或摘要 |

### 模式切换

| 快捷键 | 功能 |
|--------|------|
| Alt+P | 切换模型（不清除输入） |
| Alt+T | 切换扩展思考 |
| Alt+O | 切换快速模式 |

### 文本编辑

| 快捷键 | 功能 |
|--------|------|
| Ctrl+A | 光标移到行首 |
| Ctrl+E | 光标移到行尾 |
| Ctrl+W | 删除前一个单词 |
| Ctrl+K | 删除光标到行尾 |
| Ctrl+U | 删除光标到行首 |
| Ctrl+Y | 粘贴已删除文本 |
| Alt+B | 光标后退一个单词 |
| Alt+F | 光标前进一个单词 |

### 多行输入

| 快捷键 | 功能 |
|--------|------|
| \ + Enter | 插入换行 |
| Ctrl+J | 插入换行（通用终端） |
| Shift+Enter | 插入换行（已支持） |

### 快速输入

| 输入 | 功能 |
|------|------|
| / 开头 | 命令或 Skill |
| ! 开头 | Bash 模式 — 直接运行命令 |
| @ | 文件路径提及（自动补全） |

### Slash 命令

| 命令 | 功能 |
|------|------|
| /clear | 新对话（别名 /reset, /new） |
| /compact | 压缩对话以释放上下文 |
| /model | 切换 AI 模型 |
| /cost | 显示会话费用（别名 /usage, /stats） |
| /permissions | 管理工具权限规则 |
| /init | 初始化项目 CLAUDE.md |
| /config | 打开设置（别名 /settings） |
| /resume | 恢复历史会话（别名 /continue） |
| /diff | 交互式变更查看器 |
| /help | 显示可用命令 |
| /context | 可视化上下文窗口使用 |
| /doctor | 诊断 Claude Code 安装 |
| /theme | 切换颜色主题 |
| /memory | 编辑 CLAUDE.md 记忆文件 |
| /rename | 重命名当前会话 |
| /btw \<q\> | 快速旁问（不影响上下文） |
| /plan | 进入规划模式 |
| /branch | 分支对话（别名 /fork） |
| /copy | 复制上次回复到剪贴板 |
| /review | 在会话中审查 Pull Request |
| /exit | 退出 CLI（别名 /quit） |

## 冲突分析

### 应用快捷键 vs CLI 快捷键

| 应用快捷键 | CLI 是否使用 | 冲突？ |
|-----------|-------------|--------|
| Ctrl+Shift+* (任何) | 否 | 无 |
| Alt+N | 否 | 无 |
| Alt+R | 否 | 无 |
| Alt+W | 否 | 无（CLI 用的是 Ctrl+W） |
| Alt+↑/↓ | 否 | 无 |
| Ctrl+Tab | 否 | 无（CLI 不使用 Ctrl+Tab） |
| Ctrl+, | 否 | 无（CLI 无逗号绑定） |
| Ctrl+=/-/0 | 否 | 无（CLI 无此绑定） |
