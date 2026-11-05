import { useAppIntl } from '../../../i18n/useAppIntl'
import { timeAgo } from '../../../utils/format'

export function useConnectorRelativeTime() {
  const { locale, formatRelativeTime, formatMessage } = useAppIntl()
  return (iso: string | null) => {
    if (!iso) return formatMessage({ id: 'connectors.time.never', defaultMessage: 'never' })
    const at = new Date(iso).getTime()
    if (!Number.isFinite(at)) return ''
    if (locale.startsWith('en')) return at > Date.now() ? 'just now' : timeAgo(iso)
    const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000))
    if (seconds < 60) return formatRelativeTime(-seconds, 'second', { numeric: 'auto' })
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return formatRelativeTime(-minutes, 'minute', { numeric: 'auto' })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return formatRelativeTime(-hours, 'hour', { numeric: 'auto' })
    const days = Math.floor(hours / 24)
    if (days < 7) return formatRelativeTime(-days, 'day', { numeric: 'auto' })
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return formatRelativeTime(-weeks, 'week', { numeric: 'auto' })
    const months = Math.floor(days / 30)
    return months < 12 ? formatRelativeTime(-months, 'month', { numeric: 'auto' }) : formatRelativeTime(-Math.floor(days / 365), 'year', { numeric: 'auto' })
  }
}
