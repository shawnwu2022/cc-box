import type { AttentionKind } from '@/composables/useAttentionQueue'

export interface AttentionSummary {
  error: number
  permission: number
  completed: number
}

/**
 * 聚合项目内各会话的 attention kind 计数（纯函数，供 ProjectNode 单测）。
 * 输入:每个 tab 的 attentionKind（undefined = 无关注项）。输出:按 kind 计数。
 */
export function summarizeAttention(kinds: (AttentionKind | undefined)[]): AttentionSummary {
  const summary: AttentionSummary = { error: 0, permission: 0, completed: 0 }
  for (const kind of kinds) {
    if (kind === 'error') summary.error++
    else if (kind === 'permission') summary.permission++
    else if (kind === 'completed') summary.completed++
  }
  return summary
}
