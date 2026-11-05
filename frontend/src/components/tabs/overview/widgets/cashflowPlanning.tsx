import { fFixed } from '../../../../utils/format'
// Overview v2 — Cash-flow + Planning widget group: spending pulse, cash flow,
// calendar, goals, crossover point, FIRE projection, cash-flow runway. Ported
// from the handoff's `overview_v2b/widgets2.jsx` (Spending/Cashflow/Goals/
// CalendarCard/Crossover) and the Planning-shape widgets in `insights.jsx`
// (FireProjection/CashRunway, renamed here plan-fire/plan-runway per the
// registry).
//
// Data: `GET /api/overview/budget` (envelopes, goals, the day-by-day calendar, the month's
// cash flow) and `GET /api/overview/projections` (passive-income coverage, the cash-runway
// depletion curve), plus `/api/fire` for the FIRE year. Every money figure arrives already
// summed, differenced and divided — this file does no arithmetic on money
// (ADR 2026-07-31-overview-aggregates-are-server-computed). It previously folded raw
// transactions into calendar days, divided an annual forecast by 12, and built the runway
// curve point by point.
//
// Every widget renders through WidgetShell (title/base/meta/actions/footer)
// so rename/accent/kebab chrome behaves identically to every other widget.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType, ReactNode, RefObject, SyntheticEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { fBase, fBaseCompact, fDate, fMonth } from '../../../../utils/format'
import { Badge, Money, Skeleton, Text } from '../../../ui'
import type { WidgetContentProps } from '../types'
import { WidgetShell } from '../WidgetShell'
import { rowCap } from '../widgetDisplayShared'
import { useAnalytics } from '../useWidgetData'
import { WidgetPlaceholder } from '../WidgetPlaceholder'
import { OvChart, TICK, GRID, amountsHidden, areaFill, kTick, resolveColor } from '../charts'
import { useFire } from '../../../../hooks/useFire'
import { usePlanningSummary, useCashflowProjections } from '../../../../hooks/serverState'
import type { PlanningSummary } from '../../../../types/aggregates'

// ── shared: small icons + a footer "All X →" link ───────────────────────────

function ArrowIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function ChevronIcon({ dir }: { dir: -1 | 1 }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={dir < 0 ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

function FooterLink({
  label,
  tab,
  onNavigate,
}: {
  label: string
  tab?: string
  onNavigate?: (tab: string) => void
}) {
  if (!onNavigate || !tab) return null
  return (
    <button type="button" className="ov-panel-link" onClick={() => onNavigate(tab)}>
      {label}
      <ArrowIcon />
    </button>
  )
}

// ── Spending pulse (budget envelopes, month to date) ────────────────────────
// GET /api/planning/month — one row per non-archived envelope with assigned
// (this month's budget)/activity (negative = spent)/available.

// Envelope rows, the month totals, the pace/percent-of-budget figures and each bar's fill
// all come from `GET /api/overview/budget` — see
// ADR 2026-07-31-overview-aggregates-are-server-computed.

const Spending: ComponentType<WidgetContentProps> = ({ instance, def, onNavigate }) => {
  const { formatMessage } = useAppIntl()
  const budget = usePlanningSummary()
  const data = budget.data ?? null
  const loading = budget.initialLoading
  const error = !!budget.error && data == null
  const footer = (
    <FooterLink
      label={formatMessage({
        id: 'overview.spending.allEnvelopes',
        defaultMessage: 'All envelopes',
      })}
      tab={def.source?.tab}
      onNavigate={onNavigate}
    />
  )

  if (loading) {
    return (
      <WidgetShell title={instance.title} base={def.title} footer={footer}>
        <Skeleton height={44} />
      </WidgetShell>
    )
  }
  if (error || !data) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.spending.error',
            defaultMessage: "Couldn't load this month's budget — try reloading.",
          })}
        />
      </WidgetShell>
    )
  }

  const rows = data.envelopes.rows
  const totalSpent = data.envelopes.total_spent
  const budgetedSpent = data.envelopes.budgeted_spent ?? 0
  const budgetedTotal = data.envelopes.budgeted_total ?? 0
  const pace = Math.round(data.pace_pct)
  const pctOfBudget = Math.round(data.envelopes.pct_of_budget)
  // Budgeted spend against budgets — like for like. All spend over the budgeted total read
  // "369% of budget" when the only budgets were savings envelopes.
  const budgetLine =
    budgetedTotal > 0
      ? formatMessage(
          {
            id: 'overview.spending.budgetLine',
            defaultMessage: '{spent} of {total} budgeted ({percent}%)',
          },
          { spent: fBase(budgetedSpent), total: fBase(budgetedTotal), percent: pctOfBudget },
        )
      : formatMessage({ id: 'overview.spending.noBudgets', defaultMessage: 'No budgets set' })

  const cap = rowCap(instance, def) ?? undefined
  const visible = cap ? rows.slice(0, cap) : rows
  const extra = rows.length - visible.length

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      meta={
        <>
          {formatMessage(
            { id: 'overview.spending.spent', defaultMessage: '{amount} spent' },
            { amount: <Money as="span">{fBase(totalSpent)}</Money> },
          )}
        </>
      }
      subtitle={formatMessage(
        {
          id: 'overview.spending.subtitle',
          defaultMessage: 'Month to date • {budget} • {pace}% through the month',
        },
        { budget: budgetLine, pace },
      )}
      footer={footer}
    >
      {visible.length ? (
        <>
          {visible.map((r) => {
            const budgeted = r.assigned > 0
            return (
              <div className="ov-env-row" key={r.key}>
                <span className="ov-env-nm">{r.label}</span>
                <span className="ov-env-bar">
                  {budgeted && (
                    <span
                      className="ov-env-fill"
                      style={{
                        width: `${r.fill_pct}%`,
                        background: r.over ? 'var(--bad)' : 'var(--accent)',
                      }}
                    />
                  )}
                </span>
                <span className="ov-env-amt">
                  <Money as="span">{fBase(r.spent)}</Money>{' '}
                  <span>
                    {budgeted
                      ? `/ ${fBase(r.assigned)}`
                      : formatMessage({
                          id: 'overview.spending.noBudget',
                          defaultMessage: '· no budget',
                        })}
                  </span>
                </span>
              </div>
            )
          })}
          {extra > 0 && (
            <div className="ov-more">
              {formatMessage(
                {
                  id: 'overview.spending.more',
                  defaultMessage:
                    '+{count, plural, one {# more envelope} other {# more envelopes}}',
                },
                { count: extra },
              )}
            </div>
          )}
        </>
      ) : (
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.spending.empty',
            defaultMessage: 'No budget activity yet this month.',
          })}
        />
      )}
    </WidgetShell>
  )
}

