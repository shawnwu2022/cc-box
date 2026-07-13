import { describe, it, expect } from 'vitest'
import { reduceWaiter, isTimeoutError, isPersistFailedError, STARTUP_TIMEOUT_CODE, PERSIST_FAILED_CODE } from '@/composables/useSessionStartWaiter'

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

describe('isTimeoutError', () => {
  // 带 STARTUP_TIMEOUT_CODE 标记 -> true
  it('IsTimeout_TaggedCode_001', () => {
    const err = new Error('Claude 启动超时') as Error & { code: string }
    err.code = STARTUP_TIMEOUT_CODE
    expect(isTimeoutError(err)).toBe(true)
  })
  // 英文 locale 文案无「超时」但带 code 标记 -> 仍 true（i18n 无关，避免英文误判）
  it('IsTimeout_TaggedCodeEnLocale_001', () => {
    const err = new Error('Claude failed to start (timeout).') as Error & { code: string }
    err.code = STARTUP_TIMEOUT_CODE
    expect(isTimeoutError(err)).toBe(true)
  })
  // ptyExit/spawnFail 的 reject 无 code 标记 -> false（走 removeTab 清脏 tab）
  it('IsTimeout_UntaggedNotTimeout_001', () => {
    expect(isTimeoutError(new Error('Claude 启动失败'))).toBe(false)
    expect(isTimeoutError(new Error('cancelled'))).toBe(false)
    expect(isTimeoutError(new Error('no pty info'))).toBe(false)
  })
  // 非 Error 值（null/undefined/string/Promise rejection 原始值）-> false，不抛错
  it('IsTimeout_NonError_001', () => {
    expect(isTimeoutError(null)).toBe(false)
    expect(isTimeoutError(undefined)).toBe(false)
    expect(isTimeoutError('timeout')).toBe(false)
    expect(isTimeoutError({ message: 'x' })).toBe(false)
  })
  // code 标记不等于 STARTUP_TIMEOUT_CODE -> false
  it('IsTimeout_OtherCode_001', () => {
    const err = new Error('x') as Error & { code: string }
    err.code = 'other'
    expect(isTimeoutError(err)).toBe(false)
  })
})

describe('isPersistFailedError', () => {
  // v6 codex batch1 #2：persist_failed 标记区分 sessionStart 成功后 lastOpened 持久化失败
  // 带 PERSIST_FAILED_CODE 标记 -> true
  it('IsPersistFailed_TaggedCode_001', () => {
    const err = new Error('persist_failed') as Error & { code: string }
    err.code = PERSIST_FAILED_CODE
    expect(isPersistFailedError(err)).toBe(true)
  })

  // startTab/spawn 失败的错误无 code 标记 -> false（应重 spawn）
  it('IsPersistFailed_UntaggedNotPersist_001', () => {
    expect(isPersistFailedError(new Error('Claude 启动失败'))).toBe(false)
    expect(isPersistFailedError(new Error('no pty info'))).toBe(false)
    expect(isPersistFailedError(new Error('cancelled'))).toBe(false)
  })

  // timeout 错误（code=STARTUP_TIMEOUT_CODE）-> false（不是 persist 失败，应走 timeout 清理路径）
  it('IsPersistFailed_TimeoutNotPersist_001', () => {
    const err = new Error('Claude 启动超时') as Error & { code: string }
    err.code = STARTUP_TIMEOUT_CODE
    expect(isPersistFailedError(err)).toBe(false)
  })

  // 非 Error 值（null/undefined/string/object 无 code）-> false，不抛错
  it('IsPersistFailed_NonError_001', () => {
    expect(isPersistFailedError(null)).toBe(false)
    expect(isPersistFailedError(undefined)).toBe(false)
    expect(isPersistFailedError('persist_failed')).toBe(false)
    expect(isPersistFailedError({ message: 'x' })).toBe(false)
  })

  // code 不等于 PERSIST_FAILED_CODE -> false
  it('IsPersistFailed_OtherCode_001', () => {
    const err = new Error('x') as Error & { code: string }
    err.code = 'other'
    expect(isPersistFailedError(err)).toBe(false)
  })
})
