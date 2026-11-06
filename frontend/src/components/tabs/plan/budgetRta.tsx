// plan/budgetRta.tsx — the Ready-to-Assign breakdown popover. RtaHero turns the `.pl-sum-hero`
// figure into a disclosure button; the breakdown is the identity's own terms, one line each
// (ADR 2026-09-09 — Ready to Assign follows YNAB: cash on hand, less what the envelopes hold,
// less this month's card spending nothing covered). The popover clones the bespoke
// fixed-position pattern from budgetActivity.tsx's ActivityCell (this tab's convention — no
// ui/Modal, no generic Popover primitive, no role="dialog").
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { createPortal } from 'react-dom'
import * as PD from './planData'
import { Button } from '../../ui'
import { X } from './icons'
import {
  buildRtaLines,
  buildRtaFlowLines,
  partitionRtaFlowLines,
  stripYear,
  type RtaLine,
} from './rtaLines'

const { fBaseCents } = PD

// ── one row of the identity, shared with the fresh-start dialog's ledger: the op glyph
// (unmasked, structural) carries the sign, so the amount beside it is UNSIGNED and no row ever
// prints two minuses. A term whose own value flips sign flips its glyph with it — envelopes net
// overspent make "Held in envelopes" read '+', because a held overspend lends room back until
// month-end. Colour marks STATUS, not arithmetic — a plain subtraction is neutral; only card
// spending nothing covered, and a stale term, take the warn tone. The `=` total row below is
// the one place the pos/neg tint still means something.
// `showOp` (default true — every existing caller: the stock popover, the rail) renders the
// glyph as its own column, amount unsigned, exactly as before. The flow popover passes
// `showOp={false}` for EVERY item row (owner correction, 2026-09-14: the +/− glyph is not a
// per-row thing at all — it belongs to a dedicated section-HEADER row, `RtaSectionHeader`
// below, showing the glyph plus that section's own SUBTOTAL and nothing else; every item row
// underneath carries its own sign on the amount instead, no glyph). The `.op` column still
// renders, empty, so the label stays aligned under the glyph column either way.
export function RtaRow({
  line,
  showOp = true,
  month,
  previousMonth,
}: {
  line: RtaLine
  showOp?: boolean
  month?: string
  previousMonth?: string
}) {
  const { formatMessage } = useAppIntl()
  const labels: Record<string, string> = {
    cash: formatMessage({ id: 'plan.rtaCash', defaultMessage: 'Cash on hand' }),
    held: formatMessage({ id: 'plan.rtaHeld', defaultMessage: 'Held in envelopes' }),
    cardcredit: formatMessage({ id: 'plan.rtaCardCredit', defaultMessage: 'Credit on your cards' }),
    heldoutside: formatMessage({
      id: 'plan.rtaHeldOutside',
      defaultMessage: 'Held outside envelopes',
    }),
    cardspend: formatMessage({
      id: 'plan.rtaCardSpend',
      defaultMessage: 'Card spending not covered this month',
    }),
    baseline: formatMessage({ id: 'plan.rtaBaseline', defaultMessage: 'Baseline' }),
    future: formatMessage({ id: 'plan.rtaFuture', defaultMessage: 'Assigned in future months' }),
    other: formatMessage({ id: 'plan.rtaOther', defaultMessage: 'Unexplained — refresh' }),
  }
  if (month !== undefined) {
    labels.inflow = formatMessage(
      { id: 'plan.rtaInflow', defaultMessage: 'Inflow: Ready to Assign transactions in {month}' },
      { month },
    )
    labels.assigned = formatMessage(
      { id: 'plan.rtaAssigned', defaultMessage: 'Assigned in {month}' },
      { month },
    )
  }
  if (previousMonth !== undefined) {
    labels.carriedin = formatMessage(
      { id: 'plan.rtaCarried', defaultMessage: 'Ready to Assign left over from {month}' },
      { month: previousMonth },
    )
    labels.cashoverprev = formatMessage(
      { id: 'plan.rtaOverspending', defaultMessage: 'Cash overspending in {month}' },
      { month: previousMonth },
    )
  }
  const isZero = Math.abs(line.value) < 0.005
  return (
    <div className={'pl-rtapop-row' + (isZero ? ' zero' : line.tone === 'warn' ? ' warn' : '')}>
      <span className="op" aria-hidden="true">
        {showOp ? line.op : ''}
      </span>
      <span className="lbl">{labels[line.key] ?? line.label}</span>
      <span className="val mask">
        {showOp ? '' : line.op}
        {fBaseCents(Math.abs(line.value))}
      </span>
    </div>
  )
}

