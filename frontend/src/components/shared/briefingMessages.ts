import type { IntlShape } from 'react-intl'

export const BRIEFING_ERROR_IDS = [
  'briefing.error.unreachable',
  'briefing.error.unreadable',
] as const

export function briefingError(note: string, message: unknown, intl: IntlShape): string {
  if (!message || typeof message !== 'object') return note
  const { message_id, params } = message as { message_id?: unknown; params?: unknown }
  if (!params || typeof params !== 'object' || Array.isArray(params) || Object.keys(params).length)
    return note
  const { formatMessage } = intl
  switch (message_id) {
    case 'briefing.error.unreachable':
      return formatMessage({
        id: 'shared.briefing.unreachable',
        defaultMessage:
          "Couldn't reach the AI to generate your briefing. Check your AI provider in Settings, then refresh.",
      })
    case 'briefing.error.unreadable':
      return formatMessage({
        id: 'shared.briefing.unreadable',
        defaultMessage: "The AI returned a briefing we couldn't read. Try refreshing.",
      })
    default:
      return note
  }
}
