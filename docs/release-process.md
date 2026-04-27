# 版本发布流程

本文档描述 CC-Box 的完整版本发布流程，从版本号更新到最终发布。

## 版本号规则

CC-Box 遵循 [语义化版本](https://semver.org/lang/zh-CN/) (Semantic Versioning)：

- **主版本号 (Major)**: 不兼容的 API 变更
- **次版本号 (Minor)**: 向下兼容的功能新增
- **修订号 (Patch)**: 向下兼容的问题修复

示例：`v1.2.3`
- `1` = 主版本号
- `2` = 次版本号
- `3` = 修订号

## 版本号更新位置

发布新版本时，需要同步更新以下文件中的版本号：

| 文件 | 路径 | 说明 |
|------|------|------|
| **Cargo.toml** | `src-tauri/Cargo.toml` | Rust crate 版本 |
| **package.json** | `package.json` | npm 包版本 |
| **tauri.conf.json** | `src-tauri/tauri.conf.json` | Tauri 应用版本 |

三个文件的版本号必须保持一致。

## 发布前检查清单

在开始发布流程前，确认以下事项：

- [ ] 所有已计划的 feature 已完成
- [ ] 所有已知 bug 已修复
- [ ] 更新了 `docs/roadmap.md` 中的进度
- [ ] 更新了 `CHANGELOG.md`（如果存在）
- [ ] 本地构建测试通过 (`npm run tauri:build`)
- [ ] 在测试环境验证核心功能
- [ ] 检查敏感信息不会被提交（API token、密钥等）

## 发布流程

### 1. 创建发布分支

```bash
# 确保在 main 分支且是最新状态
git checkout main
git pull origin main

# 创建发布分支
git checkout -b release/v1.2.3
```

### 2. 更新版本号

手动编辑以下文件，将版本号从旧版本改为新版本（例如 `v1.2.2` → `v1.2.3`）：

```bash
# 1. 更新 src-tauri/Cargo.toml
# 2. 更新 package.json
# 3. 更新 src-tauri/tauri.conf.json
```

示例：
```toml
# src-tauri/Cargo.toml
[package]
name = "cc-box"
version = "1.2.3"  # 修改这里
```

```json
// package.json
{
  "name": "cc-box",
  "version": "1.2.3"  // 修改这里
}
```

```json
// src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "CC-Box",
  "version": "1.2.3"  // 修改这里
}
```

### 3. 提交版本更新

```bash
git add -A
git commit -m "Bump version to v1.2.3"
```

### 4. 合并到 main 分支

```bash
git checkout main
git merge release/v1.2.3
git push origin main
```

### 5. 创建并推送 Git 标签

```bash
# 创建 annotated tag
git tag -a v1.2.3 -m "Release v1.2.3"

# 推送标签到远程
git push origin v1.2.3
```

⚠️ **重要**：标签名必须以 `v` 开头（如 `v1.2.3`），这是 GitHub Release workflow 的触发条件。

### 6. 等待 CI 构建

推送标签后，GitHub Actions 会自动触发构建流程：

1. 访问 https://github.com/orczh-hj/cc-box/actions
2. 查看最新的 `Release` workflow 运行状态
3. 等待三个平台构建完成（约 5-10 分钟）

构建平台：
- **Windows** (x64): 生成 `.exe` 和 `.msi`
- **macOS** (x64): 生成 `.dmg`
- **Linux** (x64): 生成 `.deb` 和 `.AppImage`

### 7. 发布 GitHub Release

构建完成后，workflow 会自动创建一个**草稿 Release**。你需要：

1. 访问 https://github.com/orczh-hj/cc-box/releases
2. 找到 `v1.2.3` 草稿 Release
3. 检查自动生成的 Release Notes
4. 补充更新内容（新增功能、修复、已知问题等）
5. 点击 **Publish release**

或者使用 CLI：

```bash
# 编辑并发布现有的草稿 Release
gh release edit v1.2.3 --notes "更新内容..."

# 或者直接发布草稿
gh release edit v1.2.3 --draft=false
```

### 8. 验证发布

1. 从 Release 页面下载各平台安装包测试
2. 在干净环境中测试安装和卸载流程
3. 验证核心功能正常工作

## 快速发布命令

如果是小版本更新（如 bugfix），可以使用以下一键流程：

```bash
# 1. 更新版本号（手动编辑文件后）
vim src-tauri/Cargo.toml package.json src-tauri/tauri.conf.json

# 2. 提交并打标签
git add -A
git commit -m "Release v1.2.3"
git push origin main
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 3. 等待 CI 构建完成后，发布 Release
gh release edit v1.2.3 --draft=false
```

## 回滚流程

如果发布后发现严重问题需要回滚：

### 删除标签和 Release

```bash
# 删除远程标签
git push origin :refs/tags/v1.2.3

# 删除本地标签
git tag -d v1.2.3

# 通过 GitHub CLI 删除 Release
gh release delete v1.2.3
```

### 发布修复版本

1. 修复问题
2. 创建新的修订版本（如 `v1.2.4`）
3. 按正常流程发布

## 常见问题

### Q: CI 构建失败怎么办？

A: 检查以下事项：
- 版本号在所有文件中是否一致
- 代码是否能通过本地编译
- 查看 GitHub Actions 的详细错误日志
- 修复后推送新的 commit，标签会自动重试构建

### Q: 如何只构建特定平台？

A: 修改 `.github/workflows/release.yml` 中的 `matrix.include` 配置，注释掉不需要的平台。

### Q: Release Notes 如何自动生成？

A: GitHub Actions 的 `generate_release_notes: true` 会自动生成基于 commits 和 PRs 的 Release Notes。你可以在此基础上编辑补充。

### Q: 如何配置代码签名？

A: 参见 [打包与分发指南](./build-and-release.md#签名与公证可选)。

## 相关文档

- [打包与分发指南](./build-and-release.md) — 本地打包、签名、应用商店发布
- [roadmap.md](./roadmap.md) — 开发路线图和版本计划
- [GitHub Actions 文档](https://docs.github.com/en/actions)
