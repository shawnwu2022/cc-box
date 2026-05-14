import { describe, it, expect } from 'vitest'
import { deepMergeSettings, replaceInSettings } from '@/utils/json'

describe('deepMergeSettings', () => {
  // source 覆盖 target 中同名的叶值
  it('DeepMerge_LeafValue_001', () => {
    const target = { a: 1 }
    const source = { a: 2 }
    const result = deepMergeSettings(target, source)
    expect(result).toEqual({ a: 2 })
  })

  // source 中 target 没有的 key 被添加
  it('DeepMerge_NewKey_001', () => {
    const target = { a: 1 }
    const source = { b: 2 }
    const result = deepMergeSettings(target, source)
    expect(result).toEqual({ a: 1, b: 2 })
  })

  // 嵌套对象递归合并而非整体替换
  it('DeepMerge_Nested_001', () => {
    const target = { a: { x: 1 } }
    const source = { a: { y: 2 } }
    const result = deepMergeSettings(target, source)
    expect(result).toEqual({ a: { x: 1, y: 2 } })
  })

  // 数组在 source 中直接替换 target 数组
  it('DeepMerge_Array_001', () => {
    const target = { a: [1] }
    const source = { a: [2] }
    const result = deepMergeSettings(target, source)
    expect(result).toEqual({ a: [2] })
  })

  // source 中 null 值覆盖 target 对应 key
  it('DeepMerge_NullValue_001', () => {
    const target = { a: 1 }
    const source = { a: null }
    const result = deepMergeSettings(target, source)
    expect(result).toEqual({ a: null })
  })

  // source 为非对象类型时替换整个 target
  it('DeepMerge_SourcePrimitive_001', () => {
    const target = { a: 1 }
    const source = 'str'
    const result = deepMergeSettings(target, source)
    expect(result).toBe('str')
  })

  // 空 source 返回 target 不变
  it('DeepMerge_EmptySource_001', () => {
    const target = { a: 1 }
    const source = {}
    const result = deepMergeSettings(target, source)
    expect(result).toEqual({ a: 1 })
  })

  // 空 target 返回 source
  it('DeepMerge_EmptyTarget_001', () => {
    const target = {}
    const source = { a: 1 }
    const result = deepMergeSettings(target, source)
    expect(result).toEqual({ a: 1 })
  })
})

describe('replaceInSettings', () => {
  // 替换字符串值中的 ${TOKEN} 占位符
  it('ReplaceInSettings_String_001', () => {
    const obj = { url: 'https://api.example.com/${TOKEN}' }
    const result = replaceInSettings(obj, '${TOKEN}', 'abc123')
    expect(result).toEqual({ url: 'https://api.example.com/abc123' })
  })

  // 替换嵌套对象中的 ${TOKEN} 占位符
  it('ReplaceInSettings_Nested_001', () => {
    const obj = { config: { endpoint: 'https://${TOKEN}/v1' } }
    const result = replaceInSettings(obj, '${TOKEN}', 'myhost')
    expect(result).toEqual({ config: { endpoint: 'https://myhost/v1' } })
  })

  // 替换数组元素中的 ${TOKEN} 占位符
  it('ReplaceInSettings_Array_001', () => {
    const obj = { items: ['${TOKEN}', 'static'] }
    const result = replaceInSettings(obj, '${TOKEN}', 'replaced')
    expect(result).toEqual({ items: ['replaced', 'static'] })
  })

  // 不含占位符的字符串值不修改
  it('ReplaceInSettings_NoMatch_001', () => {
    const obj = { key: 'no placeholder here' }
    const result = replaceInSettings(obj, '${TOKEN}', 'value')
    expect(result).toEqual({ key: 'no placeholder here' })
  })

  // 同一字符串中 ${TOKEN} 出现两次时全部替换
  it('ReplaceInSettings_MultipleOccur_001', () => {
    const obj = { path: '${TOKEN}/api/${TOKEN}' }
    const result = replaceInSettings(obj, '${TOKEN}', 'demo')
    expect(result).toEqual({ path: 'demo/api/demo' })
  })
})