// ── Cash flow this month (money in vs out, P&L) ─────────────────────────────
// GET /api/ledger/summary — income in / expense out for the current month,
// recomputed into the current base currency (transfers/adjustments excluded).

const Cashflow: ComponentType<WidgetContentProps> = ({ instance, def }) => {
  const { formatMessage } = useAppIntl()
  const budget = usePlanningSummary()
  const data = budget.data?.cashflow ?? null
  const loading = budget.initialLoading
  const error = !!budget.error && data == null

  if (loading) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <Skeleton height={64} />
      </WidgetShell>
    )
  }
  if (error || !data) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.cashflow.error',
            defaultMessage: "Couldn't load this month's cash flow.",
          })}
        />
      </WidgetShell>
    )
  }

  // A month with no money yet shows the newest one that has some, and says so — "0 in, 0 out"
  // beside a full September read as a broken import (persona QA round 7).
  const fellBack = data.in_count + data.out_count === 0 ? budget.data?.cashflow_latest : null
  const shown = fellBack ?? data
  const max = shown.max
  const inCount = shown.in_count
  const outCount = shown.out_count

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      // The figure comes FIRST, "net" label after — `.ov-t-meta` ellipsizes
      // from the END when space runs out, so this ordering guarantees the
      // actual number survives truncation instead of the filler word.
      meta={
        <>
          <Text tone={shown.net >= 0 ? 'good' : 'bad'} weight={700}>
            {shown.net >= 0 ? '+' : '−'}
            <Money as="span">{fBaseCompact(Math.abs(shown.net))}</Money>
          </Text>{' '}
          {formatMessage({ id: 'overview.cashflow.netLower', defaultMessage: 'net' })}
        </>
      }
    >
      {fellBack && (
        <Text as="p" size="xs" tone="muted" className="ov-rep-note">
          {formatMessage(
            {
              id: 'overview.cashflow.fallback',
              defaultMessage: '{previous}. Nothing yet in {current}.',
            },
            {
              previous: fMonth(fellBack.month, 'long'),
              current: fMonth(budget.data!.month, 'long'),
            },
          )}
        </Text>
      )}
      <div className="ov-cf-row ov-responsive-metric-row">
        <span className="ov-cf-lbl">
          {formatMessage({ id: 'overview.cashflow.in', defaultMessage: 'In' })}
        </span>
        <span className="ov-cf-bar ov-responsive-metric-bar">
          <span
            className="ov-cf-fill"
            style={{ width: `${(shown.total_in / max) * 100}%`, background: 'var(--good)' }}
          />
        </span>
        <span className="ov-cf-amt ov-responsive-metric-amount">
          <Money as="span">{fBaseCompact(shown.total_in)}</Money>
        </span>
      </div>
      <div className="ov-cf-sub ov-responsive-metric-detail">
        {formatMessage(
          {
            id: 'overview.cashflow.inCount',
            defaultMessage:
              '{count, plural, one {# income transaction} other {# income transactions}}',
          },
          { count: inCount },
        )}
      </div>
      <div className="ov-cf-row ov-responsive-metric-row">
        <span className="ov-cf-lbl">
          {formatMessage({ id: 'overview.cashflow.out', defaultMessage: 'Out' })}
        </span>
        <span className="ov-cf-bar ov-responsive-metric-bar">
          <span
            className="ov-cf-fill"
            style={{ width: `${(shown.total_out / max) * 100}%`, background: 'var(--bad)' }}
          />
        </span>
        <span className="ov-cf-amt ov-responsive-metric-amount">
          <Money as="span">{fBaseCompact(shown.total_out)}</Money>
        </span>
      </div>
      <div className="ov-cf-sub ov-responsive-metric-detail">
        {formatMessage(
          {
            id: 'overview.cashflow.outCount',
            defaultMessage:
              '{count, plural, one {# expense transaction} other {# expense transactions}}',
          },
          { count: outCount },
        )}
      </div>
    </WidgetShell>
  )
}

