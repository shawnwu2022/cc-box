import { describe, it, expect } from 'vitest'
import { stringArrEqual, stringArrMapEqual, stringMapEqual } from '@/stores/session'

// 性能 #4：applyReturnedState 浅比较 helper。覆盖相同/不同/空/缺 key/长度差异等分支，
// 防 diff 误写（如恒 false 或漏 null 守护）导致优化静默失效。
describe('equal helpers (性能 #4)', () => {
  // ---- stringArrEqual ----
  it('StringArrEqual_Same_001', () => {
    expect(stringArrEqual(['a', 'b'], ['a', 'b'])).toBe(true)
  })
  it('StringArrEqual_Diff_001', () => {
    expect(stringArrEqual(['a'], ['b'])).toBe(false)
    expect(stringArrEqual(['a', 'b'], ['a', 'c'])).toBe(false)
    expect(stringArrEqual(['a'], ['a', 'b'])).toBe(false) // 长度不同
  })
  it('StringArrEqual_Empty_001', () => {
    expect(stringArrEqual([], [])).toBe(true)
  })

  // ---- stringArrMapEqual ----
  it('StringArrMapEqual_Same_001', () => {
    const m = new Map([['/p', ['a', 'b']]])
    expect(stringArrMapEqual(m, { '/p': ['a', 'b'] })).toBe(true)
  })
  it('StringArrMapEqual_DiffValue_001', () => {
    const m = new Map([['/p', ['a']]])
    expect(stringArrMapEqual(m, { '/p': ['a', 'b'] })).toBe(false)
  })
  it('StringArrMapEqual_DiffKey_001', () => {
    const m = new Map([['/p', ['a']]])
    expect(stringArrMapEqual(m, { '/q': ['a'] })).toBe(false) // key 不同
    expect(stringArrMapEqual(m, { '/p': ['a'], '/q': ['b'] })).toBe(false) // size 不同
  })
  it('StringArrMapEqual_Empty_001', () => {
    expect(stringArrMapEqual(new Map(), {})).toBe(true)
  })

  // ---- stringMapEqual ----
  it('StringMapEqual_Same_001', () => {
    const m = new Map([['/p', 'name']])
    expect(stringMapEqual(m, { '/p': 'name' })).toBe(true)
  })
  it('StringMapEqual_DiffValue_001', () => {
    const m = new Map([['/p', 'name']])
    expect(stringMapEqual(m, { '/p': 'other' })).toBe(false)
  })
  it('StringMapEqual_DiffKey_001', () => {
    const m = new Map([['/p', 'name']])
    expect(stringMapEqual(m, { '/q': 'name' })).toBe(false)
  })
  it('StringMapEqual_Empty_001', () => {
    expect(stringMapEqual(new Map(), {})).toBe(true)
  })
})
