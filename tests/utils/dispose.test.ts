import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/tauri', () => ({
  logMessage: vi.fn().mockResolvedValue(undefined),
}))

import { safeDispose } from '@/utils/dispose'
import { logMessage } from '@/api/tauri'

describe('safeDispose', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 检查 dispose 抛错时是否被吞掉，不向上传播
  it('SafeDispose_DisposeThrows_NotPropagated_001', async () => {
    const target = {
      dispose: () => {
        throw new Error('Could not dispose an addon that has not been loaded')
      },
    }
    await expect(safeDispose(target, 'restart')).resolves.toBeUndefined()
  })

  // 检查 dispose 抛错时是否记录 warn 级别日志，并附带 context
  it('SafeDispose_DisposeThrows_LogsWarnWithContext_002', async () => {
    const target = {
      dispose: () => {
        throw new Error('addon not loaded')
      },
    }
    await safeDispose(target, 'restart')
    expect(logMessage).toHaveBeenCalledWith(
      'warn',
      expect.stringContaining('safeDispose failed during restart'),
    )
  })

  // 检查非 Error 抛出值（字符串、undefined）是否也能被处理
  it('SafeDispose_NonErrorThrow_FormattedInLog_003', async () => {
    const target = {
      dispose: () => {
        // eslint-disable-next-line no-throw-literal
        throw 'string error'
      },
    }
    await safeDispose(target, 'cleanup')
    expect(logMessage).toHaveBeenCalledWith(
      'warn',
      expect.stringContaining('string error'),
    )
  })

  // 检查 logMessage 自身失败时不会向上传播
  it('SafeDispose_LogMessageRejects_NotPropagated_004', async () => {
    vi.mocked(logMessage).mockRejectedValueOnce(new Error('ipc down'))
    const target = {
      dispose: () => {
        throw new Error('dispose failed')
      },
    }
    await expect(safeDispose(target, 'unmount')).resolves.toBeUndefined()
  })

  // 检查正常 dispose 被调用，且不记录日志
  it('SafeDispose_NormalDispose_NoWarn_005', async () => {
    const dispose = vi.fn()
    await safeDispose({ dispose }, 'cleanup')
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(logMessage).not.toHaveBeenCalled()
  })

  // 检查 dispose 返回 Promise 时也能正确等待
  it('SafeDispose_AsyncDispose_Awaited_006', async () => {
    let resolved = false
    const target = {
      dispose: () =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            resolved = true
            resolve()
          }, 0)
        }),
    }
    await safeDispose(target, 'cleanup')
    expect(resolved).toBe(true)
  })
})
