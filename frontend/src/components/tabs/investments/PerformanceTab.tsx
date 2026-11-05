import { getNumberLocale } from '../../../utils/format'
import { useState } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { defineMessages } from 'react-intl'
import { Button, Cluster, EmptyState, ErrorState, TabSkeleton } from '../../ui'
import { ChartLine } from '../../../ui/icons'
import { LuciusCta } from '../../intro/LuciusCta'
import { usePerformanceView } from './usePerformanceView'
import type { PerfStatCard } from './usePerformanceView'
import type { ReturnPeriod, ReturnSeriesPoint } from '../../../types/portfolio'
import { fDate } from '../../../utils/format'
import './design.css'

// ── PerfChart ─────────────────────────────────────────────────────────────────
// SVG line chart mirroring the prototype exactly:
//   - 0-based cumulative return fractions (portfolio + optional benchmark)
//   - hover crosshair with a tooltip (date · portfolio % · benchmark %)
//   - dashed 0%-baseline rule
//   - coordinate math: viewBox 600×200, 10px pad
// Both series are fractions (0.0 = 0%, 0.15 = +15%); display as %.

const W = 600
const H = 200
const PAD = 10

function xAt(i: number, N: number): number {
  return PAD + (N > 1 ? i / (N - 1) : 0) * (W - 2 * PAD)
}

function yAt(v: number, min: number, rng: number): number {
  return H - PAD - ((v - min) / rng) * (H - 2 * PAD)
}

function toPath(arr: number[], min: number, rng: number): string {
  return arr
    .map(
      (v, i) => (i ? 'L' : 'M') + xAt(i, arr.length).toFixed(1) + ' ' + yAt(v, min, rng).toFixed(1),
    )
    .join(' ')
}

