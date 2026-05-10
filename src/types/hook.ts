/** Hook 监控系统类型定义 — 与 Rust hook_events.rs 一一对应 */

/** Claude 运行时状态 */
export type ClaudeState =
  | 'idle'
  | 'thinking'
  | 'tool_executing'
  | 'waiting_permission'
  | 'waiting_input'
  | 'subagent_running'
  | 'compacting'
  | 'error'
  | 'unknown'

/** SessionStart 事件提取的数据 */
export interface SessionStartData {
  model?: string
  cwd?: string
  transcriptPath?: string
  source?: string
}

/** UserPromptSubmit 事件提取的数据 */
export interface UserPromptSubmitData {
  prompt?: string
}

// ---- 带标签的事件详情 ----

export type HookEventDetail =
  | { type: 'sessionStart'; data: SessionStartData }
  | { type: 'sessionEnd'; data: null }
  | { type: 'userPromptSubmit'; data: UserPromptSubmitData }
  | { type: 'preToolUse'; data: null }
  | { type: 'postToolUse'; data: null }
  | { type: 'postToolUseFailure'; data: null }
  | { type: 'stop'; data: null }
  | { type: 'stopFailure'; data: null }
  | { type: 'notification'; data: null }
  | { type: 'subagentStart'; data: null }
  | { type: 'subagentStop'; data: null }
  | { type: 'unknown'; data: Record<string, unknown> }

// ---- 完整 payload ----

/** 从 Rust 后端 emit 的完整事件 payload */
export interface HookEventPayload {
  ptyId: string | null
  sessionId: string | null
  eventName: string
  state: ClaudeState
  timestamp: number
  detail: HookEventDetail
}

// ---- 前端聚合状态 ----

/** 每个会话的聚合 hook 状态 */
export interface SessionHookState {
  ptyId: string
  sessionId?: string
  state: ClaudeState
  model?: string
  lastUpdatedAt: number
}
