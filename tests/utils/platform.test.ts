import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('detectPlatform', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // UA 包含 Macintosh 时 platform 为 "macos", isMac 为 true
  it('DetectPlatform_Mac_001', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })
    vi.resetModules()
    const { platform, isMac } = await import('@/utils/platform')
    expect(platform).toBe('macos')
    expect(isMac).toBe(true)
  })

  // UA 包含 Windows 时 platform 为 "windows", isWindows 为 true
  it('DetectPlatform_Win_001', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' })
    vi.resetModules()
    const { platform, isWindows } = await import('@/utils/platform')
    expect(platform).toBe('windows')
    expect(isWindows).toBe(true)
  })

  // UA 包含 Linux 时 platform 为 "linux"
  it('DetectPlatform_Linux_001', async () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' })
    vi.resetModules()
    const { platform } = await import('@/utils/platform')
    expect(platform).toBe('linux')
  })

  // UA 为 "UnknownBrowser" 时 platform 为 "unknown"
  it('DetectPlatform_Unknown_001', async () => {
    vi.stubGlobal('navigator', { userAgent: 'UnknownBrowser' })
    vi.resetModules()
    const { platform } = await import('@/utils/platform')
    expect(platform).toBe('unknown')
  })
})
