import { watch, onMounted, onUnmounted, type Ref } from 'vue'
import { getCurrentWindow, UserAttentionType } from '@tauri-apps/api/window'
import { useHookStore, type HookEventType, type HookEventHandler } from '@/stores/hook'
import { useSessionStore } from '@/stores/session'
import type { HookEventPayload } from '@/types/hook'

const STATUS_EVENTS: HookEventType[] = [
  'sessionStart',
  'userPromptSubmit',
  'preToolUse',
  'postToolUse',
  'postToolUseFailure',
  'subagentStart',
  'subagentStop',
  'stop',
  'stopFailure',
  'notification',
  'sessionEnd',
]

/** 表示 Claude 正在主动工作的事件 */
const ACTIVITY_EVENTS: Set<HookEventType> = new Set([
  'preToolUse',
  'postToolUse',
  'postToolUseFailure',
  'subagentStart',
  'subagentStop',
])

export function useStatusMonitor(options: { isFocused: Ref<boolean>; isTerminalVisible: Ref<boolean> }) {
  const hookStore = useHookStore()
  const sessionStore = useSessionStore()
  const win = getCurrentWindow()

  let unsubscribe: (() => void) | null = null

  const handler: HookEventHandler = (payload: HookEventPayload) => {
    const ptyId = payload.ptyId!
    const tab = sessionStore.getTabByPtyId(ptyId)
    if (!tab || tab.status !== 'running') return

    // sessionStart：直接分配 session_id
    if (payload.detail.type === 'sessionStart') {
      const sessionId = payload.sessionId
      if (sessionId) {
        const data = payload.detail.data as { model?: string }
        sessionStore.assignSessionIdByPtyId(ptyId, sessionId, data.model)
      }
      return
    }

    // userPromptSubmit → 进入 working + 设置标题
    if (payload.detail.type === 'userPromptSubmit') {
      tab.working = true
      // 无自定义标题时，用首条用户消息作为标题
      if (tab.name === 'New Session' || tab.name === tab.sessionId?.slice(0, 8)) {
        const prompt = payload.detail.data.prompt?.trim()
        if (prompt) {
          sessionStore.updateTabName(tab.tabId, prompt.length > 50 ? prompt.slice(0, 50) + '…' : prompt)
        }
      }
      return
    }

    // 活跃事件（工具使用/子代理）→ 恢复 working 状态
    if (ACTIVITY_EVENTS.has(payload.detail.type)) {
      tab.working = true
      tab.pending = false
      return
    }

    // stop/stopFailure/notification/sessionEnd：仅在 working 时才处理
    if (!tab.working) return

    tab.working = false

    // sessionEnd 不需要 pending/attention 提示
    if (payload.detail.type === 'sessionEnd') return

    // 先设置 pending，再根据条件判断是否需要清除
    tab.pending = true

    // 如果用户正在看这个 tab（聚焦 + 终端可见 + tab 激活），则不需要 pending
    if (options.isFocused.value && options.isTerminalVisible.value && tab.tabId === sessionStore.activeTabId) {
      tab.pending = false
      return
    }

    // 应用失焦时才触发任务栏跳动
    if (!options.isFocused.value) {
      win.requestUserAttention(UserAttentionType.Critical).catch(() => {})
    }
  }

  // 聚焦 + 终端可见 + tab 激活 → 清除 pending
  watch(
    [() => options.isFocused.value, () => options.isTerminalVisible.value, () => sessionStore.activeTabId],
    ([focused, visible, activeTabId]) => {
      if (focused && visible && activeTabId) {
        const tab = sessionStore.tabs.get(activeTabId)
        if (tab) tab.pending = false
      }
    },
    { immediate: true }
  )

  onMounted(() => {
    unsubscribe = hookStore.subscribe(STATUS_EVENTS, handler)
  })

  onUnmounted(() => {
    unsubscribe?.()
    unsubscribe = null
  })
}
