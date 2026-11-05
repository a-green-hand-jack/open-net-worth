import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { Txn } from './types'

const labels = defineMessages({
  ai: { id: 'accounts.reviewSource.ai', defaultMessage: 'Added by Lucius' },
  agent: { id: 'accounts.reviewSource.agent', defaultMessage: 'Added by an agent' },
  automation: { id: 'accounts.reviewSource.automation', defaultMessage: 'Added by automation' },
  bank: { id: 'accounts.reviewSource.bank', defaultMessage: 'Bank sync' },
  email: { id: 'accounts.reviewSource.email', defaultMessage: 'Added from email' },
  import: { id: 'accounts.reviewSource.import', defaultMessage: 'Imported' },
  manual: { id: 'accounts.reviewSource.manual', defaultMessage: 'Added manually' },
  opening: { id: 'accounts.reviewSource.opening', defaultMessage: 'Starting balance' },
  reconcile: { id: 'accounts.reviewSource.reconcile', defaultMessage: 'Reconciliation' },
  unknown: { id: 'accounts.reviewSource.unknown', defaultMessage: 'New transaction' },
})

export function useReviewSource(txn: Pick<Txn, 'source' | 'via' | 'automationId'>): string {
  const { formatMessage } = useAppIntl()
  const label = formatMessage(labels[txn.source as keyof typeof labels] ?? labels.unknown)
  if (!txn.via) return label
  return txn.automationId
    ? formatMessage({ id: 'accounts.reviewSource.by', defaultMessage: 'Added by {name}' }, { name: txn.via })
    : formatMessage({ id: 'accounts.reviewSource.via', defaultMessage: '{label} via {name}' }, { label, name: txn.via })
}
