/**
 * sessionStart waiter 状态机（v6 P1.2/P1.5）。
 * 纯函数 + 类型，供 TerminalView.startProjectSession 事务 + 单元测试。
 */

/** waiter 状态：waiting=等待 sessionStart；其余为终态 */
export type WaiterStatus = 'waiting' | 'started' | 'timeout' | 'exited' | 'failed' | 'cancelled'

/** waiter 事件：sessionStart=hook 到达；timeout=超时；ptyExit=PTY 提前退出；spawnFail=startTab 失败；unmount=组件卸载 */
export type WaiterEvent =
  | { type: 'sessionStart' }
  | { type: 'timeout' }
  | { type: 'ptyExit' }
  | { type: 'spawnFail' }
  | { type: 'unmount' }

/**
 * 状态机纯函数：waiting 接受所有事件转终态；终态吸收后续事件（不重复 settle）。
 * 覆盖：成功(sessionStart) / 事件先到(started 后忽略) / 超时 / 提前退出 / spawn 失败 / unmount。
 */
export function reduceWaiter(state: WaiterStatus, event: WaiterEvent): WaiterStatus {
  if (state !== 'waiting') return state // 终态吸收
  switch (event.type) {
    case 'sessionStart': return 'started'
    case 'timeout': return 'timeout'
    case 'ptyExit': return 'exited'
    case 'spawnFail': return 'failed'
    case 'unmount': return 'cancelled'
  }
}

/**
 * timeout 错误标记码：settleWaiter reject timeout 时挂到 Error.code，
 * 供 startProjectSession catch 精确区分 timeout vs ptyExit/spawnFail（i18n 无关）。
 *
 * 不依赖 error.message 文案匹配：claudeStartTimeout 的本地化文案随 locale 变
 * （zh 含「超时」，en 为 'Claude failed to start (timeout).' 不含「超时」/key 名），
 * 文案匹配在英文 locale 下会误判 -> 走 removeTab 清掉本应保留的 tab。故用 code 标记。
 */
export const STARTUP_TIMEOUT_CODE = 'claudeStartTimeout' as const

/**
 * 判定 waiter reject 是否为 timeout：检查 Error.code === STARTUP_TIMEOUT_CODE。
 * 用于 startProjectSession catch 区分清理路径：
 * - timeout：PTY 可能活 -> ptyKill + 清 terminal instance + 保留 tab（贴 spec §4.4 step 8）
 * - ptyExit/spawnFail：removeTab 清脏 tab
 */
export function isTimeoutError(e: unknown): boolean {
  return (
    e !== null &&
    typeof e === 'object' &&
    'code' in e &&
    (e as { code: unknown }).code === STARTUP_TIMEOUT_CODE
  )
}

/**
 * persist_failed 错误标记码：startProjectSession sessionStart 成功后 setCurrentProject(persist:true)
 * 失败时挂到 Error.code，供 App.vue catch 精确区分 persist 失败 vs spawn 失败（v6 codex batch1 #2）。
 *
 * 区分动机：sessionStart 已成功（Claude 已跑），persist 失败不应误判启动失败重 spawn（会起重复 Claude 进程）。
 * persist 失败 -> 保留 tab + 重试只重 persist；其他 -> 重 spawn。
 */
export const PERSIST_FAILED_CODE = 'persist_failed' as const

/**
 * 判定错误是否为 persist_failed（sessionStart 成功后 lastOpened 持久化失败）。
 * 与 isTimeoutError 同形态：检查 Error.code === PERSIST_FAILED_CODE（i18n 无关，不靠文案匹配）。
 */
export function isPersistFailedError(e: unknown): boolean {
  return (
    e !== null &&
    typeof e === 'object' &&
    'code' in e &&
    (e as { code: unknown }).code === PERSIST_FAILED_CODE
  )
}
