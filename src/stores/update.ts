import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UpdateInfo, DownloadProgress } from '@/types'

export type DownloadState = 'idle' | 'downloading' | 'downloaded' | 'installing' | 'error'

export const useUpdateStore = defineStore('update', () => {
  // 更新信息
  const updateInfo = ref<UpdateInfo | null>(null)

  // 下载状态
  const downloadState = ref<DownloadState>('idle')

  // 下载进度
  const downloadProgress = ref<DownloadProgress>({ downloaded: 0, total: 0, percent: 0 })

  // 已下载文件路径
  const downloadedFilePath = ref('')

  // 下载错误信息
  const downloadError = ref('')

  // 设置更新信息
  function setUpdateInfo(info: UpdateInfo | null) {
    updateInfo.value = info
  }

  // 设置下载状态
  function setDownloadState(state: DownloadState) {
    downloadState.value = state
  }

  // 设置下载进度
  function setDownloadProgress(progress: DownloadProgress) {
    downloadProgress.value = progress
  }

  // 设置已下载文件路径
  function setDownloadedFilePath(path: string) {
    downloadedFilePath.value = path
  }

  // 设置下载错误
  function setDownloadError(error: string) {
    downloadError.value = error
  }

  // 重置下载状态
  function resetDownload() {
    downloadState.value = 'idle'
    downloadProgress.value = { downloaded: 0, total: 0, percent: 0 }
    downloadedFilePath.value = ''
    downloadError.value = ''
  }

  // 清除错误
  function clearError() {
    downloadError.value = ''
  }

  return {
    updateInfo,
    downloadState,
    downloadProgress,
    downloadedFilePath,
    downloadError,
    setUpdateInfo,
    setDownloadState,
    setDownloadProgress,
    setDownloadedFilePath,
    setDownloadError,
    resetDownload,
    clearError
  }
})