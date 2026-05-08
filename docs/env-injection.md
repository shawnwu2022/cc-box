# 环境变量注入

通过 cc-box 统一管理注入到 `~/.claude/settings.json` 的环境变量，控制 Claude CLI 运行时行为。

## 设计原则

- **cc-box 只管 key 名**：`~/.cc-box/config.json` 记录用户通过 cc-box 管理的环境变量 key 列表（`claudeEnvVarKeys`）
- **值在 Claude settings 中**：实际键值对存储在 `~/.claude/settings.json` 的 `env` 字段
- **设置面板实时读取**：打开 Startup 设置时从 Claude settings 实时读取当前值
- **用户 env 优先于 toggle**：Full Screen Rendering toggle 控制 `CLAUDE_CODE_NO_FLICKER`，但用户在 env 编辑器中显式设置的同名变量优先

## 数据存储

### cc-box 配置 (`~/.cc-box/config.json`)

```jsonc
{
  "fullScreenRender": true,       // 全屏渲染开关（Appearance 设置）
  "claudeEnvVarKeys": [           // cc-box 管理的 env key 列表
    "LANG",
    "LC_ALL",
    "PYTHONUTF8",
    "CLAUDE_CODE_SCROLL_SPEED",
    "PYTHONIOENCODING"
  ]
}
```

### Claude 配置 (`~/.claude/settings.json`)

```jsonc
{
  "env": {
    "LANG": "en_US.UTF-8",
    "LC_ALL": "en_US.UTF-8",
    "PYTHONUTF8": "1",
    "CLAUDE_CODE_SCROLL_SPEED": "5",
    "PYTHONIOENCODING": "utf-8",
    "CLAUDE_CODE_NO_FLICKER": "1"  // 由 toggle 控制（用户未显式设置时）
  }
}
```

## 启动同步流程

```
loadAppConfig()
  ├── 读取 fullScreenRender、claudeEnvVarKeys
  ├── claudeEnvVarKeys 为空 → 填充默认 key 列表
  └── syncEnvFromSettings()
        ├── getClaudeSettingsEnv() → 读取 ~/.claude/settings.json 的 env
        ├── 遍历 claudeEnvVarKeys → 取 Claude settings 中的值
        ├── 缺失的 key → 补 DEFAULT_CLAUDE_ENV_VALUES 中的默认值
        └── syncClaudeEnv(fullScreenRender, envMap) → 写回 Claude settings
              ├── 1) 写入用户 env（最高优先级）
              └── 2) CLAUDE_CODE_NO_FLICKER ← toggle（仅用户未设置时）
```

## 设置面板交互

### Startup Section — 环境变量编辑器

1. **打开面板**：`onMounted` → `loadEnvFromSettings()`
   - 调用 `getClaudeSettingsEnv()` 实时读取 `~/.claude/settings.json`
   - 只显示 `claudeEnvVarKeys` 中记录的 key 及当前值
2. **编辑值**：`@change` → `handleValueChange` → `setClaudeEnvVarKeys(keys, changedEnv)`
   - 更新 cc-box key 列表 + 写入 Claude settings
3. **删除行**：从 reactive map 移除 → `setClaudeEnvVarKeys` 同步
4. **新增行**：输入 KEY + value → `handleAdd` → `setClaudeEnvVarKeys` 同步

### Appearance Section — Full Screen Rendering

- Toggle 切换 → `setFullScreenRender(val)` → 写 cc-box config + `doSyncEnv()`
- `doSyncEnv()`：读 Claude settings → 构建 env map → 写入 `CLAUDE_CODE_NO_FLICKER`

## 优先级

| 来源 | 优先级 | 说明 |
|------|--------|------|
| 用户 env 编辑器中的值 | 最高 | 用户在 Startup 面板中显式设置的环境变量 |
| Full Screen Rendering toggle | 次高 | 仅当用户未在 env 中设置 `CLAUDE_CODE_NO_FLICKER` 时生效 |
| Claude settings 原有值 | 基准 | cc-box 不管理的 env key 不受影响 |

## 默认值常量

```typescript
// src/stores/app.ts

const DEFAULT_CLAUDE_ENV_VAR_KEYS = [
  'LANG',
  'LC_ALL',
  'PYTHONUTF8',
  'CLAUDE_CODE_SCROLL_SPEED',
  'PYTHONIOENCODING',
]

const DEFAULT_CLAUDE_ENV_VALUES: Record<string, string> = {
  LANG: 'en_US.UTF-8',
  LC_ALL: 'en_US.UTF-8',
  PYTHONUTF8: '1',
  CLAUDE_CODE_SCROLL_SPEED: '5',
  PYTHONIOENCODING: 'utf-8',
}
```

## 扩展方式

添加新的默认环境变量：

1. 在 `DEFAULT_CLAUDE_ENV_VAR_KEYS` 中添加 key
2. 在 `DEFAULT_CLAUDE_ENV_VALUES` 中添加默认值
3. 现有用户下次启动时自动补充新 key（`syncEnvFromSettings` 为缺失 key 补值）
