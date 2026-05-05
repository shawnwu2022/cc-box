import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow, UserAttentionType } from '@tauri-apps/api/window'
import { useSessionStore } from '@/stores/session'

export function useWindowAttention() {
  const sessionStore = useSessionStore()
  const win = getCurrentWindow()

  const isFocused = ref(true)
  let isFlashing = false
  let unlistenFocus: (() => void) | null = null

  onMounted(async () => {
    isFocused.value = await win.isFocused()

    unlistenFocus = await win.onFocusChanged(({ payload: focused }) => {
      isFocused.value = focused
      if (focused) {
        win.requestUserAttention(null).catch(() => {})
        isFlashing = false
        const activeTab = sessionStore.activeTab
        if (activeTab) activeTab.pending = false
      }
    })
  })

  watch(() => !isFocused.value && sessionStore.hasPendingTabs, (needed) => {
    if (needed && !isFlashing) {
      isFlashing = true
      win.requestUserAttention(UserAttentionType.Critical).catch(() => {})
    }
  })

  onUnmounted(() => {
    unlistenFocus?.()
    if (isFlashing) {
      win.requestUserAttention(null).catch(() => {})
      isFlashing = false
    }
  })
}
