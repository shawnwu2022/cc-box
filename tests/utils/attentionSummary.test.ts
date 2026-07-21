import { describe, it, expect } from 'vitest'
import { summarizeAttention } from '@/utils/attentionSummary'

describe('summarizeAttention', () => {
  // 空输入 -> 全 0
  it('Summary_Empty_001', () => {
    expect(summarizeAttention([])).toEqual({ error: 0, permission: 0, completed: 0 })
  })
  // 全 undefined（无关注）-> 全 0
  it('Summary_AllUndefined_001', () => {
    expect(summarizeAttention([undefined, undefined])).toEqual({ error: 0, permission: 0, completed: 0 })
  })
  // 各 kind 计数
  it('Summary_CountsByKind_001', () => {
    const r = summarizeAttention(['error', 'permission', 'completed', 'error', 'permission'])
    expect(r).toEqual({ error: 2, permission: 2, completed: 1 })
  })
  // 混合 undefined
  it('Summary_MixedUndefined_001', () => {
    const r = summarizeAttention(['error', undefined, 'completed', undefined])
    expect(r).toEqual({ error: 1, permission: 0, completed: 1 })
  })
})
