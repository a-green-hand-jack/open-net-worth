import type { IntlShape } from 'react-intl'

export function automationRunMessage(
  intl: IntlShape,
  message: { id: string; params: Record<string, unknown> } | null | undefined,
  fallback: string,
): string {
  if (
    !message ||
    !message.params ||
    typeof message.params !== 'object' ||
    Array.isArray(message.params) ||
    Object.keys(message.params).length
  )
    return fallback
  switch (message.id) {
    case 'automations.run.restartInterrupted':
      return intl.formatMessage({
        id: 'automations.run.restartInterrupted',
        defaultMessage:
          'The server restarted while this Automation was running; the interrupted turn was closed safely. No unconfirmed action was applied.',
      })
    case 'automations.run.approvalsLost':
      return intl.formatMessage({
        id: 'automations.run.approvalsLost',
        defaultMessage:
          'This Automation was waiting for approvals that no longer exist; it was closed safely.',
      })
    case 'automations.run.executionFailed':
      return intl.formatMessage({
        id: 'automations.run.executionFailed',
        defaultMessage: 'Execution failed',
      })
    case 'automations.run.interrupted':
      return intl.formatMessage({
        id: 'automations.run.interrupted',
        defaultMessage: 'Interrupted',
      })
    default:
      return fallback
  }
}
