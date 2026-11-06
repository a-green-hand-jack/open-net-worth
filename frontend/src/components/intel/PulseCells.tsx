import type { IntlShape } from 'react-intl'
import { useAppIntl } from '../../i18n/useAppIntl'
import { fPct } from '../../utils/format'
import { Sparkline } from '../ui/Sparkline'
import { Explain } from './Explain'
import { fLevel, moveNote, nextEventText, pct1, toneColor } from './pulseHelp'
import type { TrendPeriod, WatchPulseRow } from '../../types/watchPulse'

// The cells of one pulse row, left to right after the ticker: the trend line against its
// comparison (a dotted stand-in when there's no history for the period), the next scheduled
// event, and today's move with how unusual it is for this stock.

// The 52-week context and your buy zone, in words — the trend cell's tooltip when there's no line.
function rangeText(row: WatchPulseRow, sym: string, intl: IntlShape): string | null {
  const lo = row.week52_low
  const hi = row.week52_high
  if (lo == null || hi == null) return null
  const fromHigh = row.from_high_pct ?? 0
  const where =
    fromHigh >= -0.1 ? intl.formatMessage({ id: 'intel.trend.atHigh', defaultMessage: 'at the 52-week high' }) : intl.formatMessage({ id: 'intel.trend.belowHigh', defaultMessage: '{percent}% below the high' }, { percent: Math.abs(fromHigh).toFixed(1) })
  const top = row.intent?.buy_below
  const zone = top
    ? row.intent?.buy_above
      ? `${fLevel(row.intent.buy_above)}–${fLevel(top)}`
      : `≤ ${fLevel(top)}`
    : null
  return (
    intl.formatMessage({ id: 'intel.trend.range', defaultMessage: '52-week range {low} to {high} · {where}' }, { low: sym + fLevel(lo), high: sym + fLevel(hi), where }) +
    (zone ? intl.formatMessage({ id: 'intel.trend.zone', defaultMessage: ' · your buy zone {zone}' }, { zone }) : '')
  )
}

// No line for this period: a flat dotted stand-in the same shape as a trend, never a second kind
// of chart in the column. The history is fetched in the background, so this is usually brief.
function TrendEmpty({
  row,
  period,
  sym,
}: {
  row: WatchPulseRow
  period: TrendPeriod
  sym: string
}) {
  const intl = useAppIntl()
  const text = row.trend ? intl.formatMessage({ id: 'intel.trend.shortHistory', defaultMessage: 'Under {period, select, 1M {a month} 3M {3 months} other {a year}} of history' }, { period }) : intl.formatMessage({ id: 'intel.trend.noHistory', defaultMessage: 'No history yet' })
  const tip = [
    intl.formatMessage({ id: 'intel.trend.historyHelp', defaultMessage: '{text} — the line appears once enough daily closes are on file' }, { text }),
    rangeText(row, sym, intl),
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <Explain
      className="intel-pulse-trend intel-pulse-trend--empty"
      role="img"
      label={tip}
      text={tip}
    >
      <span className="intel-pulse-trend-flat" aria-hidden="true" />
      <span className="intel-pulse-trend-cap">{text}</span>
    </Explain>
  )
}

// A short dashed stroke — the caption's key to the dashed line it names.
function DashKey() {
  return (
    <svg className="intel-pulse-trend-key" width="12" height="6" viewBox="0 0 12 6" aria-hidden>
      <line x1="0" y1="3" x2="12" y2="3" />
    </svg>
  )
}

