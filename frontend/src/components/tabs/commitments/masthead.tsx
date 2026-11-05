import { FormattedMessage, RawIntlProvider } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { proposalText } from './proposalMessages'
// Funding-outlook masthead — ported verbatim from the design handoff's masthead.jsx
// `Masthead`: verdict hero + four stats + the cushion chart + a Lucius ribbon reading the
// TOP fix proposal (never hardcoded copy — see coverageEngine.ts).
import type { Commitment, PortfolioCoverage } from '../../../types/commitments'
import { fBase, fBaseWhole, fMonth } from '../../../utils/format'
import { fmtDate, isTracker, monthlySetAside, remainingTotal } from '../../../utils/commitments'
import { moneyClass } from '../../../utils/format'
import { Chart } from './chart'
import type { CoverageDerived, Proposal } from './coverageEngine'
import { CheckIcon, Spark, WarnIcon } from './icons'
import { useNarrow } from './useNarrow'

export interface HorizonOption {
  label: string
  value: number
}

interface MastheadProps {
  list: Commitment[]
  fx: Record<string, number>
  cov: PortfolioCoverage
  /** Everything going out in the next 30 days — the server's figure (auto-debits and goal
   *  set-asides included), the same one the Dashboard's Next 30 days card shows. */
  dueSoon: number
  derived: CoverageDerived
  horizon: number
  onHorizon: (n: number) => void
  hzOptions: HorizonOption[]
  topProposal: Proposal | null
  onReview: (id: string) => void
  onFix: () => void
}

