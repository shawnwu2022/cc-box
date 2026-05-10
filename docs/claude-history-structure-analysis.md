# Claude Code 历史记录文件结构分析（完整版）

## 文件概述

Claude Code 的历史记录文件采用 **JSONL (JSON Lines)** 格式存储，每行是一个独立的 JSON 对象，记录会话中的各类事件。

### 文件命名与位置

```
~/.claude/projects/<project-path-hash>/<session-id>.jsonl        # 主会话文件
~/.claude/projects/<project-path-hash>/<session-id>/subagents/agent-*.jsonl  # 子代理文件
~/.claude/projects/<project-path-hash>-worktrees-*/<session-id>.jsonl  # Worktree 会话
```

---

## 类型完整分类（基于全量统计）

### 统计概览

分析了 `~/.claude/projects` 目录下的所有 JSONL 文件，共发现 **65+ 种不同类型**。

### 一、核心交互类型（高频）

| 类型 | 数量 | 说明 |
|------|------|------|
| `message` | 53,739 | 消息结构体（API 返回） |
| `assistant` | 53,739 | AI 响应消息 |
| `user` | 34,444 | 用户输入消息 |
| `tool_use` | 29,743 | 工具调用请求 |
| `tool_result` | 29,833 | 工具返回结果 |
| `text` | 20,837 | 文本输出 |
| `thinking` | 10,699 | AI 思考过程 |
| `system` | 2,961 | 系统消息 |
| `output_style` | 2,725 | 输出样式标记 |

### 二、会话状态类型

| 类型 | 数量 | 说明 |
|------|------|------|
| `attachment` | 6,191 | 附带信息容器 |
| `file-history-snapshot` | 4,583 | 文件历史快照 |
| `permission-mode` | 3,740 | 权限模式设置 |
| `last-prompt` | 3,634 | 最后提示记录 |
| `task_reminder` | 1,902 | 任务提醒 |
| `todo_reminder` | 9 | TODO 提醒 |
| `worktree-state` | 83 | Worktree 状态 |
| `queue-operation` | 948 | 队列操作 |
| `queued_command` | 136 | 队列命令 |
| `date_change` | 22 | 日期变更 |

### 三、会话标识类型

| 类型 | 数量 | 说明 |
|------|------|------|
| `custom-title` | 986 | 自定义标题 |
| `ai-title` | 612 | AI 生成标题 |
| `agent-name` | 715 | 代理名称 |

### 四、进度与回调类型（子代理特有）

| 类型 | 数量 | 说明 |
|------|------|------|
| `progress` | 1,629 | 进度更新 |
| `hook_progress` | 1,336 | Hook 进度回调（嵌套） |
| `bash_progress` | 291 | Bash 命令进度 |
| `mcp_progress` | 2 | MCP 进度 |

### 五、文件操作类型

| 类型 | 数量 | 说明 |
|------|------|------|
| `edited_text_file` | 105 | 编辑的文本文件标记 |
| `file_unchanged` | 327 | 文件未变更 |
| `create` | 485 | 创建操作 |
| `file` | 182 | 文件引用 |
| `compact_file_reference` | 50 | 压缩文件引用 |
| `plan_file_reference` | 25 | 计划文件引用 |
| `already_read_file` | 5 | 已读文件标记 |

### 六、计划模式类型

| 类型 | 数量 | 说明 |
|------|------|------|
| `plan_mode` | 82 | 进入计划模式 |
| `plan_mode_exit` | 164 | 退出计划模式 |

### 七、IDE 集成类型

| 类型 | 数量 | 说明 |
|------|------|------|
| `opened_file_in_ide` | 59 | 在 IDE 中打开的文件 |
| `selected_lines_in_ide` | 14 | IDE 中选中的行 |
| `diagnostics` | 143 | 诊断信息 |

### 八、媒体/内容类型

| 类型 | 数量 | 说明 |
|------|------|------|
| `image` | 291 | 图片引用 |
| `image/jpeg` | 64 | JPEG 图片 |
| `image/png` | 58 | PNG 图片 |
| `image/webp` | 1 | WebP 图片 |
| `base64` | 170 | Base64 编码内容 |
| `pdf` | 2 | PDF 文件 |
| `document` | 2 | 文档 |

### 九、代码语言类型（内容标记）

| 类型 | 数量 | 说明 |
|------|------|------|
| `py` | 20 | Python 代码 |
| `rust` | 13 | Rust 代码 |
| `vue` | 5 | Vue 代码 |
| `ts` | 2 | TypeScript 代码 |
| `rs` | 1 | Rust 文件 |
| `json` | 2 | JSON 内容 |

### 十、错误/异常类型

| 类型 | 数量 | 说明 |
|------|------|------|
| `error` | 160 | 一般错误 |
| `new_api_error` | 52 | API 错误 |
| `ModelArts.81101` | 240 | ModelArts 错误 |
| `throttling` | 36 | 限流警告 |
| `bad_response_status_code` | 25 | 响应状态码错误 |
| `Unauthorized` | 14 | 未授权错误 |