const Div = () => <div className="pl-rtapop-div" />

// ── a sign group's own header — the glyph plus that group's SUBTOTAL, no label (owner
// screenshot, 2026-09-14): real YNAB's +/− circle isn't attached to any one line item, it's
// the section's own heading, sitting above every item that makes up the sum beside it. */
function RtaSectionHeader({ op, amount }: { op: '+' | '−'; amount: number }) {
  return (
    <div className="pl-rtapop-row pl-rtapop-row--sec">
      <span className="op" aria-hidden="true">
        {op}
      </span>
      <span className="lbl" />
      <span className="val mask">{fBaseCents(Math.abs(amount))}</span>
    </div>
  )
}

// ── the identity's `=` total row — the one place the pos/neg tint still means something.
// Shared by the popover (below) and the rail's summary panel (budgetRail.tsx) so the two never
// drift on rounding, sign, or copy.
export function RtaTotalRow({ rta }: { rta: number }) {
  const { formatMessage } = useAppIntl()
  const totalNeg = rta < -0.005,
    totalZero = Math.abs(rta) <= 0.005
  return (
    <div className={'pl-rtapop-total' + (totalZero ? ' zero' : totalNeg ? ' neg' : ' pos')}>
      <span className="op" aria-hidden="true">
        =
      </span>
      <span className="lbl">
        {formatMessage({ id: 'plan.totalRta', defaultMessage: 'Total Ready to Assign' })}
      </span>
      <span className="val mask">
        {totalNeg ? '−' : ''}
        {fBaseCents(Math.abs(rta))}
      </span>
    </div>
  )
}

