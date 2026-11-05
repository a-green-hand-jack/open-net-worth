// plan/budgetCardPayment.tsx — a credit card's payment envelope, in the desktop side panel
// (owner, 2026-09-25, after YNAB's payment inspector): clicking a card's row used to jump to
// Accounts — and not even to that card, since the row carries no account id. Every figure is
// the row's own server field (`owed`, `available_for_payment`, `underfunded`) or the SAME
// activity breakdown the row's Activity popover fetches; nothing is re-derived here beyond the
// display-only "balance not yet set aside" gap. Without the side panel (phone, narrow window) the
// same detail opens as the target editor's modal — a bottom sheet on a phone (owner, 2026-09-28).
import { useEffect, useState } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import * as PD from './planData'
import { authFetch } from '../../../api/client'
import { Button, Skeleton } from '../../ui'
import { Arrow, X } from './icons'
import { PlanningModal } from './PlanningModal'
import { ColorIcon } from './budgetParts'
import { NotesSection, TgtCard } from './budgetTarget'
import { PaymentBreakdownBox, buildActivityQuery, type PaymentBreakdown } from './budgetActivity'
import type { LocalCat } from './useBudgetModel'
import { cardPaymentStatus } from './cardPaymentStatus'

const fMoney = (n: number) => PD.fBaseCents(n)

