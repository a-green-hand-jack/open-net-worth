import { useAppIntl } from '../../../i18n/useAppIntl'
import type { ActionResult } from './connectorActions'
import { formatConnectorServerMessage } from './connectorServerMessages'

export function useConnectorActionMessage() {
  const intl = useAppIntl()
  const { formatMessage } = intl
  return (result: ActionResult, name: string, enabled: boolean) => {
    const values = { name, enabled: String(enabled) }
    if (!result.ok && result.serverMessage)
      return formatConnectorServerMessage(intl, result.serverMessage, result.error)
    if (!result.ok)
      return formatMessage(
        {
          id: 'connectors.enabled.failed',
          defaultMessage: "Couldn't {enabled, select, true {connect} other {disconnect}} {name}",
        },
        values,
      )
    return result.unconfirmed
      ? formatMessage(
          {
            id: 'connectors.enabled.unconfirmed',
            defaultMessage:
              "{name} {enabled, select, true {connected} other {disconnected}} in settings, but the live bot didn't confirm the change — it may still be running the old configuration. Try again, or restart the app.",
          },
          values,
        )
      : formatMessage(
          {
            id: 'connectors.enabled.done',
            defaultMessage: '{name} {enabled, select, true {connected} other {disconnected}}',
          },
          values,
        )
  }
}