export function TrendCell({
  row,
  period,
  sym,
  benchSymbol,
}: {
  row: WatchPulseRow
  period: TrendPeriod
  sym: string
  benchSymbol?: string | null
}) {
  const intl = useAppIntl()
  const s = row.trend?.[period]
  if (!s || s.closes.length < 2) return <TrendEmpty row={row} period={period} sym={sym} />
  const intent = row.intent
  const band = intent?.buy_below ? { lo: intent.buy_above ?? 0, hi: intent.buy_below } : null
  const cmp = row.compare?.symbol || benchSymbol || intl.formatMessage({ id: 'intel.trend.market', defaultMessage: 'market' })
  const cmpWords =
    row.compare?.kind === 'sector' ? intl.formatMessage({ id: 'intel.trend.sectorFund', defaultMessage: '{comparison}, its sector fund' }, { comparison: cmp }) : intl.formatMessage({ id: 'intel.trend.benchmark', defaultMessage: '{comparison}, your benchmark' }, { comparison: cmp })
  const first = s.closes[0]!
  const last = s.closes[s.closes.length - 1]!
  // The comparison rebased to the stock's first close, so both lines start together and the gap
  // at the end is the move against it (its own price units would flatten the stock's line).
  const b0 = s.bench?.[0]
  const compare = s.bench && b0 ? s.bench.map((b) => (b / b0) * first) : null
  const tip = [
    intl.formatMessage({ id: 'intel.trend.change', defaultMessage: '{period, select, 1M {Past month} 3M {Past 3 months} other {Past year}}: {first} → {last} ({change})' }, { period, first: sym + fLevel(first), last: sym + fLevel(last), change: pct1(s.pct) }),
    s.vs_bench_pct != null && compare
      ? intl.formatMessage({ id: 'intel.trend.dashed', defaultMessage: 'Dashed line: {comparison} — {percent} vs it' }, { comparison: cmpWords, percent: pct1(s.vs_bench_pct) })
      : null,
    s.vs_market_pct != null && benchSymbol
      ? intl.formatMessage({ id: 'intel.trend.vsBenchmark', defaultMessage: '{percent} vs {benchmark}, your benchmark' }, { percent: pct1(s.vs_market_pct), benchmark: benchSymbol })
      : null,
    compare ? intl.formatMessage({ id: 'intel.trend.shading', defaultMessage: "Shading: green where it's ahead of {comparison}, red where it's behind" }, { comparison: cmp }) : null,
    band ? intl.formatMessage({ id: 'intel.trend.band', defaultMessage: 'Tinted band: your buy zone' }) : null,
    period === '1Y' && row.week52_low != null && row.week52_high != null
      ? intl.formatMessage({ id: 'intel.trend.rangeCompact', defaultMessage: '52-week range {low}–{high}' }, { low: sym + fLevel(row.week52_low), high: sym + fLevel(row.week52_high) })
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <Explain className="intel-pulse-trend" role="img" label={tip} text={tip}>
      <Sparkline
        className="intel-pulse-spark"
        values={s.closes}
        compare={compare}
        band={band}
        gapFill
        endDot
        up={s.pct >= 0}
        width={120}
        height={26}
        fluid
      />
      <span className="intel-pulse-trend-cap">
        <span style={{ color: toneColor(s.pct) }}>{pct1(s.pct)}</span>
        {s.vs_bench_pct != null && compare && (
          <span className="intel-pulse-trend-vs">
            {' · '}
            <DashKey />
            {intl.formatMessage({ id: 'intel.trend.vs', defaultMessage: '{percent} vs {comparison}' }, { percent: pct1(s.vs_bench_pct), comparison: cmp })}
          </span>
        )}
      </span>
    </Explain>
  )
}

export function NextCell({ row }: { row: WatchPulseRow }) {
  const intl = useAppIntl()
  const t = row.next_event ? nextEventText(row.next_event, intl) : null
  if (!t) return <span className="intel-pulse-next intel-pulse-next--none">—</span>
  return (
    <Explain
      className={`intel-pulse-next${t.soon ? ' intel-pulse-next--soon' : ''}`}
      text={t.title}
    >
      <span className="intel-pulse-next-main">{t.main}</span>
      <span className="intel-pulse-next-sub">{t.date}</span>
    </Explain>
  )
}

export function TodayCell({ row }: { row: WatchPulseRow }) {
  const intl = useAppIntl()
  const note = moveNote(row.move, intl)
  return (
    <span className="intel-pulse-today" role="group" aria-label={intl.formatMessage({ id: "intel.field.0d417f64", defaultMessage: "Change today" })}>
      <span className="intel-pulse-day money" style={{ color: toneColor(row.day_pct) }}>
        {row.day_pct != null ? fPct(row.day_pct, { sign: true }) : '—'}
      </span>
      {note && (
        <Explain
          className={`intel-pulse-today-sub${note.loud ? ' intel-pulse-today-sub--loud' : ''}`}
          text={note.title}
        >
          {note.text}
        </Explain>
      )}
    </span>
  )
}
