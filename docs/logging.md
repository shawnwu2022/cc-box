# 日志系统

应用日志按日期保存到 `~/.cc-box/logs/` 目录，便于排查运行时问题。前端和后端的日志统一写入同一套文件。

## 文件结构

```
~/.cc-box/logs/
├── 2026-04-28.log           # 当日全部日志（INFO 及以上）
├── 2026-04-28.error.log     # 当日错误日志（WARN 及以上）
├── 2026-04-27.log
├── 2026-04-27.error.log
└── ...
```

## 日志级别

| 模式 | 保存级别 | stderr 输出 |
|------|---------|------------|
| debug | Debug 及以上 | 有 |
| release | Info 及以上 | 无 |

## 文件命名与轮转

- 文件名格式：`{YYYY-MM-DD}.log` / `{YYYY-MM-DD}.error.log`
- 每天自动使用新文件，无需手动轮转
- 启动时后台清理超过 **7 天** 的旧 `.log` 文件

## 日志格式

```
[2026-04-28 14:30:00.123][INFO] [cc_box::pty] Claude CLI spawned successfully
[2026-04-28 14:30:01.456][ERROR] [cc_box::checks] [Check Failed] Claude CLI: ...
[2026-04-28 14:30:02.789][WARN] [cc_box::commands] [Frontend] startTab: blocked by isPtyStarting
```

格式：`[时间戳][级别] [模块路径] 消息内容`

前端日志的模块路径统一为 `[Frontend]`。

## 两个文件的区分

- `{date}.log`：保存所有达到级别阈值的日志，用于了解应用整体运行状况
- `{date}.error.log`：只保存 WARN 和 ERROR 级别的日志，用于快速定位异常

## 可靠性

- 每条日志写入后立即 `flush`，即使应用崩溃也不丢失已记录的日志
- 日志文件以追加模式打开，多次启动不会覆盖历史记录

## 前端日志接口

前端通过 Tauri IPC 调用 `log_message` command，将关键事件写入后端日志文件。

### API

```typescript
import { logMessage } from '@/api/tauri'

logMessage('error', `startTab failed: ${err}`)
logMessage('warn', `startNewSession: blocked by isPtyStarting`)
logMessage('info', 'user clicked new session')
logMessage('debug', 'debug info')
```

参数：
- `level`：`'error' | 'warn' | 'info' | 'debug'`
- `message`：描述信息

### 前端日志点

| 位置 | 场景 | 级别 |
|------|------|------|
| `XTermTerminal.vue` `startTab` | tab 不存在或 PTY 正在启动 | WARN |
| `XTermTerminal.vue` `startTab` | ptySpawn 调用异常 | ERROR |
| `XTermTerminal.vue` `restartTab` | 重启失败 | ERROR |
| `XTermTerminal.vue` `startNewSession` | PTY 正在启动，操作被跳过 | WARN |
| `TerminalView.vue` `handleNewSession` | cwd 或 terminalRef 缺失 | WARN |

## 代码结构

```
src-tauri/src/logger.rs      # 日志模块（FileLogger 实现、文件管理、旧日志清理）
src-tauri/src/commands.rs    # log_message command（前端→后端日志桥接）
src-tauri/src/lib.rs         # setup 阶段调用 logger::init()
src/api/tauri.ts             # logMessage 前端封装
```

### 初始化流程

1. `lib.rs` 的 `setup` 回调中调用 `logger::init()`
2. `init()` 打开当日日志文件、设置全局日志级别、注册 `log::Log` 实现
3. 后台线程执行旧日志清理

### 后端日志点

- 启动/关闭：`CC-Box started`、`Window close requested`
- PTY 管理：进程创建、退出、错误
- 环境检查：检查失败时记录 ERROR
- 配置读取：JSONL 解析异常等 WARN