export function CardPaymentPanel({
  c,
  month,
  note,
  onSaveNote,
  onBack,
  onOpenAccounts,
  onAssign,
  inline = true,
}: {
  c: LocalCat
  month: string
  note: string
  onSaveNote: (text: string) => void
  onBack: () => void
  onOpenAccounts: () => void
  /** Set this month's assigned figure for the card's payment envelope. */
  onAssign: (value: number) => void
  /** In the side panel; false floats it as a modal instead. */
  inline?: boolean
}) {
  const { formatMessage } = useAppIntl()
  // undefined = loading, null = couldn't load
  const [bd, setBd] = useState<PaymentBreakdown | null | undefined>(undefined)
  const query = buildActivityQuery(c, month)
  useEffect(() => {
    let cancelled = false
    authFetch(`/api/planning/activity-transactions?${query}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (!cancelled) setBd((d?.breakdown as PaymentBreakdown | undefined) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [query])
  const s = cardPaymentStatus(c)
  const owed = c.paymentOwed ?? 0
  const avail = c.availableForPayment ?? 0
  const statusTitle =
    s.kind === 'overpaid'
      ? formatMessage({ id: 'plan.cardOverpaid', defaultMessage: 'Paid more than set aside' })
      : s.kind === 'underfunded'
        ? formatMessage({ id: 'plan.autoUnderfunded', defaultMessage: 'Underfunded' })
        : s.kind === 'nothingOwed'
          ? formatMessage({ id: 'plan.cardNothingOwed', defaultMessage: 'Nothing owed' })
          : s.kind === 'covered'
            ? formatMessage({ id: 'plan.cardCovered', defaultMessage: 'Spending covered' })
            : formatMessage({ id: 'plan.funded', defaultMessage: 'Funded' })
  const statusText =
    s.kind === 'overpaid'
      ? formatMessage(
          {
            id: 'plan.cardOverpaidText',
            defaultMessage:
              'Your payments went {overpaid} past what was set aside, and the card still owes {owed}. {total} covers both.',
          },
          { overpaid: fMoney(-avail), owed: fMoney(owed), total: fMoney(s.toAssign) },
        )
      : s.kind === 'underfunded'
        ? formatMessage(
            {
              id: 'plan.cardUnderfundedText',
              defaultMessage: '{amount} more needed for this bill.',
            },
            { amount: fMoney(c.paymentUnderfunded ?? 0) },
          )
        : s.kind === 'nothingOwed'
          ? formatMessage({
              id: 'plan.cardNothingText',
              defaultMessage: 'This card has no balance to pay.',
            })
          : s.kind === 'covered'
            ? formatMessage(
                {
                  id: 'plan.cardCoveredText',
                  defaultMessage:
                    "What you've spent is set aside; {amount} of the balance isn't yet.",
                },
                { amount: fMoney(s.balanceGap ?? 0) },
              )
            : formatMessage({
                id: 'plan.cardFundedText',
                defaultMessage: 'Enough is set aside to pay the full balance.',
              })
  const statusWhy =
    s.kind === 'overpaid'
      ? formatMessage(
          {
            id: 'plan.cardOverpaidWhy',
            defaultMessage:
              "Usually these payments cleared debt from before your budget started. The cash is gone, but Ready to Assign still counts it. Cover it now, or next month's Ready to Assign starts {amount} lower.",
          },
          { amount: fMoney(-avail) },
        )
      : s.kind === 'underfunded'
        ? formatMessage({
            id: 'plan.cardUnderfundedWhy',
            defaultMessage:
              "Usually it's debt from before your budget started, so nothing was ever set aside for it. Your spending categories are fine.",
          })
        : null
  const body = (
    <>
      <TgtCard title={formatMessage({ id: 'plan.payment', defaultMessage: 'Payment' })}>
        <div className={'pl-pay-status ' + s.tone}>
          <div className="pl-pay-status-title">{statusTitle}</div>
          <div className="pl-pay-status-txt">{statusText}</div>
        </div>
        {s.toAssign > 0.005 && (
          <div className="pl-pay-fix">
            {/* One click covers the whole balance (owner, 2026-09-28: "I don't see any button to
                assign underfunded") — from Ready to Assign, on top of what's already assigned. */}
            <Button
              variant="primary"
              size="dense"
              onClick={() => onAssign(Math.round((c.assigned + s.toAssign) * 100) / 100)}
            >
              {formatMessage(
                { id: 'plan.cardAssign', defaultMessage: 'Assign <b>{amount}</b>' },
                {
                  amount: fMoney(s.toAssign),
                  b: (chunks) => <span className="mask">{chunks}</span>,
                },
              )}
            </Button>
            {s.clearRed !== undefined && s.clearRed < s.toAssign - 0.005 && (
              <Button
                variant="secondary"
                size="dense"
                onClick={() => onAssign(Math.round((c.assigned + (s.clearRed ?? 0)) * 100) / 100)}
              >
                {formatMessage(
                  {
                    id: 'plan.cardClearRed',
                    defaultMessage: 'Just clear the red · <b>{amount}</b>',
                  },
                  {
                    amount: fMoney(s.clearRed),
                    b: (chunks) => <span className="mask">{chunks}</span>,
                  },
                )}
              </Button>
            )}
            {statusWhy && (
              <details className="pl-pay-why">
                <summary>
                  {formatMessage({ id: 'plan.why', defaultMessage: 'Why is this?' })}
                </summary>
                <p className="pl-pay-status-txt">{statusWhy}</p>
              </details>
            )}
          </div>
        )}
        <div className="pl-tgt-rows">
          <div className="pl-tgt-row">
            <span>
              {formatMessage({
                id: 'plan.paymentAvailable',
                defaultMessage: 'Available for payment',
              })}
            </span>
            <b className="mask">{fMoney(avail)}</b>
          </div>
          <div className="pl-tgt-row">
            <span>
              {formatMessage({ id: 'plan.currentBalance', defaultMessage: 'Current balance' })}
            </span>
            <b className="mask">{fMoney(owed)}</b>
          </div>
        </div>
      </TgtCard>
      <TgtCard title={formatMessage({ id: 'plan.thisMonth', defaultMessage: 'This month' })}>
        {bd === undefined ? (
          <div
            role="status"
            aria-label={formatMessage({
              id: 'plan.loadingMonthActivity',
              defaultMessage: "Loading this month's activity",
            })}
          >
            <Skeleton height={12} width="80%" />
            <Skeleton height={12} width="60%" style={{ marginTop: 8 }} />
          </div>
        ) : bd === null ? (
          <div className="pl-pay-status-txt">
            {formatMessage({
              id: 'plan.monthActivityFailed',
              defaultMessage: "Couldn't load this month's activity.",
            })}
          </div>
        ) : (
          <PaymentBreakdownBox b={bd} />
        )}
      </TgtCard>
      <NotesSection note={note} onSave={onSaveNote} />
      <Button variant="secondary" size="dense" onClick={onOpenAccounts}>
        {formatMessage({ id: 'plan.openAccounts', defaultMessage: 'Open in Accounts' })}
      </Button>
    </>
  )
  if (!inline)
    return (
      <PlanningModal
        onClose={onBack}
        label={formatMessage(
          { id: 'plan.paymentFor', defaultMessage: 'Payment for {name}' },
          { name: c.label },
        )}
        className="pl-tgt-modal"
      >
        <div className="pl-modal-head">
          <h3>
            <span className="pl-cdot" style={{ background: c.color, marginRight: 8 }} />
            {formatMessage(
              { id: 'plan.namedPayment', defaultMessage: '{name} • Payment' },
              { name: c.label },
            )}
          </h3>
          <button
            className="pl-modal-x"
            onClick={onBack}
            aria-label={formatMessage({ id: 'plan.close', defaultMessage: 'Close' })}
          >
            <X size={16} />
          </button>
        </div>
        <div className="pl-modal-body">{body}</div>
      </PlanningModal>
    )
  return (
    <div className="pl-budget-rail-target">
      <div className="pl-tgt-rail-head">
        <span className="pl-tgt-rail-title">
          <ColorIcon icon="envelope" color={c.color} />
          <span className="pl-tgt-rail-name">{c.label}</span>
        </span>
        <Button variant="secondary" size="dense" onClick={onBack}>
          <Arrow dir="left" size={12} /> {formatMessage({ id: 'planScan.back', defaultMessage: 'Back' })}
        </Button>
      </div>
      {body}
    </div>
  )
}
