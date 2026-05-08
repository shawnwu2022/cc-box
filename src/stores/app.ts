import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getAppConfig,
  updateAppConfig,
  saveLastProject,
  saveDefaultClaudeOptions,
  getHomeData,
  getProjects,
  getCheckResults,
  runChecks,
  syncClaudeEnv,
  getClaudeSettingsEnv
} from '@/api/tauri'

import type { ClaudeOptions, DefaultClaudeOptions, CheckResult, Project, SessionInfo } from '@/types'

const PAGE_SIZE = 12

/** 默认管理的环境变量 key 列表（首次加载时填充） */
const DEFAULT_CLAUDE_ENV_VAR_KEYS = [
  'LANG',
  'LC_ALL',
  'PYTHONUTF8',
  'CLAUDE_CODE_SCROLL_SPEED',
  'PYTHONIOENCODING',
]

/** 默认环境变量值（首次同步时写入） */
const DEFAULT_CLAUDE_ENV_VALUES: Record<string, string> = {
  LANG: 'en_US.UTF-8',
  LC_ALL: 'en_US.UTF-8',
  PYTHONUTF8: '1',
  CLAUDE_CODE_SCROLL_SPEED: '5',
  PYTHONIOENCODING: 'utf-8',
}

export interface PendingResume {
  sessionId: string
  sessionName?: string
}

