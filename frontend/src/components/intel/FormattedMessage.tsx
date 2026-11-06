import { useAppIntl } from '../../i18n/useAppIntl'

/** English fallback lets standalone Intel previews render without an app provider. */
export function FormattedMessage({ id, defaultMessage }: { id: string; defaultMessage: string }) {
  const intl = useAppIntl()
  const format = intl.formatMessage
  return <>{format({ id, defaultMessage })}</>
}
