import { describe, it, expect } from 'vitest'
import { reduceWaiter } from '@/composables/useSessionStartWaiter'

describe('reduceWaiter 状态机', () => {
  // waiting + sessionStart -> started
  it('Waiter_SessionStart_Started_001', () => {
    expect(reduceWaiter('waiting', { type: 'sessionStart' })).toBe('started')
  })
  // waiting + timeout -> timeout
  it('Waiter_Timeout_001', () => {
    expect(reduceWaiter('waiting', { type: 'timeout' })).toBe('timeout')
  })
  // waiting + ptyExit -> exited（提前退出）
  it('Waiter_PtyExit_Exited_001', () => {
    expect(reduceWaiter('waiting', { type: 'ptyExit' })).toBe('exited')
  })
  // waiting + spawnFail -> failed
  it('Waiter_SpawnFail_Failed_001', () => {
    expect(reduceWaiter('waiting', { type: 'spawnFail' })).toBe('failed')
  })
  // waiting + unmount -> cancelled
  it('Waiter_Unmount_Cancelled_001', () => {
    expect(reduceWaiter('waiting', { type: 'unmount' })).toBe('cancelled')
  })
  // 事件先到：started 后再 ptyExit/timeout 不变（终态吸收）
  it('Waiter_StartedAbsorbsLaterEvents_001', () => {
    expect(reduceWaiter('started', { type: 'ptyExit' })).toBe('started')
    expect(reduceWaiter('started', { type: 'timeout' })).toBe('started')
  })
  // timeout/exited/failed/cancelled 终态吸收后续事件
  it('Waiter_TerminalAbsorbs_001', () => {
    expect(reduceWaiter('timeout', { type: 'sessionStart' })).toBe('timeout')
    expect(reduceWaiter('exited', { type: 'sessionStart' })).toBe('exited')
    expect(reduceWaiter('failed', { type: 'sessionStart' })).toBe('failed')
    expect(reduceWaiter('cancelled', { type: 'sessionStart' })).toBe('cancelled')
  })
})
