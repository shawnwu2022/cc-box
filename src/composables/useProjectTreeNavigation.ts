import type { TerminalTab, HistorySession } from '@/stores/session'

/** 切换动作的输入（全部显式参数，无全局态——保证可测 + 无竞态，对抗审查 D/E） */
export interface SwitchInput {
  projectPath: string
  /** 点具体会话时给定；点项目名时不给 */
  sessionId?: string | null
  /** 该项目是否已是当前项目（cwd） */
  isCurrent: boolean
  /** 该项目的所有 tab */
  tabs: TerminalTab[]
  /** 该项目的已加载历史 */
  history: HistorySession[]
  /** 当前 activeTabId（用于 noop 判断） */
  activeTabId: string | null
}

export type SwitchAction =
  | { type: 'noop' }
  | { type: 'activate'; projectPath: string; tabId: string }
  | { type: 'resume'; projectPath: string; sessionId: string; name?: string }
  | { type: 'new'; projectPath: string }

/** 最近活跃 running/stopped tab（lastActiveAt 最大） */
function mostRecentTab(tabs: TerminalTab[]): TerminalTab | null {
  const live = tabs.filter(t => t.status === 'running' || t.status === 'stopped')
  if (live.length === 0) return null
  return live.reduce((m, t) => (t.lastActiveAt > m.lastActiveAt ? t : m), live[0])
}

/**
 * 解析「点项目名 / 点会话」应执行的动作（对抗审查 D/E 的可测核心）。
 * 纯函数、无副作用、不读写全局单值中间态；连续调用互不影响。
 */
export function resolveSwitchAction(input: SwitchInput): SwitchAction {
  const { projectPath, sessionId, isCurrent, tabs, history, activeTabId } = input

  // 点具体会话
  if (sessionId) {
    const tab = tabs.find(t => t.sessionId === sessionId)
    if (tab) return { type: 'activate', projectPath, tabId: tab.tabId }
    const h = history.find(s => s.sessionId === sessionId)
    return { type: 'resume', projectPath, sessionId, name: h?.name }
  }

  // 点项目名 —— 当前项目且已有 active tab：不打断
  if (isCurrent && activeTabId && tabs.some(t => t.tabId === activeTabId)) {
    return { type: 'noop' }
  }

  // 点项目名 —— 找最近活跃会话
  const recentTab = mostRecentTab(tabs)
  if (recentTab && recentTab.status === 'running') {
    return { type: 'activate', projectPath, tabId: recentTab.tabId }
  }
  if (history.length > 0) {
    const h = [...history].sort((a, b) => b.lastActiveAt - a.lastActiveAt)[0]
    return { type: 'resume', projectPath, sessionId: h.sessionId, name: h.name }
  }
  // stopped tab 存在 → 激活它（用户可手动重启）
  if (recentTab) return { type: 'activate', projectPath, tabId: recentTab.tabId }
  return { type: 'new', projectPath }
}
