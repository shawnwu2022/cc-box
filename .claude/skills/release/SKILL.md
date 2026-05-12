---
name: cc-box-release
description: CC-Box 版本发布。当用户说"发布"、"release"、"版本更新"、"patch/minor/major"时使用此 skill。
---

# CC-Box Release

执行 `npm run release`，根据情况配置参数。

## 基本命令

```bash
npm run release -- --bump <type> --notes "<notes>"
```

## 参数组合

| 场景 | 参数 |
|------|------|
| 发布新版本 | `--bump patch` 或 `--bump minor` 或 `--bump major` |
| 重新发布当前版本 | `--exact`（不 bump 版本号） |
| CI 已构建完成 | 添加 `--skip-ci` |
| 仅上传 OSS | `--oss-only v0.6.2` |

## Notes 格式

```bash
--notes "### Fixed\n- Fix issue\n\n### Features\n- Add feature"
```

- 英文
- `\n` 表示换行

## 示例

用户说：`发布 patch，修复 pending 显示问题`

执行：
```bash
npm run release -- --bump patch --notes "### Fixed\n- Fix pending display issue"
```

用户说：`发布 minor，添加状态指示灯`

执行：
```bash
npm run release -- --bump minor --notes "### Features\n- Add status indicators"
```