import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSidebarStore } from '@/stores/sidebar'

describe('sidebar store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('togglePanel', () => {
    // panelVisible=false 时调用 togglePanel("sessions") 后 panelVisible 变为 true
    it('TogglePanel_Open_001', () => {
      const store = useSidebarStore()

      expect(store.panelVisible).toBe(false)
      expect(store.activePanel).toBeNull()

      store.togglePanel('sessions')

      expect(store.panelVisible).toBe(true)
      expect(store.activePanel).toBe('sessions')
    })

    // 面板已打开且 activePanel="sessions" 时调用 togglePanel("sessions") 后 panelVisible 变为 false
    it('TogglePanel_Close_001', () => {
      const store = useSidebarStore()

      store.activePanel = 'sessions'
      store.panelVisible = true

      store.togglePanel('sessions')

      expect(store.panelVisible).toBe(false)
    })

    // activePanel="sessions" 时调用 togglePanel("mcp") 后 activePanel 变为 "mcp"
    it('TogglePanel_Switch_001', () => {
      const store = useSidebarStore()

      store.activePanel = 'sessions'
      store.panelVisible = true

      store.togglePanel('mcp')

      expect(store.activePanel).toBe('mcp')
      expect(store.panelVisible).toBe(true)
    })

    // showSettings=true 时调用 togglePanel("sessions") 后 showSettings 变为 false
    it('TogglePanel_CloseSettings_001', () => {
      const store = useSidebarStore()

      store.showSettings = true

      store.togglePanel('sessions')

      expect(store.showSettings).toBe(false)
      expect(store.activePanel).toBe('sessions')
      expect(store.panelVisible).toBe(true)
    })
  })
})
