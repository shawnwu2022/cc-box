import { describe, it, expect } from 'vitest'
import { getCategoryLabel, filterPresetsByCategory, providerPresets } from '@/config/providerPresets'
import type { ProviderPreset, ProviderCategory } from '@/types/provider'

describe('getCategoryLabel', () => {
  // official 分类返回对应中文标签
  it('CategoryLabel_Official_001', () => {
    expect(getCategoryLabel('official')).toBe('官方 Official')
  })

  // cn_official 分类返回对应中文标签
  it('CategoryLabel_CnOfficial_001', () => {
    expect(getCategoryLabel('cn_official')).toBe('国内 CN')
  })

  // cloud_provider 分类返回对应中文标签
  it('CategoryLabel_CloudProvider_001', () => {
    expect(getCategoryLabel('cloud_provider')).toBe('云服务 Cloud')
  })

  // aggregator 分类返回对应中文标签
  it('CategoryLabel_Aggregator_001', () => {
    expect(getCategoryLabel('aggregator')).toBe('聚合 Aggregator')
  })

  // custom 分类返回对应中文标签
  it('CategoryLabel_Custom_001', () => {
    expect(getCategoryLabel('custom')).toBe('自定义 Custom')
  })

  // undefined 输入返回空字符串
  it('CategoryLabel_Undefined_001', () => {
    expect(getCategoryLabel(undefined)).toBe('')
  })

  // 未知分类字符串 "future_type" 原样返回
  it('CategoryLabel_Unknown_001', () => {
    expect(getCategoryLabel('future_type' as ProviderCategory)).toBe('future_type')
  })
})

describe('filterPresetsByCategory', () => {
  // 设置 category="official" 时只返回 official 预设
  it('FilterPresets_ByCategory_001', () => {
    const result = filterPresetsByCategory(providerPresets, 'official')
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(p => p.category === 'official')).toBe(true)
  })

  // 不设 category 参数时返回所有 hidden=false 的预设
  it('FilterPresets_NoCategory_001', () => {
    const result = filterPresetsByCategory(providerPresets)
    const visiblePresets = providerPresets.filter(p => !p.hidden)
    expect(result.length).toBe(visiblePresets.length)
  })

  // hidden=true 的预设被排除
  it('FilterPresets_ExcludeHidden_001', () => {
    const presetsWithHidden: ProviderPreset[] = [
      { name: 'Visible', websiteUrl: '', settingsConfig: { env: {} }, category: 'official' },
      { name: 'Hidden', websiteUrl: '', settingsConfig: { env: {} }, category: 'official', hidden: true },
    ]
    const result = filterPresetsByCategory(presetsWithHidden, 'official')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Visible')
  })

  // 设置无匹配的 category "omo" 时返回空数组
  it('FilterPresets_NoMatch_001', () => {
    const result = filterPresetsByCategory(providerPresets, 'omo')
    expect(result).toEqual([])
  })
})
