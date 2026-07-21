import { describe, it, expect } from 'vitest'
import { computeDotClass } from '@/utils/sessionDot'

describe('computeDotClass', () => {
  // stopped + 非激活 -> closed
  it('Dot_StoppedInactive_Closed_001', () => {
    expect(computeDotClass({ isStopped: true, isActive: false })).toBe('closed')
  })
  // stopped + 激活 -> stopped
  it('Dot_StoppedActive_Stopped_001', () => {
    expect(computeDotClass({ isStopped: true, isActive: true })).toBe('stopped')
  })
  // working -> working（最高优先，即使有 attention）
  it('Dot_Working_Working_001', () => {
    expect(computeDotClass({ working: true, attentionKind: 'error' })).toBe('working')
  })
  // error 即使 active 也显示（error 非 idle，active 显示 running 会误导）
  it('Dot_Error_ShowEvenActive_001', () => {
    expect(computeDotClass({ isRunning: true, isActive: true, attentionKind: 'error' })).toBe('error')
  })
  // error 非 active 显示
  it('Dot_Error_ShowInactive_001', () => {
    expect(computeDotClass({ isRunning: true, isActive: false, attentionKind: 'error' })).toBe('error')
  })
  // permission 仅 !active 显示
  it('Dot_Permission_OnlyInactive_001', () => {
    expect(computeDotClass({ isRunning: true, isActive: false, attentionKind: 'permission' })).toBe('permission')
  })
  it('Dot_Permission_SuppressedWhenActive_001', () => {
    expect(computeDotClass({ isRunning: true, isActive: true, attentionKind: 'permission' })).toBe('running')
  })
  // completed 仅 !active 显示（绿圈）
  it('Dot_Completed_OnlyInactive_001', () => {
    expect(computeDotClass({ isRunning: true, isActive: false, attentionKind: 'completed' })).toBe('completed')
  })
  it('Dot_Completed_SuppressedWhenActive_001', () => {
    expect(computeDotClass({ isRunning: true, isActive: true, attentionKind: 'completed' })).toBe('running')
  })
  // pending 回退（stop 无 attention kind）仅 !active
  it('Dot_PendingFallback_OnlyInactive_001', () => {
    expect(computeDotClass({ isRunning: true, isActive: false, pending: true })).toBe('pending')
  })
  it('Dot_PendingFallback_SuppressedWhenActive_001', () => {
    expect(computeDotClass({ isRunning: true, isActive: true, pending: true })).toBe('running')
  })
  // running（idle，无 attention）-> running
  it('Dot_Running_Running_001', () => {
    expect(computeDotClass({ isRunning: true, isActive: false })).toBe('running')
  })
  // 默认（无任何状态）-> ''
  it('Dot_Default_Empty_001', () => {
    expect(computeDotClass({})).toBe('')
  })
  // error 优先于 permission/completed/pending
  it('Dot_Error_Precedence_001', () => {
    expect(computeDotClass({ isRunning: true, isActive: false, attentionKind: 'error', pending: true })).toBe('error')
  })
})
