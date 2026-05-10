<template>
  <div class="section-content">
    <h2 class="section-heading">Software Update</h2>

    <div class="update-card">
      <div class="version-row">
        <div class="version-info">
          <span class="version-label">Current Version</span>
          <span class="version-value">v{{ currentVersion }}</span>
        </div>
        <button
          class="check-btn"
          :disabled="checking"
          @click="handleCheckUpdate"
        >
          <img v-if="checking" src="@/assets/icons/refresh.svg" class="spinning" alt="" />
          <span>{{ checking ? 'Checking...' : 'Check for Updates' }}</span>
        </button>
      </div>

      <div v-if="error" class="update-message error">
        <span>Failed to check for updates. Please try again later.</span>
      </div>

      <div v-if="updateStore.updateInfo && !updateStore.updateInfo.hasUpdate" class="update-message success">
        <span>You're up to date!</span>
      </div>

      <template v-if="updateStore.updateInfo && updateStore.updateInfo.hasUpdate">
        <div class="update-available">
          <div class="update-banner">
            <span class="update-icon">🆕</span>
            <div>
              <span class="update-version">v{{ updateStore.updateInfo.version }} is available</span>
              <span class="update-hint">Your version: v{{ updateStore.updateInfo.currentVersion }}</span>
            </div>
          </div>

          <div v-if="updateStore.updateInfo.releaseNotes" class="release-notes">
            <h4>What's New</h4>
            <div class="notes-content" v-html="renderedNotes"></div>
          </div>

          <!-- 下载/安装状态 -->
          <div class="update-actions">
            <!-- 初始状态：显示下载按钮 -->
            <template v-if="updateStore.downloadState === 'idle'">
              <div class="action-row">
                <button
                  v-if="updateStore.updateInfo.platformAsset"
                  class="action-btn primary"
                  @click="handleDownload"
                >
                  Download & Install
                </button>
                <a
                  class="action-btn secondary"
                  @click.prevent="openExternal(updateStore.updateInfo.downloadUrl)"
                >
                  Manual Download
                </a>
              </div>
              <span v-if="updateStore.updateInfo.platformAsset" class="file-size">
                {{ formatSize(updateStore.updateInfo.platformAsset.size) }}
              </span>
            </template>

            <!-- 下载中 -->
            <template v-if="updateStore.downloadState === 'downloading'">
              <div class="progress-section">
                <div class="progress-header">
                  <span>Downloading...</span>
                  <button class="cancel-btn" @click="handleCancel">Cancel</button>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" :style="{ width: updateStore.downloadProgress.percent + '%' }"></div>
                </div>
                <div class="progress-info">
                  <span>{{ updateStore.downloadProgress.percent.toFixed(0) }}%</span>
                  <span class="progress-size">
                    {{ formatSize(updateStore.downloadProgress.downloaded) }} / {{ formatSize(updateStore.downloadProgress.total) }}
                  </span>
                </div>
              </div>
            </template>

            <!-- 下载完成 -->
            <template v-if="updateStore.downloadState === 'downloaded'">
              <div class="downloaded-info">
                <span class="downloaded-icon">✓</span>
                <span>Download complete</span>
              </div>
              <button class="action-btn primary" @click="handleInstall">
                Install & Restart
              </button>
            </template>

            <!-- 安装中 -->
            <template v-if="updateStore.downloadState === 'installing'">
              <div class="installing-message">
                <span class="spinning-text">Installing update...</span>
                <span class="installing-hint">The application will restart automatically.</span>
              </div>
            </template>

            <!-- 错误 -->
            <div v-if="updateStore.downloadState === 'error'" class="update-message error">
              <span>{{ updateStore.downloadError }}</span>
              <div class="error-actions">
                <button class="retry-link" @click="handleRetry">Retry</button>
                <a class="manual-link" @click.prevent="openExternal(updateStore.updateInfo.downloadUrl)">
                  Manual Download
                </a>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { open } from '@tauri-apps/plugin-shell'
import { checkForUpdates, downloadUpdate, installUpdate, cancelDownload, onUpdateDownloadProgress } from '@/api/tauri'
import { useSidebarStore } from '@/stores/sidebar'
import { useUpdateStore } from '@/stores/update'

