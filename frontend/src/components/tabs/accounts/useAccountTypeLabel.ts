import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { typeLabel, TYPE_MEANING, type AccountType } from './categories'

export const accountTypeMessages = defineMessages({
  cash: { id: 'accounts.group.cash', defaultMessage: 'Cash' },
  fixed_deposit: { id: 'accounts.group.fixedDeposit', defaultMessage: 'Fixed deposit' },
  investment: { id: 'accounts.group.investment', defaultMessage: 'Investment' },
  retirement: { id: 'accounts.group.retirement', defaultMessage: 'Retirement' },
  receivable: { id: 'accounts.group.receivable', defaultMessage: 'Receivable' },
  credit: { id: 'accounts.group.credit', defaultMessage: 'Credit' },
  loan: { id: 'accounts.group.loan', defaultMessage: 'Loan' },
})

export const accountTypeMeaningMessages = defineMessages({
  cash: {
    id: 'accounts.meaning.cash',
    defaultMessage: 'Bank, e-wallet, physical cash · spendable · in budget',
  },
  fixed_deposit: {
    id: 'accounts.meaning.fixedDeposit',
    defaultMessage: 'Time-locked cash · counts to net worth, not spendable',
  },
  investment: {
    id: 'accounts.meaning.investment',
    defaultMessage: 'Brokerage or crypto exchange · holdings + settlement cash',
  },
  retirement: {
    id: 'accounts.meaning.retirement',
    defaultMessage: 'CPF, SRS, pension · locked until retirement',
  },
  receivable: { id: 'accounts.meaning.receivable', defaultMessage: 'Money someone owes you' },
  credit: {
    id: 'accounts.meaning.credit',
    defaultMessage: 'Credit card, BNPL, line of credit · paid from cash · in budget',
  },
  loan: {
    id: 'accounts.meaning.loan',
    defaultMessage: 'Mortgage, car, personal, student, margin loan',
  },
})

export function useAccountTypeLabel() {
  const { formatMessage } = useAppIntl()
  return (type: string) =>
    Object.hasOwn(accountTypeMessages, type)
      ? formatMessage(accountTypeMessages[type as AccountType])
      : typeLabel(type)
}

export function useAccountTypeMeaning() {
  const { formatMessage } = useAppIntl()
  return (type: AccountType) =>
    formatMessage(accountTypeMeaningMessages[type]) || TYPE_MEANING[type]
}
