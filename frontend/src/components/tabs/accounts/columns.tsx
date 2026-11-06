/**
 * columns.tsx — Register column-visibility model + the "Display" toolbar picker (columns, and
 * whether hidden transactions are listed).
 *
 * Mirrors the width-persistence pattern in Register.tsx (localStorage `acctColW_v1`):
 * here `acctColVis_v1` stores the HIDDEN set (an array of column keys), so a column
 * added later defaults VISIBLE (absence = shown). cb/clr/amount are structural and can
 * never be hidden — they never enter the set. The picker renders adjacent to the
 * date-range + Add-transaction controls (see SearchFilter.tsx `Filters`).
 */

import { useState, useRef, useEffect } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useRegisterColumnLabel } from './useRegisterColumnLabel'
import { REG_COLS, type RegCol } from './Register'
import { AdvCheck } from './pickers'
import { SlidersHorizontal } from '../../../ui/icons'

export const REG_VIS_KEY = 'acctColVis_v1'

// Always-visible, never offered in the picker (structural: the select box, the cleared
// toggle, and the amount are the register's spine).
export const FIXED_COL_KEYS = new Set(['cb', 'clr', 'amount'])

/** The columns a user may toggle — everything but the fixed spine, and `account`
 *  only in the all-accounts view (it's `accountOnly`). REG_COLS order preserved. */
export function toggleableCols(showAccount: boolean): RegCol[] {
  return REG_COLS.filter((c) => !FIXED_COL_KEYS.has(c.key) && (!c.accountOnly || showAccount))
}

export function loadHiddenCols(): Set<string> {
  try {
    const arr = JSON.parse(localStorage.getItem(REG_VIS_KEY) || '[]')
    // Defensive: ignore non-strings and any fixed key that shouldn't be persisted as hidden.
    return new Set(
      Array.isArray(arr) ? arr.filter((k) => typeof k === 'string' && !FIXED_COL_KEYS.has(k)) : [],
    )
  } catch {
    return new Set()
  }
}

function saveHiddenCols(hidden: Set<string>) {
  try {
    localStorage.setItem(REG_VIS_KEY, JSON.stringify([...hidden]))
  } catch {
    /* localStorage unavailable (private mode / quota) — visibility just isn't persisted. */
  }
}

export interface ColumnVisibility {
  hidden: Set<string>
  toggle: (key: string) => void
  reset: () => void
}

/** Owns the hidden-set + its persistence. Called once by AccountsTab; `hidden` flows to
 *  the Register (which filters `cols`), `toggle`/`reset` to the ColumnsPicker. */
export function useColumnVisibility(): ColumnVisibility {
  const [hidden, setHidden] = useState<Set<string>>(loadHiddenCols)
  const toggle = (key: string) =>
    setHidden((prev) => {
      if (FIXED_COL_KEYS.has(key)) return prev // structural columns can't be hidden
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      saveHiddenCols(next)
      return next
    })
  const reset = () =>
    setHidden((prev) => {
      if (prev.size === 0) return prev
      const next = new Set<string>()
      saveHiddenCols(next)
      return next
    })
  return { hidden, toggle, reset }
}

// ── ColumnsPicker ──────────────────────────────────────────────────────────

export interface ColumnsPickerProps {
  showAccount: boolean
  hidden: Set<string>
  onToggle: (key: string) => void
  onReset: () => void
  /** Rows: list hidden transactions too (dimmed). Omitted, the Rows section isn't offered. */
  showHidden?: boolean
  onToggleShowHidden?: () => void
}

export function ColumnsPicker({
  showAccount,
  hidden,
  onToggle,
  onReset,
  showHidden = false,
  onToggleShowHidden,
}: ColumnsPickerProps) {
  const { formatMessage } = useAppIntl()
  const columnLabel = useRegisterColumnLabel()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  })
  const cols = toggleableCols(showAccount)
  // "Hidden" only counts columns currently on offer — a key persisted from the all-accounts
  // view (e.g. a hidden `account`) shouldn't light up the button while a single account is open.
  const hiddenCount = cols.filter((c) => hidden.has(c.key)).length
  const isDefault = hiddenCount === 0 && !showHidden
  // Back to defaults: every column, hidden rows left out. Not "Show all" — beside "Show hidden
  // transactions" that read as if it would list the hidden rows too.
  const reset = () => {
    onReset()
    if (showHidden) onToggleShowHidden?.()
  }
  return (
    <div className="acct-advwrap" ref={ref}>
      <button
        className={'acct-advbtn acct-colbtn' + (isDefault ? '' : ' on')}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={formatMessage({ id: 'accounts.displayOptions', defaultMessage: 'Display options' })}
      >
        <SlidersHorizontal size={14} aria-hidden="true" />
        <span className="acct-viewlbl">
          {formatMessage({ id: 'accounts.display', defaultMessage: 'Display' })}
        </span>
      </button>
      {open && (
        <div
          className="acct-advpop acct-colpop"
          role="dialog"
          aria-label={formatMessage({
            id: 'accounts.displayOptions',
            defaultMessage: 'Display options',
          })}
        >
          <div className="acct-advbody">
            <div className="acct-advgroup">
              <div className="acct-advsec">
                {formatMessage({ id: 'accounts.columns', defaultMessage: 'Columns' })}
              </div>
              {cols.map((c) => (
                <AdvCheck key={c.key} checked={!hidden.has(c.key)} onChange={() => onToggle(c.key)}>
                  {columnLabel(c.key, c.label || c.key)}
                </AdvCheck>
              ))}
            </div>
            {onToggleShowHidden && (
              <div className="acct-advgroup">
                <div className="acct-advsec">
                  {formatMessage({ id: 'accounts.rows', defaultMessage: 'Rows' })}
                </div>
                <AdvCheck checked={showHidden} onChange={onToggleShowHidden}>
                  {formatMessage({
                    id: 'accounts.showHidden',
                    defaultMessage: 'Show hidden transactions',
                  })}
                </AdvCheck>
              </div>
            )}
          </div>
          <div className="acct-advfoot">
            <button className="acct-advclear" onClick={reset} disabled={isDefault}>
              {formatMessage({ id: 'accounts.reset', defaultMessage: 'Reset' })}
            </button>
            <button className="acct-advdone" onClick={() => setOpen(false)}>
              {formatMessage({ id: 'accounts.done', defaultMessage: 'Done' })}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