const sidebarStore = useSidebarStore()
const updateStore = useUpdateStore()
const currentVersion = __APP_VERSION__
const checking = ref(false)
const error = ref(false)

let unlistenProgress: (() => void) | null = null

onMounted(async () => {
  // 监听下载进度事件
  unlistenProgress = await onUpdateDownloadProgress((progress) => {
    updateStore.setDownloadProgress(progress)
    if (progress.percent >= 100) {
      updateStore.setDownloadState('downloaded')
    }
  })
})

onUnmounted(() => {
  unlistenProgress?.()
})

const renderedNotes = computed(() => {
  if (!updateStore.updateInfo?.releaseNotes) return ''
  return updateStore.updateInfo.releaseNotes
    .replace(/\n/g, '<br>')
    .replace(/#{1,3}\s(.+)/g, '<strong>$1</strong>')
})

function openExternal(url: string) {
  open(url)
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

async function handleCheckUpdate() {
  checking.value = true
  error.value = false
  try {
    const info = await checkForUpdates()
    updateStore.setUpdateInfo(info)
    sidebarStore.setUpdateInfo(info)
  } catch {
    error.value = true
  } finally {
    checking.value = false
  }
}

async function handleDownload() {
  if (!updateStore.updateInfo?.platformAsset) return

  updateStore.setDownloadState('downloading')
  updateStore.clearError()
  updateStore.setDownloadProgress({ downloaded: 0, total: 0, percent: 0 })

  try {
    const asset = updateStore.updateInfo.platformAsset
    const filePath = await downloadUpdate(asset.url, asset.name, asset.size)
    updateStore.setDownloadedFilePath(filePath)
    updateStore.setDownloadState('downloaded')
  } catch (err) {
    updateStore.setDownloadError(`Download failed: ${err}`)
    updateStore.setDownloadState('error')
  }
}

async function handleCancel() {
  cancelDownload()
  updateStore.resetDownload()
}

async function handleRetry() {
  updateStore.resetDownload()
  await handleDownload()
}

async function handleInstall() {
  if (!updateStore.downloadedFilePath) return

  updateStore.setDownloadState('installing')
  try {
    await installUpdate(updateStore.downloadedFilePath)
  } catch (err) {
    updateStore.setDownloadError(`Install failed: ${err}`)
    updateStore.setDownloadState('downloaded')
  }
}
</script>

<style scoped>
.section-content {
  padding: 8px 0;
}

.section-heading {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.update-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 20px;
}

.version-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.version-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.version-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.check-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.check-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.check-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.check-btn img {
  width: 14px;
  height: 14px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.update-message {
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
}

.update-message.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
}

.update-message.success {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.update-available {
  margin-top: 16px;
}

.update-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--accent-light);
  border-radius: 6px;
  margin-bottom: 16px;
}

.update-icon {
  font-size: 20px;
}

.update-version {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
}

.update-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.release-notes {
  margin-bottom: 16px;
}

.release-notes h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.notes-content {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.update-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s ease;
  text-decoration: none;
  border: none;
}

.action-btn:hover {
  opacity: 0.9;
}

.action-btn.primary {
  background: var(--accent-color);
  color: white;
}

.action-btn.secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.action-btn.secondary:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.file-size {
  font-size: 12px;
  color: var(--text-tertiary);
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.cancel-btn {
  padding: 4px 12px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.cancel-btn:hover {
  border-color: var(--error-color);
  color: var(--error-color);
}

.progress-bar {
  height: 8px;
  background: var(--bg-primary);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

.progress-size {
  color: var(--text-tertiary);
}

.downloaded-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--success-color);
  margin-bottom: 8px;
}

.downloaded-icon {
  font-size: 16px;
}

.installing-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: var(--accent-light);
  border-radius: 6px;
}

.spinning-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  animation: pulse-text 1.5s ease-in-out infinite;
}

.installing-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

@keyframes pulse-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.retry-link,
.manual-link {
  background: none;
  border: none;
  color: var(--accent-color);
  cursor: pointer;
  font-size: 13px;
  text-decoration: underline;
  padding: 0;
}

.manual-link {
  color: var(--text-secondary);
}
</style>