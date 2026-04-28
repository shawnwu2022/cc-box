<template>
  <div class="plugins-panel">
    <!-- Header -->
    <PanelHeader title="Plugins" @close="$emit('close')">
      <template #actions>
        <button class="action-btn" @click="handleRefresh" title="Refresh plugins">
          <img src="@/assets/icons/refresh.svg" alt="Refresh" />
        </button>
      </template>
    </PanelHeader>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <span class="loading-text">Loading plugins...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="error-state">
      <span class="error-text">{{ error }}</span>
    </div>

    <!-- Empty -->
    <div v-else-if="userPlugins.length === 0 && projectPlugins.length === 0" class="empty-state">
      <span class="empty-text">No plugins installed</span>
      <span class="empty-hint">Install plugins via claude plugin install</span>
    </div>

    <!-- Plugins List -->
    <div v-else class="plugins-list">
      <!-- Project Plugins -->
      <PluginGroup
        v-if="projectPlugins.length > 0"
        title="Project Plugins"
        :expanded="sidebarStore.pluginsExpandedGroups.project"
        :count="projectPlugins.length"
        :plugins="projectPlugins"
        @toggle="sidebarStore.togglePluginGroup('project')"
      />

      <!-- User Plugins -->
      <PluginGroup
        v-if="userPlugins.length > 0"
        title="User Plugins"
        :expanded="sidebarStore.pluginsExpandedGroups.user"
        :count="userPlugins.length"
        :plugins="userPlugins"
        @toggle="sidebarStore.togglePluginGroup('user')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSidebarStore } from '@/stores/sidebar'
import { useAppStore } from '@/stores/app'
import type { PluginInfo } from '@/types'
import PluginGroup from './PluginGroup.vue'
import PanelHeader from '../sidebar/PanelHeader.vue'

const sidebarStore = useSidebarStore()
const appStore = useAppStore()

const error = ref<string | null>(null)

// 使用 sidebar store 的数据（已预加载）
const plugins = computed(() => sidebarStore.plugins)
const loading = computed(() => sidebarStore.pluginsLoading)

// 按 scope 分组
const userPlugins = computed(() => {
  return plugins.value.filter(p => p.scope === 'user' && p.enabled)
})

const projectPlugins = computed(() => {
  return plugins.value.filter(p => p.scope === 'project' && p.enabled)
})

function handleRefresh() {
  if (appStore.cwd) {
    error.value = null
    sidebarStore.loadPlugins(appStore.cwd)
  }
}

onMounted(() => {
  // 如果 sidebar store 还没有数据，触发加载
  if (appStore.cwd && sidebarStore.plugins.length === 0) {
    sidebarStore.loadPlugins(appStore.cwd)
  }
})
</script>

<style scoped>
.plugins-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

/* action-btn slot 样式 */
.plugins-panel :deep(.action-btn) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0;
}

.plugins-panel :deep(.action-btn img) {
  width: 16px;
  height: 16px;
}

.plugins-panel :deep(.action-btn:hover) {
  color: var(--text-primary);
}

.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 8px;
}

.loading-text,
.error-text,
.empty-text {
  font-size: 13px;
  color: var(--text-secondary);
}

.error-text {
  color: var(--error-color);
}

.empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.plugins-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}
</style>
