// The "Last fetched …" line every provider config section renders — replaces each file's own
// "Last synced {timeAgo} • N accounts linked • N imported" line (that count now lives in
// ConnectorAccountsList). See .claude/rfcs/connectors-as-data-sources-ui-spec.md §1.2.A.
import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { Text, type TextTone } from '../../ui'

const STATUS_PHRASE = defineMessages({
  ok: { id: 'connectors.status.ok', defaultMessage: 'up to date' },
  not_configured: { id: 'connectors.status.notConfigured', defaultMessage: 'not set up yet' },
  disabled: { id: 'connectors.status.paused', defaultMessage: 'paused' },
  auth_error: { id: 'connectors.status.authError', defaultMessage: 'credentials need attention' },
  rate_limited: { id: 'connectors.status.rateLimited', defaultMessage: 'rate limited by the provider' },
  connect_error: { id: 'connectors.status.connectError', defaultMessage: "couldn't reach the provider" },
  error: { id: 'connectors.status.error', defaultMessage: 'error' },
})

const STATUS_TONE: Record<string, TextTone> = {
  ok: 'faint',
  not_configured: 'faint',
  disabled: 'faint',
  auth_error: 'bad',
  rate_limited: 'warn',
  connect_error: 'bad',
  error: 'bad',
}

export function ConnectorStatusLine({
  lastSyncedAt,
  lastStatus,
}: {
  lastSyncedAt: string | null
  lastStatus: string
}) {
  const { formatMessage } = useAppIntl()
  if (!lastSyncedAt) {
    return (
      <Text size="xs" tone="faint">
        {formatMessage({ id: 'connectors.status.never', defaultMessage: 'Last fetched: never' })}
      </Text>
    )
  }
  const phrase = lastStatus in STATUS_PHRASE ? formatMessage(STATUS_PHRASE[lastStatus as keyof typeof STATUS_PHRASE]) : lastStatus
  const ms = Date.now() - new Date(lastSyncedAt).getTime()
  const mins = Math.floor(ms / 60000)
  const time = Number.isNaN(ms) ? formatMessage({ id: 'connectors.time.never', defaultMessage: 'never' })
    : mins < 1 ? formatMessage({ id: 'connectors.time.justNow', defaultMessage: 'just now' })
    : mins < 60 ? formatMessage({ id: 'connectors.time.minutes', defaultMessage: '{count}m ago' }, { count: mins })
    : mins < 1440 ? formatMessage({ id: 'connectors.time.hours', defaultMessage: '{count}h ago' }, { count: Math.floor(mins / 60) })
    : formatMessage({ id: 'connectors.time.days', defaultMessage: '{count}d ago' }, { count: Math.floor(mins / 1440) })
  const tone = STATUS_TONE[lastStatus] ?? 'faint'
  return (
    <Text size="xs" tone={tone}>
      {formatMessage({ id: 'connectors.status.fetched', defaultMessage: 'Last fetched {time} · {status}' }, { time, status: phrase })}
    </Text>
  )
}
