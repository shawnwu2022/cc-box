import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UpdateInfo, DownloadProgress } from '@/types'

export type DownloadState = 'idle' | 'downloading' | 'installing' | 'error'

export const useUpdateStore = defineStore('update', () => {
  const updateInfo = ref<UpdateInfo | null>(null)
  const downloadState = ref<DownloadState>('idle')
  const downloadProgress = ref<DownloadProgress>({ downloaded: 0, total: 0, percent: 0 })
  const downloadError = ref('')

  function setUpdateInfo(info: UpdateInfo | null) {
    updateInfo.value = info
  }

  function setDownloadState(state: DownloadState) {
    downloadState.value = state
  }

  function setDownloadProgress(progress: DownloadProgress) {
    downloadProgress.value = progress
  }

  function setDownloadError(error: string) {
    downloadError.value = error
  }

  function resetDownload() {
    downloadState.value = 'idle'
    downloadProgress.value = { downloaded: 0, total: 0, percent: 0 }
    downloadError.value = ''
  }

  function clearError() {
    downloadError.value = ''
  }

  return {
    updateInfo,
    downloadState,
    downloadProgress,
    downloadError,
    setUpdateInfo,
    setDownloadState,
    setDownloadProgress,
    setDownloadError,
    resetDownload,
    clearError
  }
})
