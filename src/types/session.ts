// Session 相关类型定义

export interface SessionInfo {
  sessionId: string
  name: string
  projectPath: string
  lastActiveAt: number
  /** 来自运行中 tab 的工作状态 */
  working?: boolean
  /** 来自运行中 tab 的待处理状态 */
  pending?: boolean
}

export interface SessionDetails {
  sessionId: string
  name: string
  messageCount: number
  totalTokens?: number
  totalCost?: number
  createdAt?: number
  lastActiveAt: number
}

export interface SessionSearchResult {
  sessionId: string
  name: string
  projectPath: string
  lastActiveAt: number
  snippet: string
}