### 十一、代理相关类型

| 类型 | 数量 | 说明 |
|------|------|------|
| `agent_mention` | 11 | 代理提及 |
| `invoked_skills` | 6 | 已调用技能 |
| `agent-color` | 2 | 代理颜色 |

### 十二、其他类型

| 类型 | 数量 | 说明 |
|------|------|------|
| `skill_listing` | 450 | 技能列表 |
| `update` | 437 | 状态更新 |
| `Project` | 23 | 项目引用 |
| `nested_memory` | 23 | 嵌套内存 |
| `companion_intro` | 23 | Companion 介绍 |
| `server_tool_use` | 126 | 服务端工具使用 |
| `command_permissions` | 55 | 命令权限 |

---

## attachment 子类型详解

`attachment` 类型是一个容器，其 `attachment.type` 字段指定具体内容：

| 子类型 | 说明 |
|--------|------|
| `skill_listing` | 可用技能列表 |
| `task_reminder` | 任务提醒 |
| `todo_reminder` | TODO 提醒 |
| `plan_mode` | 进入计划模式 |
| `plan_mode_exit` | 退出计划模式 |
| `agent_mention` | 代理提及 |
| `invoked_skills` | 已调用技能 |
| `opened_file_in_ide` | IDE 打开的文件 |
| `selected_lines_in_ide` | IDE 选中的行 |
| `diagnostics` | 诊断信息 |
| `command_permissions` | 命令权限配置 |
| `compact_file_reference` | 压缩文件引用 |
| `plan_file_reference` | 计划文件引用 |
| `already_read_file` | 已读文件标记 |
| `output_style` | 输出样式 |
| `nested_memory` | 嵌套内存引用 |
| `companion_intro` | Companion 功能介绍 |

---

## 重要类型结构详解

### 1. worktree-state（Worktree 状态）

```json
{
  "type": "worktree-state",
  "worktreeSession": {
    "originalCwd": "D:\\orczh\\Documents\\front\\claude-tauri-gui",
    "worktreePath": "D:\\orczh\\Documents\\front\\claude-tauri-gui\\.claude\\worktrees\\dreamy-juggling-sutton",
    "worktreeName": "dreamy-juggling-sutton",
    "worktreeBranch": "worktree-dreamy-juggling-sutton",
    "originalBranch": "main",
    "originalHeadCommit": "2315e033c31c13959e2c3c5a28716b8d538fdd1c",
    "sessionId": "bda5e4ac-f356-47e0-b6ca-6d048532c895"
  },
  "sessionId": "bda5e4ac-f356-47e0-b6ca-6d048532c895"
}
```

**用途：** 记录 Git Worktree 会话状态，包括原始分支、Worktree 路径等。

---

### 2. output_style（输出样式）

```json
{
  "type": "output_style",
  "outputStyle": "concise"  // 或 "verbose", "default"
}
```

---

### 3. opened_file_in_ide（IDE 文件）

```json
{
  "type": "attachment",
  "attachment": {
    "type": "opened_file_in_ide",
    "filename": "c:\\Users\\orczh\\.ssh\\config"
  },
  ...
}
```

---

### 4. diagnostics（诊断信息）

```json
{
  "type": "attachment",
  "attachment": {
    "type": "diagnostics",
    "diagnostics": [...]
  },
  ...
}
```

---

### 5. agent_mention（代理提及）

```json
{
  "type": "attachment",
  "attachment": {
    "type": "agent_mention",
    "agentType": "paper-tool:paper-search"
  },
  ...
}
```

---

### 6. compact_file_reference（压缩文件引用）

用于上下文压缩时引用已处理的大文件。

---

### 7. plan_file_reference（计划文件引用）

```json
{
  "type": "attachment",
  "attachment": {
    "type": "plan_file_reference",
    "path": "..."
  },
  ...
}
```

---

### 8. nested_memory（嵌套内存）

用于引用嵌套的内存/上下文。

---

### 9. companion_intro（Companion 介绍）

用于 Companion 功能初始化时的介绍信息。

---

### 10. error 类型

```json
{
  "type": "error",
  "error": {
    "message": "...",
    "code": "..."
  },
  ...
}
```

---

### 11. progress/hook_progress（进度回调）

```json
{
  "type": "progress",
  "data": {
    "type": "hook_progress",
    "hookEvent": "PostToolUse",
    "hookName": "PostToolUse:Glob",
    "command": "callback"
  },
  "parentToolUseID": "call_xxx",
  "toolUseID": "call_xxx",
  ...
}
```

---

## 用户消息特殊标记

### isMeta 字段

```json
{
  "type": "user",
  "isMeta": true,  // 表示元消息（如命令执行通知）
  "message": {
    "content": "<local-command-caveat>..."
  },
  ...
}
```

### 命令格式

```json
{
  "message": {
    "content": "<command-name>/model</command-name>\n<command-message>model</command-message>\n<command-args>GLM-5.1</command-args>"
  }
}
```

---

