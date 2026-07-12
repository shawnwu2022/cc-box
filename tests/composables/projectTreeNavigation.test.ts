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
  // 点具体会话（sessionId 给定）且该会话是 running tab → activate
  it('Switch_PointSession_ActivateTab_001', () => {
    const tabs = [makeTab({ tabId: 't1', sessionId: 's1', status: 'running', lastActiveAt: 10 })]
    const out = resolveSwitchAction({
      projectPath: '/p', sessionId: 's1', isCurrent: false,
      tabs, history: [], activeTabId: null,
    })
    expect(out).toEqual({ type: 'activate', projectPath: '/p', tabId: 't1' })
  })

  // 点具体历史会话（无 running tab）→ resume
  it('Switch_PointHistory_Resume_001', () => {
    const history: HistorySession[] = [
      { sessionId: 'h1', name: 'H1', projectPath: '/p', lastActiveAt: 100 },
    ]
    const out = resolveSwitchAction({
      projectPath: '/p', sessionId: 'h1', isCurrent: false,
      tabs: [], history, activeTabId: null,
    })
    expect(out).toEqual({ type: 'resume', projectPath: '/p', sessionId: 'h1', name: 'H1' })
  })

  // 点项目名（无 sessionId）：该项目有 running tab → activate 最近活跃
  it('Switch_PointProject_ActivateRecent_001', () => {
    const tabs = [
      makeTab({ tabId: 't-old', sessionId: 'so', status: 'running', lastActiveAt: 5 }),
      makeTab({ tabId: 't-new', sessionId: 'sn', status: 'running', lastActiveAt: 99 }),
    ]
    const out = resolveSwitchAction({
      projectPath: '/p', sessionId: undefined, isCurrent: false,
      tabs, history: [], activeTabId: null,
    })
    expect(out).toEqual({ type: 'activate', projectPath: '/p', tabId: 't-new' })
  })

  // 点项目名：无 running tab 但有历史 → resume 最近
  it('Switch_PointProject_ResumeRecent_001', () => {
    const history: HistorySession[] = [
      { sessionId: 'old', name: 'Old', projectPath: '/p', lastActiveAt: 1 },
      { sessionId: 'new', name: 'New', projectPath: '/p', lastActiveAt: 50 },
    ]
    const out = resolveSwitchAction({
      projectPath: '/p', sessionId: undefined, isCurrent: false,
      tabs: [], history, activeTabId: null,
    })
    expect(out).toEqual({ type: 'resume', projectPath: '/p', sessionId: 'new', name: 'New' })
  })

  // 点项目名：项目全新（无 tab 无历史）→ new
  it('Switch_PointProject_New_001', () => {
    const out = resolveSwitchAction({
      projectPath: '/p', sessionId: undefined, isCurrent: false,
      tabs: [], history: [], activeTabId: null,
    })
    expect(out).toEqual({ type: 'new', projectPath: '/p' })
  })

  // 点当前项目名且已有 active tab → noop（不打断，对抗审查 F）
  it('Switch_PointCurrentProjectName_Noop_001', () => {
    const tabs = [makeTab({ tabId: 't-cur', sessionId: 'sc', status: 'running' })]
    const out = resolveSwitchAction({
      projectPath: '/p', sessionId: undefined, isCurrent: true,
      tabs, history: [], activeTabId: 't-cur',
    })
    expect(out.type).toBe('noop')
  })

  // 竞态固化（D）：连续对两个不同项目解析，各自结果独立、不串
  it('Switch_ConcurrentProjects_NoCrossTalk_001', () => {
    const tabsA = [makeTab({ tabId: 'ta', sessionId: 'sa', status: 'running' })]
    const tabsB = [makeTab({ tabId: 'tb', sessionId: 'sb', status: 'running' })]
    const a = resolveSwitchAction({
      projectPath: '/pa', sessionId: undefined, isCurrent: false,
      tabs: tabsA, history: [], activeTabId: null,
    })
    const b = resolveSwitchAction({
      projectPath: '/pb', sessionId: undefined, isCurrent: false,
      tabs: tabsB, history: [], activeTabId: null,
    })
    expect(a).toEqual({ type: 'activate', projectPath: '/pa', tabId: 'ta' })
    expect(b).toEqual({ type: 'activate', projectPath: '/pb', tabId: 'tb' })
  })
})
