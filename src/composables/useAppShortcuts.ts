import { Window, getCurrentWindow, currentMonitor } from '@tauri-apps/api/window'
import { Webview, getCurrentWebview } from '@tauri-apps/api/webview'
import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi'
import { useAppStore } from '@/stores/app'
import { useSidebarStore } from '@/stores/sidebar'
import { ptyKillAll } from '@/api/tauri'

export async function snapWindow(side: 'left' | 'right') {
  try {
    const win = getCurrentWindow()
    const monitor = await currentMonitor()
    if (!monitor) return

    const scaleFactor = monitor.scaleFactor
    const halfWidth = Math.floor(monitor.size.width / scaleFactor / 2)
    const height = window.screen.availHeight - 21
    const x = side === 'left'
      ? monitor.position.x / scaleFactor
      : monitor.position.x / scaleFactor + halfWidth
    const y = monitor.position.y / scaleFactor

    await win.setPosition(new LogicalPosition(x, y))
    await win.setSize(new LogicalSize(halfWidth, height))
  } catch (err) {
    console.error(`Failed to snap ${side}:`, err)
  }
}

export function openNewWindow() {
  const label = `win_${Date.now()}`
  const appWindow = new Window(label, {
    title: 'CC-Box',
    width: 800,
    height: 600,
    minWidth: 500,
    minHeight: 400,
    center: true,
  })

  appWindow.once('tauri://created', () => {
    new Webview(appWindow, label, {
      url: '/',
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    })
  })
}

export function useAppShortcuts() {
  const appStore = useAppStore()
  const sidebarStore = useSidebarStore()

  let unlistenFocus: (() => void) | null = null

  async function handleKeydown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey
    const shift = e.shiftKey
    const key = e.key

    // Ctrl+Shift+N — 新建窗口
    if (ctrl && shift && key === 'N') {
      e.preventDefault()
      e.stopPropagation()
      openNewWindow()
      return
    }

    // Ctrl+Shift+← — 窗口左移半屏
    if (ctrl && shift && key === 'ArrowLeft') {
      e.preventDefault()
      e.stopPropagation()
      await snapWindow('left')
      return
    }

    // Ctrl+Shift+→ — 窗口右移半屏
    if (ctrl && shift && key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      await snapWindow('right')
      return
    }

    // Ctrl+Shift+R — 重启应用
    if (ctrl && shift && key === 'R') {
      e.preventDefault()
      e.stopPropagation()
      try { await ptyKillAll() } catch { /* ignore */ }
      window.location.reload()
      return
    }

    // Ctrl+, — 打开设置
    if (ctrl && key === ',') {
      e.preventDefault()
      e.stopPropagation()
      sidebarStore.openSettings()
      return
    }

    // Ctrl+Plus / Ctrl+= — 增大字体
    if (ctrl && (key === '+' || key === '=')) {
      e.preventDefault()
      e.stopPropagation()
      appStore.setFontSize(appStore.fontSize + 1)
      return
    }

    // Ctrl+Minus — 缩小字体
    if (ctrl && key === '-') {
      e.preventDefault()
      e.stopPropagation()
      appStore.setFontSize(appStore.fontSize - 1)
      return
    }

    // Ctrl+0 — 重置字体
    if (ctrl && key === '0') {
      e.preventDefault()
      e.stopPropagation()
      appStore.setFontSize(12)
      return
    }
  }

  async function setupFocusRecovery() {
    const win = getCurrentWindow()
    unlistenFocus = await win.onFocusChanged(({ payload: focused }) => {
      if (focused) {
        // 窗口获得焦点时，恢复 webview 焦点
        getCurrentWebview().setFocus().catch(() => {})
      }
    })
  }

  function cleanup() {
    unlistenFocus?.()
  }

  return { handleKeydown, setupFocusRecovery, cleanup }
}
