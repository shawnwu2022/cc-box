#!/usr/bin/env node

/**
 * CC-Box 依赖下载脚本
 *
 * 从 Claude 官方和 GitHub 下载最新版本，上传到阿里云 OSS
 *
 * 用法：
 *   set HTTP_PROXY=http://127.0.0.1:33210
 *   npm run download-deps
 *
 * 下载内容：
 *   - Claude CLI (各平台版本)
 *   - Git for Windows (便携版)
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execSync } = require('child_process')

// ============================================
// 配置
// ============================================

const PROJECT_ROOT = path.resolve(__dirname, '..')
const OSS_CONFIG_PATH = path.join(PROJECT_ROOT, 'scripts/oss-config.json')
const RELEASES_DIR = path.join(PROJECT_ROOT, 'releases/deps')

const CLAUDE_DOWNLOAD_BASE = 'https://downloads.claude.ai/claude-code-releases'
const GIT_RELEASES_API = 'https://api.github.com/repos/git-for-windows/git/releases/latest'

// Claude 平台列表（主要支持 Windows）
const CLAUDE_PLATFORMS = [
  'win32-x64',
  'win32-arm64',
  'darwin-x64',
  'darwin-arm64',
  'linux-x64',
  'linux-x64-musl',
  'linux-arm64',
  'linux-arm64-musl',
]

// ============================================
// 工具函数
// ============================================

function logStep(msg) {
  console.log(`\n\x1b[36m==> ${msg}\x1b[0m`)
}

function logSuccess(msg) {
  console.log(`\x1b[32m✓ ${msg}\x1b[0m`)
}

function logError(msg) {
  console.log(`\x1b[31m✗ ${msg}\x1b[0m`)
}

function logInfo(msg) {
  console.log(msg)
}

// 使用 curl 下载（自动支持 HTTP_PROXY 环境变量）
function curlDownload(url, outputPath) {
  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY
  const proxyArg = proxy ? `--proxy "${proxy}"` : ''

  logInfo(`下载: ${url}`)
  if (proxy) logInfo(`使用代理: ${proxy}`)

  try {
    // --ssl-no-revoke: 禁用 SSL 证书吊销检查
    // -L: 跟随重定向
    execSync(`curl -fsSL ${proxyArg} --ssl-no-revoke -o "${outputPath}" "${url}"`, {
      stdio: 'inherit'
    })
    return true
  } catch (e) {
    logError(`下载失败: ${e.message}`)
    return false
  }
}

// 使用 curl 获取内容（自动支持 HTTP_PROXY 环境变量）
function curlFetch(url) {
  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY
  const proxyArg = proxy ? `--proxy "${proxy}"` : ''

  if (proxy) logInfo(`使用代理: ${proxy}`)

  try {
    return execSync(`curl -fsSL ${proxyArg} --ssl-no-revoke "${url}"`, {
      encoding: 'utf-8'
    })
  } catch (e) {
    throw new Error(`请求失败: ${e.message}`)
  }
}

// 计算文件 SHA256
function calculateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

// 加载 OSS 配置
function loadOssConfig() {
  if (!fs.existsSync(OSS_CONFIG_PATH)) {
    logError(`OSS 配置文件不存在: ${OSS_CONFIG_PATH}`)
    return null
  }
  const config = JSON.parse(fs.readFileSync(OSS_CONFIG_PATH, 'utf-8'))
  if (!config.bucketName || !config.region || !config.accessKeyId || !config.accessKeySecret) {
    logError('OSS 配置缺失，请检查 scripts/oss-config.json')
    return null
  }
  return config
}

// OSS 上传
function uploadToOSS(localPath, ossPath) {
  const config = loadOssConfig()
  if (!config) return false

  const { bucketName, region, accessKeyId, accessKeySecret } = config
  const endpoint = `${region}.aliyuncs.com`
  const ossUtilPath = path.join(PROJECT_ROOT, 'ossutil64.exe')

  // 检查 ossutil
  if (!fs.existsSync(ossUtilPath)) {
    logInfo('下载 ossutil...')
    downloadOssUtil(ossUtilPath)
  }

  // 配置 ossutil
  const { execSync } = require('child_process')
  execSync(`"${ossUtilPath}" config -e ${endpoint} -i ${accessKeyId} -k ${accessKeySecret} -L CH`, { stdio: 'ignore' })

  // 上传
  execSync(`"${ossUtilPath}" cp "${localPath}" "oss://${bucketName}/${ossPath}" -f`, { stdio: 'inherit' })
  return true
}

// 下载 ossutil
function downloadOssUtil(targetPath) {
  const { execSync } = require('child_process')
  const url = 'https://gosspublic.alicdn.com/ossutil/1.7.14/ossutil64.exe'
  execSync(`curl -fsSL -o "${targetPath}" "${url}"`, { stdio: 'inherit' })
}

// ============================================
// Claude CLI 下载
// ============================================

async function downloadClaude() {
  logStep('获取 Claude CLI 最新版本...')

  // 获取最新版本号（使用 curl）
  const versionText = curlFetch(`${CLAUDE_DOWNLOAD_BASE}/latest`)
  const version = versionText.trim()
  logSuccess(`最新版本: ${version}`)

  // 获取 manifest
  const manifestText = curlFetch(`${CLAUDE_DOWNLOAD_BASE}/${version}/manifest.json`)
  let manifest
  try {
    manifest = JSON.parse(manifestText)
  } catch (e) {
    logError('解析 manifest.json 失败')
    throw e
  }

  // 创建版本目录
  const versionDir = path.join(RELEASES_DIR, 'claude', version)
  fs.mkdirSync(versionDir, { recursive: true })

  // 下载各平台版本
  const platformInfos = []

  for (const platform of CLAUDE_PLATFORMS) {
    const platformData = manifest.platforms?.[platform]
    if (!platformData) {
      logInfo(`跳过 ${platform}（manifest 中不存在）`)
      continue
    }

    const expectedChecksum = platformData.checksum
    if (!expectedChecksum) {
      logInfo(`跳过 ${platform}（无 checksum）`)
      continue
    }

    // Windows 使用 .exe 扩展名
    const ext = platform.startsWith('win32') ? '.exe' : ''
    const filename = `claude${ext}`
    const platformDir = path.join(versionDir, platform)
    fs.mkdirSync(platformDir, { recursive: true })
    const outputPath = path.join(platformDir, filename)

    logInfo(`下载 ${platform}/${filename}...`)
    const downloadUrl = `${CLAUDE_DOWNLOAD_BASE}/${version}/${platform}/${filename}`

    if (!curlDownload(downloadUrl, outputPath)) {
      continue
    }

    // 验证 checksum
    const actualChecksum = await calculateChecksum(outputPath)
    if (actualChecksum !== expectedChecksum.toLowerCase()) {
      logError(`${platform} checksum 不匹配`)
      fs.unlinkSync(outputPath)
      continue
    }

    logSuccess(`${platform} checksum 验证通过`)
    platformInfos.push({
      platform,
      filename,
      checksum: actualChecksum,
      size: fs.statSync(outputPath).size,
    })
  }

  // 生成 latest.json
  const latestJson = {
    version,
    release_date: new Date().toISOString().split('T')[0],
    platforms: {},
  }

  for (const info of platformInfos) {
    latestJson.platforms[info.platform] = {
      url: `deps/claude/${version}/${info.platform}/${info.filename}`,
      checksum: info.checksum,
      size: info.size,
    }
  }

  const latestJsonPath = path.join(RELEASES_DIR, 'claude', 'latest.json')
  fs.writeFileSync(latestJsonPath, JSON.stringify(latestJson, null, 2) + '\n')
  logSuccess(`latest.json 已生成: ${latestJsonPath}`)

  return { version, versionDir, platformInfos }
}

// ============================================
// Git 便携版下载
// ============================================

async function downloadGitPortable() {
  logStep('获取 Git for Windows 最新版本...')

  // GitHub API 获取最新 release（使用 curl）
  const releaseText = curlFetch(GIT_RELEASES_API)
  let release
  try {
    release = JSON.parse(releaseText)
  } catch (e) {
    logError('解析 GitHub release 失败')
    throw e
  }

  const version = release.tag_name
  logSuccess(`最新版本: ${version}`)

  // 找到 PortableGit 文件
  const portableAsset = release.assets.find(a =>
    a.name.match(/PortableGit-[\d.]+-64-bit\.7z\.exe/i)
  )

  if (!portableAsset) {
    logError('未找到 PortableGit-64-bit.7z.exe')
    throw new Error('PortableGit asset not found')
  }

  logInfo(`找到: ${portableAsset.name}`)
  logInfo(`下载 URL: ${portableAsset.browser_download_url}`)

  // 创建 Git 目录
  const gitDir = path.join(RELEASES_DIR, 'git')
  fs.mkdirSync(gitDir, { recursive: true })
  const outputPath = path.join(gitDir, portableAsset.name)

  logInfo(`下载 ${portableAsset.name}...`)
  if (!curlDownload(portableAsset.browser_download_url, outputPath)) {
    throw new Error('下载 Git 便携版失败')
  }

  const fileSize = fs.statSync(outputPath).size
  logSuccess(`下载完成: ${Math.round(fileSize / 1024 / 1024)}MB`)

  // 生成 latest.json
  const latestJson = {
    version,
    release_date: new Date().toISOString().split('T')[0],
    file: portableAsset.name,
    url: `deps/git/${portableAsset.name}`,
    size: fileSize,
  }

  const latestJsonPath = path.join(gitDir, 'latest.json')
  fs.writeFileSync(latestJsonPath, JSON.stringify(latestJson, null, 2) + '\n')
  logSuccess(`latest.json 已生成: ${latestJsonPath}`)

  return { version, outputPath, portableAsset }
}

// ============================================
// 上传到 OSS
// ============================================

function uploadClaudeToOSS(version, versionDir) {
  logStep('上传 Claude CLI 到 OSS...')

  const config = loadOssConfig()
  if (!config) return

  // 上传各平台文件
  const platforms = fs.readdirSync(versionDir)
  for (const platform of platforms) {
    const platformDir = path.join(versionDir, platform)
    if (!fs.statSync(platformDir).isDirectory()) continue

    const files = fs.readdirSync(platformDir)
    for (const file of files) {
      const localPath = path.join(platformDir, file)
      const ossPath = `deps/claude/${version}/${platform}/${file}`
      uploadToOSS(localPath, ossPath)
      logSuccess(`已上传: ${platform}/${file}`)
    }
  }

  // 上传 latest.json
  const latestJsonPath = path.join(RELEASES_DIR, 'claude', 'latest.json')
  uploadToOSS(latestJsonPath, 'deps/claude/latest.json')
  logSuccess('latest.json 已上传')
}

function uploadGitToOSS(outputPath, portableAsset) {
  logStep('上传 Git 便携版到 OSS...')

  const config = loadOssConfig()
  if (!config) return

  uploadToOSS(outputPath, `deps/git/${portableAsset.name}`)
  logSuccess(`已上传: ${portableAsset.name}`)

  // 上传 latest.json
  const latestJsonPath = path.join(RELEASES_DIR, 'git', 'latest.json')
  uploadToOSS(latestJsonPath, 'deps/git/latest.json')
  logSuccess('latest.json 已上传')
}

// ============================================
// 主流程
// ============================================

async function main() {
  console.log('\x1b[35m======================================')
  console.log('     CC-Box 依赖下载脚本')
  console.log('======================================\x1b[0m')

  // 检查代理
  if (!process.env.HTTP_PROXY && !process.env.HTTPS_PROXY) {
    logInfo('\n提示: 未配置代理，国内可能无法访问')
    logInfo('建议设置: set HTTP_PROXY=http://127.0.0.1:33210')
  }

  try {
    // 下载 Claude
    const claudeResult = await downloadClaude()
    uploadClaudeToOSS(claudeResult.version, claudeResult.versionDir)

    // 下载 Git（仅 Windows）
    const gitResult = await downloadGitPortable()
    uploadGitToOSS(gitResult.outputPath, gitResult.portableAsset)

    console.log('\n\x1b[32m======================================')
    console.log('     下载完成！')
    console.log('======================================\x1b[0m')

    logInfo('\nOSS 文件结构:')
    logInfo('  deps/claude/latest.json')
    logInfo(`  deps/claude/${claudeResult.version}/win32-x64/claude.exe`)
    logInfo('  deps/git/latest.json')
    logInfo(`  deps/git/${gitResult.portableAsset.name}`)

  } catch (e) {
    logError(`\n执行失败: ${e.message}`)
    process.exit(1)
  }
}

main()