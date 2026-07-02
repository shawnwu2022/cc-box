import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @tauri-apps/api/core 的 invoke
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}))

import {
  setSkillEnabled,
  setAgentEnabled,
  setMcpServerEnabled,
  setPluginEnabled,
} from '@/api/tauri'

describe('setSkillEnabled / setAgentEnabled / setMcpServerEnabled / setPluginEnabled', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  // setSkillEnabled('deploy', false) → invoke('set_skill_enabled', { name: 'deploy', enabled: false })
  it('SetSkillEnabled_Disable_001', async () => {
    mockInvoke.mockResolvedValue(undefined)
    await setSkillEnabled('deploy', false)
    expect(mockInvoke).toHaveBeenCalledWith('set_skill_enabled', {
      name: 'deploy',
      enabled: false,
    })
  })

  // setSkillEnabled('deploy', true) → 正确参数
  it('SetSkillEnabled_Enable_001', async () => {
    mockInvoke.mockResolvedValue(undefined)
    await setSkillEnabled('deploy', true)
    expect(mockInvoke).toHaveBeenCalledWith('set_skill_enabled', {
      name: 'deploy',
      enabled: true,
    })
  })

  // setAgentEnabled → 命令名 set_agent_enabled
  it('SetAgentEnabled_Call_001', async () => {
    mockInvoke.mockResolvedValue(undefined)
    await setAgentEnabled('reviewer', false)
    expect(mockInvoke).toHaveBeenCalledWith('set_agent_enabled', {
      name: 'reviewer',
      enabled: false,
    })
  })

  // setMcpServerEnabled → 命令名 set_mcp_server_enabled
  it('SetMcpServerEnabled_Call_001', async () => {
    mockInvoke.mockResolvedValue(undefined)
    await setMcpServerEnabled('zread', true)
    expect(mockInvoke).toHaveBeenCalledWith('set_mcp_server_enabled', {
      name: 'zread',
      enabled: true,
    })
  })

  // setPluginEnabled → 命令名 set_plugin_enabled，参数名 pluginId（camelCase）
  it('SetPluginEnabled_Call_001', async () => {
    mockInvoke.mockResolvedValue(undefined)
    await setPluginEnabled('paper-tool@orczh', false)
    expect(mockInvoke).toHaveBeenCalledWith('set_plugin_enabled', {
      pluginId: 'paper-tool@orczh',
      enabled: false,
    })
  })

  // 后端返回错误时，前端 promise reject 含错误字符串
  it('SetSkillEnabled_ErrorPropagated_001', async () => {
    mockInvoke.mockRejectedValue('Skill not found')
    await expect(setSkillEnabled('ghost', false)).rejects.toBe('Skill not found')
  })
})
