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
