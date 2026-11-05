// budgetLens/proportional/SettingsModal.tsx — "Configure" for 50/30/20: the monthly net income (the
// Profile's — Outlook and FIRE read it too), which income categories count once a month closes,
// and each group's share of income (the groups are the book's Zero-Based groups, 2026-09-26) —
// Savings is what the shares leave. Edits are a draft; closing the modal saves whatever changed.
import { useState } from 'react'
import { useAppIntl } from '../../../../../i18n/useAppIntl'
import { Modal } from '../../../../ui'
import { getCurrencySymbol } from '../../../../../utils/format'
import { parseMoneyInput } from '../../planData'
import { Check } from '../MethodCard'
import { SAVE_COLOR, fmt } from './propMath'
import type { GroupFigures } from './propMath'
import type { PropIncomeCategory } from './propApi'

const Minus = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M2.5 6h7" />
  </svg>
)
const Plus = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M6 2.5v7M2.5 6h7" />
  </svg>
)

export interface SettingsResult {
  income: number
  /** Every group's share, in percent — null for none. */
  targets: Record<string, number | null>
  excluded: Record<string, boolean>
  /** Counted income category ids, or null when every one counts. */
  counted: string[] | null
}

export function SettingsModal({
  income,
  groups,
  incomeCategories,
  onClose,
}: {
  income: number
  groups: GroupFigures[]
  incomeCategories: PropIncomeCategory[]
  /** Called once, on close, with the edited settings. */
  onClose: (next: SettingsResult) => void
}) {
  const { formatMessage } = useAppIntl()
  // As typed — cents included — and parsed once, on close.
  const [inc, setInc] = useState(income ? String(income) : '')
  const [t, setT] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(groups.map((f) => [f.g.id, f.g.target])),
  )
  const [out, setOut] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((f) => [f.g.id, f.g.excluded])),
  )
  const [counts, setCounts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(incomeCategories.map((c) => [c.id, c.counted])),
  )
  const shared = groups.reduce((sum, f) => sum + (out[f.g.id] ? 0 : (t[f.g.id] ?? 0)), 0)
  const save = 100 - shared
  const monthly = parseMoneyInput(inc)
  const step = (id: string, dd: number) =>
    setT((cur) => {
      const next = Math.max(0, (cur[id] ?? 0) + dd)
      if (dd > 0 && shared + dd > 100) return cur
      return { ...cur, [id]: next || null }
    })
  const close = () => {
    const ids = incomeCategories.filter((c) => counts[c.id]).map((c) => c.id)
    onClose({
      income: monthly,
      targets: t,
      excluded: out,
      counted: ids.length === incomeCategories.length ? null : ids,
    })
  }
  return (
    <Modal
      open
      onClose={close}
      title={formatMessage({
        id: 'plan.configureProportional',
        defaultMessage: 'Configure 50/30/20',
      })}
    >
      <div className="pt-pop pt-set">
        <label className="pt-pop-f">
          <span>
            {formatMessage({ id: 'plan.monthlyNetIncome', defaultMessage: 'Monthly net income' })}
          </span>
          <span className="pt-inc">
            <b>{getCurrencySymbol()}</b>
            <input
              value={inc}
              placeholder="0"
              inputMode="decimal"
              aria-label={formatMessage({
                id: 'plan.monthlyNetIncome',
                defaultMessage: 'Monthly net income',
              })}
              onChange={(e) => setInc(e.target.value.replace(/[^0-9.]/g, ''))}
            />
          </span>
          <small className="pt-shared">
            {formatMessage({
              id: 'plan.monthlyIncomeProfileHelp',
              defaultMessage:
                'Your usual month. Saved to your Profile — also used by Outlook and FIRE',
            })}
          </small>
        </label>
        {incomeCategories.length > 0 && (
          <>
            <div className="pt-pop-k">
              {formatMessage({ id: 'plan.incomeCategories', defaultMessage: 'Income categories' })}
            </div>
            <div className="pt-incl">
              {incomeCategories.map((c) => (
                <label key={c.id} className="pt-incl-r">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={!!counts[c.id]}
                    aria-label={c.label}
                    className={'bo-check' + (counts[c.id] ? ' on' : '')}
                    onClick={() => setCounts((m) => ({ ...m, [c.id]: !m[c.id] }))}
                  >
                    {counts[c.id] && <Check size={11} />}
                  </button>
                  <i style={{ background: c.color }} />
                  <span className="n">{c.label}</span>
                  <span className="d">
                    {c.last_month > 0
                      ? formatMessage(
                          { id: 'plan.amountLastMonth', defaultMessage: '{amount} last month' },
                          { amount: fmt(c.last_month) },
                        )
                      : formatMessage({
                          id: 'plan.noTransactionsYet',
                          defaultMessage: 'no transactions yet',
                        })}
                  </span>
                </label>
              ))}
            </div>
            <p className="pt-shared">
              {formatMessage({
                id: 'plan.incomeCategoriesHelp',
                defaultMessage:
                  'When a month ends, its budget is measured against what arrived in these categories. During the month, your monthly net income is used.',
              })}
            </p>
          </>
        )}
        <div className="pt-pop-k">
          {formatMessage({
            id: 'plan.eachGroupShare',
            defaultMessage: 'Each group’s share of income',
          })}
        </div>
        <div className="pt-steps">
          {groups.map((f) => {
            const id = f.g.id
            const pct = t[id] ?? 0
            return (
              <div className={'pt-step' + (out[id] ? ' pt-step--out' : '')} key={id}>
                <i style={{ background: f.color }} />
                <span className="n">{f.g.name}</span>
                {out[id] ? (
                  <span className="v rest">
                    {formatMessage({ id: 'plan.excluded', defaultMessage: 'Excluded' })}
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      aria-label={formatMessage(
                        { id: 'plan.lowerNamed', defaultMessage: 'Lower {name}' },
                        { name: f.g.name },
                      )}
                      onClick={() => step(id, -5)}
                    >
                      <Minus />
                    </button>
                    <span className="v">{pct ? pct + '%' : '—'}</span>
                    <button
                      type="button"
                      aria-label={formatMessage(
                        { id: 'plan.raiseNamed', defaultMessage: 'Raise {name}' },
                        { name: f.g.name },
                      )}
                      onClick={() => step(id, 5)}
                    >
                      <Plus />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={!out[id]}
                  aria-label={formatMessage(
                    { id: 'plan.countNamed', defaultMessage: 'Count {name} in the split' },
                    { name: f.g.name },
                  )}
                  title={
                    out[id]
                      ? formatMessage({
                          id: 'plan.countSplit',
                          defaultMessage: 'Count in the split',
                        })
                      : formatMessage({
                          id: 'plan.excludeSplit',
                          defaultMessage: 'Exclude from the split',
                        })
                  }
                  className={'bo-check pt-step-in' + (out[id] ? '' : ' on')}
                  onClick={() => setOut((m) => ({ ...m, [id]: !m[id] }))}
                >
                  {!out[id] && <Check size={11} />}
                </button>
              </div>
            )
          })}
          <div className="pt-step">
            <i style={{ background: SAVE_COLOR }} />
            <span className="n">
              {formatMessage({ id: 'plan.savings', defaultMessage: 'Savings' })}
            </span>
            <span className="v rest">
              {save}%{monthly > 0 ? ' · ' + fmt((monthly * save) / 100) : ''}
            </span>
          </div>
        </div>
        <p className="pt-shared">
          {formatMessage({
            id: 'plan.groupSplitHelp',
            defaultMessage:
              'A group with no target is still counted: its spending reduces your savings. Excluded groups sit outside the split entirely (a one-off, a commitment).',
          })}
        </p>
      </div>
    </Modal>
  )
}
