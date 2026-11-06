import { useAppIntl } from '../../../i18n/useAppIntl'
import { errorText } from './presentation'
import type { MessageDescriptor } from 'react-intl'
import { tradingServerMessages } from './serverMessages'

export function useTradingErrorText() {
  const formatRuntime = useAppIntl().formatMessage
  return (error: unknown) => {
    if (!(error instanceof Error) || !('messageId' in error) || typeof error.messageId !== 'string')
      return errorText(error)
    const descriptor = (tradingServerMessages as Record<string, MessageDescriptor>)[error.messageId]
    if (!descriptor) return error.message
    const params =
      'messageParams' in error &&
      typeof error.messageParams === 'object' &&
      error.messageParams !== null
        ? (error.messageParams as Record<string, string | number | boolean | null>)
        : {}
    return formatRuntime(descriptor, params)
  }
}