// ── RtaHero — the trigger button + its internal breakdown popover ─────────────────────────
export function RtaHero({
  rta,
  monthLabel,
  onBudgetCash,
  cardCredit = 0,
  heldInEnvelopes,
  heldOutsideEnvelopes,
  cardSpendNotCovered,
  baseline,
  assignedInFuture,
  flow,
  prevMonthLabel,
  totalAssigned,
  underfundedCount,
  onFundUnderfunded,
  hasForeignCash = false,
}: {
  rta: number
  monthLabel: string
  onBudgetCash: number | null
  /** Every card's balance above zero — budget money beside cash (ADR 2026-11-02). */
  cardCredit?: number
  heldInEnvelopes: number
  heldOutsideEnvelopes: number
  cardSpendNotCovered: number
  baseline: number
  assignedInFuture: number
  /** The SAME Ready-to-Assign identity, reframed as YNAB's own flow terms — `null`/absent at
   *  the earliest budgeted month (or before the caller has threaded it), where there is no
   *  predecessor for the walk to read (design doc 2026-09-13, §6): the popover falls back to
   *  today's stock rows exactly as it does when `flow` is explicitly `null`. */
  flow?: {
    prev_month: string
    carried_in: number
    inflow: number
    cash_overspending_prev: number
  } | null
  prevMonthLabel?: string
  totalAssigned?: number
  hasForeignCash?: boolean
  /** RTA quick action (handoff delta #8) — count of underfunded targets + the handler that
   *  closes this popover and opens the SAME auto-assign preview as the toolbar's "Fund all
   *  targets" (handoff delta #10). Owner-retained popover is otherwise untouched. */
  underfundedCount: number
  onFundUnderfunded: () => void
}) {
  const { formatMessage } = useAppIntl()
  const zero = Math.abs(rta) <= 0.005,
    neg = rta < -0.005
  const heroCls = 'pl-sum-hero mask' + (zero ? '' : neg ? ' neg' : ' pos')

  // Hooks are called unconditionally (Rules of Hooks) — the onBudgetCash==null fallback
  // (data not ready yet: the plain, non-interactive figure) branches in the RETURN below.
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{
    left: number
    W: number
    arrowX: number
    below: boolean
    top: number | null
    bottom: number | null
  } | null>(null)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const r = btnRef.current!.getBoundingClientRect()
    const W = Math.min(480, window.innerWidth - 24)
    // Left-aligned to the trigger's own left edge (owner ask) rather than centered under it —
    // centering pushed a wide panel's left edge past the app's left nav sidebar, rendering
    // it ON TOP of the nav rather than inside the Plan tab's own content column. Clamped to
    // the sidebar's actual measured width (never a hardcoded guess), not the raw viewport edge.
    let left = Math.round(r.left)
    const sidebarW =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lx-sidebar-w')) ||
      52
    left = Math.max(sidebarW + 12, Math.min(left, window.innerWidth - W - 12))
    const below = window.innerHeight - r.bottom > 340
    const arrowX = Math.max(16, Math.min(W - 28, Math.round(r.left + r.width / 2 - left)))
    const top = below ? Math.round(r.bottom + 10) : null
    const bottom = below ? null : Math.round(window.innerHeight - r.top + 10)
    setPos({ left, W, arrowX, below, top, bottom })
  }, [open])

  // 4-listener dismiss (outside mousedown / Escape / resize / outside-scroll) — mirrors
  // ActivityCell exactly; inside clicks stopPropagation so they never reach these handlers.
  useEffect(() => {
    if (!open) return
    // The panel PORTALS to <body> (it escapes .pl-summary's sticky stacking context, which
    // trapped z-index:1200 UNDER the app sidebar/topbar) — so "inside" = trigger OR panel.
    const inside = (t: Node) => !!(wrapRef.current?.contains(t) || popRef.current?.contains(t))
    const h = (e: MouseEvent) => {
      if (!inside(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScroll = (e: Event) => {
      if (inside(e.target as Node)) return
      setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  // Focus returns to the trigger on every dismiss path (this fires exactly once per
  // true→false transition, regardless of WHICH listener above closed it).
  useEffect(() => {
    if (wasOpen.current && !open) btnRef.current?.focus()
    wasOpen.current = open
  }, [open])

  const totalNeg = rta < -0.005

  // Data isn't ready yet (no cash-side computed) — the plain, non-interactive figure
  // (spec §2A). Placed AFTER every hook call above so the hook order never changes, and BEFORE
  // buildRtaLines so a half-loaded month never reads as a broken identity.
  if (onBudgetCash == null)
    return (
      <div className={heroCls}>
        {neg ? '−' : ''}
        {fBaseCents(Math.abs(rta))}
      </div>
    )

  const stockLines = buildRtaLines({
    onBudgetCash,
    cardCredit,
    heldInEnvelopes,
    heldOutsideEnvelopes,
    cardSpendNotCovered,
    baseline,
    assignedInFuture,
    rta,
  })
  const flowLines = flow
    ? buildRtaFlowLines({
        carriedIn: flow.carried_in,
        inflow: flow.inflow,
        assigned: totalAssigned ?? 0,
        cashOverspendingPrev: flow.cash_overspending_prev,
        assignedInFuture,
        rta,
        monthLabel,
        prevMonthLabel: prevMonthLabel ?? '',
      })
    : null

  return (
    <span className="pl-rta-trigger-wrap" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={heroCls + ' as-btn'}
        aria-expanded={open}
        aria-controls="pl-rtapop-panel"
        aria-label={formatMessage(
          { id: 'plan.rtaAria', defaultMessage: 'Ready to Assign, {amount} — click for breakdown' },
          { amount: fBaseCents(rta) },
        )}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        {neg ? '−' : ''}
        {fBaseCents(Math.abs(rta))}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            id="pl-rtapop-panel"
            ref={popRef}
            className="pl-rtapop"
            role="group"
            aria-label={formatMessage(
              {
                id: 'plan.rta.breakdownLabel',
                defaultMessage: 'Ready to Assign breakdown, {month}',
              },
              { month: monthLabel },
            )}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: pos.left + 'px',
              top: pos.top != null ? pos.top + 'px' : 'auto',
              bottom: pos.bottom != null ? pos.bottom + 'px' : 'auto',
              width: pos.W + 'px',
            }}
          >
            <span
              className="pl-rtapop-arrow"
              style={{
                left: pos.arrowX + 'px',
                [pos.below ? 'top' : 'bottom']: '-6px',
                transform: pos.below ? 'rotate(45deg)' : 'rotate(225deg)',
              }}
            />
            <div className="pl-actpop-head">
              <div className="pl-actpop-title">
                {formatMessage({
                  id: 'plan.rtaBreakdown',
                  defaultMessage: 'Ready to Assign Breakdown',
                })}
              </div>
              <button
                className="pl-actpop-x"
                onClick={() => setOpen(false)}
                aria-label={formatMessage({ id: 'plan.close', defaultMessage: 'Close' })}
              >
                <X />
              </button>
            </div>
            {flowLines ? (
              <>
                {(() => {
                  const { added, deducted } = partitionRtaFlowLines(flowLines)
                  const addedTotal = added.reduce((s, l) => s + l.value, 0)
                  const deductedTotal = deducted.reduce((s, l) => s + l.value, 0)
                  // No "Added"/"Deducted" TEXT headers — matches real YNAB exactly (owner
                  // screenshot): each section's own +/− glyph plus its SUBTOTAL IS the
                  // header, no label needed. Every item row underneath carries its own sign
                  // on the amount (`showOp={false}`), never a repeated glyph. The DIVIDER
                  // between the two groups stays — the same screenshot shows a rule between
                  // the + section and the − section, not just before the total.
                  return (
                    <>
                      {added.length > 0 && <RtaSectionHeader op="+" amount={addedTotal} />}
                      {added.map((l) => (
                        <RtaRow
                          key={l.key}
                          line={l}
                          showOp={false}
                          month={stripYear(monthLabel)}
                          previousMonth={stripYear(prevMonthLabel ?? '')}
                        />
                      ))}
                      {added.length > 0 && deducted.length > 0 && <Div />}
                      {deducted.length > 0 && <RtaSectionHeader op="−" amount={deductedTotal} />}
                      {deducted.map((l) => (
                        <RtaRow
                          key={l.key}
                          line={l}
                          showOp={false}
                          month={stripYear(monthLabel)}
                          previousMonth={stripYear(prevMonthLabel ?? '')}
                        />
                      ))}
                    </>
                  )
                })()}
                <Div />
                <RtaTotalRow rta={rta} />
              </>
            ) : (
              <>
                {stockLines.map((l) => (
                  <Fragment key={l.key}>
                    <RtaRow line={l} />
                    {l.key === 'held' && heldInEnvelopes < -0.005 && (
                      <div className="pl-rtapop-note">
                        {formatMessage({
                          id: 'plan.rtaHeldCreditNote',
                          defaultMessage:
                            'Envelopes are net overspent this month — that lends Ready to Assign room back until the roll charges the hole to next month.',
                        })}
                      </div>
                    )}
                    {l.key === 'heldoutside' && (
                      <div className="pl-rtapop-note">
                        {formatMessage({
                          id: 'plan.rtaHeldOutsideNote',
                          defaultMessage:
                            'Spending with no envelope is held the same way — give it a category, or link its category to an envelope, before month-end or the roll charges it to next month.',
                        })}
                      </div>
                    )}
                  </Fragment>
                ))}
                <Div />
                <RtaTotalRow rta={rta} />
              </>
            )}
            {rta > 0.005 && (
              <div className="pl-rtapop-note">
                {formatMessage({
                  id: 'plan.rtaAssignNote',
                  defaultMessage:
                    'Give these dollars a job by assigning them to one or more envelopes!',
                })}
              </div>
            )}
            <Div />
            <div className="pl-rtapop-banner">
              <span className="ic" aria-hidden="true">
                ⓘ
              </span>
              <span className="txt">
                {formatMessage({
                  id: 'plan.rtaExplanation',
                  defaultMessage:
                    "Ready to Assign is money that hasn't yet been assigned to an envelope.",
                })}
              </span>
            </div>
            {!totalNeg && rta > 0.005 && underfundedCount > 0 && (
              <>
                <Div />
                <Button
                  variant="primary"
                  size="dense"
                  className="pl-rtapop-act"
                  onClick={() => {
                    setOpen(false)
                    onFundUnderfunded()
                  }}
                >
                  {formatMessage(
                    {
                      id: 'plan.fundTargets',
                      defaultMessage:
                        'Fund {count, plural, one {# underfunded target} other {# underfunded targets}}',
                    },
                    { count: underfundedCount },
                  )}
                </Button>
              </>
            )}
            {hasForeignCash && (
              <>
                <Div />
                <div className="pl-rtapop-banner">
                  <span className="ic" aria-hidden="true">
                    ⓘ
                  </span>
                  <span className="txt">
                    {formatMessage({
                      id: 'plan.rtaFxNote',
                      defaultMessage: 'Ready to Assign can shift as exchange rates move',
                    })}
                  </span>
                </div>
              </>
            )}
          </div>,
          document.body,
        )}
    </span>
  )
}
