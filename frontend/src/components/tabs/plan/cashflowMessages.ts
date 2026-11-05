import type { IntlShape } from 'react-intl'

export interface CashflowMessage {
  id: string
  params?: Record<string, unknown>
}

/** Only known backend message IDs are translated. Unknown IDs and malformed parameters keep the original. */
export function formatCashflowMessage(
  intl: IntlShape,
  message: CashflowMessage | undefined,
  original: string,
): string {
  if (!message) return original
  const params = message.params
  if (
    params !== undefined &&
    (params === null || typeof params !== 'object' || Array.isArray(params))
  )
    return original
  if (message.id === 'cashflow.note.recurring') {
    if (!params || Object.keys(params).length !== 1 || typeof params.cadence !== 'string')
      return original
  } else if (params && Object.keys(params).length !== 0) return original
  const { formatMessage } = intl
  switch (message.id) {
    case 'cashflow.label.salary':
      return formatMessage({ id: 'cashflow.label.salary', defaultMessage: 'Salary' })
    case 'cashflow.label.living_expenses':
      return formatMessage({
        id: 'cashflow.label.living_expenses',
        defaultMessage: 'Living expenses',
      })
    case 'cashflow.label.irregular_income':
      return formatMessage({
        id: 'cashflow.label.irregular_income',
        defaultMessage: 'Irregular income',
      })
    case 'cashflow.label.everyday_spending':
      return formatMessage({
        id: 'cashflow.label.everyday_spending',
        defaultMessage: 'Everyday spending',
      })
    case 'cashflow.label.recurring':
      return formatMessage({ id: 'cashflow.label.recurring', defaultMessage: 'Recurring' })
    case 'cashflow.label.income':
      return formatMessage({ id: 'cashflow.label.income', defaultMessage: 'Income' })
    case 'cashflow.label.expense':
      return formatMessage({ id: 'cashflow.label.expense', defaultMessage: 'Expense' })
    case 'cashflow.category.income':
      return formatMessage({ id: 'cashflow.category.income', defaultMessage: 'Income' })
    case 'cashflow.category.expenses':
      return formatMessage({ id: 'cashflow.category.expenses', defaultMessage: 'Expenses' })
    case 'cashflow.note.variable':
      return formatMessage({
        id: 'cashflow.note.variable',
        defaultMessage: '3-month average of irregular items',
      })
    case 'cashflow.note.recurring': {
      const cadence = message.params?.cadence
      if (typeof cadence !== 'string') return original
      if (!cadence)
        return formatMessage({ id: 'cashflow.note.recurringEmpty', defaultMessage: 'recurring' })
      const translated =
        cadence === 'weekly'
          ? formatMessage({ id: 'cashflow.cadence.weekly', defaultMessage: 'weekly' })
          : cadence === 'biweekly'
            ? formatMessage({ id: 'cashflow.cadence.biweekly', defaultMessage: 'biweekly' })
            : cadence === 'monthly'
              ? formatMessage({ id: 'cashflow.cadence.monthly', defaultMessage: 'monthly' })
              : cadence === 'quarterly'
                ? formatMessage({ id: 'cashflow.cadence.quarterly', defaultMessage: 'quarterly' })
                : cadence === 'annual'
                  ? formatMessage({ id: 'cashflow.cadence.annual', defaultMessage: 'annual' })
                  : cadence
      return formatMessage(
        { id: 'cashflow.note.recurring', defaultMessage: '{cadence} · recurring' },
        { cadence: translated },
      )
    }
    default:
      return original
  }
}
