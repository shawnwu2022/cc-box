#!/bin/bash
# CC-Box Hook Reporter — 跨平台兼容，任何异常均 exit 0
#
# 作用：将 Claude Code 的 hook 事件通过 HTTP POST 发送给 CC-Box
# 触发条件：由 cc-box-monitor plugin 的 hooks.json 注册
#
# 环境变量（由 CC-Box spawn PTY 时注入）：
# - CC_BOX_HOOK_PORT   CC-Box HTTP 服务器端口（未设置 = 非 CC-Box 会话）
# - CC_BOX_SESSION_ID  当前 PTY 的唯一标识（用于区分多终端）
#
# 安全保障：
# - CC_BOX_HOOK_PORT 未设置时静默退出，不影响 Claude
# - curl 不可用时跳过
# - 所有错误重定向到 /dev/null
# - 超时 3 秒，hook timeout 5 秒作为二次保险

[ -z "$CC_BOX_HOOK_PORT" ] && exit 0

command -v curl >/dev/null 2>&1 || exit 0

INPUT=$(cat)

# CC_BOX_SESSION_ID 由 CC-Box 按 PTY 注入，用于区分多终端
# 放在 header 中不影响 hook 事件数据
curl -s --max-time 3 -X POST "http://127.0.0.1:$CC_BOX_HOOK_PORT/hook" \
  -H "Content-Type: application/json" \
  -H "X-CC-Box-Session: ${CC_BOX_SESSION_ID:-}" \
  -d "$INPUT" >/dev/null 2>&1

exit 0

exit 0