// ── Calendar card (money in/out by day this month) ──────────────────────────
// GET /api/transactions?date_from=&date_to= — the register's own filtered
// list, bucketed client-side by day (no day-granular endpoint exists).

interface CalendarDayModel {
  day: number
  date: Date
  inAmt: number
  outAmt: number
  /** Server-computed in − out for the day. */
  net: number
  isToday: boolean
}

interface CalendarModel {
  label: string
  isCurrent: boolean
  startDow: number
  days: CalendarDayModel[]
  totalIn: number
  totalOut: number
}

function ymOffset(offset: number): string {
  const first = new Date()
  first.setDate(1)
  first.setMonth(first.getMonth() + offset)
  return `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`
}

/** Lay the server's per-day in/out figures onto a calendar grid. No money is derived here —
 *  the amounts, the month totals and the weekday offset all arrive computed. */
function buildCalendarModel(
  ym: string,
  calendar: PlanningSummary['calendar'] | null,
): CalendarModel {
  const [y, m1] = ym.split('-').map(Number) as [number, number]
  const m = m1 - 1
  const today = new Date()
  const isCurrent = today.getFullYear() === y && today.getMonth() === m
  return {
    label: fMonth(new Date(y, m, 1)),
    isCurrent,
    startDow: calendar?.first_weekday ?? new Date(y, m, 1).getDay(),
    days: (calendar?.days ?? []).map((d) => ({
      day: d.day,
      date: new Date(y, m, d.day),
      inAmt: d.in,
      outAmt: d.out,
      net: d.net,
      isToday: isCurrent && d.day === today.getDate(),
    })),
    totalIn: calendar?.total_in ?? 0,
    totalOut: calendar?.total_out ?? 0,
  }
}

interface CalendarHover {
  d: CalendarDayModel
  left: number
  top: number
  above: boolean
}

// The popover's footprint, used to pick a side and keep it on screen (viewport px).
const CAL_POP_HALF_W = 100
const CAL_POP_H = 180

function CalendarPopover({
  hover,
  pinned,
  onOpenRegister,
  popRef,
  onPointerStay,
  onPointerLeave,
}: {
  hover: CalendarHover
  /** True for a tap-pinned popover (dismissed by the scrim) — false for the mouse-hover one,
   *  which stays open while the pointer is over it so "Open in register" is reachable. */
  pinned?: boolean
  onOpenRegister?: () => void
  popRef?: RefObject<HTMLDivElement | null>
  onPointerStay?: () => void
  onPointerLeave?: () => void
}) {
  const { formatMessage, locale } = useAppIntl()
  const net = hover.d.net
  const hasActivity = hover.d.inAmt > 0 || hover.d.outAmt > 0
  // A body portal at fixed viewport coordinates: the widget body clips to its own scroll box
  // (overview.css), and a popover above a top-row day was losing its header to that clip.
  return createPortal(
    <div
      ref={popRef}
      className={`ov-cal-pop${hover.above ? ' ov-cal-pop--above' : ''}`}
      data-pinned={pinned || undefined}
      style={{ left: hover.left, top: hover.top }}
      onMouseEnter={onPointerStay}
      onMouseLeave={onPointerLeave}
    >
      <div className="ov-cal-pop-d">
        {hover.d.date.toLocaleDateString(locale, { weekday: 'short' })}, {fDate(hover.d.date)}
      </div>
      {hover.d.inAmt > 0 && (
        <div className="ov-cal-pop-row">
          <span className="ov-cal-pop-dot ov-cal-pop-dot--in" />
          {formatMessage({ id: 'overview.calendar.moneyIn', defaultMessage: 'Money in' })}
          <b>
            +<Money as="span">{fBase(hover.d.inAmt)}</Money>
          </b>
        </div>
      )}
      {hover.d.outAmt > 0 && (
        <div className="ov-cal-pop-row">
          <span className="ov-cal-pop-dot ov-cal-pop-dot--out" />
          {formatMessage({ id: 'overview.calendar.moneyOut', defaultMessage: 'Money out' })}
          <b>
            −<Money as="span">{fBase(hover.d.outAmt)}</Money>
          </b>
        </div>
      )}
      {hasActivity ? (
        <div className="ov-cal-pop-net">
          {formatMessage({ id: 'overview.calendar.net', defaultMessage: 'Net' })}
          <b>
            {net >= 0 ? '+' : '−'}
            <Money as="span">{fBase(Math.abs(net))}</Money>
          </b>
        </div>
      ) : (
        pinned && (
          <Text as="p" size="sm" tone="faint">
            {formatMessage({
              id: 'overview.calendar.noTransactions',
              defaultMessage: 'No transactions.',
            })}
          </Text>
        )
      )}
      {onOpenRegister && (
        <button type="button" className="ov-panel-link" onClick={onOpenRegister}>
          {formatMessage({
            id: 'overview.calendar.openRegister',
            defaultMessage: 'Open in register',
          })}
        </button>
      )}
    </div>,
    document.body,
  )
}

