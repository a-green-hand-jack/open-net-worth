// Overview v2 — the per-widget "Set alert…" dialog (kebab menu → Set alert…).
// A small confirm dialog: "Notify me when it [op] [value]" → `alert = {op,
// value}` on the instance. UI-only front-end mock — no evaluation engine
// behind it yet, matching the handoff's own documented scope (see the ADR's
// decision 6 / PARITY_AND_GAPS.md).

import { useState } from 'react'
import { Button, Modal, NumberField, Select } from '../../ui'
import type { WidgetAlert } from './types'
import { useAppIntl } from '../../../i18n/useAppIntl'

const OPS: WidgetAlert['op'][] = ['>', '<', '>=', '<=', '==']

export interface WidgetAlertDialogProps {
  open: boolean
  onClose: () => void
  alert: WidgetAlert | null | undefined
  onSave: (alert: WidgetAlert | null) => void
}

export function WidgetAlertDialog({ open, onClose, alert, onSave }: WidgetAlertDialogProps) {
  const { formatMessage } = useAppIntl()
  const labels: Record<WidgetAlert['op'], string> = {
    '>': formatMessage({ id: 'overview.alert.greater', defaultMessage: 'is greater than' }),
    '<': formatMessage({ id: 'overview.alert.less', defaultMessage: 'is less than' }),
    '>=': formatMessage({ id: 'overview.alert.atLeast', defaultMessage: 'is at least' }),
    '<=': formatMessage({ id: 'overview.alert.atMost', defaultMessage: 'is at most' }),
    '==': formatMessage({ id: 'overview.alert.equals', defaultMessage: 'equals' }),
  }
  const [op, setOp] = useState<WidgetAlert['op']>(alert?.op || '>')
  const [value, setValue] = useState<string>(alert?.value != null ? String(alert.value) : '')

  const save = () => {
    const n = Number(value)
    if (!value.trim() || !isFinite(n)) return
    onSave({ op, value: n })
    onClose()
  }
  const remove = () => {
    onSave(null)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formatMessage({ id: 'overview.alert.title', defaultMessage: 'Set alert' })}
      size="sm"
    >
      <div className="ov-alert-dialog">
        <p className="ov-alert-copy">
          {formatMessage({
            id: 'overview.alert.help',
            defaultMessage: 'Lucius pings you when this crosses your threshold.',
          })}
        </p>
        <div className="ov-alert-row">
          <span>
            {formatMessage({ id: 'overview.alert.notify', defaultMessage: 'Notify me when it' })}
          </span>
          <Select
            aria-label={formatMessage({
              id: 'overview.alert.comparison',
              defaultMessage: 'Comparison',
            })}
            value={op}
            onChange={(e) => setOp(e.target.value as WidgetAlert['op'])}
            options={OPS.map((value) => ({ value, label: labels[value] }))}
          />
          <NumberField
            aria-label={formatMessage({
              id: 'overview.alert.threshold',
              defaultMessage: 'Threshold value',
            })}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="ov-alert-actions">
          {alert && (
            <Button size="sm" variant="ghost" onClick={remove}>
              {formatMessage({ id: 'overview.alert.remove', defaultMessage: 'Remove alert' })}
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={onClose}>
            {formatMessage({ id: 'overview.cancel', defaultMessage: 'Cancel' })}
          </Button>
          <Button size="sm" variant="primary" onClick={save} disabled={!value.trim()}>
            {formatMessage({ id: 'overview.save', defaultMessage: 'Save' })}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