## 主会话 vs 子代理 vs Worktree 对比

| 特征 | 主会话 | 子代理 | Worktree |
|------|--------|--------|----------|
| 文件位置 | `<session-id>.jsonl` | `subagents/agent-*.jsonl` | `worktrees-*/<session-id>.jsonl` |
| `worktree-state` | ✗ | ✗ | ✓ |
| `ai-title` | ✓ | ✗ | ✗ |
| `custom-title` | ✓ | ✗ | ✓ |
| `agent-name` | ✓ | ✗ | ✗ |
| `progress` | ✗ | ✓ | ✗ |
| `hook_progress` | ✗ | ✓ | ✗ |
| `agentId`/`slug` | 可选 | ✓ | ✓ |
| `plan_mode` | ✓ | ✗ | ✓ |
| `output_style` | ✓ | ✓ | ✓ |
| `diagnostics` | ✓ | ✗ | ✓ |

---

## 类型功能定位汇总

### 消息交互类
- `user`, `assistant`, `message` — 核心交互

### 内容输出类
- `text`, `thinking`, `output_style` — 输出内容

### 工具调用类
- `tool_use`, `tool_result`, `server_tool_use` — 工具交互

### 文件操作类
- `file-history-snapshot`, `edited_text_file`, `file_unchanged`, `create`, `compact_file_reference` — 文件管理

### 状态控制类
- `permission-mode`, `worktree-state`, `queue-operation` — 状态管理

### 会话标识类
- `ai-title`, `custom-title`, `agent-name`, `last-prompt` — 会话元数据

### 进度反馈类
- `progress`, `hook_progress`, `bash_progress`, `mcp_progress` — 执行反馈

### 模式切换类
- `plan_mode`, `plan_mode_exit` — 计划模式

### IDE 集成类
- `opened_file_in_ide`, `selected_lines_in_ide`, `diagnostics` — IDE 交互

### 错误处理类
- `error`, `new_api_error`, `throttling`, `bad_response_status_code` — 错误记录

### 媒体内容类
- `image`, `image/jpeg`, `image/png`, `base64`, `pdf` — 媒体处理

### 代理扩展类
- `agent_mention`, `invoked_skills`, `skill_listing` — 代理功能

---

## 文件统计总览

| 指标 | 数值 |
|------|------|
| 总 assistant 消息 | 53,739 |
| 总 user 消息 | 34,444 |
| 总工具调用 | ~30,000 |
| 总 thinking 记录 | 10,699 |
| 总 attachment | 6,191 |
| 总文件快照 | 4,583 |
| 发现的类型总数 | 65+ |

---

## 类型层级结构图

```
顶层类型
├── 交互类
│   ├── user (含 isMeta, 命令格式)
│   ├── assistant
│   └── attachment (容器)
│       ├── skill_listing
│       ├── task_reminder
│       ├── todo_reminder
│       ├── plan_mode
│       ├── plan_mode_exit
│       ├── agent_mention
│       ├── invoked_skills
│       ├── opened_file_in_ide
│       ├── selected_lines_in_ide
│       ├── diagnostics
│       ├── command_permissions
│       ├── compact_file_reference
│       ├── plan_file_reference
│       ├── already_read_file
│       ├── output_style
│       ├── nested_memory
│       └── companion_intro
│
├── 状态类
│   ├── permission-mode
│   ├── worktree-state
│   ├── queue-operation
│   ├── queued_command
│   ├── date_change
│   └── last-prompt
│
├── 标识类
│   ├── ai-title
│   ├── custom-title
│   └── agent-name
│
├── 进度类
│   ├── progress
│   │   └── hook_progress (嵌套)
│   ├── bash_progress
│   └── mcp_progress
│
├── 文件类
│   ├── file-history-snapshot
│   ├── edited_text_file
│   ├── file_unchanged
│   └── create
│
├── 错误类
│   ├── error
│   ├── new_api_error
│   ├── throttling
│   ├── ModelArts.*
│   ├── bad_response_status_code
│   └── Unauthorized
│
├── 媒体类
│   ├── image
│   ├── image/jpeg
│   ├── image/png
│   ├── image/webp
│   ├── base64
│   ├── pdf
│   └── document
│
└── 内容标记类
    ├── message (API 结构)
    ├── text
    ├── thinking
    ├── tool_use
    ├── tool_result
    ├── system
    ├── update
    ├── file
    ├── py/rust/vue/ts/json (语言标记)
    └── server_tool_use
```

---

## 总结

1. **类型丰富**: 发现 65+ 种类型，覆盖交互、状态、文件、错误、媒体等多个维度
2. **分层设计**: attachment 作为容器，包含多种子类型
3. **场景分化**: 主会话、子代理、Worktree 使用不同的类型组合
4. **IDE 集成**: 支持 IDE 文件打开、选中行、诊断信息
5. **错误追踪**: 多种错误类型用于不同场景
6. **上下文压缩**: compact_file_reference、nested_memory 支持压缩
7. **代理扩展**: agent_mention、invoked_skills 支持代理功能