import type { TerminalTab, HistorySession } from '@/stores/session'

/** 切换动作的输入（全部显式参数，无全局态--保证可测 + 无竞态，对抗审查 D/E） */
export interface SwitchInput {
  projectPath: string
  /** 点会话节点时给定；调用方保证必填（点项目节点 = 展开/折叠，不调本函数） */
  sessionId: string
  /** 该项目的所有 tab */
  tabs: TerminalTab[]
  /** 该项目的已加载历史 */
  history: HistorySession[]
}

export type SwitchAction =
  | { type: 'activate'; projectPath: string; tabId: string }
  | { type: 'resume'; projectPath: string; sessionId: string; name?: string }

/**
 * 解析「点会话节点」应执行的动作（对抗审查 D/E 的可测核心）。
 * 纯函数、无副作用、不读写全局单值中间态；连续调用互不影响。
 *
 * v3：点项目节点 = 展开/折叠（不切换），不经本函数；切换只靠点会话节点。
 * 因此只处理 sessionId 给定的情形：
 * - sessionId 在 tabs 里 -> activate 该 tab
 * - sessionId 在 history 里 -> resume 历史会话
 * - 都不在 -> resume（name 缺省，下游 CLI 报错路径）
 */
export function resolveSwitchAction(input: SwitchInput): SwitchAction {
  const { projectPath, sessionId, tabs, history } = input

  // sessionId 在 tabs 里 -> 激活该 tab
  const tab = tabs.find(t => t.sessionId === sessionId)
  if (tab) return { type: 'activate', projectPath, tabId: tab.tabId }

  // sessionId 在 history 里 -> resume
  const h = history.find(s => s.sessionId === sessionId)
  if (h) return { type: 'resume', projectPath, sessionId, name: h.name }

  // 都不在 -> resume（下游 CLI 报错路径，name 缺省）
  return { type: 'resume', projectPath, sessionId, name: undefined }
}
