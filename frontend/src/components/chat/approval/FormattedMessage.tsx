import { useAppIntl } from '../../../i18n/useAppIntl'

/** Allows isolated approval cards to retain the English fallback without a provider. */
export function FormattedMessage({ id, defaultMessage }: { id: string; defaultMessage: string }) {
  const intl = useAppIntl()
  const format = intl.formatMessage
  return <>{format({ id, defaultMessage })}</>
}