export const useAppStore = defineStore('app', () => {
  const cwd = ref<string>('')
  const theme = ref<string>('light')
  const fontSize = ref<number>(12)
  const fullScreenRender = ref<boolean>(true)
  // cc-box 管理的环境变量 key 列表（值从 ~/.claude/settings.json 实时读取）
  const claudeEnvVarKeys = ref<string[]>([])

  // 启动控制
  const pendingResume = ref<PendingResume | null>(null)
  const shouldAutoOpenSessions = ref(false)

  // 环境检查
  const checkResults = ref<CheckResult[]>([])
  const checkFailed = ref(false)

  // 缓存：项目列表（分页）和近期会话
  const cachedProjects = ref<Project[]>([])
  const cachedRecentSessions = ref<SessionInfo[]>([])
  const cacheLoaded = ref(false)
  const openedProjectPaths = ref<Set<string>>(new Set())
  const projectsPage = ref(0)
  const hasMoreProjects = ref(true)
  const isLoadingProjects = ref(false)

  // Claude 默认启动参数（持久化，Settings 绑定）
  const defaultClaudeOptions = ref<DefaultClaudeOptions>({
    skipPermissions: false,
    customArgs: ''
  })

  // Claude 当前使用启动参数（SessionsPanel/ProjectSelectView 绑定）
  const claudeOptions = ref<ClaudeOptions>({
    resume: '',
    skipPermissions: false,
    customArgs: ''
  })

  const currentProject = computed(() => {
    if (!cwd.value) return null
    const parts = cwd.value.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || cwd.value
  })

  const failedChecks = computed(() => checkResults.value.filter(c => !c.passed))

  async function loadAppConfig() {
    try {
      const config = await getAppConfig()
      theme.value = config.theme || 'light'
      fontSize.value = config.fontSize || 12
      fullScreenRender.value = config.fullScreenRender ?? true

      // 加载用户管理的环境变量 key 列表（首次使用默认值）
      claudeEnvVarKeys.value = (config.claudeEnvVarKeys ?? []).length > 0
        ? config.claudeEnvVarKeys!
        : [...DEFAULT_CLAUDE_ENV_VAR_KEYS]

      // 启动时：读取 Claude settings 当前 env，为缺失的 key 补上默认值
      await syncEnvFromSettings()

      defaultClaudeOptions.value = {
        skipPermissions: config.defaultSkipPermissions ?? false,
        customArgs: config.defaultCustomArgs ?? ''
      }
      claudeOptions.value = {
        resume: '',
        skipPermissions: defaultClaudeOptions.value.skipPermissions,
        customArgs: defaultClaudeOptions.value.customArgs
      }
    } catch (err) {
      console.error('Failed to load app config:', err)
    }
  }

  async function doChecks(force = false) {
    try {
      checkResults.value = force ? await runChecks() : await getCheckResults()
      checkFailed.value = checkResults.value.some(c => !c.passed)
    } catch (err) {
      console.error('Failed to run checks:', err)
    }
  }

  async function loadCache() {
    if (cacheLoaded.value) return
    try {
      const data = await getHomeData(PAGE_SIZE, 20)
      cachedProjects.value = data.projects
      cachedRecentSessions.value = data.recentSessions
      projectsPage.value = 1
      hasMoreProjects.value = data.hasMore
      cacheLoaded.value = true
    } catch (err) {
      console.error('Failed to load cache:', err)
    }
  }

  async function loadMoreProjects() {
    if (isLoadingProjects.value || !hasMoreProjects.value) return
    isLoadingProjects.value = true
    try {
      const offset = projectsPage.value * PAGE_SIZE
      const projs = await getProjects(PAGE_SIZE, offset)
      cachedProjects.value.push(...projs)
      projectsPage.value++
      hasMoreProjects.value = projs.length === PAGE_SIZE
    } catch (err) {
      console.error('Failed to load more projects:', err)
    } finally {
      isLoadingProjects.value = false
    }
  }

  function refreshRecentSessions(sessions: SessionInfo[]) {
    cachedRecentSessions.value = sessions
  }

  function setCwd(path: string) {
    cwd.value = path
    openedProjectPaths.value.add(path)
    saveLastProject(path)
  }

  function setTheme(newTheme: string) {
    theme.value = newTheme
    updateAppConfig({ theme: newTheme })
  }

  function setFontSize(size: number) {
    fontSize.value = Math.max(10, Math.min(24, size))
    updateAppConfig({ fontSize: size })
  }

  async function setFullScreenRender(val: boolean) {
    fullScreenRender.value = val
    updateAppConfig({ fullScreenRender: val })
    await doSyncEnv()
  }

  /** 从 Claude settings 读取当前 env，为管理的 key 补默认值后写入 */
  async function syncEnvFromSettings() {
    try {
      const currentEnv = await getClaudeSettingsEnv()
      const envToSync: Record<string, string> = {}
      for (const key of claudeEnvVarKeys.value) {
        envToSync[key] = currentEnv[key] ?? DEFAULT_CLAUDE_ENV_VALUES[key] ?? ''
      }
      await syncClaudeEnv(fullScreenRender.value, envToSync)
    } catch (err) {
      console.error('Failed to sync env from settings:', err)
    }
  }

  /** 根据当前 key 列表 + Claude settings 中的值，执行写入 */
  async function doSyncEnv() {
    const currentEnv = await getClaudeSettingsEnv()
    const envToSync: Record<string, string> = {}
    for (const key of claudeEnvVarKeys.value) {
      envToSync[key] = currentEnv[key] ?? DEFAULT_CLAUDE_ENV_VALUES[key] ?? ''
    }
    await syncClaudeEnv(fullScreenRender.value, envToSync)
  }

  /** 更新用户管理的 key 列表并同步 */
  async function setClaudeEnvVarKeys(keys: string[], changedEnv?: Record<string, string>) {
    claudeEnvVarKeys.value = keys
    updateAppConfig({ claudeEnvVarKeys: keys })
    const envToSync = changedEnv ?? {}
    if (!changedEnv) {
      const currentEnv = await getClaudeSettingsEnv()
      for (const key of keys) {
        envToSync[key] = currentEnv[key] ?? DEFAULT_CLAUDE_ENV_VALUES[key] ?? ''
      }
    }
    await syncClaudeEnv(fullScreenRender.value, envToSync)
  }

  function setClaudeOptions(options: Partial<ClaudeOptions>) {
    claudeOptions.value = { ...claudeOptions.value, ...options }
  }

  function resetClaudeOptions() {
    claudeOptions.value = {
      resume: '',
      skipPermissions: defaultClaudeOptions.value.skipPermissions,
      customArgs: defaultClaudeOptions.value.customArgs
    }
  }

  async function setDefaultClaudeOptions(opts: Partial<DefaultClaudeOptions>) {
    defaultClaudeOptions.value = { ...defaultClaudeOptions.value, ...opts }
    claudeOptions.value = {
      resume: claudeOptions.value.resume,
      skipPermissions: defaultClaudeOptions.value.skipPermissions,
      customArgs: defaultClaudeOptions.value.customArgs
    }
    await saveDefaultClaudeOptions(defaultClaudeOptions.value)
  }

  async function saveAsDefault(): Promise<boolean> {
    try {
      const opts = {
        skipPermissions: claudeOptions.value.skipPermissions,
        customArgs: claudeOptions.value.customArgs
      }
      defaultClaudeOptions.value = opts
      await saveDefaultClaudeOptions(opts)
      return true
    } catch (err) {
      console.error('Failed to save default options:', err)
      return false
    }
  }

  function getClaudeArgs(): string[] {
    const opts = claudeOptions.value
    const args: string[] = []

    if (opts.resume) args.push('--resume', opts.resume)
    if (opts.skipPermissions) args.push('--dangerously-skip-permissions')
    if (opts.customArgs) {
      const custom = opts.customArgs.trim().split(/\s+/).filter(Boolean)
      args.push(...custom)
    }

    return args
  }

  function setPendingResume(sessionId: string, sessionName?: string) {
    pendingResume.value = { sessionId, sessionName }
  }

  function clearPendingResume() {
    pendingResume.value = null
  }

  function setAutoOpenSessions(val: boolean) {
    shouldAutoOpenSessions.value = val
  }

  return {
    cwd,
    theme,
    fontSize,
    fullScreenRender,
    claudeEnvVarKeys,
    defaultClaudeOptions,
    claudeOptions,
    currentProject,
    pendingResume,
    shouldAutoOpenSessions,
    checkResults,
    checkFailed,
    failedChecks,
    cachedProjects,
    cachedRecentSessions,
    cacheLoaded,
    openedProjectPaths,
    hasMoreProjects,
    isLoadingProjects,
    loadAppConfig,
    runChecks: doChecks,
    loadCache,
    loadMoreProjects,
    refreshRecentSessions,
    setCwd,
    setTheme,
    setFontSize,
    setFullScreenRender,
    setClaudeEnvVarKeys,
    getClaudeSettingsEnv,
    setClaudeOptions,
    setDefaultClaudeOptions,
    resetClaudeOptions,
    saveAsDefault,
    getClaudeArgs,
    setPendingResume,
    clearPendingResume,
    setAutoOpenSessions
  }
})
