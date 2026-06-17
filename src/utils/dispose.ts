import { logMessage } from '@/api/tauri'

/**
 * 安全 dispose 一个带 dispose() 的对象，吞掉抛出的错误。
 *
 * xterm.js 的 term.dispose() 在某些边界场景会抛错（例如 addon 已 loadAddon
 * 但 term.open(el) 从未执行导致 dispatcher 未 activate 时，会抛
 * "Could not dispose an addon that has not been loaded"）。
 * 用于 restartTab/cleanup/onUnmounted 等清理流程，避免单个 dispose 抛错
 * 阻断后续 Map.delete 等清理逻辑。
 */
export async function safeDispose(
  target: { dispose(): unknown },
  context: string,
): Promise<void> {
  try {
    await target.dispose()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`[safeDispose] ${context} failed:`, err)
    await logMessage('warn', `safeDispose failed during ${context}: ${message}`).catch(() => {})
  }
}
