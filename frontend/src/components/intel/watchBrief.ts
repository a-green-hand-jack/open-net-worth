import { createIntl, type IntlShape } from 'react-intl'
// The Watchlist pulse's brief, written from the same rows the list shows (no LLM — like the
// Holdings brief's own text): the day's most unusual move, what's scheduled this week, and who is
// furthest ahead of / behind its comparison over the period on screen. How much of that it says
// follows the user's brief verbosity (Settings › Intelligence): 1 the loudest move only, 2 adds
// the next event, 3 (default) adds the period's best/worst in about two lines, 4 adds every event
// this week and the up/down/flagged counts. Level 5 is Lucius's narrative (useWatchBrief), which
// falls back to level 4 while it loads.

import { compact1, pct1 } from './pulseHelp'
import type { NextEvent, TrendPeriod, WatchPulseRow } from '../../types/watchPulse'

const englishIntl = createIntl({ locale: 'en' })

const MAX_LEN = 220 // ≈ two lines of the brief at desktop width
const DETAILED_MAX_LEN = 420 // ≈ three to four lines

export type BriefLevel = 1 | 2 | 3 | 4 | 5

const DRIVER: Record<string, string> = {
  company: 'company-specific',
  sector: 'with its sector',
  market: 'with the market',
}

function today(rows: WatchPulseRow[], listName?: string | null, headline = false, intl: IntlShape = englishIntl): string | null {
  const priced = rows.filter((r) => r.day_pct != null)
  if (!priced.length) return null
  const loud = priced
    .filter((r) => r.move?.z != null && Math.abs(r.move.z) >= 2)
    .sort((a, b) => Math.abs(b.move!.z!) - Math.abs(a.move!.z!))[0]
  if (loud) {
    const d = loud.day_pct!
    const kind = loud.move?.kind && DRIVER[loud.move.kind] ? loud.move.kind : 'none'
    const why = kind === 'none' ? '' : intl.formatMessage({ id: 'intel.watch.driverKind', defaultMessage: ', {kind, select, company {company-specific} sector {with its sector} market {with the market} other {}}' }, { kind })
    return (
      intl.formatMessage({ id: 'intel.watch.unusualMove', defaultMessage: '{ticker} {direction, select, up {rose} other {fell}} {percent}% today — {multiple}× its usual move{why}.' }, { ticker: loud.ticker, direction: d >= 0 ? 'up' : 'down', percent: Math.abs(d).toFixed(1), multiple: compact1(Math.abs(loud.move!.z!)), why })
    )
  }
  const n = priced.length
  const names = listName
    ? intl.formatMessage({ id: 'intel.watch.listNames', defaultMessage: 'the {count} {count, plural, one {name} other {names}} on {list}' }, { count: n, list: listName })
    : intl.formatMessage({ id: 'intel.watch.watchedNames', defaultMessage: 'your {count} watched {count, plural, one {name} other {names}}' }, { count: n })
  const top = [...priced].sort((a, b) => Math.abs(b.day_pct!) - Math.abs(a.day_pct!))[0]!
  if (Math.abs(top.day_pct!) < 0.05) return intl.formatMessage({ id: 'intel.watch.quietDay', defaultMessage: 'A quiet day across {names}.' }, { names })
  if (headline) return intl.formatMessage({ id: 'intel.watch.topToday', defaultMessage: '{ticker} moved most today, {percent}.' }, { ticker: top.ticker, percent: pct1(top.day_pct!) })
  return intl.formatMessage({ id: 'intel.watch.normalDay', defaultMessage: 'A normal day across {names}; {ticker} moved most, {percent}.' }, { names, ticker: top.ticker, percent: pct1(top.day_pct!) })
}

function when(days: number, intl: IntlShape): string {
  return intl.formatMessage({ id: 'intel.watch.when', defaultMessage: '{days, plural, =0 {today} =1 {tomorrow} other {in # days}}' }, { days })
}

