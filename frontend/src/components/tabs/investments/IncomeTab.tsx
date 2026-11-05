import './income.css'
import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useDataVersion } from '../../../hooks/useDataVersion'
import {
  Badge,
  Button,
  Cluster,
  EmptyState,
  ErrorState,
  Money,
  SummaryBar,
  TabSkeleton,
} from '../../ui'
import { CalendarCheck, CalendarClock, DollarSign } from '../../../ui/icons'
import { fBase, fCurrency, fDate, fPct } from '../../../utils/format'
import {
  useIncomeView,
  type IncomeHistoryRow,
  type IncomePaymentRow,
  type IncomeSourceRow,
} from './useIncomeView'
import { EntityRow } from '../../../lucius/EntityRow'
import { LuciusCta } from '../../intro/LuciusCta'

const cardLabels = defineMessages({
  received12m: {
    id: 'income.card.received12m',
    defaultMessage: 'Received • last 12m',
  },
  receivedAll: { id: 'income.card.receivedAll', defaultMessage: 'Received • all time' },
  yieldCost: { id: 'income.card.yieldCost', defaultMessage: 'Yield on cost' },
  forecast: {
    id: 'income.card.forecast',
    defaultMessage: 'Forecast • next 12m',
  },
  forwardYield: { id: 'income.card.forwardYield', defaultMessage: 'Forward yield' },
})
const kindLabels = defineMessages({
  dividend: { id: 'income.kind.dividend', defaultMessage: 'Dividend' },
  interest: { id: 'income.kind.interest', defaultMessage: 'Interest' },
  distribution: { id: 'income.kind.distribution', defaultMessage: 'Distribution' },
})
const sourceLabels = defineMessages({
  declared: { id: 'income.source.declared', defaultMessage: 'Declared rate' },
  fixedIncome: { id: 'income.source.fixedIncome', defaultMessage: 'Fixed income rate' },
  trailing: { id: 'income.source.trailing', defaultMessage: 'Trailing 12M' },
})
const sourceDescriptions = defineMessages({
  declared: {
    id: 'income.source.declaredDesc',
    defaultMessage: 'The official rate the company has announced.',
  },
  fixedIncome: {
    id: 'income.source.fixedIncomeDesc',
    defaultMessage: "The bond's coupon or T-bill's accretion — contractual, not estimated.",
  },
  trailing: {
    id: 'income.source.trailingDesc',
    defaultMessage: 'No rate announced — estimated from the last 12 months paid.',
  },
})

// Colours follow the forecast source; the labels come from the message catalog.
const INC_SRC = {
  declared: { dot: 'var(--primary)' },
  fixedIncome: { dot: 'var(--warn)' },
  trailing: { dot: 'var(--muted)' },
} as const

interface Props {
  /** Bumped after a dividend is recorded so this tab refetches income data. */
  version?: number
  onAskLucius?: (text: string) => void
}

const INCOME_MESSAGE =
  'Help me record my dividends and interest. Ask which holdings pay me; I can send a ' +
  'screenshot or statement of my payments instead of typing.'

// ── Source list rows ──────────────────────────────────────────────────────────

function SourceRow({ row }: { row: IncomeSourceRow }) {
  const { formatMessage } = useAppIntl()
  const dot = INC_SRC[row.source]?.dot ?? 'var(--fg-3)'
  return (
    <div className="inc-src-row">
      <div className="inc-src-id">
        <span className="inc-src-sym">{row.sym}</span>
        <span className="inc-src-nm">{row.name}</span>
      </div>
      <div className="inc-src-bar">
        <span
          className="inc-dot"
          style={{ background: dot }}
          title={formatMessage(sourceLabels[row.source])}
        />
        <span className="inc-src-track">
          <span className="inc-src-fill" style={{ width: `${row.barPct}%`, background: dot }} />
        </span>
      </div>
      <span className="inc-src-amt">{fBase(row.annualBase)}</span>
    </div>
  )
}

// ── Payment table row ─────────────────────────────────────────────────────────

