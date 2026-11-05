// Needs attention — the ONE list of what wants the owner's eye. The Dashboard widget and the
// Lucius home both render it, so a count on one screen is the count on the other (ADR
// 2026-10-14-one-definition-per-fact-across-screens). Every figure and every threshold is the
// server's; this module decides which flags exist and how they read, never what the numbers are.

import { useDataVersion } from '../../../hooks/useDataVersion'
import { fetchJson } from '../../../hooks/serverState'
import { useInvestmentSignals } from '../../../hooks/useInvestmentSignals'
import { useQueryCache } from '../../../state/queryCache'
import type { SignalKind } from '../../../types/investmentSignals'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
import { fBase, fBaseWhole, fMonth, fPct } from '../../../utils/format'
import { useAnalytics, useCommitments, useFundingCoverage } from './useWidgetData'

export type AttentionIcon = 'clock' | 'gap' | 'pie' | 'card' | 'cash'

export interface AttentionFlag {
  id: string
  sev: 'hi' | 'md'
  icon: AttentionIcon
  title: string
  desc: string
  nav?: { tab: string }
}

const REVIEW_COUNT_URL = '/api/transactions/recently-added?needs_review=true&limit=1'

function decisionTitle(kind: SignalKind, intl: IntlShape): string | null {
  if (kind === 'concentration')
    return intl.formatMessage({
      id: 'attention.concentration',
      defaultMessage: 'Position concentration',
    })
  if (kind === 'rebalance')
    return intl.formatMessage({ id: 'attention.rebalance', defaultMessage: 'Portfolio off target' })
  if (kind === 'vesting')
    return intl.formatMessage({ id: 'attention.vesting', defaultMessage: 'Upcoming vest' })
  return null
}

/** "due in 3 days", "due today", "overdue by 2 days". */
function dueIn(days: number, intl: IntlShape): string {
  if (days < 0)
    return intl.formatMessage(
      {
        id: 'attention.overdueBy',
        defaultMessage: 'overdue by {days, plural, one {# day} other {# days}}',
      },
      { days: -days },
    )
  if (days === 0)
    return intl.formatMessage({ id: 'attention.dueToday', defaultMessage: 'due today' })
  if (days === 1)
    return intl.formatMessage({ id: 'attention.dueTomorrow', defaultMessage: 'due tomorrow' })
  return intl.formatMessage(
    { id: 'attention.dueIn', defaultMessage: 'due in {days} days' },
    { days },
  )
}

/** How many ledger transactions are waiting for review (added while the owner was away). */
function useReviewCount(): { count: number; loading: boolean } {
  const version = useDataVersion('ledger')
  const query = useQueryCache<{ total?: number }>(
    REVIEW_COUNT_URL,
    () => fetchJson<{ total?: number }>(REVIEW_COUNT_URL),
    { version },
  )
  return { count: query.data?.total ?? 0, loading: query.initialLoading }
}

