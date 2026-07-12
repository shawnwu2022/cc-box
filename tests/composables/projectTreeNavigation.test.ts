import { describe, it, expect } from 'vitest'
import { resolveSwitchAction } from '@/composables/useProjectTreeNavigation'
import type { TerminalTab, HistorySession } from '@/stores/session'

function makeTab(overrides: Partial<TerminalTab> & { tabId: string }): TerminalTab {
  return {
    tabId: overrides.tabId,
    projectPath: overrides.projectPath ?? '/p',
    ptyId: overrides.ptyId ?? null,
    sessionId: overrides.sessionId ?? null,
    name: overrides.name ?? 't',
    status: overrides.status ?? 'running',
    createdAt: 0, lastActiveAt: overrides.lastActiveAt ?? 0,
    working: false, pending: false, isResume: false,
  }
}

describe('resolveSwitchAction', () => {
  // 点会话：sessionId 在 tabs 里 -> activate 该 tab
  it('Switch_PointSession_ActivateTab_001', () => {
    const tabs = [makeTab({ tabId: 't1', sessionId: 's1', status: 'running', lastActiveAt: 10 })]
    const out = resolveSwitchAction({
      projectPath: '/p', sessionId: 's1', tabs, history: [],
    })
    expect(out).toEqual({ type: 'activate', projectPath: '/p', tabId: 't1' })
  })

  // 点会话：sessionId 在 history 里 -> resume 历史会话
  it('Switch_PointSession_ResumeHistory_001', () => {
    const history: HistorySession[] = [
      { sessionId: 'h1', name: 'H1', projectPath: '/p', lastActiveAt: 100 },
    ]
    const out = resolveSwitchAction({
      projectPath: '/p', sessionId: 'h1', tabs: [], history,
    })
    expect(out).toEqual({ type: 'resume', projectPath: '/p', sessionId: 'h1', name: 'H1' })
  })

  // 点会话：sessionId 既不在 tabs 也不在 history -> resume（下游 CLI 报错路径，name 缺省）
  it('Switch_PointSession_UnknownSession_Resume_001', () => {
    const out = resolveSwitchAction({
      projectPath: '/p', sessionId: 'ghost', tabs: [], history: [],
    })
    expect(out).toEqual({ type: 'resume', projectPath: '/p', sessionId: 'ghost', name: undefined })
  })

  // 竞态固化（D/E）：连续对两个不同会话解析，各自结果独立、不串
  it('Switch_ConcurrentSessions_NoCrossTalk_001', () => {
    const tabsA = [makeTab({ tabId: 'ta', sessionId: 'sa', status: 'running' })]
    const tabsB = [makeTab({ tabId: 'tb', sessionId: 'sb', status: 'running' })]
    const a = resolveSwitchAction({
      projectPath: '/pa', sessionId: 'sa', tabs: tabsA, history: [],
    })
    const b = resolveSwitchAction({
      projectPath: '/pb', sessionId: 'sb', tabs: tabsB, history: [],
    })
    expect(a).toEqual({ type: 'activate', projectPath: '/pa', tabId: 'ta' })
    expect(b).toEqual({ type: 'activate', projectPath: '/pb', tabId: 'tb' })
  })
})
