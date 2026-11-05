import { useAppIntl } from '../../../i18n/useAppIntl'

export function FormattedMessage({ id, defaultMessage }: { id: string; defaultMessage: string }) {
  const intl = useAppIntl()
  const format = intl.formatMessage
  return <>{format({ id, defaultMessage })}</>
}
