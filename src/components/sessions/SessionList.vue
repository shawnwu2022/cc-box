<template>
  <div class="session-list">
    <SessionItem
      v-for="item in items"
      :key="item.id"
      :id="item.id"
      :name="item.name"
      :is-active="item.id === activeId"
      :is-running="item.isRunning"
      :is-stopped="item.isStopped"
      :working="item.working"
      :pending="item.pending"
      :attention-kind="item.attentionKind"
      :last-active-at="item.lastActiveAt"
      :can-resume="item.canResume"
      :closable="closable && item.isTab"
      :archivable="!item.isTab"
      :snippet="item.snippet"
      :show-time="item.showTime"
      @switch="(id) => $emit('switch', id)"
      @rename="(id, name) => $emit('rename', id, name)"
      @restart="(id) => $emit('restart', id)"
      @close="(id) => $emit('close', id)"
      @archive="(id) => $emit('archive', id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SessionItem from './SessionItem.vue'
import type { TerminalTab, HistorySession } from '@/stores/session'
import { useAttentionStore } from '@/stores/attention'
import type { AttentionKind } from '@/composables/useAttentionQueue'

const attentionStore = useAttentionStore()

const props = defineProps<{
  tabs?: TerminalTab[]
  history?: HistorySession[]
  activeId: string | null
  runningTabIds?: string[]
  closable?: boolean
  snippetMap?: Map<string, string>
}>()

defineEmits<{
  switch: [id: string]
  rename: [id: string, name: string]
  restart: [id: string]
  close: [id: string]
  archive: [id: string]
}>()

interface ListItem {
  id: string
  name: string
  isRunning: boolean
  isStopped: boolean
  isTab: boolean
  lastActiveAt: number
  canResume?: boolean
  snippet?: string
  working?: boolean
  pending?: boolean
  attentionKind?: AttentionKind
  showTime?: boolean
}

const items = computed<ListItem[]>(() => {
  const snippets = props.snippetMap

  const tabItems: ListItem[] = (props.tabs ?? []).map(tab => ({
    id: tab.tabId,
    name: tab.name,
    isRunning: tab.status === 'running',
    isStopped: tab.status === 'stopped',
    isTab: true,
    lastActiveAt: tab.lastActiveAt,
    canResume: tab.status === 'stopped' ? !!tab.sessionId : undefined,
    working: tab.status === 'running' ? tab.working : undefined,
    pending: tab.status === 'running' ? tab.pending : undefined,
    attentionKind: tab.ptyId ? attentionStore.getItem(tab.ptyId)?.kind : undefined,
    showTime: false,
  }))

  const historyItems: ListItem[] = (props.history ?? []).map(s => ({
    id: s.sessionId,
    name: s.name,
    isRunning: false,
    isStopped: false,
    isTab: false,
    lastActiveAt: s.lastActiveAt,
    snippet: snippets?.get(s.sessionId),
    showTime: true,
  }))

  return [...tabItems, ...historyItems]
})
</script>

<style scoped>
.session-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
