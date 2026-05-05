import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  HookEventPayload,
  SessionHookState,
  ClaudeState,
} from '@/types/hook'
import { onHookEvent } from '@/api/tauri'

const STALENESS_THRESHOLD_MS = 120_000 // 2 分钟
const ACTIVE_STATES: ClaudeState[] = ['thinking', 'tool_executing', 'subagent_running', 'compacting', 'waiting_permission', 'waiting_input']

export const useHookStore = defineStore('hook', () => {
  const sessions = ref<Map<string, SessionHookState>>(new Map())
  let initialized = false
  let stalenessTimer: ReturnType<typeof setInterval> | null = null

  function handleHookEvent(payload: HookEventPayload) {
    const key = payload.ptyId ?? payload.sessionId
    if (!key) return

    const existing = sessions.value.get(key)
    const prevState = existing?.state

    if (existing) {
      existing.state = payload.state
      existing.lastUpdatedAt = Date.now()
      if (payload.sessionId && !existing.sessionId) {
        existing.sessionId = payload.sessionId
      }
      if (payload.detail.type === 'sessionStart') {
        existing.model = payload.detail.data.model
      }
    } else {
      sessions.value.set(key, {
        ptyId: key,
        state: payload.state,
        sessionId: payload.sessionId ?? undefined,
        model: payload.detail.type === 'sessionStart'
          ? payload.detail.data.model
          : undefined,
        lastUpdatedAt: Date.now(),
      })
    }

    console.log('[hook]', payload.eventName, `state: ${prevState ?? '—'} → ${payload.state}`, `ptyId: ${payload.ptyId}`, `sessionId: ${payload.sessionId}`)
  }

  function getStateForPty(ptyId: string): SessionHookState | undefined {
    return sessions.value.get(ptyId)
  }

  function clearSession(key: string) {
    sessions.value.delete(key)
  }

  function startStalenessCheck() {
    if (stalenessTimer) return
    stalenessTimer = setInterval(() => {
      const now = Date.now()
      for (const [key, session] of sessions.value) {
        if (ACTIVE_STATES.includes(session.state) &&
            now - session.lastUpdatedAt > STALENESS_THRESHOLD_MS) {
          console.log('[hook] staleness detected, resetting to idle:', key, `was: ${session.state}`)
          session.state = 'idle'
          session.lastUpdatedAt = now
        }
      }
    }, 30_000)
  }

  async function init() {
    if (initialized) return
    initialized = true
    onHookEvent((payload) => {
      handleHookEvent(payload)
    })
    startStalenessCheck()
  }

  return {
    sessions,
    handleHookEvent,
    getStateForPty,
    clearSession,
    init,
  }
})
