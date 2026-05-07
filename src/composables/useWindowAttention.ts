import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'

export function useWindowAttention() {
  const win = getCurrentWindow()
  const isFocused = ref(true)
  let unlistenFocus: (() => void) | null = null

  onMounted(async () => {
    isFocused.value = await win.isFocused()

    unlistenFocus = await win.onFocusChanged(({ payload: focused }) => {
      isFocused.value = focused
      if (focused) {
        // 聚焦时取消任务栏跳动
        win.requestUserAttention(null).catch(() => {})
      }
    })
  })

  onUnmounted(() => {
    unlistenFocus?.()
    win.requestUserAttention(null).catch(() => {})
  })

  return { isFocused }
}
