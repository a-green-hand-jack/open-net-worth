// Shared inline row editor (detail3.jsx's `EditRow`) — used by both the Schedule tab's
// installment rows and the Funding tab's source rows.
import { DateField } from '../../ui'
import { useAppIntl } from '../../../i18n/useAppIntl'

export interface EditDraft {
  label: string
  amount: number | string
  due_date?: string
  description?: string
  note?: string
}

interface EditRowProps {
  draft: EditDraft
  setDraft: (d: EditDraft) => void
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
  withDate?: boolean
  descKey?: 'description' | 'note'
  descPlaceholder?: string
  ccy?: string
}

export function EditRow({
  draft,
  setDraft,
  onSave,
  onCancel,
  onDelete,
  withDate,
  descKey,
  descPlaceholder,
  ccy,
}: EditRowProps) {
  const { formatMessage } = useAppIntl()
  return (
    <div className="c2-edit">
      <div className="c2-edit-row">
        <input
          className="c2-input grow"
          type="text"
          value={draft.label}
          placeholder={formatMessage({ id: 'commitments.editor.label', defaultMessage: 'Label' })}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        />
        {withDate && (
          <DateField
            unstyled
            className="c2-input date"
            value={draft.due_date || ''}
            onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
          />
        )}
        <input
          className="c2-input amt"
          type="number"
          value={draft.amount}
          placeholder={ccy ? formatMessage({ id: 'commitments.editor.amountCurrency', defaultMessage: 'Amount ({currency})' }, { currency: ccy }) : formatMessage({ id: 'commitments.editor.amount', defaultMessage: 'Amount' })}
          onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
        />
      </div>
      {descKey && (
        <textarea
          className="c2-input c2-edit-desc"
          value={draft[descKey] || ''}
          placeholder={descPlaceholder || formatMessage({ id: 'commitments.editor.description', defaultMessage: 'Description (optional)' })}
          onChange={(e) => setDraft({ ...draft, [descKey]: e.target.value })}
        />
      )}
      <div className="c2-edit-btns">
        {onDelete && (
          <button className="c2-mini-btn danger" onClick={onDelete}>
            {formatMessage({ id: 'commitments.editor.delete', defaultMessage: 'Delete' })}
          </button>
        )}
        <button className="c2-mini-btn" onClick={onCancel}>
          {formatMessage({ id: 'commitments.editor.cancel', defaultMessage: 'Cancel' })}
        </button>
        <button className="c2-mini-btn pri" onClick={onSave}>
          {formatMessage({ id: 'commitments.editor.save', defaultMessage: 'Save' })}
        </button>
      </div>
    </div>
  )
}
