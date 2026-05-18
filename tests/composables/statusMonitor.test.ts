import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { randomUUID } from 'crypto'

// crypto.randomUUID polyfill for jsdom
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      ...globalThis.crypto,
      randomUUID: () => randomUUID(),
    },
    writable: true,
    configurable: true,
  })
}

// 捕获 vue 生命周期回调
let mountedCbs: (() => void)[] = []
let unmountedCbs: (() => void)[] = []

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onMounted: (fn: () => void) => mountedCbs.push(fn),
    onUnmounted: (fn: () => void) => unmountedCbs.push(fn),
  }
})

// Mock @/api/tauri — 捕获 onHookEvent 回调
let capturedDispatch: ((payload: any) => void) | null = null

vi.mock('@/api/tauri', () => ({
  ptyKill: vi.fn().mockResolvedValue(true),
  getSessionCount: vi.fn().mockResolvedValue(0),
  getSessions: vi.fn().mockResolvedValue([]),
  searchSessionMessages: vi.fn().mockResolvedValue([]),
  onHookEvent: vi.fn((cb: (p: any) => void) => {
    capturedDispatch = cb
    return Promise.resolve(() => {})
  }),
}))

// Mock Tauri window API
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    requestUserAttention: vi.fn().mockResolvedValue(undefined),
  }),
  UserAttentionType: { Critical: 'Critical' },
}))

import { useSessionStore } from '@/stores/session'
import { useHookStore } from '@/stores/hook'
import type { HookEventPayload, HookEventDetail } from '@/types/hook'
import { useStatusMonitor } from '@/composables/useStatusMonitor'

/** 各事件类型对应的默认 data */
const DEFAULT_DATA: Record<string, unknown> = {
  userPromptSubmit: { prompt: 'test prompt' },
  sessionStart: { model: 'claude-sonnet-4-6', cwd: '/project' },
}

/** 构建测试用的 HookEventPayload */
function makePayload(
  type: HookEventDetail['type'],
  ptyId: string = 'pty1',
  extra?: Partial<HookEventPayload>,
): HookEventPayload {
  return {
    ptyId,
    sessionId: 'session1',
    eventName: type,
    state: 'thinking',
    timestamp: Date.now(),
    detail: { type, data: (DEFAULT_DATA[type] ?? null) as any } as HookEventDetail,
    ...extra,
  }
}

/** 创建一个处于 running 状态且绑定 ptyId 的 tab */
function createRunningTab(ptyId = 'pty1', projectPath = '/project'): string {
  const store = useSessionStore()
  const tabId = store.createTab(projectPath)
  const tab = store.tabs.get(tabId)!
  tab.status = 'running'
  tab.ptyId = ptyId
  return tabId
}

/** 挂载 useStatusMonitor 并触发 onMounted */
function mountMonitor() {
  const isFocused = ref(true)
  const isTerminalVisible = ref(true)

  const hookStore = useHookStore()
  hookStore.init()

  useStatusMonitor({ isFocused, isTerminalVisible })

  // 触发 onMounted 回调
  mountedCbs.forEach((fn) => fn())

  return { isFocused, isTerminalVisible }
}

/** 通过 hook store dispatch 发送事件 */
function emit(payload: HookEventPayload) {
  capturedDispatch!(payload)
}

