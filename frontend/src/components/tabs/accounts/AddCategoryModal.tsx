/**
 * AddCategoryModal.tsx — Create a new category from within the transaction flow.
 *
 * The `kind` prop is the transaction direction that opened this (income = money in,
 * expense = money out); it pre-selects the Type, which the user can override to any of
 * the four category kinds. A category is a pure transaction LABEL (envelope ⊥ category,
 * RFC envelope-category-full-split.md) — it mints no budget envelope and belongs to no
 * budget group, so this modal collects only the label and kind.
 */

import { useState, useEffect } from 'react'
import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { FormField } from '../../ui/FormField'
import { TextField } from '../../ui/TextField'

export type CatKind = 'income' | 'expense' | 'transfer' | 'investment'

const KIND_ORDER: CatKind[] = ['expense', 'income', 'transfer', 'investment']
const labels = defineMessages({
  expense: { id: 'category.create.expense', defaultMessage: 'Expense' },
  income: { id: 'category.create.income', defaultMessage: 'Income' },
  transfer: { id: 'category.create.transfer', defaultMessage: 'Transfer' },
  investment: { id: 'category.create.investment', defaultMessage: 'Investment' },
})
const placeholders = defineMessages({
  expense: { id: 'category.create.expenseExample', defaultMessage: 'e.g. Pet care' },
  income: { id: 'category.create.incomeExample', defaultMessage: 'e.g. Bonus' },
  transfer: { id: 'category.create.transferExample', defaultMessage: 'e.g. Reimbursement' },
  investment: { id: 'category.create.investmentExample', defaultMessage: 'e.g. Dividends' },
})
const notes = defineMessages({
  expense: {
    id: 'category.create.expenseNote',
    defaultMessage: 'This is <b>money out (−)</b> — a label for spending.',
  },
  income: {
    id: 'category.create.incomeNote',
    defaultMessage: 'This is <b>money in (+)</b> — a label for income.',
  },
  transfer: {
    id: 'category.create.transferNote',
    defaultMessage: 'This is a <b>transfer</b> label — money moved between your accounts.',
  },
  investment: {
    id: 'category.create.investmentNote',
    defaultMessage: 'This is an <b>investment</b> label — buys, sells, dividends.',
  },
})

export interface AddCategoryModalProps {
  open: boolean
  prefill?: string
  /** The transaction direction that opened this dialog — pre-selects the Type. */
  kind?: CatKind
  onClose: () => void
  onSave: (cat: { name: string; kind: CatKind }) => void
}

export function AddCategoryModal({ open, prefill, kind, onClose, onSave }: AddCategoryModalProps) {
  const { formatMessage: fm } = useAppIntl()
  const [name, setName] = useState('')
  const [selectedKind, setSelectedKind] = useState<CatKind>(kind ?? 'expense')

  useEffect(() => {
    if (open) {
      setName(prefill || '')
      setSelectedKind(kind ?? 'expense')
    }
  }, [open, prefill, kind])

  const valid = name.trim().length > 0

  function save() {
    if (!valid) return
    onSave({ name: name.trim(), kind: selectedKind })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={fm({ id: 'category.create.title', defaultMessage: 'Add category' })}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {fm({ id: 'category.create.cancel', defaultMessage: 'Cancel' })}
          </Button>
          <Button size="sm" variant="primary" disabled={!valid} onClick={save}>
            {fm({ id: 'category.create.save', defaultMessage: 'Save' })}
          </Button>
        </>
      }
    >
      <div className="acct-form">
        <div className="full">
          <div className="acct-refund-note">
            {fm(
              { id: notes[selectedKind].id, defaultMessage: notes[selectedKind].defaultMessage },
              { b: (chunks) => <b>{chunks}</b> },
            )}
          </div>
        </div>
        <div className="full">
          <FormField
            label={fm({ id: 'category.create.type', defaultMessage: 'Type' })}
            htmlFor="cat-kind"
          >
            <div className="acct-edit-seg">
              {KIND_ORDER.map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`acct-edit-seg-btn${selectedKind === k ? ` on ${k}` : ''}`}
                  onClick={() => setSelectedKind(k)}
                >
                  {fm(labels[k])}
                </button>
              ))}
            </div>
          </FormField>
        </div>
        <div className="full">
          <FormField
            label={fm({ id: 'category.create.name', defaultMessage: 'Category name' })}
            htmlFor="cat-name"
          >
            <TextField
              id="cat-name"
              autoFocus
              value={name}
              placeholder={fm(placeholders[selectedKind])}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  save()
                }
              }}
            />
          </FormField>
        </div>
      </div>
    </Modal>
  )
}