const Calendar: ComponentType<WidgetContentProps> = ({ instance, def, onOpenRegister }) => {
  const { formatMessage, locale } = useAppIntl()
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2024, 0, 7 + i)),
    ),
  )
  const [offset, setOffset] = useState(0)
  const [hover, setHover] = useState<CalendarHover | null>(null)
  // Tap/click-pinned popover — separate from `hover` so a tap survives the day button losing
  // focus (a mouse-only hover would otherwise be dismissed by its own onBlur before the
  // popover's "Open in register" button's click ever fires). Dismissed by re-tapping the same
  // day, tapping another day, or tapping the scrim outside it — never by blur.
  const [pinned, setPinned] = useState<CalendarHover | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const leaveTimer = useRef<number | null>(null)
  const ym = ymOffset(offset)
  const budget = usePlanningSummary(ym)
  const loading = budget.initialLoading
  const error = !!budget.error && budget.data == null
  const calendar = budget.data?.calendar ?? null
  const model = useMemo(() => buildCalendarModel(ym, calendar), [ym, calendar])

  // The popover is a fixed-position body portal, so it is placed in VIEWPORT coordinates and
  // sits flush against the day (no gap): the pointer must be able to travel from the cell
  // straight into it without crossing the row above, whose own mouseenter would swap or
  // clear the hover.
  const cellPos = (e: SyntheticEvent<HTMLButtonElement>, d: CalendarDayModel): CalendarHover => {
    const cell = e.currentTarget.getBoundingClientRect()
    const left = Math.max(
      CAL_POP_HALF_W + 8,
      Math.min(cell.left + cell.width / 2, window.innerWidth - CAL_POP_HALF_W - 8),
    )
    const above = cell.top > CAL_POP_H + 8
    return { d, left, top: above ? cell.top : cell.bottom, above }
  }

  const cancelLeave = () => {
    if (leaveTimer.current != null) {
      window.clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
  }
  // Leaving the grid schedules the dismissal instead of firing it: the popover is not a DOM
  // descendant of the grid (it is portalled), so moving the mouse INTO it leaves the grid.
  // Its own mouseenter cancels the timer.
  const scheduleLeave = () => {
    cancelLeave()
    leaveTimer.current = window.setTimeout(() => setHover(null), 150)
  }
  useEffect(() => cancelLeave, [])

  // Fixed coordinates go stale the moment anything scrolls or resizes — dismiss rather than
  // drift.
  useEffect(() => {
    if (!hover && !pinned) return
    const dismiss = () => {
      setHover(null)
      setPinned(null)
    }
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    return () => {
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [hover, pinned])

  const onEnter = (e: SyntheticEvent<HTMLButtonElement>, d: CalendarDayModel) => {
    cancelLeave()
    if (!d.inAmt && !d.outAmt) {
      setHover(null)
      return
    }
    setHover(cellPos(e, d))
  }

  const openRegisterFor = (h: CalendarHover) =>
    onOpenRegister &&
    (() => {
      onOpenRegister({ dateOn: `${ym}-${String(h.d.day).padStart(2, '0')}` })
      setPinned(null)
      setHover(null)
    })

  const onTap = (e: SyntheticEvent<HTMLButtonElement>, d: CalendarDayModel) => {
    // `cellPos` reads `e.currentTarget` — must resolve it HERE, synchronously, while the
    // synthetic event is still valid. A functional setState updater is not guaranteed to run
    // within that window (e.g. under StrictMode's double-invocation), so passing `e` into one
    // and calling `cellPos` from inside it crashes on the second, deferred call.
    const pos = cellPos(e, d)
    setPinned((p) => (p && p.d === d ? null : pos))
  }

  const nav = (
    <div className="ov-cal-navwrap">
      <button
        type="button"
        className="ov-cal-nav"
        aria-label={formatMessage({
          id: 'overview.calendar.previous',
          defaultMessage: 'Previous month',
        })}
        onClick={() => {
          setHover(null)
          setPinned(null)
          setOffset((o) => o - 1)
        }}
      >
        <ChevronIcon dir={-1} />
      </button>
      <button
        type="button"
        className="ov-cal-month"
        title={formatMessage({
          id: 'overview.calendar.back',
          defaultMessage: 'Back to this month',
        })}
        onClick={() => {
          setHover(null)
          setPinned(null)
          setOffset(0)
        }}
      >
        {model.label}
        {!model.isCurrent && <span className="ov-cal-dotmark" aria-hidden="true" />}
      </button>
      <button
        type="button"
        className="ov-cal-nav"
        aria-label={formatMessage({ id: 'overview.calendar.next', defaultMessage: 'Next month' })}
        onClick={() => {
          setHover(null)
          setPinned(null)
          setOffset((o) => o + 1)
        }}
      >
        <ChevronIcon dir={1} />
      </button>
    </div>
  )

  const meta =
    model.totalIn || model.totalOut ? (
      <>
        <Text tone="good" weight={600}>
          +<Money as="span">{fBaseCompact(model.totalIn)}</Money>
        </Text>{' '}
        <Text tone="bad" weight={600}>
          −<Money as="span">{fBaseCompact(model.totalOut)}</Money>
        </Text>
      </>
    ) : undefined

  return (
    <WidgetShell title={instance.title} base={def.title} meta={meta} subhead={nav}>
      {loading ? (
        <Skeleton height={180} />
      ) : error ? (
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.calendar.error',
            defaultMessage: "Couldn't load this month's transactions.",
          })}
        />
      ) : (
        <div className="ov-cal-wrap" ref={wrapRef} onMouseLeave={scheduleLeave}>
          <div className="ov-cal">
            {weekdays.map((d, i) => (
              <span key={`h${i}`} className="ov-cal-dow">
                {d}
              </span>
            ))}
            {Array.from({ length: model.startDow }).map((_, i) => (
              <span key={`b${i}`} className="ov-cal-pad" />
            ))}
            {model.days.map((d) => {
              const active = d.inAmt > 0 || d.outAmt > 0
              const isHot = hover?.d === d || pinned?.d === d
              const cls =
                'ov-cal-cell' +
                (d.isToday ? ' ov-cal-cell--today' : '') +
                (active ? ' ov-cal-cell--has' : '') +
                (isHot ? ' ov-cal-cell--hot' : '')
              return (
                <button
                  key={d.day}
                  type="button"
                  className={cls}
                  onMouseEnter={(e) => onEnter(e, d)}
                  onFocus={(e) => onEnter(e, d)}
                  onBlur={(e) => {
                    // Focus moving INTO the popover (its "Open in register" button) must not
                    // dismiss it — that blur fires before the button's own click ever can.
                    if (!popRef.current?.contains(e.relatedTarget as Node | null)) setHover(null)
                  }}
                  onClick={(e) => onTap(e, d)}
                >
                  <span className="ov-cal-day">{d.day}</span>
                  <span className="ov-cal-dots">
                    {d.inAmt > 0 && <i className="ov-cal-dot ov-cal-dot--in" />}
                    {d.outAmt > 0 && <i className="ov-cal-dot ov-cal-dot--out" />}
                  </span>
                </button>
              )
            })}
          </div>
          {pinned &&
            createPortal(
              <span
                className="info-pop-scrim ov-cal-scrim"
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setPinned(null)
                }}
              />,
              document.body,
            )}
          {/* ONE popover for hover and pin: a click on the hovered day used to swap the hover
              popover for a separate pinned one, remounting it — it vanished and reappeared. */}
          {(pinned ?? hover) && (
            <CalendarPopover
              hover={(pinned ?? hover)!}
              pinned={!!pinned}
              popRef={pinned ? undefined : popRef}
              onPointerStay={pinned ? undefined : cancelLeave}
              onPointerLeave={pinned ? undefined : () => setHover(null)}
              onOpenRegister={openRegisterFor((pinned ?? hover)!)}
            />
          )}
        </div>
      )}
    </WidgetShell>
  )
}

