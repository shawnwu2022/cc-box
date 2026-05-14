<template>
  <div ref="listRef" class="provider-list">
    <ProviderCard
      v-for="provider in localProviders"
      :key="provider.id"
      :provider="provider"
      :is-active="provider.id === activeId"
      :is-testing="provider.id === testingId"
      @activate="$emit('activate', provider.id)"
      @edit="$emit('edit', provider)"
      @test="$emit('test', provider)"
      @delete="$emit('delete', provider.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDraggable } from 'vue-draggable-plus'
import ProviderCard from './ProviderCard.vue'
import type { Provider } from '@/types/provider'

const props = defineProps<{
  providers: Provider[]
  activeId: string | null
  testingId: string | null
}>()

const emit = defineEmits<{
  activate: [id: string]
  edit: [provider: Provider]
  test: [provider: Provider]
  delete: [id: string]
  reorder: [ids: string[]]
}>()

const listRef = ref<HTMLElement | null>(null)
const localProviders = ref<Provider[]>([...props.providers])

watch(() => props.providers, (val) => {
  localProviders.value = [...val]
}, { deep: true })

useDraggable(listRef, localProviders, {
  animation: 150,
  handle: '.drag-handle',
  forceFallback: true,
  onUpdate() {
    emit('reorder', localProviders.value.map(p => p.id))
  }
})
</script>

<style scoped>
.provider-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
