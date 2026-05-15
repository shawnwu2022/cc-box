import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock vue-i18n 的 t 函数，直接返回 key+参数 方便断言
const mockT = vi.fn((key: string, params?: Record<string, unknown>) => {
  if (params) return `${key}:${JSON.stringify(params)}`
  return key
})

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: mockT }),
}))

import { useTimeFormat } from '@/composables/useTimeFormat'

describe('useTimeFormat', () => {
  beforeEach(() => {
    mockT.mockClear()
  })

  // < 1 分钟 → timeNow
  it('TimeAgo_JustNow_001', () => {
    const { formatTimeAgo } = useTimeFormat()
    const result = formatTimeAgo(Date.now() - 30000)
    expect(result).toBe('timeNow')
    expect(mockT).toHaveBeenCalledWith('timeNow')
  })

  // 5 分钟 → timeMinutes { n: 5 }
  it('TimeAgo_Minutes_001', () => {
    const { formatTimeAgo } = useTimeFormat()
    const result = formatTimeAgo(Date.now() - 5 * 60000)
    expect(result).toBe('timeMinutes:{"n":5}')
    expect(mockT).toHaveBeenCalledWith('timeMinutes', { n: 5 })
  })

  // 2 小时 → timeHours { n: 2 }
  it('TimeAgo_Hours_001', () => {
    const { formatTimeAgo } = useTimeFormat()
    const result = formatTimeAgo(Date.now() - 2 * 3600000)
    expect(result).toBe('timeHours:{"n":2}')
    expect(mockT).toHaveBeenCalledWith('timeHours', { n: 2 })
  })

  // 3 天 → timeDays { n: 3 }
  it('TimeAgo_Days_001', () => {
    const { formatTimeAgo } = useTimeFormat()
    const result = formatTimeAgo(Date.now() - 3 * 86400000)
    expect(result).toBe('timeDays:{"n":3}')
    expect(mockT).toHaveBeenCalledWith('timeDays', { n: 3 })
  })

  // 59 分钟 → timeMinutes（边界：不超过 60 分钟）
  it('TimeAgo_MinutesBoundary_001', () => {
    const { formatTimeAgo } = useTimeFormat()
    formatTimeAgo(Date.now() - 59 * 60000)
    expect(mockT).toHaveBeenCalledWith('timeMinutes', { n: 59 })
  })

  // 23 小时 → timeHours（边界：不超过 24 小时）
  it('TimeAgo_HoursBoundary_001', () => {
    const { formatTimeAgo } = useTimeFormat()
    formatTimeAgo(Date.now() - 23 * 3600000)
    expect(mockT).toHaveBeenCalledWith('timeHours', { n: 23 })
  })

  // 0 毫秒差 → timeNow
  it('TimeAgo_ZeroDiff_001', () => {
    const { formatTimeAgo } = useTimeFormat()
    const now = Date.now()
    const result = formatTimeAgo(now)
    expect(result).toBe('timeNow')
  })
})
