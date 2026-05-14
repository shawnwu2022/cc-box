<template>
  <div class="preset-panel">
    <div class="panel-header">
      <button class="back-btn" @click="$emit('close')">← 返回</button>
      <span class="panel-title">选择预设模板</span>
    </div>

    <div class="panel-content">
      <div class="category-filter">
        <button
          v-for="cat in categories"
          :key="cat.value"
          class="filter-btn"
          :class="{ active: selectedCategory === cat.value }"
          @click="selectedCategory = cat.value"
        >
          {{ cat.label }}
        </button>
      </div>

      <div class="preset-grid">
        <div
          v-for="preset in filteredPresets"
          :key="preset.name"
          class="preset-card"
          @click="$emit('select', preset)"
        >
          <div class="preset-icon" :style="{ color: preset.iconColor || '#6366F1' }">
            {{ getIconChar(preset.icon) }}
          </div>
          <div class="preset-info">
            <span class="preset-name">{{ preset.name }}</span>
            <span class="preset-category">{{ getCategoryLabel(preset.category) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { providerPresets, getCategoryLabel } from '@/config/providerPresets'
import type { ProviderPreset } from '@/types/provider'

defineEmits<{
  close: []
  select: [preset: ProviderPreset]
}>()

const presets = ref<ProviderPreset[]>(providerPresets)

const categories = [
  { value: '', label: '全部' },
  { value: 'official', label: '官方' },
  { value: 'cn_official', label: '国内' },
  { value: 'aggregator', label: '聚合' },
  { value: 'cloud_provider', label: '云服务' },
  { value: 'third_party', label: '第三方' },
]

const selectedCategory = ref<string>('')

const filteredPresets = computed(() => {
  if (!selectedCategory.value) {
    return presets.value.filter(p => !p.hidden)
  }
  return presets.value.filter(p => p.category === selectedCategory.value && !p.hidden)
})

function getIconChar(icon?: string): string {
  if (!icon) return 'P'
  const iconChars: Record<string, string> = {
    anthropic: 'A',
    deepseek: 'D',
    zhipu: 'Z',
    baidu: 'B',
    bailian: 'B',
    kimi: 'K',
    stepfun: 'S',
    minimax: 'M',
    doubao: 'D',
    siliconflow: 'S',
    openrouter: 'O',
    gemini: 'G',
    github: 'G',
    aws: 'A',
    aihubmix: 'A',
    modelscope: 'M',
    generic: 'P',
    custom: 'C',
  }
  return iconChars[icon] || icon[0].toUpperCase()
}
</script>

<style scoped>
.preset-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-primary);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.back-btn {
  padding: 6px 12px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}

.back-btn:hover {
  background: var(--hover-bg);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.category-filter {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-btn {
  padding: 6px 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.filter-btn:hover {
  background: var(--hover-bg);
}

.filter-btn.active {
  background: var(--accent-color);
  color: white;
  border-color: var(--accent-color);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.preset-card:hover {
  border-color: var(--accent-color);
}

.preset-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  background: var(--bg-primary);
  border-radius: 6px;
}

.preset-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preset-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.preset-category {
  font-size: 11px;
  color: var(--text-tertiary);
}
</style>