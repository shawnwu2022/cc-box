<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="CC-Box" width="80" height="80">
</p>

<h1 align="center">CC-Box</h1>

<p align="center">
  <strong>专为 <a href="https://docs.anthropic.com/en/docs/claude-code">Claude Code</a> 重度用户打造的多终端管理器</strong><br>
  一个窗口，多个会话，CLI 做不到的这里都有。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/平台-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <img src="https://img.shields.io/badge/Tauri-2.x-orange" alt="Tauri">
  <img src="https://img.shields.io/badge/Vue-3-green" alt="Vue">
  <img src="https://img.shields.io/badge/许可证-MIT-yellow" alt="License">
</p>

---

[English](README.md) | 简体中文

---

## 为什么需要 CC-Box？

Claude Code 的 CLI 在单会话场景下表现优秀。但如果你需要**管理多个项目**、**并行运行多个 Agent**，或者想**一目了然地看到 Token 用量和成本**——纯终端就显得力不从心了。

CC-Box 不是替代 CLI，而是用原生终端体验包裹它，并补充 CLI 做不好的功能：多会话编排、信息面板、项目快速切换。

**把它想象成 iTerm2/Warp，但专为 Claude Code 设计。**

---

## 核心功能

### 单窗口多会话

打开任意数量的 Claude Code 会话——每个都在独立的终端标签页中运行。即时切换，切换回来时输出内容完整保留。告别终端窗口管理的烦恼。

### 项目快速启动

浏览常用项目，一键启动会话。设置项目级启动选项如 `--continue`、`--model` 或自定义参数。再也不需要每次 `cd` 并重复输入相同参数。

### 侧边栏面板

侧边抽屉式面板——不遮挡、不抢焦点：

- **Sessions** — 浏览、搜索、切换所有会话（支持滚动加载大量历史记录）
- **MCP Servers** — 查看已连接的 MCP 服务器，浏览可用工具及其 schema
- **Skills & Agents** — 快速访问 Claude Code skills 和 agent 配置
- **Plugins** — 查看已安装插件

### 原生终端，零妥协

应用通过伪终端运行真实的 Claude CLI 二进制文件。一切都和终端里一样——slash 命令、键盘快捷键、流式输出、颜色、交互式提示。

### 合理的设置

实时调整字体大小，设置默认启动参数（`--continue`、`--skip-permissions`、自定义 args），一次配置，所有后续会话通用。

---

## 快速开始

### 1. 确保 Claude Code 已安装

```bash
# 如果还没安装 Claude Code
npm install -g @anthropic-ai/claude-code
claude        # 运行一次进行认证
```

### 2. 下载安装

前往 [**Releases**](https://github.com/orczh-hj/cc-box/releases) 页面获取对应平台的安装包：

| 平台 | 文件 |
|------|------|
| **Windows** | `.exe` (NSIS 安装器) 或 `.msi` |
| **macOS** | `.dmg` |
| **Linux** | `.deb` 或 `.AppImage` |

### 3. 启动使用

1. 打开应用
2. 点击 **Open New Project** 选择目录
3. Claude Code 会话启动——就像在终端里一样输入
4. 从侧边栏打开更多会话，每个独立运行

---

## 从源码构建

<details>
<summary>点击展开</summary>

### 前置要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) stable 工具链
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) 已安装并认证
- **仅 Windows**: MinGW-w64（PATH 中包含 `C:\ProgramData\mingw64\mingw64\bin`）

### 设置

```bash
git clone https://github.com/orczh-hj/cc-box.git
cd cc-box
npm install
```

### 开发

```bash
npm run tauri:dev     # 启动开发模式（热重载）
```

### 构建

```bash
npm run tauri:build   # 构建当前平台

# 或指定平台：
npm run build:win     # Windows (x86_64-pc-windows-gnu)
npm run build:mac     # macOS
npm run build:linux   # Linux (x86_64)
```

构建产物在 `src-tauri/target/release/bundle/`。

</details>

---

## 常见问题

<details>
<summary><strong>这会修改我的 Claude Code 配置吗？</strong></summary>

不会。应用只读取 Claude Code 原生文件。所有 GUI 专属设置独立存储在 `~/.cc-box/`。随时可以回到纯 CLI。
</details>

<details>
<summary><strong>能用所有 CLI 功能吗？</strong></summary>

是的。Slash 命令、键盘快捷键、模型切换、权限提示——一切透明传递给真实 CLI。
</details>

<details>
<summary><strong>性能如何？</strong></summary>

使用 Tauri 2（Rust 后端）构建，安装后约 10 MB，内存占用极低。终端通过 xterm.js 渲染，匹配原生终端性能。
</details>

<details>
<summary><strong>Claude Code 更新后会失效吗？</strong></summary>

应用直接运行 CLI 二进制——不依赖任何内部 API。只要 CLI 在 PATH 中，任何版本都能正常工作。
</details>

---

## 技术栈

Tauri 2 (Rust) + Vue 3 + TypeScript + xterm.js + portable-pty

---

## 代码签名政策

免费代码签名由 [SignPath.io](https://signpath.io) 提供，证书由 [SignPath Foundation](https://signpath.org) 签发

- **提交者和审核者**: [贡献者](https://github.com/orczh-hj/cc-box/graphs/contributors)
- **批准者**: [所有者](https://github.com/orczh-hj)
- **隐私政策**: 本程序不会将任何信息传输到其他网络系统，除非用户或安装/操作者明确请求。

---

## 许可证

[MIT](LICENSE)