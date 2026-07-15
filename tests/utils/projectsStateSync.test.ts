import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createProjectsStateSync } from '@/utils/projectsStateSync'
import type { ProjectsState } from '@/types/app'

const S = (pinned: string[]): ProjectsState => ({ pinnedProjects: pinned, archivedSessions: {}, displayNames: {} })
const apply = vi.fn()

describe('projectsStateSync', () => {
  // 模块级 apply mock 在用例间累积调用，按仓库约定每例前清空（test3 的 toHaveBeenCalledTimes(1) 依赖）
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applyFromAction 总应用并自增 seq', async () => {
    const sync = createProjectsStateSync()
    expect(sync.currentSeq()).toBe(0)
    await sync.applyFromAction(S(['a']), apply)
    expect(apply).toHaveBeenCalledWith(S(['a']))
    expect(sync.currentSeq()).toBe(1)
  })

  it('applyFromReload 期间无 action 则应用', async () => {
    const sync = createProjectsStateSync()
    const emitSeq = sync.currentSeq()
    await sync.applyFromReload(S(['x']), apply, emitSeq)
    expect(apply).toHaveBeenCalledWith(S(['x']))
    expect(sync.currentSeq()).toBe(1)
  })

  it('applyFromReload 期间有 action 应用过则丢弃（防逆序覆盖）', async () => {
    const sync = createProjectsStateSync()
    const emitSeq = sync.currentSeq()                 // reload 发起快照
    // 期间 action 应用（appliedSeq 自增）
    await sync.applyFromAction(S(['a']), apply)
    expect(sync.currentSeq()).toBe(1)
    // reload 旧响应到达：emitSeq(0) !== currentSeq(1) -> 丢弃
    await sync.applyFromReload(S(['old']), apply, emitSeq)
    expect(apply).toHaveBeenCalledTimes(1)            // 只应用了 action，reload 被丢
    expect(apply).not.toHaveBeenCalledWith(S(['old']))
  })

  it('apply 串行：两个 action 按入队顺序应用', async () => {
    const sync = createProjectsStateSync()
    const order: string[] = []
    const a2 = (s: ProjectsState) => order.push(s.pinnedProjects[0])
    await Promise.all([
      sync.applyFromAction(S(['a']), a2),
      sync.applyFromAction(S(['b']), a2),
    ])
    expect(order).toEqual(['a', 'b'])
  })

  it('单步 apply 抛错不断链（后续仍可应用）', async () => {
    const sync = createProjectsStateSync()
    const bad = vi.fn(() => { throw new Error('boom') })
    await sync.applyFromAction(S(['a']), bad)         // 不 reject
    await sync.applyFromAction(S(['b']), apply)       // 仍正常
    expect(apply).toHaveBeenCalledWith(S(['b']))
  })
})