// ── Goals (the user's savings goals + dated envelope targets) ───────────────
// Goals ("save X by date Y", services/targets) hydrated into base currency, plus any
// `by_date` envelope target (needs_whole_amount picks contributions vs balance).

const Goals: ComponentType<WidgetContentProps> = ({ instance, def, onNavigate }) => {
  const { formatMessage } = useAppIntl()
  // Progress per dated target — including the `needs_whole_amount` flavor rule that picks
  // contributions-to-date vs balance, and the completion percentage — is server-computed.
  const budget = usePlanningSummary()
  const data = budget.data ?? null
  const loading = budget.initialLoading
  const error = !!budget.error && data == null
  const footer = (
    <FooterLink
      label={formatMessage({ id: 'overview.goals.all', defaultMessage: 'All goals' })}
      tab={def.source?.tab}
      onNavigate={onNavigate}
    />
  )

  if (loading) {
    return (
      <WidgetShell title={instance.title} base={def.title} footer={footer}>
        <Skeleton height={64} />
      </WidgetShell>
    )
  }
  if (error || !data) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.goals.error',
            defaultMessage: "Couldn't load your Plan goals — try reloading.",
          })}
        />
      </WidgetShell>
    )
  }

  const rows = data.goals
  const cap = rowCap(instance, def) ?? undefined
  const visible = cap ? rows.slice(0, cap) : rows
  const extra = rows.length - visible.length

  return (
    <WidgetShell title={instance.title} base={def.title} footer={footer}>
      {rows.length ? (
        <>
          {visible.map((g) => {
            const pct = Math.round(g.pct)
            return (
              <div className="ov-goal" key={g.key}>
                <div className="ov-goal-top">
                  <span className="ov-goal-nm">
                    {g.label}{' '}
                    {g.risk && (
                      <Badge tone="warn">
                        {g.status === 'past_due'
                          ? formatMessage({
                              id: 'overview.goals.pastDue',
                              defaultMessage: 'past due',
                            })
                          : formatMessage({
                              id: 'overview.goals.behind',
                              defaultMessage: 'behind',
                            })}
                      </Badge>
                    )}
                  </span>
                  <span className="ov-goal-pct">{pct}%</span>
                </div>
                <div className="ov-env-bar ov-goal-bar">
                  <span
                    className="ov-env-fill"
                    style={{ width: `${pct}%`, background: g.risk ? 'var(--warn)' : 'var(--good)' }}
                  />
                </div>
                <div className="ov-goal-sub">
                  {formatMessage(
                    { id: 'overview.goals.progress', defaultMessage: '{have} of {target}' },
                    {
                      have: <Money as="span">{fBase(g.have)}</Money>,
                      target: <Money as="span">{fBase(g.target)}</Money>,
                    },
                  )}
                  {g.by
                    ? formatMessage(
                        { id: 'overview.goals.by', defaultMessage: ' • by {date}' },
                        { date: fMonth(g.by, 'short', 'always') },
                      )
                    : ''}
                </div>
              </div>
            )
          })}
          {extra > 0 && (
            <div className="ov-more">
              {formatMessage(
                {
                  id: 'overview.goals.more',
                  defaultMessage: '+{count, plural, one {# more goal} other {# more goals}}',
                },
                { count: extra },
              )}
            </div>
          )}
        </>
      ) : (
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.goals.empty',
            defaultMessage: 'No savings goals yet — add one in Plan.',
          })}
        />
      )}
    </WidgetShell>
  )
}

