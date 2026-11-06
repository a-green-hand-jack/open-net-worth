import { defineMessages, type IntlShape } from 'react-intl'

const flags = defineMessages({
  near_duplicate: {
    id: 'accounts.importFlag.nearDuplicate',
    defaultMessage: 'Already in your account?',
  },
  transfer_pair: {
    id: 'accounts.importFlag.transferPair',
    defaultMessage: 'Opposite legs — one transfer?',
  },
  transfer_leg_echo: {
    id: 'accounts.importFlag.transferEcho',
    defaultMessage: 'Already booked as a transfer',
  },
  intra_batch_duplicate: { id: 'accounts.importFlag.repeated', defaultMessage: 'Repeated in file' },
  amount_anomaly: { id: 'accounts.importFlag.amount', defaultMessage: 'Unusual amount' },
  no_account_for_currency: {
    id: 'accounts.importFlag.noAccount',
    defaultMessage: 'No account in this currency',
  },
  fx_transfer_pair: {
    id: 'accounts.importFlag.fxPair',
    defaultMessage: 'Transfer between your accounts',
  },
  fx_transfer_leg: {
    id: 'accounts.importFlag.fxLeg',
    defaultMessage: 'Second leg — folds into the transfer',
  },
})
const kinds = defineMessages({
  expense: { id: 'accounts.reviewKind.expense', defaultMessage: 'Expense' },
  income: { id: 'accounts.reviewKind.income', defaultMessage: 'Income' },
  transfer: { id: 'accounts.reviewKind.transfer', defaultMessage: 'Transfer' },
  investment: { id: 'accounts.reviewKind.investment', defaultMessage: 'Investment' },
  adjustment: { id: 'accounts.reviewKind.adjustment', defaultMessage: 'Balance adjustment' },
})

export function importFlagLabel(type: string, intl: IntlShape): string {
  return Object.hasOwn(flags, type) ? intl.formatMessage(flags[type as keyof typeof flags]) : type
}

export function importMatchKind(kind: string | null | undefined, intl: IntlShape): string {
  if (!kind) return '—'
  return Object.hasOwn(kinds, kind) ? intl.formatMessage(kinds[kind as keyof typeof kinds]) : kind
}