function PaymentRow({ row }: { row: IncomePaymentRow }) {
  const { formatMessage } = useAppIntl()
  return (
    <div className="inc-pay-row">
      <span>
        <span className="inc-pay-sym">{row.sym}</span>{' '}
        <span className="inc-pay-nm">{row.name}</span>
      </span>
      <span className="inc-pay-date">
        {row.exDate}
        {row.exDaysUntil >= 0 && row.exDaysUntil <= 10 && (
          <span className="inc-soon">
            {formatMessage(
              { id: 'income.inDays', defaultMessage: 'in {days}d' },
              { days: row.exDaysUntil },
            )}
          </span>
        )}
      </span>
      <span className="inc-pay-date">{row.payDate}</span>
      <span className="inc-pay-amt">
        <span
          className="inc-pay-status"
          title={
            row.status === 'scheduled'
              ? formatMessage({
                  id: 'income.confirmed',
                  defaultMessage: 'Confirmed — date announced',
                })
              : formatMessage({
                  id: 'income.estimated',
                  defaultMessage: 'Estimated — predicted from past payments',
                })
          }
        >
          {row.status === 'scheduled' ? (
            <CalendarCheck size={14} strokeWidth={2} />
          ) : (
            <CalendarClock size={14} strokeWidth={2} />
          )}
        </span>
        <span>{fBase(row.amountBase)}</span>
      </span>
    </div>
  )
}

// ── Persisted income history ─────────────────────────────────────────────────

