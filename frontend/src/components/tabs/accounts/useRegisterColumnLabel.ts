import { defineMessages, type MessageDescriptor } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'

const columns: Record<string, MessageDescriptor> = defineMessages({
  clr: { id: 'accounts.column.cleared', defaultMessage: 'C' },
  account: { id: 'accounts.column.account', defaultMessage: 'Account' },
  date: { id: 'accounts.column.date', defaultMessage: 'Date' },
  payee: { id: 'accounts.column.payee', defaultMessage: 'Payee' },
  category: { id: 'accounts.column.category', defaultMessage: 'Category' },
  description: { id: 'accounts.column.description', defaultMessage: 'Description' },
  memo: { id: 'accounts.column.memo', defaultMessage: 'Memo' },
  source: { id: 'accounts.column.source', defaultMessage: 'Source' },
  amount: { id: 'accounts.column.amount', defaultMessage: 'Amount' },
})

export function useRegisterColumnLabel() {
  const { formatMessage } = useAppIntl()
  return (key: string, fallback = '') =>
    Object.hasOwn(columns, key) ? formatMessage(columns[key]!) : fallback
}
