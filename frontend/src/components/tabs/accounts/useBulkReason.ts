import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'

const reasons = defineMessages({
  'ledger.bulk.category_kind': { id: 'ledger.bulk.category_kind', defaultMessage: 'category not allowed on this kind' },
  'ledger.bulk.payee_kind': { id: 'ledger.bulk.payee_kind', defaultMessage: 'payee not allowed on this kind' },
  'ledger.bulk.transfer_move': { id: 'ledger.bulk.transfer_move', defaultMessage: 'move not supported on transfers' },
  'ledger.bulk.no_change': { id: 'ledger.bulk.no_change', defaultMessage: 'no applicable change' },
})

export function useBulkReason() {
  const { formatMessage } = useAppIntl()
  return (entry: { reason?: string; reason_message?: { id: string; params?: Record<string, string | number> } }) => {
    const id = entry.reason_message?.id
    if (id && Object.hasOwn(reasons, id)) return formatMessage(reasons[id as keyof typeof reasons])
    return entry.reason || formatMessage({ id: 'accounts.bulk.unknownReason', defaultMessage: 'reason unavailable' })
  }
}