function RecentIncomePanel({
  rows,
  total,
  expanded,
  onToggle,
}: {
  rows: IncomeHistoryRow[]
  total: number
  expanded: boolean
  onToggle: () => void
}) {
  const { formatMessage } = useAppIntl()
  return (
    <div className="mk-panel">
      <div className="mk-panel-head">
        <span className="mk-panel-title">
          {formatMessage({ id: 'income.ui.RecentIncome', defaultMessage: 'Recent income' })}
        </span>
        <span className="mk-panel-spacer" />
        <span className="mk-panel-sub">
          {formatMessage(
            { id: 'income.receivedCount', defaultMessage: '{count} received' },
            { count: total },
          )}
        </span>
      </div>
      <div className="mk-panel-body">
        {total === 0 ? (
          <EmptyState
            title={formatMessage({
              id: 'income.ui.NoIncomeRecordedYet',
              defaultMessage: 'No income recorded yet',
            })}
            body={formatMessage({
              id: 'income.ui.RecordADividendInterestPaymentDistributionOrDrpToSeeItHere',
              defaultMessage:
                'Record a dividend, interest payment, distribution, or DRP to see it here.',
            })}
          />
        ) : (
          <>
            <div className="inv-event-table inv-event-table--income">
              <div className="inv-event-head" aria-hidden="true">
                <span>
                  {formatMessage({ id: 'income.ui.DateReceived', defaultMessage: 'Date received' })}
                </span>
                <span>{formatMessage({ id: 'income.ui.Holding', defaultMessage: 'Holding' })}</span>
                <span>{formatMessage({ id: 'income.ui.Kind', defaultMessage: 'Kind' })}</span>
                <span>{formatMessage({ id: 'income.ui.Net', defaultMessage: 'Net' })}</span>
                <span>{formatMessage({ id: 'income.ui.Method', defaultMessage: 'Method' })}</span>
              </div>
              {/* EntityRow renders the host <div> itself and stamps data-entity-id + draggable
                  + data-ctx-*, making an income event @-mentionable, right-clickable
                  ("Ask Lucius about this") and draggable into the dock. `income` is a
                  registered mention type (descriptors/equity_lots.py, order=19). */}
              {rows.map((row) => (
                <EntityRow
                  as="div"
                  className="inv-event-row"
                  key={row.eventId}
                  type="income"
                  id={row.eventId}
                  label={
                    row.symbolFallback
                      ? formatMessage({
                          id: 'income.unknownHolding',
                          defaultMessage: 'Unknown holding',
                        })
                      : row.symbol
                  }
                  item={row}
                  toFields={(it) => ({
                    symbol: it.symbol,
                    income_kind: it.kindLabel,
                    currency: it.amountCurrency,
                    paid_at: it.date,
                  })}
                  search={`${row.symbol} ${row.name ?? ''} ${row.kindLabel}`}
                  sublabel={`${formatMessage(kindLabels[row.kindKey])} • ${fDate(row.date, 'short', 'always')}`}
                >
                  <time className="inv-event-date" dateTime={row.date}>
                    {fDate(row.date, 'short', 'always')}
                  </time>
                  <span
                    className="inv-event-holding"
                    title={
                      row.name ||
                      (row.symbolFallback
                        ? formatMessage({
                            id: 'income.unknownHolding',
                            defaultMessage: 'Unknown holding',
                          })
                        : row.symbol)
                    }
                  >
                    <strong>
                      {row.symbolFallback
                        ? formatMessage({
                            id: 'income.unknownHolding',
                            defaultMessage: 'Unknown holding',
                          })
                        : row.symbol}
                    </strong>
                    {row.name && <span className="inv-event-name">{row.name}</span>}
                    <span className="inv-event-mobile-meta">
                      {' '}
                      • {formatMessage(kindLabels[row.kindKey])}
                    </span>
                  </span>
                  <span className="inv-event-kind">{formatMessage(kindLabels[row.kindKey])}</span>
                  <span
                    className="inv-event-amount"
                    title={
                      row.amountBase !== null
                        ? undefined
                        : formatMessage({
                            id: 'income.ui.BaseCurrencyFxUnavailableShowingTheNativeNetAmount',
                            defaultMessage:
                              'Base-currency FX unavailable; showing the native net amount',
                          })
                    }
                  >
                    <Money>
                      {row.amountBase !== null
                        ? fBase(row.amountBase)
                        : fCurrency(row.amountNative, row.amountCurrency)}
                    </Money>
                    {row.amountBase === null && (
                      <span className="inv-event-detail">
                        {formatMessage({
                          id: 'income.ui.NativeFxUnavailable',
                          defaultMessage: 'native • FX unavailable',
                        })}
                      </span>
                    )}
                  </span>
                  <span className="inv-event-method">
                    <Badge tone={row.reinvested ? 'neutral' : 'muted'}>
                      {row.reinvested
                        ? formatMessage({ id: 'income.reinvested', defaultMessage: 'Reinvested' })
                        : formatMessage({ id: 'income.cash', defaultMessage: 'Cash' })}
                    </Badge>
                  </span>
                </EntityRow>
              ))}
            </div>
            {total > 8 && (
              <Button variant="ghost" size="sm" className="inv-event-toggle" onClick={onToggle}>
                {expanded
                  ? formatMessage({
                      id: 'income.showTop',
                      defaultMessage: 'Show top 8 only',
                    })
                  : formatMessage(
                      {
                        id: 'income.showAllEvents',
                        defaultMessage: 'Show all {count} income events',
                      },
                      { count: total },
                    )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function IncomeTab({ version = 0, onAskLucius }: Props) {
  const { formatMessage } = useAppIntl()
  // Local dividend saves bump `version`; any Lucius write bumps `anyWriteV`.
  const anyWriteV = useDataVersion('*')
  const view = useIncomeView(version + anyWriteV)

  if (view.loading) {
    return (
      <div className="mk-subt">
        <TabSkeleton
          variant="income"
          label={formatMessage({
            id: 'income.ui.LoadingIncome',
            defaultMessage: 'Loading income…',
          })}
          header={false}
        />
      </div>
    )
  }

  if (view.error) {
    return (
      <div className="mk-subt">
        <ErrorState message={formatMessage({ id: 'investments.income.loadError', defaultMessage: "Couldn't load income data." })} onRetry={view.retry} />
      </div>
    )
  }

  if (!view.hasAny) {
    return (
      <div className="mk-subt">
        <EmptyState
          fill
          icon={<DollarSign size={28} strokeWidth={1.5} aria-hidden="true" />}
          title={formatMessage({ id: 'income.ui.NoIncomeYet', defaultMessage: 'No income yet' })}
          body={formatMessage({
            id: 'income.ui.AppearsOnceYouHoldDividendStocksEtfsOrBonds',
            defaultMessage: 'Appears once you hold dividend stocks, ETFs, or bonds.',
          })}
          action={
            <Cluster gap="--space-3" justify="center">
              <LuciusCta
                label={formatMessage({
                  id: 'income.ui.AddWithLucius',
                  defaultMessage: 'Add with Lucius',
                })}
                message={INCOME_MESSAGE}
                onAskLucius={onAskLucius}
              />
            </Cluster>
          }
        />
      </div>
    )
  }

  const shownSrc = view.showAllSrc ? view.showAllSrc_allRows : view.sourceRows
  const shownPays = view.showAllPay ? view.allPaymentRows : view.paymentRows
  const shownHistory = view.showAllHistory ? view.allHistoryRows : view.historyRows

  return (
    <div className="mk-subt">
      {view.cards.length > 0 && (
        <SummaryBar
          cards={view.cards.map((card) => ({
            ...card,
            label: formatMessage(cardLabels[card.labelKey]),
            value: card.fxUnavailable
              ? formatMessage({ id: 'income.fxUnavailable', defaultMessage: 'FX unavailable' })
              : card.value,
          }))}
        />
      )}

      <div className="inc-grid">
        {/* ── Left: "Where your income comes from" ── */}
        <div className="mk-panel">
          <div className="mk-panel-head">
            <span className="inc-titlerow">
              <span className="mk-panel-title">
                {formatMessage({
                  id: 'income.ui.WhereYourIncomeComesFrom',
                  defaultMessage: 'Where your income comes from',
                })}
              </span>
              <span
                className="inc-info"
                tabIndex={0}
                role="button"
                aria-label={formatMessage({
                  id: 'income.ui.WhatIsIncome',
                  defaultMessage: 'What is income?',
                })}
              >
                i
                <span className="inc-info-pop">
                  {formatMessage({
                    id: 'income.explanation',
                    defaultMessage:
                      "Dividends, interest and fund distributions — what you've received, plus a 12-month forward estimate from your current holdings.",
                  })}
                </span>
              </span>
            </span>
            <span className="mk-panel-spacer" />
            <span className="mk-panel-sub">
              {formatMessage(
                {
                  id: 'income.sourceCount',
                  defaultMessage: '{count} holdings • forecast next 12m',
                },
                { count: view.totalSourceCount },
              )}
            </span>
          </div>
          <div className="mk-panel-body">
            <div className="inc-src">
              {shownSrc.map((row) => (
                <SourceRow key={row.positionId} row={row} />
              ))}
              {view.restSrcCount > 0 && !view.showAllSrc && (
                <button
                  type="button"
                  className="inc-src-row inc-src-row--agg"
                  onClick={() => view.setShowAllSrc(true)}
                  title={formatMessage({
                    id: 'income.ui.ShowAllHoldings',
                    defaultMessage: 'Show all holdings',
                  })}
                >
                  <div className="inc-src-id">
                    <span className="inc-src-sym">
                      {formatMessage(
                        { id: 'income.moreHoldings', defaultMessage: '+{count} more holdings' },
                        { count: view.restSrcCount },
                      )}
                    </span>
                    <span className="inc-src-nm">
                      {formatMessage({
                        id: 'income.ui.SmallerContributorsTapToExpand',
                        defaultMessage: 'smaller contributors • tap to expand',
                      })}
                    </span>
                  </div>
                  <div className="inc-src-bar">
                    <span className="inc-dot" style={{ background: 'var(--fg-3)' }} />
                    <span className="inc-src-track">
                      <span
                        className="inc-src-fill"
                        style={{
                          width: `${view.restSrcBarPct}%`,
                          background: 'var(--fg-3)',
                          opacity: 0.55,
                        }}
                      />
                    </span>
                  </div>
                  <span className="inc-src-amt">{fBase(view.restSrcSum)}</span>
                </button>
              )}
            </div>
            {view.restSrcCount > 0 && (
              <button className="inc-showall" onClick={() => view.setShowAllSrc((v) => !v)}>
                {view.showAllSrc
                  ? formatMessage({
                      id: 'income.ui.ShowTop8Only',
                      defaultMessage: 'Show top 8 only',
                    })
                  : formatMessage(
                      { id: 'income.showAllHoldings', defaultMessage: 'Show all {count} holdings' },
                      { count: view.totalSourceCount },
                    )}
              </button>
            )}
            <p className="inc-cap">
              {formatMessage({
                id: 'income.sourceNote',
                defaultMessage:
                  'Ranked by forecast contribution, excluding crypto and non-paying positions. Dot colour = rate source — see "How we estimate".',
              })}
            </p>
          </div>
        </div>

        {/* ── Right: "Is your income growing?" ── */}
        <div className="mk-panel">
          <div className="mk-panel-head">
            <span className="mk-panel-title">
              {formatMessage({
                id: 'income.ui.IsYourIncomeGrowing',
                defaultMessage: 'Is your income growing?',
              })}
            </span>
          </div>
          <div className="mk-panel-body">
            {view.growth ? (
              <>
                <div className="inc-cmp">
                  <div className="inc-cmp-row">
                    <div className="inc-cmp-top">
                      <span className="inc-cmp-k">
                        {formatMessage({
                          id: 'income.ui.ReceivedLast12M',
                          defaultMessage: 'Received • last 12m',
                        })}
                      </span>
                      <span className="inc-cmp-v">{fBase(view.growth.received)}</span>
                    </div>
                    <div className="inc-bar">
                      <span
                        className="inc-bar-fill"
                        style={{
                          width: `${view.growth.receivedBarPct}%`,
                          background: 'var(--good)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="inc-cmp-row">
                    <div className="inc-cmp-top">
                      <span className="inc-cmp-k">
                        {formatMessage({
                          id: 'income.ui.ForecastNext12M',
                          defaultMessage: 'Forecast • next 12m',
                        })}
                      </span>
                      <span className="inc-cmp-v">
                        <span>{fBase(view.growth.projected)}</span>
                        {view.growth.growthPct != null && (
                          <Badge tone={view.growth.growthPct >= 0 ? 'pos' : 'neg'}>
                            {fPct(view.growth.growthPct, { sign: true })}
                          </Badge>
                        )}
                      </span>
                    </div>
                    <div className="inc-bar">
                      <span
                        className="inc-bar-fill"
                        style={{
                          width: `${view.growth.projectedBarPct}%`,
                          background: 'var(--good)',
                          opacity: 0.5,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <p className="inc-chart-cap">
                  {formatMessage({
                    id: 'income.growthNote',
                    defaultMessage:
                      "Next 12 months vs. last 12 months, assuming today's holdings and rates hold steady.",
                  })}
                </p>
              </>
            ) : (
              <p className="inc-chart-cap">
                {view.incomeBaseTotalsAvailable === false
                  ? formatMessage({
                      id: 'income.growthUnavailable',
                      defaultMessage:
                        'Growth is unavailable until the missing exchange rate can convert every received payment.',
                    })
                  : formatMessage({
                      id: 'income.growthEmpty',
                      defaultMessage: 'Add holdings or record income to see year-over-year growth.',
                    })}
              </p>
            )}
            <div className="inc-legend">
              <span className="inc-legend-h">
                {formatMessage({
                  id: 'income.ui.HowWeEstimate',
                  defaultMessage: 'How we estimate',
                })}
              </span>
              {(Object.keys(INC_SRC) as Array<keyof typeof INC_SRC>).map((k) => (
                <div className="inc-legend-item" key={k}>
                  <span className="inc-dot" style={{ background: INC_SRC[k].dot }} />
                  <div>
                    <div className="inc-legend-k">{formatMessage(sourceLabels[k])}</div>
                    <div className="inc-legend-d">{formatMessage(sourceDescriptions[k])}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Upcoming payments ── */}
      {view.hasCalendar && (
        <div className="mk-panel">
          <div className="mk-panel-head">
            <span className="mk-panel-title">
              {formatMessage({
                id: 'income.ui.UpcomingPayments',
                defaultMessage: 'Upcoming payments',
              })}
            </span>
            <span className="mk-panel-spacer" />
            <span className="mk-panel-sub">
              {formatMessage(
                {
                  id: 'income.calendarSummary',
                  defaultMessage: 'next {days} days • {count} expected • {amount}',
                },
                {
                  days: view.calendarHorizonDays,
                  count: view.calendarCount,
                  amount: view.calendarTotalFmt,
                },
              )}
            </span>
          </div>
          <div className="mk-panel-body">
            {view.nextPayment && (
              <div className="inc-next">
                <div className="inc-next-l">
                  <span className="inc-next-tag">
                    {formatMessage({
                      id: 'income.ui.NextExDividend',
                      defaultMessage: 'Next ex-dividend',
                    })}
                  </span>
                  <span className="inc-next-main">
                    {view.nextPayment.sym} •{' '}
                    {view.nextPayment.exDaysUntil <= 0
                      ? formatMessage({ id: 'income.today', defaultMessage: 'today' })
                      : formatMessage(
                          {
                            id: 'income.daysUntil',
                            defaultMessage: '{days, plural, one {in # day} other {in # days}}',
                          },
                          { days: view.nextPayment.exDaysUntil },
                        )}
                  </span>
                  <span className="inc-next-sub">
                    {formatMessage(
                      {
                        id: 'income.ownThrough',
                        defaultMessage: 'Own it through {date} to receive this payout',
                      },
                      { date: view.nextPayment.exLabel },
                    )}
                  </span>
                </div>
                <div className="inc-next-r">
                  <span className="inc-next-amt">{fBase(view.nextPayment.amountFmt)}</span>
                  <span className="inc-next-pay">
                    {formatMessage(
                      { id: 'income.pays', defaultMessage: 'pays {date}' },
                      { date: view.nextPayment.payLabel },
                    )}
                  </span>
                </div>
              </div>
            )}
            <div className="inc-pay">
              <div className="inc-pay-head">
                <span>{formatMessage({ id: 'income.ui.Holding', defaultMessage: 'Holding' })}</span>
                <span>
                  {formatMessage({ id: 'income.ui.ExDividend', defaultMessage: 'Ex-dividend' })}
                </span>
                <span>
                  {formatMessage({ id: 'income.ui.PayDate', defaultMessage: 'Pay date' })}
                </span>
                <span style={{ textAlign: 'right' }}>
                  {formatMessage({ id: 'income.ui.Amount', defaultMessage: 'Amount' })}
                </span>
              </div>
              {shownPays.map((p) => (
                <PaymentRow key={p.positionId} row={p} />
              ))}
            </div>
            {view.totalPaymentCount > 8 && (
              <button className="inc-showall" onClick={() => view.setShowAllPay((v) => !v)}>
                {view.showAllPay
                  ? formatMessage({ id: 'income.ui.ShowFewer', defaultMessage: 'Show fewer' })
                  : formatMessage(
                      { id: 'income.showAllPayments', defaultMessage: 'Show all {count} payments' },
                      { count: view.totalPaymentCount },
                    )}
              </button>
            )}
            <p className="inc-chart-cap">
              {formatMessage({
                id: 'income.paymentNote.own',
                defaultMessage:
                  'Own the holding before its ex-dividend date to receive the payout.',
              })}
              <br />
              {formatMessage({
                id: 'income.paymentNote.confirmed',
                defaultMessage: 'Confirmed = date announced by the company.',
              })}
              <br />
              {formatMessage({
                id: 'income.paymentNote.estimated',
                defaultMessage: 'Estimated = predicted from past payment timing.',
              })}
            </p>
          </div>
        </div>
      )}

      <RecentIncomePanel
        rows={shownHistory}
        total={view.totalHistoryCount}
        expanded={view.showAllHistory}
        onToggle={() => view.setShowAllHistory((value) => !value)}
      />
    </div>
  )
}