// ── Crossover point (passive income vs spending) ────────────────────────────
// Today's real passive income (GET /api/income/forecast — dividends/interest,
// annualized) vs the recurring baseline spending (GET /api/cashflow — the average monthly
// expense the cash-flow projection runs on, not a measured average); the projected
// crossover YEAR reuses the FIRE engine (GET /api/fire) — reaching the FIRE
// number IS, by construction, the year a safe withdrawal can fully cover
// annual expenses, which is the same "crossover" this widget projects.

const Crossover: ComponentType<WidgetContentProps> = ({ instance, def, onNavigate }) => {
  const { formatMessage } = useAppIntl()
  // FIRE seeds from the ONE net worth — see OverviewDataContext and ADR
  // 2026-07-31-single-source-net-worth. The passive-vs-spending figures (the monthly passive
  // income, the coverage percentage and the shortfall) are the SERVER's: the widget used to
  // divide the annual forecast by 12 and take a percentage of average expenses itself.
  const { netWorth, loading: portfolioLoading } = useAnalytics()
  const fire = useFire(netWorth ?? 0)
  const projections = useCashflowProjections()
  const crossover = projections.data?.crossover
  const footer = (
    <FooterLink
      label={formatMessage({ id: 'overview.openPlan', defaultMessage: 'Open Plan' })}
      tab={def.source?.tab}
      onNavigate={onNavigate}
    />
  )

  if ((portfolioLoading && netWorth == null) || fire.loading || projections.initialLoading) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <Skeleton height={100} />
      </WidgetShell>
    )
  }
  if (projections.error || !crossover?.known) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.crossover.empty',
            defaultMessage: 'Needs at least one month of spending history to project a crossover.',
          })}
        />
      </WidgetShell>
    )
  }

  const expensesMonthly = crossover.expenses_monthly
  const passiveMonthly = crossover.passive_monthly
  const pct = Math.round(crossover.coverage_pct)
  const toGo = crossover.to_go_monthly
  let yearLabel = '—'
  if (fire.data) {
    if (fire.data.progress_pct >= 100)
      yearLabel = formatMessage({ id: 'overview.now', defaultMessage: 'Now' })
    else if (fire.data.years_to_fire != null)
      yearLabel = String(new Date().getFullYear() + Math.round(fire.data.years_to_fire))
  }

  return (
    <WidgetShell title={instance.title} base={def.title} bodyAlign="center" footer={footer}>
      <div className="ov-cross">
        <div className="ov-cross-hd">
          <span className="ov-cross-yr">{yearLabel}</span>
          <span className="ov-cross-note">
            {formatMessage({ id: 'overview.projected', defaultMessage: 'projected' })}
          </span>
        </div>
        <div className="ov-env-bar ov-goal-bar">
          <span className="ov-env-fill" style={{ width: `${pct}%`, background: 'var(--good)' }} />
        </div>
        <div className="ov-cross-stats">
          <div className="ov-cross-stat">
            <span className="ov-cross-lbl">
              {formatMessage({
                id: 'overview.crossover.passive',
                defaultMessage: 'Passive income now',
              })}
            </span>
            <b className="ov-cross-val">
              {formatMessage(
                { id: 'overview.perMonth', defaultMessage: '{amount}/mo' },
                { amount: <Money as="span">{fBaseCompact(passiveMonthly)}</Money> },
              )}
            </b>
          </div>
          <div className="ov-cross-stat">
            <span className="ov-cross-lbl">
              {formatMessage({
                id: 'overview.crossover.spending',
                defaultMessage: 'Baseline spending',
              })}
            </span>
            <b className="ov-cross-val">
              {formatMessage(
                { id: 'overview.perMonth', defaultMessage: '{amount}/mo' },
                { amount: <Money as="span">{fBaseCompact(expensesMonthly)}</Money> },
              )}
            </b>
          </div>
          <div className="ov-cross-stat">
            <span className="ov-cross-lbl">
              {formatMessage({ id: 'overview.crossover.covered', defaultMessage: 'Covered' })}
            </span>
            <b className="ov-cross-val">{pct}%</b>
          </div>
        </div>
        {toGo > 0 && (
          <div className="ov-cross-cap">
            {formatMessage(
              { id: 'overview.crossover.toGo', defaultMessage: '{amount}/mo to go' },
              { amount: <Money as="span">{fBaseCompact(toGo)}</Money> },
            )}
          </div>
        )}
      </div>
    </WidgetShell>
  )
}

