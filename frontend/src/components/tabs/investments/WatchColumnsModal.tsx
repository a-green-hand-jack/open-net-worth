// WatchColumnsModal — Manage Columns for the Watchlist table: tick a column on (it joins the end)
// or off, grouped the way a broker groups them; the shown columns can be nudged left/right.

import { Button, Checkbox, Modal } from '../../ui'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { watchColumnLabel, watchGroupLabel } from './watchColumnMessages'
import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import {
  DEFAULT_WATCH_COLUMNS,
  WATCH_COLUMN_GROUPS,
  WATCH_COLUMNS,
  columnsFor,
} from './watchColumns'

interface Props {
  open: boolean
  value: string[]
  onChange: (keys: string[]) => void
  onClose: () => void
}

export function WatchColumnsModal({ open, value, onChange, onClose }: Props) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key])
  const move = (i: number, by: -1 | 1) => {
    const next = [...value]
    const j = i + by
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    onChange(next)
  }
  const shown = columnsFor(value)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={formatMessage({ id: 'watchColumns.manage', defaultMessage: 'Manage columns' })}
      subtitle={formatMessage({
        id: 'watchColumns.subtitle',
        defaultMessage: 'Instrument is always shown first.',
      })}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_WATCH_COLUMNS)}>
            {formatMessage({ id: 'watchColumns.reset', defaultMessage: 'Reset to default' })}
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            {formatMessage({ id: 'watchColumns.done', defaultMessage: 'Done' })}
          </Button>
        </>
      }
    >
      <div className="mk-wcols">
        <section>
          <h4 className="mk-wcols-h">
            {formatMessage({ id: 'watchColumns.shown', defaultMessage: 'Shown, in order' })}
          </h4>
          {shown.length === 0 ? (
            <p className="mk-wcols-empty">
              {formatMessage({
                id: 'watchColumns.empty',
                defaultMessage: 'No columns — tick some below.',
              })}
            </p>
          ) : (
            <ol className="mk-wcols-order">
              {shown.map((c, i) => (
                <li key={c.key} className="mk-wcols-chip">
                  <button
                    type="button"
                    aria-label={formatMessage(
                      { id: 'watchColumns.left', defaultMessage: 'Move {name} left' },
                      { name: watchColumnLabel(c.key, c.label, intl) },
                    )}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ChevronLeft size={13} aria-hidden="true" />
                  </button>
                  <span>{watchColumnLabel(c.key, c.label, intl)}</span>
                  <button
                    type="button"
                    aria-label={formatMessage(
                      { id: 'watchColumns.right', defaultMessage: 'Move {name} right' },
                      { name: watchColumnLabel(c.key, c.label, intl) },
                    )}
                    disabled={i === shown.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ChevronRight size={13} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
        {WATCH_COLUMN_GROUPS.map((g) => (
          <section key={g}>
            <h4 className="mk-wcols-h">{watchGroupLabel(g, intl)}</h4>
            <div className="mk-wcols-grid">
              {WATCH_COLUMNS.filter((c) => c.group === g).map((c) => (
                <Checkbox
                  key={c.key}
                  id={`wcol-${c.key}`}
                  label={watchColumnLabel(c.key, c.label, intl)}
                  checked={value.includes(c.key)}
                  onChange={() => toggle(c.key)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  )
}