export function useAttentionFlags(): { flags: AttentionFlag[]; loading: boolean } {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const { analytics: portfolio, loading } = useAnalytics()
  const { coverage, loading: coverageLoading } = useFundingCoverage()
  const { signals, loading: signalsLoading } = useInvestmentSignals()
  const { overdueCount, overdueTotal, cardsDueSoon, loading: commitmentsLoading } = useCommitments()
  const { count: reviewCount, loading: reviewLoading } = useReviewCount()
  const a = portfolio?.attention

  const flags: AttentionFlag[] = []
  if (coverage?.at_risk) {
    // The figure is the DEEPEST gap to the cash floor in the look-ahead window, so the copy
    // names the low point and the window — the first dip is usually much shallower, and
    // pairing the trough's dollars with the first dip's date read as a different number from
    // the Commitments tab's.
    const firstDip = coverage.earliest_shortfall_date
      ? fMonth(coverage.earliest_shortfall_date, 'short', 'always')
      : null
    const lowest = coverage.lowest_balance_month
      ? fMonth(coverage.lowest_balance_month, 'short', 'always')
      : null
    const timing = [
      firstDip &&
        formatMessage(
          { id: 'attention.firstDip', defaultMessage: 'cash first dips below the floor in {date}' },
          { date: firstDip },
        ),
      lowest &&
        lowest !== firstDip &&
        formatMessage(
          { id: 'attention.lowest', defaultMessage: 'bottoms out in {date}' },
          { date: lowest },
        ),
    ]
      .filter(Boolean)
      .join(formatMessage({ id: 'attention.and', defaultMessage: ' and ' }))
    flags.push({
      id: 'shortfall',
      sev: 'hi',
      icon: 'gap',
      title: formatMessage({ id: 'attention.shortfall', defaultMessage: 'Funding shortfall' }),
      desc: formatMessage(
        {
          id: 'attention.shortfallBody',
          defaultMessage:
            "Your commitments leave you {shortfall} short of your {floor} cash floor at the lowest point within the next {months} months{fx, select, yes {, at today's exchange rates} other {}}{hasTiming, select, yes {: {timing}} other {}}.",
        },
        {
          shortfall: fBaseWhole(coverage.total_shortfall_base),
          floor: fBase(coverage.low_balance_threshold),
          months: coverage.horizon_months,
          fx: coverage.spans_currencies ? 'yes' : 'no',
          hasTiming: timing ? 'yes' : 'no',
          timing,
        },
      ),
      nav: { tab: 'commitments' },
    })
  }
  if (overdueCount > 0) {
    flags.push({
      id: 'overdue',
      sev: 'hi',
      icon: 'clock',
      title: formatMessage(
        {
          id: 'attention.overdue',
          defaultMessage: '{count, plural, one {# overdue payment} other {# overdue payments}}',
        },
        { count: overdueCount },
      ),
      desc:
        overdueTotal > 0
          ? formatMessage(
              {
                id: 'attention.overdueTotal',
                defaultMessage: '{amount} is past due in Commitments.',
              },
              { amount: fBase(overdueTotal) },
            )
          : formatMessage({
              id: 'attention.overdueNoTotal',
              defaultMessage: 'Past their due date in Commitments.',
            }),
      nav: { tab: 'commitments' },
    })
  }
  // A card balance alone asks nothing of the owner; a statement about to fall due does. One
  // flag per card whose unpaid statement is due within a week or overdue (server-decided).
  for (const card of cardsDueSoon) {
    const days = card.days_until_due ?? 0
    flags.push({
      id: 'card-bill-' + card.account_id,
      sev: days < 0 ? 'hi' : 'md',
      icon: 'card',
      title: formatMessage(
        { id: 'attention.cardTitle', defaultMessage: '{name}: {amount} {due}' },
        { name: card.label, amount: fBase(card.amount_base), due: dueIn(days, intl) },
      ),
      desc: card.estimated
        ? formatMessage({
            id: 'attention.cardEstimate',
            defaultMessage: "Estimated from the card's statement cycle.",
          })
        : formatMessage({
            id: 'attention.cardOwed',
            defaultMessage: 'Still owed on the last statement.',
          }),
      nav: { tab: 'accounts' },
    })
  }
  if (coverage?.over_committed) {
    flags.push({
      id: 'over-earmarked',
      sev: 'md',
      icon: 'cash',
      title: formatMessage({
        id: 'attention.overEarmarked',
        defaultMessage: 'Cash over-earmarked',
      }),
      desc: formatMessage(
        {
          id: 'attention.overEarmarkedBody',
          defaultMessage: "You've earmarked {earmarked} of cash but hold {liquid} liquid.",
        },
        {
          earmarked: fBase(coverage.reconciliation.earmarked_base),
          liquid: fBase(coverage.reconciliation.liquid_base),
        },
      ),
    })
  }
  // The open portfolio decisions are the Investments brief's own ("N to decide"): a concentration
  // call, a rebalance, a vest to plan for. This card used to compute a concentration flag of its
  // own and said "All clear" beside the brief's call.
  for (const sig of signals.filter((x) => x.actionable)) {
    flags.push({
      id: 'decision-' + sig.id,
      sev: sig.kind === 'concentration' ? 'hi' : 'md',
      icon: sig.kind === 'concentration' || sig.kind === 'rebalance' ? 'pie' : 'clock',
      title: decisionTitle(sig.kind, intl) ?? sig.tag,
      desc: sig.narrative,
      nav: { tab: 'investments' },
    })
  }
  if (a?.contingent_flagged) {
    flags.push({
      id: 'contingent',
      sev: 'md',
      icon: 'clock',
      title: formatMessage(
        { id: 'attention.contingent', defaultMessage: '{percent} contingent' },
        { percent: fPct(a.contingent_pct) },
      ),
      desc: formatMessage({
        id: 'attention.contingentBody',
        defaultMessage: 'Depends on unvested equity or money owed to you.',
      }),
    })
  }
  if (a?.thin_cash) {
    flags.push({
      id: 'thin-cash',
      sev: 'md',
      icon: 'cash',
      title: formatMessage({ id: 'attention.thinCash', defaultMessage: 'Thin cash buffer' }),
      desc: [
        a.cash_months != null
          ? formatMessage(
              {
                id: 'attention.cashMonths',
                defaultMessage: '{amount} in cash covers about {months} months of your spending.',
              },
              { amount: fBase(a.cash_total), months: a.cash_months },
            )
          : formatMessage(
              { id: 'attention.cashOnly', defaultMessage: 'Only {amount} in liquid cash.' },
              { amount: fBase(a.cash_total) },
            ),
        a.cards_missing_spending?.length
          ? formatMessage(
              {
                id: 'attention.cardCaveat',
                defaultMessage: 'Card spending not included yet ({cards})',
              },
              { cards: a.cards_missing_spending.join(', ') },
            )
          : null,
      ]
        .filter(Boolean)
        .join(' '),
    })
  }
  if (reviewCount > 0) {
    flags.push({
      id: 'review',
      sev: 'md',
      icon: 'clock',
      title: formatMessage(
        {
          id: 'attention.review',
          defaultMessage: '{count, plural, one {# transaction} other {# transactions}} to review',
        },
        { count: reviewCount },
      ),
      desc: formatMessage({
        id: 'attention.reviewBody',
        defaultMessage: 'Imported or added by Lucius. Approve them when you have a minute.',
      }),
      nav: { tab: 'accounts' },
    })
  }

  return {
    flags,
    loading: loading || coverageLoading || signalsLoading || commitmentsLoading || reviewLoading,
  }
}
