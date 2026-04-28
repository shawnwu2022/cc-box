# 版本发布流程

本文档描述 CC-Box 的版本号管理、本地打包、CI/CD 发布、签名与分发。

## 版本号规则

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：`vMAJOR.MINOR.PATCH`

## 版本号更新位置

| 文件 | 路径 |
|------|------|
| Cargo.toml | `src-tauri/Cargo.toml` → `version` |
| package.json | `package.json` → `version` |
| tauri.conf.json | `src-tauri/tauri.conf.json` → `version` |

三个文件的版本号必须保持一致。

## 发布前检查清单

- [ ] 所有已计划的 feature 已完成
- [ ] 所有已知 bug 已修复
- [ ] 更新了 `docs/roadmap.md` 中的进度
- [ ] 本地构建测试通过 (`npm run tauri:build`)
- [ ] 检查敏感信息不会被提交

## 快速发布命令

```bash
# 1. 更新版本号（手动编辑以下三个文件）
vim src-tauri/Cargo.toml package.json src-tauri/tauri.conf.json

# 2. 提交并打标签
git add -A && git commit -m "Release v1.2.3"
git push origin main
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 3. 等待 CI 构建完成后发布
gh release edit v1.2.3 --draft=false
```

## 本地打包

### Windows
```bash
npm run build:win
```
输出: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/`
- NSIS 安装程序: `bundle/nsis/*.exe`
- MSI 安装程序: `bundle/msi/*.msi`
- 免安装版: `release/*.exe`

> 首次打包下载 NSIS 组件时可能需要代理：
> ```bash
> set HTTP_PROXY=http://127.0.0.1:33210
> set HTTPS_PROXY=http://127.0.0.1:33210
> ```

### macOS
```bash
npm run build:mac
```
输出: `src-tauri/target/universal-apple-darwin/release/bundle/`
- DMG 镜像: `bundle/dmg/*.dmg`
- APP 包: `bundle/macos/*.app`

### Linux
```bash
npm run build:linux
```
输出: `src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/`
- Debian 包: `bundle/deb/*.deb`
- AppImage: `bundle/appimage/*.AppImage`

## CI/CD 发布（GitHub Actions）

推送 `v*` 标签后自动触发：

```
git push origin v1.2.3
  → GitHub Actions 自动构建三平台
  → 创建草稿 Release（附带构建产物）
  → 审核后发布
```

构建产物：
- **Windows** (x64): `.exe` + `.msi`
- **macOS** (Universal): `.dmg` + `.app`
- **Linux** (x64): `.deb` + `.AppImage`

### 发布草稿

```bash
# CLI 发布草稿
gh release edit v1.2.3 --notes "更新内容..."
gh release edit v1.2.3 --draft=false
```

或在 https://github.com/orczh-hj/cc-box/releases 手动发布。

## 签名与公证（可选）

### Windows 代码签名
在 `src-tauri/tauri.conf.json` 中配置:
```json
"bundle": {
  "windows": {
    "certificateThumbprint": "证书指纹",
    "timestampUrl": "http://timestamp.digicert.com"
  }
}
```

### macOS 代码签名
```bash
security import certificate.p12 -k ~/Library/Keychains/login.keychain-db
```
在 `tauri.conf.json` 配置 `signingIdentity` 和 `hardenedRuntime`。

## 回滚流程

```bash
# 删除标签和 Release
git push origin :refs/tags/v1.2.3
git tag -d v1.2.3
gh release delete v1.2.3

# 修复后发布新版本
```

## 体积优化

当前已启用：
- `strip = true` — 移除调试符号
- `lto = true` — 链接时优化