describe('useStatusMonitor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    capturedDispatch = null
    mountedCbs = []
    unmountedCbs = []
  })

  // ==================== 基本状态转换 ====================

  describe('基本状态转换', () => {
    // userPromptSubmit → working = true
    it('StatusMonitor_UserPromptSubmit_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('userPromptSubmit', 'pty1'))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.working).toBe(true)
    })

    // stop → working = false, pending = true
    it('StatusMonitor_Stop_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('userPromptSubmit', 'pty1'))
      emit(makePayload('stop', 'pty1'))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.working).toBe(false)
      expect(tab.pending).toBe(true)
    })

    // notification → working = false, pending = true
    it('StatusMonitor_Notification_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('userPromptSubmit', 'pty1'))
      emit(makePayload('notification', 'pty1'))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.working).toBe(false)
      expect(tab.pending).toBe(true)
    })
  })

  // ==================== 活跃事件恢复 working ====================

  describe('活跃事件恢复 working（bug 修复）', () => {
    // notification 后收到 preToolUse → working 恢复为 true
    it('StatusMonitor_ActivityRestore_PreToolUse_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('userPromptSubmit', 'pty1'))
      emit(makePayload('notification', 'pty1'))
      emit(makePayload('preToolUse', 'pty1'))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.working).toBe(true)
      expect(tab.pending).toBe(false)
    })

    // notification 后收到 postToolUse → working 恢复为 true
    it('StatusMonitor_ActivityRestore_PostToolUse_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('userPromptSubmit', 'pty1'))
      emit(makePayload('notification', 'pty1'))
      emit(makePayload('postToolUse', 'pty1'))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.working).toBe(true)
      expect(tab.pending).toBe(false)
    })

    // notification 后收到 subagentStart → working 恢复为 true
    it('StatusMonitor_ActivityRestore_SubagentStart_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('userPromptSubmit', 'pty1'))
      emit(makePayload('notification', 'pty1'))
      emit(makePayload('subagentStart', 'pty1'))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.working).toBe(true)
      expect(tab.pending).toBe(false)
    })

    // notification 后收到 postToolUseFailure → working 恢复为 true
    it('StatusMonitor_ActivityRestore_PostToolUseFailure_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('userPromptSubmit', 'pty1'))
      emit(makePayload('notification', 'pty1'))
      emit(makePayload('postToolUseFailure', 'pty1'))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.working).toBe(true)
      expect(tab.pending).toBe(false)
    })

    // stop 后收到 subagentStop → working 恢复为 true
    it('StatusMonitor_ActivityRestore_SubagentStop_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('userPromptSubmit', 'pty1'))
      emit(makePayload('stop', 'pty1'))
      emit(makePayload('subagentStop', 'pty1'))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.working).toBe(true)
      expect(tab.pending).toBe(false)
    })

    // 完整流程：用户发消息 → 权限提示 → 用户授权 → 工具执行 → 完成
    it('StatusMonitor_FullPermissionFlow_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('userPromptSubmit', 'pty1'))
      expect(useSessionStore().getTabByPtyId('pty1')!.working).toBe(true)

      emit(makePayload('notification', 'pty1'))
      expect(useSessionStore().getTabByPtyId('pty1')!.working).toBe(false)
      expect(useSessionStore().getTabByPtyId('pty1')!.pending).toBe(true)

      emit(makePayload('preToolUse', 'pty1'))
      expect(useSessionStore().getTabByPtyId('pty1')!.working).toBe(true)
      expect(useSessionStore().getTabByPtyId('pty1')!.pending).toBe(false)

      emit(makePayload('postToolUse', 'pty1'))
      expect(useSessionStore().getTabByPtyId('pty1')!.working).toBe(true)

      emit(makePayload('stop', 'pty1'))
      expect(useSessionStore().getTabByPtyId('pty1')!.working).toBe(false)
      expect(useSessionStore().getTabByPtyId('pty1')!.pending).toBe(true)
    })
  })

  // ==================== 不影响原有逻辑 ====================

  describe('原有逻辑不受影响', () => {
    // working = false 时 stop 事件被忽略
    it('StatusMonitor_IgnoreStopWhenIdle_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('stop', 'pty1'))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.working).toBe(false)
      expect(tab.pending).toBe(false)
    })

    // sessionEnd → working = false，不设 pending
    it('StatusMonitor_SessionEnd_NoPending_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('userPromptSubmit', 'pty1'))
      emit(makePayload('sessionEnd', 'pty1'))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.working).toBe(false)
      expect(tab.pending).toBe(false)
    })

    // sessionStart 分配 sessionId
    it('StatusMonitor_SessionStart_001', () => {
      createRunningTab('pty1')
      mountMonitor()

      emit(makePayload('sessionStart', 'pty1', {
        sessionId: 'new-session-id',
        detail: {
          type: 'sessionStart',
          data: { model: 'claude-sonnet-4-6' },
        } as any,
      }))

      const tab = useSessionStore().getTabByPtyId('pty1')!
      expect(tab.sessionId).toBe('new-session-id')
      expect(tab.model).toBe('claude-sonnet-4-6')
    })
  })
})
