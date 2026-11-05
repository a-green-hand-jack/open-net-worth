import type { TradingNotice } from '../../../types/trading'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { MessageDescriptor } from 'react-intl'
import { tradingServerMessages } from './serverMessages'

export function asTradingNotice(value: unknown): TradingNotice | undefined {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.default_message !== 'string' ||
    !candidate.params ||
    typeof candidate.params !== 'object' ||
    Array.isArray(candidate.params)
  )
    return undefined
  return candidate as unknown as TradingNotice
}

/** Old servers only send text. Refuse a partial message list so no warning is lost. */
export function useTradingNotices() {
  const formatRuntime = useAppIntl().formatMessage
  return (messages: TradingNotice[] | undefined, fallback: string[] = []): string[] => {
    if (!messages || messages.length !== fallback.length) return fallback
    return messages.map(({ id, default_message, params }) => {
      const descriptor = (tradingServerMessages as Record<string, MessageDescriptor>)[id]
      return descriptor ? formatRuntime(descriptor, params) : default_message
    })
  }
}