function coming(rows: WatchPulseRow[], limit = 2, intl: IntlShape = englishIntl): string | null {
  const soon = rows
    .filter((r): r is WatchPulseRow & { next_event: NextEvent } => !!r.next_event)
    .filter((r) => r.next_event.in_days <= 7)
    .sort((a, b) => a.next_event.in_days - b.next_event.in_days)
  const [first, ...rest] = soon
  if (!first) return null
  const e = first.next_event
  let line = intl.formatMessage({ id: 'intel.watch.event', defaultMessage: '{ticker} {kind, select, earnings {reports earnings} other {goes ex-dividend}} {when}' }, { ticker: first.ticker, kind: e.kind, when: when(e.in_days, intl) })
  if (rest.length && limit > 0) {
    const named = rest
      .slice(0, limit)
      .map((r) => intl.formatMessage({ id: 'intel.watch.eventShort', defaultMessage: '{ticker} ({kind, select, earnings {earnings} other {ex-dividend}})' }, { ticker: r.ticker, kind: r.next_event.kind }))
    const more = rest.length - named.length
    line += intl.formatMessage({ id: 'intel.watch.also', defaultMessage: '; also this week: {names}{more, plural, =0 {} other { and # more}}' }, { names: named.join(', '), more })
  }
  return `${line}.`
}

function trend(rows: WatchPulseRow[], period: TrendPeriod, benchSymbol: string | null | undefined, intl: IntlShape) {
  const gaps = rows
    .map((r) => ({ r, gap: r.trend?.[period]?.vs_bench_pct }))
    .filter((x): x is { r: WatchPulseRow; gap: number } => x.gap != null)
    .sort((a, b) => b.gap - a.gap)
  if (!gaps.length) return null
  const vs = (x: { r: WatchPulseRow; gap: number }) =>
    intl.formatMessage({ id: 'intel.watch.versus', defaultMessage: '{percent} vs {comparison}' }, { percent: pct1(x.gap), comparison: x.r.compare?.symbol || benchSymbol || intl.formatMessage({ id: 'intel.watch.itsComparison', defaultMessage: 'its comparison' }) })
  const best = gaps[0]!
  const worst = gaps[gaps.length - 1]!
  const periodPhrase = intl.formatMessage({ id: 'intel.watch.period', defaultMessage: '{period, select, 1M {Over the past month} 3M {Over the past 3 months} other {Over the past year}}' }, { period })
  if (gaps.length === 1) return intl.formatMessage({ id: 'intel.watch.singleTrend', defaultMessage: '{period}, {ticker} is {comparison}.' }, { period: periodPhrase, ticker: best.r.ticker, comparison: vs(best) })
  return (
    intl.formatMessage({ id: 'intel.watch.multiTrend', defaultMessage: '{period}, {best} did best against its comparison ({bestComparison}), {worst} worst ({worstComparison}).' }, { period: periodPhrase, best: best.r.ticker, bestComparison: vs(best), worst: worst.r.ticker, worstComparison: vs(worst) })
  )
}

function counts(rows: WatchPulseRow[], intl: IntlShape): string | null {
  const priced = rows.filter((r) => r.day_pct != null)
  if (!priced.length) return null
  const up = priced.filter((r) => r.day_pct! >= 0.05).length
  const down = priced.filter((r) => r.day_pct! <= -0.05).length
  const flagged = rows.filter((r) => (r.findings ?? []).length > 0).length
  return intl.formatMessage({ id: 'intel.watch.counts', defaultMessage: '{up} up, {down} down{flagged, plural, =0 {} other {, # flagged}}.' }, { up, down, flagged })
}

export function watchBrief(
  rows: WatchPulseRow[],
  period: TrendPeriod,
  benchSymbol?: string | null,
  /** The list the rows are (a list tab), for "the 6 names on Semis". */
  listName?: string | null,
  /** The user's brief verbosity; 5 (Lucius's narrative) renders as 4 here. */
  level: BriefLevel = 3,
  intl: IntlShape = englishIntl,
): string | null {
  const first = today(rows, listName, level === 1, intl)
  if (!first || level === 1) return first
  const detailed = level >= 4
  const event = coming(rows, level === 2 ? 0 : detailed ? rows.length : 2, intl)
  const lead = event ? `${first} ${event}` : first
  if (level === 2) return lead
  const parts = [lead, trend(rows, period, benchSymbol, intl), detailed ? counts(rows, intl) : null]
  const cap = detailed ? DETAILED_MAX_LEN : MAX_LEN
  let out = lead
  for (const part of parts.slice(1)) {
    if (!part) continue
    if (event && `${out} ${part}`.length > cap) break
    out = `${out} ${part}`
  }
  return out
}