function fmtReturn(v: number): string {
  return (v >= 0 ? '+' : '−') + Math.abs(v * 100).toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

interface PerfChartProps {
  series: ReturnSeriesPoint[]
  hasBenchmark: boolean
  benchLabel: string
  period: ReturnPeriod
}

function PerfChart({ series, hasBenchmark, benchLabel, period }: PerfChartProps) {
  const { formatMessage } = useAppIntl()
  const [hi, setHi] = useState<number | null>(null)

  const port = series.map((p) => p.portfolio)
  const bench = hasBenchmark ? series.map((p) => p.benchmark ?? 0) : null
  const N = port.length

  const allValues = bench ? [...port, ...bench, 0] : [...port, 0]
  const minV = Math.min(...allValues)
  const maxV = Math.max(...allValues)
  const rng = maxV - minV || 1

  const portPath = toPath(port, minV, rng)

  const spanDays: Record<ReturnPeriod, number> = {
    '7D': 7,
    '1M': 30,
    '3M': 91,
    YTD: 172,
    '1Y': 365,
    ALL: 1095,
  }
  const span = spanDays[period] || 365

  function dateAt(i: number): string {
    const d = new Date()
    d.setDate(d.getDate() - Math.round(span * (1 - (N > 1 ? i / (N - 1) : 1))))
    return fDate(d)
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    setHi(Math.round(t * (N - 1)))
  }

  const xPct = (i: number) => (xAt(i, N) / W) * 100
  const yPct = (v: number) => (yAt(v, minV, rng) / H) * 100
  const tipLeft = hi != null ? Math.min(88, Math.max(12, xPct(hi))) : 0

  const y0 = yAt(0, minV, rng)

  return (
    <div className="mk-chart-wrap" onMouseMove={onMouseMove} onMouseLeave={() => setHi(null)}>
      <svg
        className="mk-chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="perf-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--good)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--good)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill under the portfolio line */}
        <path
          d={portPath + ` L ${W - PAD} ${H - PAD} L ${PAD} ${H - PAD} Z`}
          fill="url(#perf-grad)"
        />
        {/* 0% baseline rule */}
        <line
          x1={PAD}
          x2={W - PAD}
          y1={y0}
          y2={y0}
          stroke="var(--line-strong)"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.7"
          vectorEffect="non-scaling-stroke"
        />
        {/* Benchmark (dashed) */}
        {bench && (
          <path
            d={toPath(bench, minV, rng)}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1.4"
            strokeDasharray="4 4"
            opacity="0.7"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {/* Portfolio line */}
        <path
          d={portPath}
          fill="none"
          stroke="var(--good)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {/* Hover crosshair */}
        {hi != null && (
          <line
            x1={xAt(hi, N)}
            x2={xAt(hi, N)}
            y1={PAD}
            y2={H - PAD}
            stroke="var(--muted)"
            strokeWidth="1"
            opacity="0.45"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* 0% axis label */}
      <span className="mk-chart-axis" style={{ top: yPct(0) + '%' }}>
        0%
      </span>

      {/* Hover tooltip */}
      {hi != null && (
        <>
          <span
            className="mk-chart-dot good"
            style={{ left: xPct(hi) + '%', top: yPct(port[hi]!) + '%' }}
          />
          {bench && (
            <span
              className="mk-chart-dot mut"
              style={{ left: xPct(hi) + '%', top: yPct(bench[hi]!) + '%' }}
            />
          )}
          <div className="mk-chart-tip" style={{ left: tipLeft + '%' }}>
            <div className="mk-chart-tip-d">{dateAt(hi)}</div>
            <div className="mk-chart-tip-r">
              <i className="good" />
              <span>
                {formatMessage({ id: 'performance.ui.Portfolio', defaultMessage: 'Portfolio' })}
              </span>
              <b className={port[hi]! >= 0 ? 'pos' : 'neg'}>{fmtReturn(port[hi]!)}</b>
            </div>
            {bench && (
              <div className="mk-chart-tip-r">
                <i className="mut" />
                <span>{benchLabel}</span>
                <b className={bench[hi]! >= 0 ? 'pos' : 'neg'}>{fmtReturn(bench[hi]!)}</b>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── StatInfo ──────────────────────────────────────────────────────────────────
// Inline hover-triggered info tooltip ("italic i" button + popover).
// Uses .stat-info/.stat-pop classes from design.css (CSS-only hover, no JS).

interface StatInfoProps {
  text: string
  alignRight?: boolean
}

function StatInfo({ text, alignRight }: StatInfoProps) {
  const { formatMessage } = useAppIntl()
  return (
    <span
      className="stat-info"
      tabIndex={0}
      role="button"
      aria-label={formatMessage({
        id: 'performance.ui.WhatDoesThisMean',
        defaultMessage: 'What does this mean?',
      })}
    >
      i<span className={'stat-pop' + (alignRight ? ' r' : '')}>{text}</span>
    </span>
  )
}

// ── StatBar ───────────────────────────────────────────────────────────────────
// Renders the prototype StatBar on top of .sumbar / .sumcard (.sk/.sv).
// The SummaryBar ui/ primitive doesn't carry .sk-row / StatInfo — we extend it here.

interface StatBarProps {
  cards: PerfStatCard[]
}

function StatBar({ cards }: StatBarProps) {
  // We can't pass the help text to the SummaryBar primitive (it doesn't know StatInfo),
  // so we render the cards ourselves using the same .sumbar/.sumcard/.sk/.sv structure.
  return (
    <div className="sumbar">
      {cards.map((c, i) => (
        <div className="sumcard" key={c.key}>
          <div className="sk">
            <span className="sk-row">
              {c.label}
              {c.help && <StatInfo text={c.help} alignRight={i >= cards.length - 2} />}
            </span>
          </div>
          <div className={`sv${c.tone ? ' ' + c.tone : ''}`}>{c.value}</div>
        </div>
      ))}
    </div>
  )
}

// ── PerformanceTab ────────────────────────────────────────────────────────────
// The Performance sub-tab of Investments. Uses usePerformanceView for all data
// and renders the exact prototype layout: StatBar → Returns panel → Risk panel.

const PERIODS: ReturnPeriod[] = ['1M', '3M', 'YTD', '1Y', 'ALL']
const periodMessages = defineMessages({
  '7D': { id: 'performance.period.7d', defaultMessage: '7D' },
  '1M': { id: 'performance.period.1m', defaultMessage: '1M' },
  '3M': { id: 'performance.period.3m', defaultMessage: '3M' },
  YTD: { id: 'performance.period.ytd', defaultMessage: 'YTD' },
  '1Y': { id: 'performance.period.1y', defaultMessage: '1Y' },
  ALL: { id: 'performance.period.all', defaultMessage: 'ALL' },
})

// With nothing held there is no return to show yet, and the useful thing to say is why the
// screen is worth filling: one return across every broker, measured against the market.
const ADD_ALL_MESSAGE =
  'Help me add my investments from every broker and account I use, so I can compare my ' +
  'whole portfolio with the market. Ask which brokers I use; I can send screenshots or ' +
  'statements instead of typing. Ask me one thing at a time.'

export function PerformanceTab({
  noHoldings = false,
  onAddHolding,
  onAskLucius,
}: {
  /** Nothing is held yet: pitch adding holdings instead of a price-history explanation. */
  noHoldings?: boolean
  onAddHolding?: () => void
  onAskLucius?: (text: string) => void
} = {}) {
  const { formatMessage } = useAppIntl()
  const vm = usePerformanceView()

  const {
    period,
    setPeriod,
    benchKey,
    setBenchKey,
    loading,
    error,
    benchmarks,
    data,
    sufficient,
    returnCards,
    benchCards,
    series,
    hasBenchmark,
    benchLabel,
    risk,
  } = vm

  // Combine return + bench cards for the StatBar
  const allCards = [...returnCards, ...benchCards]

  // Plain-English risk summary: if no risk data yet, skip it.
  const rkNote = risk?.summary ?? ''

  const isEmpty = !loading && !error && data && !sufficient

  return (
    <div className="mk-subt">
      {/* Loading skeleton */}
      {!noHoldings && loading && !data && (
        <TabSkeleton
          variant="performance"
          label={formatMessage({
            id: 'performance.ui.LoadingReturns',
            defaultMessage: 'Loading returns…',
          })}
          header={false}
        />
      )}

      {/* Error */}
      {!noHoldings && !loading && error && (
        <ErrorState
          message={formatMessage({
            id: 'performance.ui.CouldnTLoadPerformanceData',
            defaultMessage: "Couldn't load performance data.",
          })}
        />
      )}

      {/* Empty: nothing held yet */}
      {noHoldings && (
        <EmptyState
          fill
          icon={<ChartLine size={28} strokeWidth={1.5} aria-hidden="true" />}
          title={formatMessage({
            id: 'performance.ui.YourWholePortfolioVsTheMarket',
            defaultMessage: 'Your whole portfolio vs the market',
          })}
          body={formatMessage({
            id: 'performance.ui.AddYourHoldingsFromEveryBrokerAndAccountToSeeOneReturnForAllOfThemMeasuredAgainstIndicesLikeTheSP500AndMsciWorld',
            defaultMessage:
              'Add your holdings from every broker and account to see one return for all of them, measured against indices like the S&P 500 and MSCI World.',
          })}
          action={
            <Cluster gap="--space-3" justify="center">
              {onAddHolding && (
                <Button variant="primary" size="sm" onClick={onAddHolding}>
                  {formatMessage({
                    id: 'performance.ui.AddHolding',
                    defaultMessage: 'Add holding',
                  })}
                </Button>
              )}
              <LuciusCta
                label={formatMessage({
                  id: 'performance.ui.AddWithLucius',
                  defaultMessage: 'Add with Lucius',
                })}
                message={ADD_ALL_MESSAGE}
                onAskLucius={onAskLucius}
              />
            </Cluster>
          }
        />
      )}

      {/* Empty: not enough history */}
      {!noHoldings && isEmpty && (
        <EmptyState
          title={formatMessage({
            id: 'performance.ui.NoReturnToShowYet',
            defaultMessage: 'No return to show yet',
          })}
          body={
            data?.data_quality.market_since
              ? formatMessage(
                  {
                    id: 'performance.insufficientHistory',
                    defaultMessage:
                      'Not enough price history before {date} to compute a return over this window.',
                  },
                  { date: data.data_quality.market_since },
                )
              : formatMessage({
                  id: 'performance.ui.FiguresAppearOncePricesHaveBeenCollectedAcrossTheWindow',
                  defaultMessage:
                    'Figures appear once prices have been collected across the window.',
                })
          }
        />
      )}

      {/* Main content */}
      {!noHoldings && data && !error && sufficient && (
        <>
          {/* Return stat cards */}
          {allCards.length > 0 && <StatBar cards={allCards} />}

          {/* Returns & performance panel */}
          <div className="mk-panel">
            <div className="mk-panel-head">
              <span className="mk-panel-title">
                {formatMessage({
                  id: 'performance.ui.ReturnsPerformance',
                  defaultMessage: 'Returns & performance',
                })}
              </span>
              <span className="mk-panel-spacer" />
              {benchmarks.length > 0 && (
                <select
                  className="mk-toolsel"
                  value={benchKey}
                  onChange={(e) => setBenchKey(e.target.value)}
                  aria-label={formatMessage({
                    id: 'performance.ui.CompareAgainstABenchmark',
                    defaultMessage: 'Compare against a benchmark',
                  })}
                >
                  {benchmarks.map((b) => (
                    <option key={b.key || 'none'} value={b.key}>
                      {b.key
                        ? formatMessage(
                            { id: 'performance.compareWith', defaultMessage: 'vs {benchmark}' },
                            { benchmark: b.label },
                          )
                        : formatMessage({
                            id: 'performance.noBenchmark',
                            defaultMessage: 'No benchmark',
                          })}
                    </option>
                  ))}
                </select>
              )}
              <div className="mk-seg">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={period === p ? 'on' : ''}
                    onClick={() => setPeriod(p)}
                  >
                    {formatMessage(periodMessages[p])}
                  </button>
                ))}
              </div>
            </div>
            <div className="mk-panel-body">
              {series.length >= 2 ? (
                <PerfChart
                  series={series}
                  hasBenchmark={hasBenchmark}
                  benchLabel={benchLabel}
                  period={period}
                />
              ) : (
                <EmptyState
                  title={formatMessage({
                    id: 'performance.ui.NoChartData',
                    defaultMessage: 'No chart data',
                  })}
                  body={formatMessage({
                    id: 'performance.ui.NotEnoughDailyPointsToDrawACurveForThisWindow',
                    defaultMessage: 'Not enough daily points to draw a curve for this window.',
                  })}
                />
              )}
              <div className="mk-legend">
                <span>
                  <i style={{ background: 'var(--good)' }} />
                  {formatMessage({
                    id: 'performance.ui.YourPortfolio',
                    defaultMessage: 'Your portfolio',
                  })}
                </span>
                {hasBenchmark && (
                  <span>
                    <i style={{ background: 'var(--muted)' }} />
                    {benchLabel}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Risk-adjusted return panel */}
          <div className="mk-panel">
            <div className="mk-panel-head">
              <span className="mk-panel-title">
                {formatMessage({
                  id: 'performance.ui.RiskAdjustedReturn',
                  defaultMessage: 'Risk-adjusted return',
                })}
              </span>
              <span className="mk-panel-spacer" />
              <span className="mk-panel-sub">
                {formatMessage(
                  {
                    id: 'performance.riskCaption',
                    defaultMessage: '{period} • how much risk earned this return',
                  },
                  { period: formatMessage(periodMessages[period]) },
                )}
              </span>
            </div>
            <div className="mk-panel-body">
              {risk ? (
                <>
                  <div className="rk-grid">
                    <div className="rk-cell">
                      <div className="rk-k">
                        <span className="sk-row">
                          {formatMessage({
                            id: 'performance.ui.VolatilityAnn',
                            defaultMessage: 'Volatility (ann.)',
                          })}
                          <StatInfo
                            text={formatMessage({
                              id: 'performance.ui.HowMuchYourDailyReturnsSwingAnnualizedHigherMeansABumpierRideToTheSameDestination',
                              defaultMessage:
                                'How much your daily returns swing, annualized. Higher means a bumpier ride to the same destination.',
                            })}
                          />
                        </span>
                      </div>
                      <div className="rk-v">
                        {risk.vol != null ? risk.vol.toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '—'}
                      </div>
                    </div>
                    <div className="rk-cell">
                      <div className="rk-k">
                        <span className="sk-row">
                          {formatMessage(
                            { id: 'performance.beta', defaultMessage: 'Beta vs {symbol}' },
                            { symbol: risk.betaSymbol },
                          )}
                          <StatInfo
                            text={formatMessage(
                              {
                                id: 'performance.betaHelp',
                                defaultMessage:
                                  'How much you move relative to {symbol}. 1.0 tracks it; above 1 amplifies its moves, below 1 dampens them.',
                              },
                              { symbol: risk.betaSymbol },
                            )}
                          />
                        </span>
                      </div>
                      <div className="rk-v">{risk.beta != null ? risk.beta.toLocaleString(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</div>
                    </div>
                    <div className="rk-cell">
                      <div className="rk-k">
                        <span className="sk-row">
                          {formatMessage({
                            id: 'performance.ui.SharpeRatio',
                            defaultMessage: 'Sharpe ratio',
                          })}
                          <StatInfo
                            text={formatMessage({
                              id: 'performance.ui.ReturnEarnedPerUnitOfRiskAboveThe35RiskFreeRateAbove1IsGoodAbove2IsExcellent',
                              defaultMessage:
                                'Return earned per unit of risk, above the ~3.5% risk-free rate. Above 1 is good, above 2 is excellent.',
                            })}
                          />
                        </span>
                      </div>
                      <div
                        className="rk-v"
                        style={{
                          color:
                            risk.sharpe == null
                              ? 'var(--ink)'
                              : risk.sharpe >= 1
                                ? 'var(--good)'
                                : risk.sharpe < 0
                                  ? 'var(--bad)'
                                  : 'var(--ink)',
                        }}
                      >
                        {risk.sharpe != null ? risk.sharpe.toLocaleString(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                      </div>
                    </div>
                    <div className="rk-cell">
                      <div className="rk-k">
                        <span className="sk-row">
                          {formatMessage({
                            id: 'performance.ui.MaxDrawdown',
                            defaultMessage: 'Max drawdown',
                          })}
                          <StatInfo
                            text={formatMessage({
                              id: 'performance.ui.TheWorstPeakToTroughDropOverThisPeriodYourDeepestDipBeforeRecoveringSmallerIsCalmer',
                              defaultMessage:
                                'The worst peak-to-trough drop over this period — your deepest dip before recovering. Smaller is calmer.',
                            })}
                            alignRight
                          />
                        </span>
                      </div>
                      <div className="rk-v" style={{ color: 'var(--bad)' }}>
                        {risk.mdd != null ? risk.mdd.toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '—'}
                      </div>
                    </div>
                  </div>
                  {rkNote && <p className="inc-chart-cap">{rkNote}</p>}
                </>
              ) : (
                <EmptyState
                  title={formatMessage({
                    id: 'performance.ui.RiskMetricsUnavailable',
                    defaultMessage: 'Risk metrics unavailable',
                  })}
                  body={formatMessage({
                    id: 'performance.ui.NotEnoughPriceHistoryToComputeRiskAdjustedMetricsForThisWindow',
                    defaultMessage:
                      'Not enough price history to compute risk-adjusted metrics for this window.',
                  })}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
