import type { IntlShape } from 'react-intl'

interface FlowMessage {
  id: string
  params?: Record<string, unknown>
}

/** Translate only backend-identified system labels; unknown or malformed data stays verbatim. */
export function formatMoneyFlowLabel(
  intl: IntlShape,
  message: FlowMessage | undefined,
  original: string,
): string {
  if (!message || typeof message.id !== 'string') return original
  const params = message.params
  if (params !== undefined && (!params || typeof params !== 'object' || Array.isArray(params)))
    return original
  const { formatMessage } = intl
  if (message.id === 'moneyFlow.label.otherGroup') {
    if (
      !params ||
      typeof params.group !== 'string' ||
      Object.keys(params).some((k) => k !== 'group' && k !== 'group_message')
    )
      return original
    let group = params.group
    if ('group_message' in params) {
      const nested = params.group_message
      if (
        !nested ||
        typeof nested !== 'object' ||
        Array.isArray(nested) ||
        typeof (nested as FlowMessage).id !== 'string' ||
        (nested as FlowMessage).id === 'moneyFlow.label.otherGroup'
      )
        return original
      group = formatMoneyFlowLabel(intl, nested as FlowMessage, group)
    }
    return formatMessage(
      { id: 'moneyFlow.label.otherGroup', defaultMessage: 'Other {group}' },
      { group },
    )
  }
  if (params && Object.keys(params).length) return original
  switch (message.id) {
    case 'moneyFlow.label.uncategorizedIncome':
      return formatMessage({
        id: 'moneyFlow.label.uncategorizedIncome',
        defaultMessage: 'Uncategorized income',
      })
    case 'moneyFlow.label.otherIncome':
      return formatMessage({ id: 'moneyFlow.label.otherIncome', defaultMessage: 'Other income' })
    case 'moneyFlow.label.uncategorizedSpending':
      return formatMessage({
        id: 'moneyFlow.label.uncategorizedSpending',
        defaultMessage: 'Uncategorized spending',
      })
    case 'moneyFlow.label.notInBudget':
      return formatMessage({ id: 'moneyFlow.label.notInBudget', defaultMessage: 'Not in budget' })
    case 'moneyFlow.label.spending':
      return formatMessage({ id: 'moneyFlow.label.spending', defaultMessage: 'Spending' })
    case 'moneyFlow.label.other':
      return formatMessage({ id: 'moneyFlow.label.other', defaultMessage: 'Other' })
    case 'moneyFlow.label.otherSpending':
      return formatMessage({
        id: 'moneyFlow.label.otherSpending',
        defaultMessage: 'Other spending',
      })
    case 'moneyFlow.label.spent':
      return formatMessage({ id: 'moneyFlow.label.spent', defaultMessage: 'Spent' })
    case 'moneyFlow.label.income':
      return formatMessage({ id: 'moneyFlow.label.income', defaultMessage: 'Income' })
    case 'moneyFlow.label.fromSavings':
      return formatMessage({ id: 'moneyFlow.label.fromSavings', defaultMessage: 'From savings' })
    case 'moneyFlow.label.saved':
      return formatMessage({ id: 'moneyFlow.label.saved', defaultMessage: 'Saved' })
    default:
      return original
  }
}
