import type { IntlShape } from 'react-intl'
import { timeAgo } from '../../utils/format'

/** Keep the existing English wording while formatting other locales through Intl. */
export function intelTimeAgo(iso: string, intl: IntlShape): string {
  if (intl.locale.toLowerCase().startsWith('en')) return timeAgo(iso)
  const timestamp = new Date(iso).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return intl.formatRelativeTime(-seconds, 'second', { numeric: 'auto' })
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return intl.formatRelativeTime(-minutes, 'minute', { numeric: 'auto' })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return intl.formatRelativeTime(-hours, 'hour', { numeric: 'auto' })
  const days = Math.floor(hours / 24)
  if (days < 7) return intl.formatRelativeTime(-days, 'day', { numeric: 'auto' })
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return intl.formatRelativeTime(-weeks, 'week', { numeric: 'auto' })
  const months = Math.floor(days / 30)
  if (months < 12) return intl.formatRelativeTime(-months, 'month', { numeric: 'auto' })
  return intl.formatRelativeTime(-Math.floor(days / 365), 'year', { numeric: 'auto' })
}
