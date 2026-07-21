import type { AttentionKind } from '@/composables/useAttentionQueue'

export interface DotClassInput {
  isStopped?: boolean
  isActive?: boolean
  working?: boolean
  pending?: boolean
  isRunning?: boolean
  attentionKind?: AttentionKind
}

/**
 * 会话状态点 class 推导（纯函数，供 SessionItem 单测）。
 *
 * 优先级（高到低）:
 * 1. stopped && !active -> closed（空心圈，已关闭）
 * 2. stopped -> stopped（灰，已停止但当前选中）
 * 3. working -> working（绿脉冲，工作中）
 * 4. attentionKind=error -> error（红，即使 active 也显示 -- CLI 异常非 idle，active 显示 running 会误导）
 * 5. attentionKind=permission && !active -> permission（金脉冲，等权限）
 * 6. attentionKind=completed && !active -> completed（绿圈，完成待确认）
 * 7. pending && !active -> pending（金回退，stop 事件无 attention kind）
 * 8. isRunning -> running（绿静止，空闲）
 * 9. 默认 -> ''（灰）
 *
 * active tab 不显示 permission/completed（用户在看，终端直接可见）。
 * error 即使 active 也显示（error 非 idle，active 时显示 running 绿静止会误导）。
 */
export function computeDotClass(input: DotClassInput): string {
  const { isStopped, isActive, working, pending, isRunning, attentionKind } = input
  if (isStopped && !isActive) return 'closed'
  if (isStopped) return 'stopped'
  if (working) return 'working'
  if (attentionKind === 'error') return 'error'
  if (attentionKind === 'permission' && !isActive) return 'permission'
  if (attentionKind === 'completed' && !isActive) return 'completed'
  if (pending && !isActive) return 'pending'
  if (isRunning) return 'running'
  return ''
}
