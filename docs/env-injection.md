# 环境变量注入

通过 cc-box 统一管理注入到 `~/.claude/settings.json` 的环境变量，控制 Claude CLI 运行时行为。

## 设计原则

- **单一管理入口**：所有环境变量在设置 → Startup → Environment Variables 中集中管理
- **默认值在代码中定义**：首次使用自动填充，用户可随时重置
- **启动时自动同步**：每次启动将 cc-box 配置的环境变量合并写入 `~/.claude/settings.json`
- **实时生效**：设置面板中修改立即写入，无需重启

## 数据存储

### cc-box 配置 (`~/.cc-box/config.json`)

```jsonc
{
  "claudeEnvVars": {             // 用户管理的完整键值对
    "LANG": "en_US.UTF-8",
    "LC_ALL": "en_US.UTF-8",
    "PYTHONUTF8": "1",
    "CLAUDE_CODE_SCROLL_SPEED": "5",
    "PYTHONIOENCODING": "utf-8",
    "CLAUDE_CODE_NO_FLICKER": "1"
  }
}
```

### Claude 配置 (`~/.claude/settings.json`)

cc-box 管理的 key 被合并写入 `env` 字段，不影响用户手动添加的其他 env。

```jsonc
{
  "env": {
    "LANG": "en_US.UTF-8",
    // ... cc-box 管理的变量
    "OTHER_VAR": "xxx"          // 用户手动设置的，cc-box 不动
  }
}
```

## 默认环境变量

定义在 `src/stores/app.ts` 的 `DEFAULT_CLAUDE_ENV_VARS`：

```typescript
const DEFAULT_CLAUDE_ENV_VARS: Record<string, string> = {
  LANG: 'en_US.UTF-8',
  LC_ALL: 'en_US.UTF-8',
  PYTHONUTF8: '1',
  CLAUDE_CODE_SCROLL_SPEED: '5',
  PYTHONIOENCODING: 'utf-8',
  CLAUDE_CODE_NO_FLICKER: '1',
}
```

**添加新默认变量**：在此常量中添加 key-value 即可，现有用户可通过"Reset to defaults"按钮获取。

## 启动同步流程

```
loadAppConfig()
  ├── 读取 claudeEnvVars
  ├── 为空 → 填充 DEFAULT_CLAUDE_ENV_VARS
  └── doSyncEnv()
        ├── updateAppConfig({ claudeEnvVars })     → 写入 cc-box config
        └── syncClaudeEnv(claudeEnvVars)           → Tauri command
              └── store::sync_claude_env(user_env) → 合并写入 ~/.claude/settings.json
```

Rust `sync_claude_env` 逻辑：读取 `~/.claude/settings.json` → 获取/创建 `env` 对象 → 将 `user_env` 中的 key-value 合并写入 → 写回文件。只更新 `user_env` 中包含的 key，不影响其他已有 env。

## 设置面板交互

### Startup Section — 环境变量编辑器

| 操作 | 行为 |
|------|------|
| **打开面板** | 从 `appStore.claudeEnvVars`（cc-box config）加载当前值 |
| **编辑值** | `@change` → 更新 reactive → `setClaudeEnvVars()` → 写 cc-box config + 写 Claude settings |
| **编辑 key** | 旧 key 删除、新 key 添加 → 同步 |
| **删除行** | 从 reactive map 移除 → 同步 |
| **新增行** | 输入 KEY + value → 添加 → 同步 |
| **Reset to defaults** | 清空当前 → 填充 `DEFAULT_CLAUDE_ENV_VARS` → 同步 |

## 扩展方式

添加新的默认环境变量：

1. 在 `src/stores/app.ts` 的 `DEFAULT_CLAUDE_ENV_VARS` 中添加 key-value
2. 新用户首次启动自动获得
3. 现有用户点击"Reset to defaults"获取
