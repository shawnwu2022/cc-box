---
name: cc-box-release
description: CC-Box 版本发布。当用户说"发布"、"release"、"版本更新"、"准备发布"时使用此 skill。自动分析代码变更，决定版本级别，撰写 release notes，执行发布。
---

# CC-Box Release

自动分析变更 → 决定版本级别 → 撰写 notes → 执行发布。

## 流程

### 1. 分析变更

```bash
# 获取上一发布版本的 tag
git describe --tags --abbrev=0

# 对比上一版本到当前 HEAD 的差异
git diff <prev-tag>..HEAD --stat
git log <prev-tag>..HEAD --oneline
```

### 2. 决定版本级别

| 变更类型 | 级别 |
|---------|------|
| Bug fix、小改进 | `patch` |
| 新功能、向后兼容的改动 | `minor` |
| 破坏性变更、重大重构 | `major` |

判断规则：
- 只有 `fix`、小改动 → patch
- 有 `feat`、`add`、新组件/功能 → minor
- 有 `breaking`、删除功能、重大架构变更 → major

### 3. 撰写 Release Notes

根据 diff 内容生成英文 notes：

```markdown
### Fixed
- Fix <具体问题>

### Features
- Add <具体功能>

### Improvements
- Improve <具体改进>
```

格式要点：
- 每条以动词开头：Fix/Add/Improve/Update/Remove
- 具体描述改动内容，不写抽象概括
- 英文

### 4. 执行发布

```bash
npm run release -- --bump <level> --notes "<notes>"
```

## 示例

用户说：`发布`

执行步骤：
1. `git describe --tags --abbrev=0` → v0.6.2
2. `git diff v0.6.2..HEAD --stat` → 分析变更文件
3. `git log v0.6.2..HEAD --oneline` → 分析 commit 信息
4. 根据分析结果决定：`--bump patch`
5. 撰写 notes：`--notes "### Fixed\n- Fix hook event handling"`
6. 执行：`npm run release -- --bump patch --notes "..."`

## 特殊情况

| 场景 | 处理 |
|------|------|
| 没有变更 | 提示用户"没有待发布的变更" |
| 用户指定级别 | 使用用户指定的级别，跳过自动判断 |
| 用户提供 notes | 使用用户提供的 notes，跳过自动撰写 |