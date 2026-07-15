import type { ProjectsState } from '@/types/app'

/**
 * 多实例 projects.json 状态应用的统一同步队列（spec §3.8）。
 *
 * 解决「聚焦 reload 读到旧版本、其响应晚于 action 到达、覆盖 action 新状态」的逆序竞态。
 *
 * - 串行 apply：所有应用经同一 Promise 链排队，避免并发覆盖。
 * - appliedSeq：每次成功 apply 自增。
 *   - action 返回值：无条件应用（代表用户最新操作结果），appliedSeq++。
 *   - reload 返回值：仅当 appliedSeq === emitSeq（发起后无任何 apply）才应用，否则丢弃。
 */
export interface ProjectsStateSync {
  /** action 返回值应用（无条件）。apply 覆盖本地三份状态。 */
  applyFromAction(state: ProjectsState, apply: (s: ProjectsState) => void): Promise<void>
  /** reload 返回值应用（emitSeq = 发起时 currentSeq()）。期间有 apply 则丢弃。 */
  applyFromReload(state: ProjectsState, apply: (s: ProjectsState) => void, emitSeq: number): Promise<void>
  /** 当前 appliedSeq（reload 发起前快照用）。 */
  currentSeq(): number
}

export function createProjectsStateSync(): ProjectsStateSync {
  let appliedSeq = 0
  let chain: Promise<void> = Promise.resolve()

  function enqueue(task: () => void): Promise<void> {
    chain = chain.then(() => task()).catch(() => {})   // 串行；单步抛错不断链
    return chain
  }

  return {
    applyFromAction(state, apply) {
      return enqueue(() => { apply(state); appliedSeq++ })
    },
    applyFromReload(state, apply, emitSeq) {
      return enqueue(() => {
        if (appliedSeq === emitSeq) { apply(state); appliedSeq++ }
        // 否则丢弃：期间有 action/其他 reload 应用过，本 reload 已过时
      })
    },
    currentSeq() { return appliedSeq },
  }
}
