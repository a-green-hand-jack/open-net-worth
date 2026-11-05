import { defineMessages, type MessageDescriptor } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'

const messages = defineMessages({
  'statement.skip.account_not_found': { id: 'statement.skip.account_not_found', defaultMessage: 'account not found' },
  'statement.skip.account_missing': { id: 'statement.skip.account_missing', defaultMessage: 'No account chosen and the row has no account name.' },
  'statement.skip.account_named': { id: 'statement.skip.account_named', defaultMessage: "No account named ''{name}''." },
  'statement.skip.missing_date': { id: 'statement.skip.missing_date', defaultMessage: 'missing date' },
  'statement.skip.unparseable_amount': { id: 'statement.skip.unparseable_amount', defaultMessage: 'unparseable amount' },
  'statement.skip.ambiguous_direction': { id: 'statement.skip.ambiguous_direction', defaultMessage: 'ambiguous direction' },
  'statement.skip.zero_amount': { id: 'statement.skip.zero_amount', defaultMessage: 'zero amount' },
  'statement.skip.missing_fitid': { id: 'statement.skip.missing_fitid', defaultMessage: 'missing FITID' },
  'statement.skip.invalid_credit_debit': { id: 'statement.skip.invalid_credit_debit', defaultMessage: 'missing or invalid CdtDbtInd' },
  'statement.skip.unreadable': { id: 'statement.skip.unreadable', defaultMessage: 'unreadable row' },
  'statement.skip.status': { id: 'statement.skip.status', defaultMessage: "status ''{status}'' (not completed)" },
  'statement.skip.low_confidence': { id: 'statement.skip.low_confidence', defaultMessage: 'low confidence' },
  'statement.skip.low_confidence_note': { id: 'statement.skip.low_confidence_note', defaultMessage: 'low confidence ({note})' },
})

export function useStatementSkipReason() {
  const { formatMessage } = useAppIntl()
  return (row: { reason: string; reason_message?: { id: string; params?: Record<string, string | number> } | null }) => {
    const id = row.reason_message?.id
    if (id && Object.hasOwn(messages, id)) return formatMessage(messages[id as keyof typeof messages] as MessageDescriptor, row.reason_message?.params)
    return row.reason
  }
}
