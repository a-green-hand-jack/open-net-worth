import { useAppIntl } from '../../../../i18n/useAppIntl'
import { displayValue, fieldLabel } from '../FieldLabels'
import { targetActionLabel } from '../ChangeTitles'
import type { ProposedChange } from '../../../../types/chat'
import { ApprovalLead, ApprovalNote, ApprovalTable } from '../ApprovalCard'
import { isRecord } from '../cardTypes'

// An id too long for a narrow column shows its head; the whole id is the hover.
export function BatchCell({ field, value, tool, version, path }: { field: string; value: unknown; tool?: string; version?: string; path?: string }) {
  const intl = useAppIntl()
  if (typeof value === 'string' && /(^|_)id$/.test(field) && value.length > 14) {
    return <span title={value}>{value.slice(0, 10)}…</span>
  }
  const text = displayValue(value, intl, tool, version, path)
  return text.length > 72 ? <span title={text}>{text.slice(0, 69)}…</span> : <>{text}</>
}

/** The body of every `*_batch` card (`registry.stage_batch`): what the call does and how
 * many, then the rows themselves — they ARE the change, so the table is never folded. */
export function BatchBody({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d = (change.display || {}) as Record<string, unknown>
  const rows = (Array.isArray(d.rows) ? d.rows : []).filter(isRecord)
  const count = typeof d.count === 'number' ? d.count : rows.length
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter((key) =>
    !(change.type === 'set_target_batch' && key === 'op_id') && rows.some((row) => row[key] != null && row[key] !== ''),
  )

  return (
    <>
      <ApprovalLead>{intl.formatMessage({ id: 'chat.approval.items', defaultMessage: '{count, plural, one {# item} other {# items}}' }, { count })}</ApprovalLead>
      {columns.length > 0 && (
        <ApprovalTable
          head={columns.map((column) => fieldLabel(column, intl))}
          rows={rows.map((row, i) => ({
            key: i,
            cells: columns.map((key) => {
              let value = row[key]
              if (change.type === 'set_target_batch' && key === 'op') value = targetActionLabel(row.op_id, intl) || value
              if (change.type === 'set_target_batch' && key === 'target_type') {
                if (value === 'monthly') value = intl.formatMessage({ id: 'chat.budget.monthly', defaultMessage: 'monthly' })
                else if (value === 'weekly') value = intl.formatMessage({ id: 'chat.budget.weekly', defaultMessage: 'weekly' })
                else if (value === 'yearly') value = intl.formatMessage({ id: 'chat.budget.yearly', defaultMessage: 'yearly' })
                else if (value === 'by_date') value = intl.formatMessage({ id: 'chat.budget.savings', defaultMessage: 'savings' })
              }
              return <BatchCell key={key} field={key} value={value} />
            }),
          }))}
        />
      )}
      {count > rows.length && <ApprovalNote>{intl.formatMessage({ id: 'chat.approval.more', defaultMessage: '+{count} more' }, { count: count - rows.length })}</ApprovalNote>}
    </>
  )
}