export function Masthead({
  list,
  fx,
  cov,
  dueSoon,
  derived,
  horizon,
  onHorizon,
  hzOptions,
  topProposal,
  onReview,
  onFix,
}: MastheadProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const shownProposal = topProposal ? proposalText(intl, topProposal) : null
  const active = list.filter((c) => c.status === 'active')
  const floor = derived.floor
  const atRisk = derived.minBal < floor
  const shortfall = atRisk ? floor - derived.minBal : 0
  const gapMonth =
    derived.gapIdx >= 0
      ? fMonth(derived.timeline[derived.gapIdx]!.year_month, 'long', 'always')
      : null
  // The hero figure is the DEEPEST gap in the window, not the gap at the first dip — so the
  // sub-line names both months (and the window), or "Short $X … in April" reads as the April gap.
  const lowestMonth =
    derived.minIdx >= 0
      ? fMonth(derived.timeline[derived.minIdx]!.year_month, 'long', 'always')
      : null
  const riskC = active.find((c) => c.id === derived.riskId) || null

  const toBaseSafe = (amt: number, ccy: string) => {
    const rate = fx[(ccy || '').toUpperCase()]
    return rate ? amt * rate : amt
  }
  const committedRemaining = active
    .filter((c) => !isTracker(c))
    .reduce((s, c) => s + toBaseSafe(remainingTotal(c), c.currency), 0)
  const earmarked = cov.reconciliation.earmarked_base
  const overCommitted = cov.reconciliation.over_committed

  // All four always render, at every width. A zero here is a real answer — "nothing due in the
  // next 30 days" is exactly what someone opening this card wants to know, and hiding it would
  // make the reader unsure whether the stat is absent or simply not applicable. The mobile
  // problem was never WHICH stats show, it was how much room they took: on a phone they now
  // lay out as one compact inline strip instead of four full-width rows or a 2×2 of quadrants
  // (see .c2-sum-metrics in the ≤560px container query).
  const narrow = useNarrow()
  const stats: Array<{ k: string; v: number; tone?: string; hint?: string }> = [
    {
      k: formatMessage({
        id: 'commitments.masthead.committed',
        defaultMessage: 'Committed remaining',
      }),
      v: committedRemaining,
    },
    {
      k: formatMessage({ id: 'commitments.masthead.due30', defaultMessage: 'Due in 30 days' }),
      v: dueSoon,
      hint: formatMessage({
        id: 'commitments.masthead.dueHint',
        defaultMessage:
          'Everything going out in the next 30 days, auto-debits and goal set-asides included. The same figure as the Dashboard.',
      }),
    },
    {
      k: formatMessage({
        id: 'commitments.masthead.recurring',
        defaultMessage: 'Recurring funding / mo',
      }),
      v: monthlySetAside(list),
      hint: formatMessage({
        id: 'commitments.masthead.recurringHint',
        defaultMessage:
          'Monthly funding sources (budget envelope top-ups) feeding these commitments. A one-off or scheduled set-aside, such as a goal installment, is not here: it counts under Due in 30 days.',
      }),
    },
    {
      k: formatMessage({ id: 'commitments.masthead.cash', defaultMessage: 'Cash earmarked' }),
      v: earmarked,
      tone: overCommitted ? 'warn' : undefined,
    },
  ]

  // Extracted so the SAME markup can sit inside the funding-outlook card (desktop, and the
  // default before a narrow measurement lands) or as its own standalone card below it (phone —
  // owner: "let's show suggested fix and fix button below the first widget"). Never duplicated
  // in the DOM: exactly one of the two placements below renders it.
  const ribbon = (
    <div className="c2-ribbon">
      <span className="c2-ribbon-spark">
        <Spark />
      </span>
      <span className="c2-ribbon-text">
        {atRisk && riskC ? (
          <>
            <span className="c2-ribbon-core">
              <FormattedMessage
                id="commitments.masthead.riskRibbon"
                defaultMessage="{name} runs {amount} short around {date}"
                values={{
                  name: <b>{riskC.name}</b>,
                  amount: (
                    <b className={moneyClass()}>
                      {fBaseWhole(riskC.coverage?.shortfall_base ?? shortfall)}
                    </b>
                  ),
                  date: (
                    <b>
                      {riskC.coverage?.earliest_shortfall_date
                        ? fmtDate(riskC.coverage.earliest_shortfall_date)
                        : ''}
                    </b>
                  ),
                }}
              />
              {topProposal ? <>. {shownProposal!.ribbonHint}</> : '.'}
            </span>
            <span className="c2-ribbon-lite">
              {topProposal ? (
                <>
                  <b>
                    {formatMessage({
                      id: 'commitments.masthead.suggested',
                      defaultMessage: 'Suggested fix:',
                    })}
                  </b>{' '}
                  {shownProposal!.title}.
                </>
              ) : (
                formatMessage({
                  id: 'commitments.masthead.luciusHelp',
                  defaultMessage: 'Lucius can help close this gap.',
                })
              )}
            </span>
          </>
        ) : (
          <>
            <FormattedMessage
              id="commitments.masthead.safeRibbon"
              defaultMessage="Cash stays above your safety floor — {amount} set aside across your synced budget targets."
              values={{
                amount: (
                  <b className={moneyClass()}>
                    {formatMessage(
                      { id: 'commitments.masthead.perMonth', defaultMessage: '{amount}/mo' },
                      { amount: fBase(monthlySetAside(list)) },
                    )}
                  </b>
                ),
              }}
            />
          </>
        )}
      </span>
      <span className="c2-ribbon-acts">
        {atRisk && riskC && (
          <button className="c2-ribbon-act" onClick={() => onReview(riskC.id)}>
            {formatMessage({
              id: 'commitments.masthead.review',
              defaultMessage: 'Review commitment',
            })}
          </button>
        )}
        <button className="c2-ribbon-act hot" onClick={onFix}>
          <Spark size={13} />
          {atRisk
            ? formatMessage({ id: 'commitments.masthead.fix', defaultMessage: 'Fix with Lucius' })
            : formatMessage({ id: 'commitments.masthead.ask', defaultMessage: 'Ask Lucius' })}
        </button>
      </span>
    </div>
  )

  return (
    <RawIntlProvider value={intl}>
      <section className="c2-sum">
        <div className="c2-sum-row">
          <div className="c2-sum-left">
            {/* No "FUNDING OUTLOOK • NEXT N MONTHS" eyebrow. Tracked uppercase caps were the
              loudest type treatment on the card, spent restating the card's own purpose, and
              the horizon it named is a live control (.c3-hz) directly below. Removing it drops
              the verdict block from three type treatments to two at every width. */}
            <div className="c2-sum-heroline">
              <span className={'c2-sum-badge ' + (atRisk ? 'bad' : 'good')}>
                {atRisk ? <WarnIcon /> : <CheckIcon />}
              </span>
              <span className={moneyClass('c2-sum-hero', atRisk ? 'neg' : 'pos')}>
                {atRisk
                  ? formatMessage(
                      { id: 'commitments.masthead.short', defaultMessage: 'Short {amount}' },
                      { amount: fBaseWhole(shortfall) },
                    )
                  : floor > 0
                    ? formatMessage(
                        {
                          id: 'commitments.masthead.aboveFloor',
                          defaultMessage: 'Cash stays above your {amount} safety floor',
                        },
                        { amount: fBaseWhole(floor) },
                      )
                    : formatMessage({
                        id: 'commitments.masthead.aboveZero',
                        defaultMessage: 'Cash stays above zero',
                      })}
              </span>
            </div>
            <span className="c2-sum-sub">
              {atRisk ? (
                <>
                  <FormattedMessage
                    id="commitments.masthead.riskDetail"
                    defaultMessage="Cash dips below {floor} in {month}{lowest}, within the next {horizon} months{exchange}."
                    values={{
                      floor:
                        floor > 0
                          ? formatMessage(
                              {
                                id: 'commitments.masthead.floorValue',
                                defaultMessage: 'your {amount} safety floor',
                              },
                              { amount: fBase(floor) },
                            )
                          : formatMessage({
                              id: 'commitments.masthead.zero',
                              defaultMessage: 'zero',
                            }),
                      month: <b>{gapMonth}</b>,
                      lowest:
                        lowestMonth && lowestMonth !== gapMonth
                          ? formatMessage(
                              {
                                id: 'commitments.masthead.lowest',
                                defaultMessage: ' and bottoms out in {month}',
                              },
                              { month: lowestMonth },
                            )
                          : '',
                      horizon,
                      exchange: cov.spans_currencies
                        ? formatMessage({
                            id: 'commitments.masthead.exchange',
                            defaultMessage: ", at today's exchange rates",
                          })
                        : '',
                    }}
                  />
                </>
              ) : (
                <>
                  {formatMessage(
                    {
                      id: 'commitments.masthead.nextMonths',
                      defaultMessage: 'For the next {months} months, after every planned payment.',
                    },
                    { months: horizon },
                  )}
                </>
              )}
            </span>
          </div>
          <div className="c2-sum-metrics">
            {stats.map((s) => (
              <div className="c2-stat" key={s.k} title={s.hint}>
                <span className="k">{s.k}</span>
                <span className={moneyClass('v', s.tone)}>{fBase(s.v)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="c2-chart-wrap">
          <div className="c2-chart-head">
            {/* "vs. committed payments" is dropped on phone, not truncated — the legend directly
              below already names Cushion/Payments/Funding, so the short form reads as a
              deliberate label sharing a row with the select, not a clipped sentence. */}
            <span className="c2-chart-title">
              {formatMessage({
                id: 'commitments.masthead.cashCushion',
                defaultMessage: 'Cash cushion',
              })}
              <span className="c2-chart-title-rest">
                {formatMessage({
                  id: 'commitments.masthead.versus',
                  defaultMessage: ' vs. committed payments',
                })}
              </span>
            </span>
            {/* Four segmented buttons cost a full row on a phone to expose a setting that is
              changed rarely. A native select is one control, one tap target, and opens the
              platform picker — so it collapses to a chip while staying easier to hit than any
              of the four segments were. Desktop keeps the segmented group, where the row is
              free and seeing all four at once is worth it. */}
            {hzOptions.length > 0 &&
              (narrow ? (
                <select
                  className="c2-select c3-hz-select"
                  aria-label={formatMessage({
                    id: 'commitments.masthead.timeframe',
                    defaultMessage: 'Timeframe',
                  })}
                  value={horizon}
                  onChange={(e) => onHorizon(Number(e.target.value))}
                >
                  {hzOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label === 'All'
                        ? formatMessage({
                            id: 'commitments.masthead.allMonths',
                            defaultMessage: 'All months',
                          })
                        : o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  className="c3-hz"
                  role="group"
                  aria-label={formatMessage({
                    id: 'commitments.masthead.timeframe',
                    defaultMessage: 'Timeframe',
                  })}
                >
                  {hzOptions.map((o) => (
                    <button
                      key={o.value}
                      className={horizon === o.value ? 'on' : ''}
                      onClick={() => onHorizon(o.value)}
                      title={
                        o.label === 'All'
                          ? formatMessage(
                              {
                                id: 'commitments.masthead.throughLast',
                                defaultMessage: 'Through the last payment ({months} months)',
                              },
                              { months: o.value },
                            )
                          : formatMessage(
                              {
                                id: 'commitments.masthead.months',
                                defaultMessage: '{months} months',
                              },
                              { months: o.value },
                            )
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ))}
            <div className="c2-chart-legend">
              <span className="c2-leg">
                <i className="line" />{' '}
                {formatMessage({ id: 'commitments.masthead.cushion', defaultMessage: 'Cushion' })}
              </span>
              <span className="c2-leg">
                <i className="out" />
                <span>
                  {formatMessage({
                    id: 'commitments.masthead.payments',
                    defaultMessage: 'Payments',
                  })}
                  <span className="c2-leg-rest">
                    {formatMessage({ id: 'commitments.masthead.out', defaultMessage: ' out' })}
                  </span>
                </span>
              </span>
              <span className="c2-leg">
                <i className="in" />
                <span>
                  {formatMessage({ id: 'commitments.masthead.funding', defaultMessage: 'Funding' })}
                  <span className="c2-leg-rest">
                    {formatMessage({ id: 'commitments.masthead.in', defaultMessage: ' in' })}
                  </span>
                </span>
              </span>
              {/* The plot carries TWO dashed reference lines (zero and the cash floor). Their
                in-plot labels are dropped at phone width because they painted over the series,
                so BOTH have to be named here — labelling only the floor left the zero line
                unexplained, which is the more important of the two. */}
              {narrow && (
                <span className="c2-leg zero">
                  <i className="zeroline" />
                  <span>
                    $0
                    <span className="c2-leg-rest">
                      {formatMessage({
                        id: 'commitments.masthead.cashLabel',
                        defaultMessage: ' cash',
                      })}
                    </span>
                  </span>
                </span>
              )}
              {narrow && floor > 0 && (
                <span className="c2-leg floor">
                  <i className="floorline" />
                  <span>
                    {formatMessage({ id: 'commitments.masthead.floor', defaultMessage: 'Floor' })}
                    <span className="c2-leg-rest">&nbsp;{fBase(floor)}</span>
                  </span>
                </span>
              )}
            </div>
          </div>
          <Chart timeline={derived.timeline} floor={floor} gapIdx={derived.gapIdx} />
        </div>

        {/* Desktop, and the default render before the narrow measurement lands: ribbon stays
          inside the funding-outlook card, where it always lived. */}
        {!narrow && ribbon}
      </section>
      {/* Phone: the ribbon becomes its OWN card below the funding-outlook card, rather than a
        strip stacked inside it — its own border/background, not a border-top separator. */}
      {narrow && <div className="c2-ribbon-card">{ribbon}</div>}
    </RawIntlProvider>
  )
}
