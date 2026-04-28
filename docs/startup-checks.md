# 启动先决条件检查

## 概述

应用启动时自动检测 Claude CLI 和 Git Bash（仅 Windows）的可用性。检测成功的路径自动保存到配置文件，后续启动直接从配置读取。

涉及文件：`src-tauri/src/checks.rs`、`src-tauri/src/pty.rs`、`src-tauri/src/store.rs`、`src/App.vue`

## 检查流程

```
应用启动
  │
  ├─ lib.rs: CHECK_RESULTS (LazyLock)
  │   → checks::run_checks()
  │     ├─ read_config_paths()          ← 从 ~/.cc-box/config.json 读取已保存路径
  │     ├─ check_claude_cli()           ← 检查 Claude CLI
  │     ├─ check_git_bash()             ← 检查 Git Bash (Windows only)
  │     └─ save_detected_paths()        ← 通过的路径写回 config.json
  │
  ├─ 前端 App.vue onMounted()
  │   → appStore.runChecks()            ← 拉取后端缓存的检查结果
  │   ├─ 全部通过 → initAfterChecks() 进入主界面
  │   └─ 有失败   → 显示检查失败面板，用户手动填写或安装
```

## Claude CLI 检查

优先级从高到低，找到即返回：

| 步骤 | 来源 | 说明 |
|------|------|------|
| 1 | config.claudePath | 配置文件保存的路径，路径存在即通过 |
| 2 | `where`/`which` 查找 | 系统路径搜索 `claude`（Windows 为 `claude.exe`） |

全部未找到 → 返回失败结果，附带安装引导链接。

## Git Bash 检查（仅 Windows）

优先级从高到低，找到即返回：

| 步骤 | 来源 | 说明 |
|------|------|------|
| 1 | config.gitBashPath | 配置文件保存的路径，路径存在即通过 |
| 2 | 环境变量 `CLAUDE_CODE_GIT_BASH_PATH` | Claude Code 原生支持的环境变量 |
| 3 | `where git.exe` → 推导安装目录 | 找到 git.exe 后，向上取安装目录，拼接 `bin/bash.exe` |

第 3 步推导逻辑：

```
where git.exe → C:\Program Files\Git\cmd\git.exe
                    └── parent ──┘ └─ file
parent = "cmd" → git_install = parent.parent = C:\Program Files\Git
bash_path = C:\Program Files\Git\bin\bash.exe
```

处理 `cmd` 和 `bin` 两种常见子目录结构。

## 路径自动保存

`save_detected_paths()` 在 `run_checks()` 结束时调用：

- 仅保存 **passed=true** 的检查项的 `detected_path`
- 写入 `~/.cc-box/config.json` 的 `claudePath` / `gitBashPath` 字段
- 使用 `update_app_config()` 合并更新，不影响其他配置项
- 调用时机：首次启动（自动检测）和用户点击 Retry（重新检测）

## PTY 启动时的路径使用

PTY 层（`pty.rs`）在 spawn Claude CLI 进程时，通过 `detect_claude_path()` 和 `detect_git_bash()` 获取路径，两者都优先从配置读取：

```
detect_claude_path()
  1. config.claudePath 存在 → 直接使用
  2. ~/.local/bin/claude.exe (Windows)
  3. PATH 环境变量搜索

detect_git_bash()
  1. config.gitBashPath 存在 → 直接使用
  2. 硬编码候选路径
  3. PATH 环境变量搜索 Git\bin\bash.exe
  4. CLAUDE_CODE_GIT_BASH_PATH 环境变量
```

## 前端交互

检查失败时，App.vue 显示全屏遮罩：

- 每个失败的检查项显示输入框 + Browse 按钮 + 安装引导链接
- 用户手动填写路径后，点击 **Save & Retry**：
  1. 将用户填写的路径写入 `config.json`
  2. 重新调用 `run_checks()`（force=true）
  3. 全部通过则进入主界面

## 配置文件结构

`~/.cc-box/config.json` 中相关字段：

```jsonc
{
  "claudePath": "C:\\Users\\xxx\\.local\\bin\\claude.exe",  // Claude CLI 路径
  "gitBashPath": "C:\\Program Files\\Git\\bin\\bash.exe"    // Git Bash 路径
}
```

字段为可选。首次启动时由检查逻辑自动填充，用户也可在设置中手动修改。
