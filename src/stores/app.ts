import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  getAppConfig,
  updateAppConfig,
  saveLastProject,
  saveDefaultClaudeOptions,
  getHomeData,
  getProjects,
  getCheckResults,
  runChecks,
} from '@/api/tauri'
import { normalizeTerminalThemeId } from '@/config/terminalThemes'
import { applyThemeToDom } from '@/utils/theme'
import i18n from '@/i18n'

import type { ClaudeOptions, DefaultClaudeOptions, CheckResult, Project, SessionInfo } from '@/types'

const PAGE_SIZE = 12

/** 默认环境变量（代码中定义，用户可重置） */
const DEFAULT_CLAUDE_ENV_VARS: Record<string, string> = {
  LANG: 'en_US.UTF-8',
  LC_ALL: 'en_US.UTF-8',
  PYTHONUTF8: '1',
  CLAUDE_CODE_SCROLL_SPEED: '5',
  PYTHONIOENCODING: 'utf-8',
  CLAUDE_CODE_NO_FLICKER: '1',
}

export { DEFAULT_CLAUDE_ENV_VARS }

export interface PendingResume {
  sessionId: string
  sessionName?: string
}

export const useAppStore = defineStore('app', () => {
  const cwd = ref<string>('')
  const theme = ref<string>('light')
  const terminalTheme = ref<string>('cc-box-light')
  const fontSize = ref<number>(12)
  const webglRenderer = ref<boolean>(false)
  const language = ref<string>('en')
  const alwaysOnTop = ref<boolean>(false)
  const claudeEnvVars = ref<Record<string, string>>({})

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

  // ---- 启动状态源（v5-T3）----
  // 最近打开的项目路径（启动决定视图用）+ 隐藏项目集合（项目列表过滤用）
  const lastOpenedProject = ref<string>('')
  const hiddenProjects = ref<Set<string>>(new Set())
  // app config 加载状态：idle/loading/loaded/error（v5 P1：加载失败感知）
  const loadStatus = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  // setHidden 操作锁：串行化 读->算 next->persist->改本地，防并发丢更新
  let hiddenOpLock: Promise<void> = Promise.resolve()

  const currentProject = computed(() => {
    if (!cwd.value) return null
    const parts = cwd.value.replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || cwd.value
  })

  const failedChecks = computed(() => checkResults.value.filter(c => !c.passed))

  async function loadAppConfig() {
    loadStatus.value = 'loading'
    try {
      const config = await getAppConfig()
      theme.value = config.theme || 'light'
      fontSize.value = config.fontSize || 12
      webglRenderer.value = config.webglRenderer ?? false
      language.value = config.language || detectSystemLocale()
      i18n.global.locale.value = language.value

      // 终端主题：归一化 + 迁移推断（缺失时按 GUI 映射）
      const inferredTerminalTheme = config.terminalTheme
        ? normalizeTerminalThemeId(config.terminalTheme)
        : (config.theme === 'dark' ? 'cc-box-dark' : 'cc-box-light')
      terminalTheme.value = inferredTerminalTheme

      // 加载环境变量（首次使用默认值）
      claudeEnvVars.value = Object.keys(config.claudeEnvVars ?? {}).length > 0
        ? config.claudeEnvVars!
        : { ...DEFAULT_CLAUDE_ENV_VARS }

      // 启动持久化：env + terminalTheme（仅当需修正/迁移时写 terminalTheme）合并为一次调用，
      // 避免多次读-改-写加剧既有竞态（见 spec「已知限制」）
      const needWriteTheme = inferredTerminalTheme !== config.terminalTheme
      await updateAppConfig({
        claudeEnvVars: claudeEnvVars.value,
        ...(needWriteTheme ? { terminalTheme: inferredTerminalTheme } : {}),
      })

      defaultClaudeOptions.value = {
        skipPermissions: config.defaultSkipPermissions ?? false,
        customArgs: config.defaultCustomArgs ?? ''
      }
      claudeOptions.value = {
        resume: '',
        skipPermissions: defaultClaudeOptions.value.skipPermissions,
        customArgs: defaultClaudeOptions.value.customArgs
      }

      // 启动状态源：读 lastOpenedProject + hiddenProjects（v5-T3）
      lastOpenedProject.value = config.lastOpenedProject ?? ''
      hiddenProjects.value = new Set(config.hiddenProjects ?? [])

      loadStatus.value = 'loaded'
    } catch (err) {
      loadStatus.value = 'error'
      console.error('Failed to load app config:', err)
      throw err // v5 P1：加载失败不吞，向上传播让 UI 感知
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
      throw err // v5 P1：加载失败不吞，向上传播让 UI 感知
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

  async function refreshCache() {
    cacheLoaded.value = false
    await loadCache()
  }

  function ensureProjectInList(projectPath: string) {
    const normalize = (p: string) => p.replace(/\\/g, '/').toLowerCase()
    const normalized = normalize(projectPath)
    if (cachedProjects.value.some(p => normalize(p.path) === normalized)) return

    const parts = projectPath.replace(/\\/g, '/').split('/')
    cachedProjects.value.unshift({
      path: projectPath,
      name: parts[parts.length - 1] || projectPath,
      lastDuration: Date.now(),
    })
  }

  /** 检查路径是否为已知项目（归一化后匹配 cachedProjects） */
  function isKnownProject(projectPath: string): boolean {
    const normalize = (p: string) => p.replace(/\\/g, '/').toLowerCase()
    const normalized = normalize(projectPath)
    return cachedProjects.value.some(p => normalize(p.path) === normalized)
  }

  function refreshRecentSessions(sessions: SessionInfo[]) {
    cachedRecentSessions.value = sessions
  }

  /**
   * 路径归一化：统一为小写正斜杠，用于跨平台/跨重启匹配隐藏集合。
   * 与 session.ts normalizePath 语义一致。
   */
  function normalizePath(p: string): string {
    return p.replace(/\\/g, '/').toLowerCase()
  }

  /** 该项目是否已隐藏（normalized 比较，兼容 Windows 路径大小写/斜杠差异） */
  function isHidden(path: string): boolean {
    const n = normalizePath(path)
    for (const h of hiddenProjects.value) {
      if (normalizePath(h) === n) return true
    }
    return false
  }

  /**
   * setHidden 操作锁（复用 session.ts withLock 范式）：串行化
   * 读集合 -> 算 next -> persist -> 改本地 全流程，防同窗口快速隐藏 A+B 各自基于旧内存
   * 算 next、后 persist 覆盖前导致磁盘丢一项。
   */
  function withHiddenLock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = hiddenOpLock
    let release!: () => void
    hiddenOpLock = new Promise<void>(r => { release = r })
    return (async () => {
      await prev
      try {
        return await fn()
      } finally {
        release()
      }
    })()
  }

  /**
   * 设置/取消隐藏项目（opLock 串行 + persist-first 回滚 + 规范化比较）。
   * - 算 next：规范化比较移除旧条目，hidden=true 时加回（用原始 path 保真）。
   * - 幂等：状态未变则不持久化。
   * - persist-first：成功后才改本地；失败抛错，hiddenProjects 不变。
   */
  async function setHidden(path: string, hidden: boolean): Promise<void> {
    return withHiddenLock(async () => {
      const n = normalizePath(path)
      const next = new Set<string>()
      let existed = false
      for (const h of hiddenProjects.value) {
        if (normalizePath(h) === n) { existed = true; continue }
        next.add(h)
      }
      if (hidden) next.add(path)
      // 幂等：状态未变则跳过持久化
      if (hidden === existed) return
      // persist-first：失败抛错，本地不变
      await updateAppConfig({ hiddenProjects: [...next] })
      hiddenProjects.value = next
    })
  }

  /**
   * 只更新内存 cwd + openedProjectPaths，不持久化。
   * 用途：sessionStart 事务中 spawn 前切 cwd（终端立即用新 cwd 启动），
   * 持久化由后续 setCurrentProject(persist:true) 或 setCwd 完成。
   */
  function setCwdLocal(path: string) {
    cwd.value = path
    openedProjectPaths.value.add(path)
  }

  /**
   * setCurrentProject（persist-first）。
   * - persist=true：先 await saveLastProject 成功，再 setCwdLocal；失败抛错且 cwd 不变。
   *   注：sessionStart 事务中 spawn 前已 setCwdLocal（cwd 已切），此处 persist 失败时 cwd 保持
   *   已切状态（终端已跑），仅 lastOpened 未持久化--错误传播让 UI 提示，终端不中断（spec v6 §4.4）。
   * - persist=false / undefined：只 setCwdLocal（恢复启动用，不重复持久化）。
   */
  async function setCurrentProject(path: string, opts: { persist?: boolean } = {}): Promise<void> {
    if (opts.persist === true) {
      await saveLastProject(path) // 失败抛错，setCwdLocal 不执行
    }
    setCwdLocal(path)
  }

  /** 兼容旧调用方：setCwdLocal + fire-and-forget saveLastProject */
  function setCwd(path: string) {
    setCwdLocal(path)
    saveLastProject(path)
  }

  function setTheme(newTheme: string) {
    theme.value = newTheme
    // 同步应用到 DOM
    applyThemeToDom(newTheme)
    // 持久化
    updateAppConfig({ theme: newTheme })
  }

  function setTerminalTheme(id: string) {
    const normalized = normalizeTerminalThemeId(id)
    terminalTheme.value = normalized
    updateAppConfig({ terminalTheme: normalized })
  }

  function setFontSize(size: number) {
    fontSize.value = Math.max(10, Math.min(24, size))
    updateAppConfig({ fontSize: size })
  }

  // 渲染后端开关：true=WebGL（高频滚动流畅，但 CJK glyph atlas 可能留白/错位），
  // false=DOM（默认，稳定）。仅对新开终端生效（renderer 在 term.open 时设定）。
  function setWebglRenderer(enabled: boolean) {
    webglRenderer.value = enabled
    updateAppConfig({ webglRenderer: enabled })
  }

  function detectSystemLocale(): string {
    const browserLang = navigator.language || 'en'
    return browserLang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  }

  function setLanguage(lang: string) {
    language.value = lang
    updateAppConfig({ language: lang })
    i18n.global.locale.value = lang
  }

  /** 同步当前 claudeEnvVars 到 cc-box config */
  async function doSyncEnv() {
    await updateAppConfig({ claudeEnvVars: claudeEnvVars.value })
  }

  /** 更新环境变量并同步 */
  async function setClaudeEnvVars(vars: Record<string, string>) {
    claudeEnvVars.value = vars
    await doSyncEnv()
  }

  /** 将默认变量恢复为代码默认值，保留用户添加的变量 */
  async function resetClaudeEnvVars() {
    const updated = { ...claudeEnvVars.value }
    for (const [key, value] of Object.entries(DEFAULT_CLAUDE_ENV_VARS)) {
      updated[key] = value
    }
    claudeEnvVars.value = updated
    await doSyncEnv()
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

  async function toggleAlwaysOnTop() {
    try {
      const win = getCurrentWindow()
      const newState = !alwaysOnTop.value
      await win.setAlwaysOnTop(newState)
      alwaysOnTop.value = newState
    } catch (err) {
      console.error('Failed to toggle always on top:', err)
    }
  }

  return {
    cwd,
    theme,
    terminalTheme,
    fontSize,
    webglRenderer,
    language,
    claudeEnvVars,
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
    lastOpenedProject,
    hiddenProjects,
    loadStatus,
    loadAppConfig,
    runChecks: doChecks,
    loadCache,
    loadMoreProjects,
    refreshCache,
    ensureProjectInList,
    isKnownProject,
    refreshRecentSessions,
    isHidden,
    setHidden,
    setCwdLocal,
    setCurrentProject,
    setCwd,
    setTheme,
    setTerminalTheme,
    setFontSize,
    setWebglRenderer,
    setLanguage,
    setClaudeEnvVars,
    resetClaudeEnvVars,
    setClaudeOptions,
    setDefaultClaudeOptions,
    resetClaudeOptions,
    saveAsDefault,
    getClaudeArgs,
    setPendingResume,
    clearPendingResume,
    setAutoOpenSessions,
    alwaysOnTop,
    toggleAlwaysOnTop
  }
})
