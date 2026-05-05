import { defineStore } from 'pinia'
import type { HookEventPayload } from '@/types/hook'
import { onHookEvent } from '@/api/tauri'
import { useSessionStore } from '@/stores/session'

export const useHookStore = defineStore('hook', () => {
  let initialized = false

  function handleHookEvent(payload: HookEventPayload) {
    const ptyId = payload.ptyId
    if (!ptyId) return

    const sessionStore = useSessionStore()
    const model = payload.detail.type === 'sessionStart'
      ? (payload.detail.data as { model?: string }).model
      : undefined

    sessionStore.updateClaudeState(ptyId, payload.state, model)
  }

  function clearSession(_key: string) {
    // 不再维护 sessions map，sessionStore 处理清理
  }

  async function init() {
    if (initialized) return
    initialized = true
    onHookEvent((payload) => {
      handleHookEvent(payload)
    })
  }

  return {
    handleHookEvent,
    clearSession,
    init,
  }
})