// ── FIRE projection + cash-flow runway (compact Outlook mirrors) ────────────
// Both reuse the shared insights-style layout (a headline row of two stats +
// a compact OvChart) rather than the full Plan/Outlook chart, per the ADR's
// "a simplified single-figure/mini-chart view is fine" allowance.

function InsHeadStat({
  value,
  label,
  color,
}: {
  value: ReactNode
  label: ReactNode
  color?: string
}) {
  return (
    <div>
      <div className="ov-ins-big" style={color ? { color } : undefined}>
        {value}
      </div>
      <span className="ov-t-meta">{label}</span>
    </div>
  )
}

const PlanFire: ComponentType<WidgetContentProps> = ({ instance, def }) => {
  const { formatMessage } = useAppIntl()
  // FIRE seeds from the ONE net worth (GET /api/net-worth), not a client-side portfolio sum —
  // see OverviewDataContext and ADR 2026-07-31-single-source-net-worth.
  const { netWorth, loading: portfolioLoading } = useAnalytics()
  const total = netWorth ?? 0
  const { data, loading, error } = useFire(total)

  if ((portfolioLoading && netWorth == null) || loading) {
    return (
      <WidgetShell title={instance.title} base={def.title} fill bodyClass="ov-ins-body">
        <Skeleton height={140} />
      </WidgetShell>
    )
  }
  if (error || !data || data.monthly_retirement_spending <= 0) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={
            total <= 0
              ? formatMessage({
                  id: 'overview.fire.loadingWorth',
                  defaultMessage: 'Net worth is still loading.',
                })
              : formatMessage({
                  id: 'overview.fire.empty',
                  defaultMessage:
                    'Set your monthly retirement spending in Plan to see a projection.',
                })
          }
        />
      </WidgetShell>
    )
  }

  const fiLabel =
    data.projected_fire_age != null ? `FI ~${Math.round(data.projected_fire_age)}` : 'FI —'
  // MATH-28: current_age (and every trajectory point's age) is null without a date of
  // birth on file — the chart plots against age, so swap it for a one-line hint instead
  // of an axis of "null" labels; the years-based header stats above are unaffected.
  const ageKnown = data.current_age != null
  const ACC = resolveColor('var(--accent)')
  const WARN = resolveColor('var(--warn)')
  const cfg = {
    type: 'line' as const,
    data: {
      labels: data.trajectory.map((p) => String(p.age ?? p.year)),
      datasets: [
        {
          label: formatMessage({ id: 'overview.netWorth.title', defaultMessage: 'Net worth' }),
          data: data.trajectory.map((p) => p.nw),
          borderColor: ACC,
          backgroundColor: areaFill(ACC),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
        },
        {
          label: formatMessage({ id: 'overview.fire.number', defaultMessage: 'FIRE number' }),
          data: data.trajectory.map((p) => p.target),
          borderColor: WARN,
          borderWidth: 1.2,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: Array<{ dataIndex: number }>) => {
              const age = data.trajectory[items[0]?.dataIndex ?? 0]?.age
              return age != null
                ? formatMessage({ id: 'overview.fire.age', defaultMessage: 'Age {age}' }, { age })
                : ''
            },
            label: (ctx: { dataset: { label?: string }; raw: unknown }) =>
              `${ctx.dataset.label}: ${amountsHidden() ? '***' : fBaseCompact(Number(ctx.raw))}`,
          },
        },
      },
      scales: {
        x: { ticks: { color: TICK(), maxTicksLimit: 6 }, grid: { display: false } },
        y: { ticks: { color: TICK(), callback: kTick }, grid: { color: GRID() } },
      },
    },
  }

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      fill
      bodyClass="ov-ins-body"
      meta={fiLabel}
    >
      <div className="ov-ins-headrow">
        <InsHeadStat
          value={<Money as="span">{fBaseCompact(data.fire_number)}</Money>}
          label={formatMessage({ id: 'overview.fire.number', defaultMessage: 'FIRE number' })}
        />
        <InsHeadStat
          value={
            data.years_to_fire != null
              ? formatMessage(
                  { id: 'overview.fire.years', defaultMessage: '{years} yrs' },
                  { years: fFixed(data.years_to_fire, 1) },
                )
              : formatMessage({ id: 'overview.fire.over50', defaultMessage: '50+ yrs' })
          }
          label={formatMessage({
            id: 'overview.fire.toIndependence',
            defaultMessage: 'to independence',
          })}
          color="var(--good)"
        />
      </div>
      {ageKnown ? (
        <OvChart
          config={cfg}
          sig={`${data.trajectory.length}|${data.fire_number}`}
          minHeight={110}
        />
      ) : (
        <Text as="p" size="sm" tone="faint">
          {formatMessage({
            id: 'overview.fire.birthDate',
            defaultMessage: 'Add your date of birth in Profile to see ages',
          })}
        </Text>
      )}
    </WidgetShell>
  )
}

