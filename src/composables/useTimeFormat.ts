import { useI18n } from 'vue-i18n'

export function useTimeFormat() {
  const { t } = useI18n()

  function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t('timeNow')
    if (minutes < 60) return t('timeMinutes', { n: minutes })
    if (hours < 24) return t('timeHours', { n: hours })
    return t('timeDays', { n: days })
  }

  return { formatTimeAgo }
}
