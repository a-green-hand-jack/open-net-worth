import type { IntlShape } from 'react-intl'
import type { CashFlowNode } from '../../../../types/aggregates'

export function moneyFlowSystemLabel(intl: IntlShape, node: CashFlowNode): string {
  if (node.id === 'saved' && node.kind === 'saved' && node.label === 'Saved')
    return intl.formatMessage({ id: 'overview.moneyFlow.node.saved', defaultMessage: 'Saved' })
  if (node.id === 'shortfall' && node.kind === 'shortfall' && node.label === 'From savings')
    return intl.formatMessage({
      id: 'overview.moneyFlow.node.fromSavings',
      defaultMessage: 'From savings',
    })
  if (node.id === 'inc-other' && node.kind === 'income' && node.label === 'Other income')
    return intl.formatMessage({
      id: 'overview.moneyFlow.node.otherIncome',
      defaultMessage: 'Other income',
    })
  if (node.id === 'sg-other' && node.kind === 'spend_group' && node.label === 'Other spending')
    return intl.formatMessage({
      id: 'overview.moneyFlow.node.otherSpending',
      defaultMessage: 'Other spending',
    })
  if (
    node.id === 'sg:__unbudgeted__' &&
    node.kind === 'spend_group' &&
    node.label === 'Not in budget'
  )
    return intl.formatMessage({
      id: 'overview.moneyFlow.node.notInBudget',
      defaultMessage: 'Not in budget',
    })
  if (node.id === 'total' && node.kind === 'total' && node.label === 'Income')
    return intl.formatMessage({ id: 'overview.moneyFlow.node.income', defaultMessage: 'Income' })
  if (node.id === 'total' && node.kind === 'total' && node.label === 'Spent')
    return intl.formatMessage({ id: 'overview.moneyFlow.node.spent', defaultMessage: 'Spent' })
  return node.label
}