const PlanRunway: ComponentType<WidgetContentProps> = ({ instance, def }) => {
  const { formatMessage } = useAppIntl()
  // The depletion curve is projected server-side, point by point — the widget used to build
  // `cash - burn * i` itself, which is money math on a chart's worth of points.
  const projections = useCashflowProjections()
  const data = projections.data?.runway

  if (projections.initialLoading) {
    return (
      <WidgetShell title={instance.title} base={def.title} fill bodyClass="ov-ins-body">
        <Skeleton height={140} />
      </WidgetShell>
    )
  }
  if (projections.error || !data?.known) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.runway.empty',
            defaultMessage: 'Needs at least one recorded expense to estimate a burn rate.',
          })}
        />
      </WidgetShell>
    )
  }

  const cash = data.cash
  const burn = data.burn
  const runway = data.runway_months
  const caveat = data.cards_missing_spending?.length
    ? formatMessage(
        {
          id: 'overview.runway.cardCaveat',
          defaultMessage: 'Card spending not included yet ({cards})',
        },
        { cards: data.cards_missing_spending.join(', ') },
      )
    : null
  const points = data.trajectory
  const ACC = resolveColor('var(--accent)')
  const cfg = {
    type: 'line' as const,
    data: {
      labels: points.map((_, i) =>
        formatMessage(
          { id: 'overview.runway.chartMonth', defaultMessage: '+{count}mo' },
          { count: i },
        ),
      ),
      datasets: [
        {
          label: formatMessage({ id: 'overview.runway.cash', defaultMessage: 'Cash' }),
          data: points,
          borderColor: ACC,
          backgroundColor: areaFill(ACC),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: Array<{ dataIndex: number }>) =>
              formatMessage(
                { id: 'overview.runway.tooltipMonth', defaultMessage: '+{count} mo' },
                { count: items[0]?.dataIndex ?? 0 },
              ),
            label: (ctx: { raw: unknown }) =>
              formatMessage(
                { id: 'overview.runway.cashValue', defaultMessage: 'Cash: {amount}' },
                { amount: amountsHidden() ? '***' : fBaseCompact(Number(ctx.raw)) },
              ),
          },
        },
      },
      scales: {
        x: { ticks: { color: TICK(), maxTicksLimit: 6 }, grid: { display: false } },
        y: { ticks: { color: TICK(), callback: kTick }, grid: { color: GRID() } },
      },
    },
  }

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      fill
      bodyClass="ov-ins-body"
      meta={
        runway != null
          ? formatMessage(
              { id: 'overview.runway.months', defaultMessage: '{count} mo' },
              { count: fFixed(runway, 1) },
            )
          : '∞'
      }
    >
      <div className="ov-ins-headrow">
        <InsHeadStat
          value={<Money as="span">{fBaseCompact(cash)}</Money>}
          label={formatMessage({
            id: 'overview.runway.cashOnHand',
            defaultMessage: 'cash on hand',
          })}
        />
        <InsHeadStat
          value={
            runway != null
              ? formatMessage(
                  { id: 'overview.runway.months', defaultMessage: '{count} mo' },
                  { count: fFixed(runway, 1) },
                )
              : formatMessage({ id: 'overview.runway.noBurn', defaultMessage: 'No burn' })
          }
          label={
            <>
              {formatMessage(
                { id: 'overview.runway.burn', defaultMessage: 'runway at {amount}/mo burn' },
                { amount: <Money as="span">{fBaseCompact(burn)}</Money> },
              )}
            </>
          }
          color="var(--good)"
        />
      </div>
      {caveat && (
        <Text as="p" size="xs" tone="faint">
          {caveat}
        </Text>
      )}
      <OvChart config={cfg} sig={`${cash}|${burn}|${data.horizon_months}`} minHeight={110} />
    </WidgetShell>
  )
}

export const cashflowPlanningWidgetComponents: Record<string, ComponentType<WidgetContentProps>> = {
  spending: Spending,
  cashflow: Cashflow,
  calendar: Calendar,
  goals: Goals,
  crossover: Crossover,
  'plan-fire': PlanFire,
  'plan-runway': PlanRunway,
}
