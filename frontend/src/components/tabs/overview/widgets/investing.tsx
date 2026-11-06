import { fFixed } from '../../../../utils/format'
// Overview v2 — Investing widget group (beyond net worth/movers): FX rates,
// dividends, holdings map (treemap), allocation drift, performance vs
// benchmark, unrealized gains, dividend forecast.
//
// Real data sources (see docs/adr/2026-07-22-overview-tab-redesign-faithful-port.md,
// decision 8 — a genuine backend gap ships an honest partial state, never a
// fabricated number):
//   fx          — GET /api/prices?fx=<currencies> (services/prices.py fetch_live);
//                 currencies derived from useOverviewData().rows (held, non-base)
//                 PLUS any base/quote pair the user adds via the "Watch pairs"
//                 Data setting (def.settings `type: 'pairs'`, WidgetFullscreen's
//                 generic PairsEditor) — an arbitrary cross is derived from two
//                 vs-base rates client-side (fxCross: rateVsBase(b)/rateVsBase(q)),
//                 mirroring the handoff's fxCross() over its own CCY table.
//                 GAP: fetch_live discards the FX symbols' own previousClose before
//                 it reaches the response, so there is no day-over-day change for a
//                 currency pair today — the widget shows the live rate only and says
//                 so, rather than inventing a % move.
//   dividends   — GET /api/income/calendar (upcoming, kind=dividend only) +
//                 GET /api/income (YTD received, summed client-side from `events`
//                 filtered to this calendar year — the summary endpoint itself only
//                 exposes trailing-12m/all-time, not YTD).
//   rep-treemap — useOverviewData().rows (same ComputedRow[] the Investments tab
//                 uses) grouped by Sector/Asset type/Account/None. No treemap chart
//                 type is wired into <OvChart> (chartjs-chart-treemap isn't a
//                 dependency) — adding a new charting library for one widget was
//                 judged disproportionate, so this renders a flexbox-based
//                 proportional-tile layout instead of a true squarified treemap:
//                 each group's own row height is proportional to its total value
//                 (flexGrow), each tile's width within its group is proportional to
//                 that holding's value — genuinely two-axis-proportional, just not
//                 packed as an optimal-aspect-ratio 2D treemap.
//   inv-drift   — the server's `drift` fold (portfolio_analytics._drift): per-class actual vs
//                 the profile's target_allocation, flagged at `threshold_pp`
//                 (rebalance.DRIFT_FLAG_PP — the one threshold every surface reads),
//                 over the rebalanceable investment book only.
//   inv-perf    — GET /api/returns (api/portfolio.ts's fetchReturns) against the profile's
//                 `preferred_benchmark` (usePreferredBenchmark) — the same index the
//                 Performance sub-tab saves its picker to. The period enum has no 6-month
//                 bucket (7D/1M/3M/YTD/1Y/ALL), so the def and this widget offer 3M/1Y/All.
//   inv-gains   — the server's `gains` fold: one line per instrument (positions summed),
//                 cost-basis-known vested holdings only, sorted by |P&L| desc.
//   inv-divfc   — GET /api/income/calendar?days=366 (kind=dividend only), bucketed
//                 by payment month into the next 12 calendar months.

import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
import { assetClassLabel } from '../assetClassMessages'
import { ArrowLeftRight, ArrowRight } from 'lucide-react'
import { authFetch } from '../../../../api/client'
import { fetchReturns } from '../../../../api/portfolio'
import { useDataVersion } from '../../../../hooks/useDataVersion'
import type {
  ComputedRow,
  PortfolioReturns,
  PricesResponse,
  ReturnPeriod,
} from '../../../../types/portfolio'
import type { TreemapFacet } from '../../../../types/aggregates'
import { ASSET_CLASS_COLOR, paletteColor } from '../../../../utils/constants'
import { useMaskText } from '../../../../utils/amountMask'
import { fBase, fDate, fPct, fPrice, getBaseCurrency, plClass } from '../../../../utils/format'
import { MaskedText, Money, SegmentedControl, Text } from '../../../ui'
import { useDividendSummary } from '../../../../hooks/serverState'
import { usePreferredBenchmark } from '../../../../hooks/usePreferredBenchmark'
import type { WidgetContentProps, WidgetDefinition } from '../types'
import { ChartToggleMenu } from '../ChartToggleMenu'
import { WidgetShell } from '../WidgetShell'
import { rowCap } from '../widgetDisplayShared'
import { WidgetPlaceholder, WidgetSkeleton } from '../WidgetPlaceholder'
import { useAnalytics, useValuedRows } from '../useWidgetData'
import { GRID, OvChart, TICK, axes, legend, resolveColor } from '../charts'

// ── shared local fetch hook ──────────────────────────────────────────────────
// A tiny widget-local read hook (mirrors OverviewDataContext's own inline
// authFetch pattern) — these four endpoints are each needed by exactly one
// widget in this group, so a shared context entry isn't warranted.

interface JsonState<T> {
  data: T | null
  loading: boolean
  error: boolean
}

function useJson<T>(url: string | null): JsonState<T> {
  const [state, setState] = useState<JsonState<T>>({ data: null, loading: !!url, error: false })
  useEffect(() => {
    if (!url) {
      setState({ data: null, loading: false, error: false })
      return
    }
    let alive = true
    setState((s) => ({ ...s, loading: true, error: false }))
    authFetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (alive) setState({ data: d, loading: false, error: false })
      })
      .catch(() => {
        if (alive) setState({ data: null, loading: false, error: true })
      })
    return () => {
      alive = false
    }
  }, [url])
  return state
}

function sourceFooter(
  def: WidgetDefinition,
  onNavigate: ((tab: string) => void) | undefined,
  label: string,
) {
  if (!onNavigate || !def.source) return undefined
  const tab = def.source.tab
  return (
    <button type="button" className="ov-panel-link" onClick={() => onNavigate(tab)}>
      {label} <ArrowRight size={12} aria-hidden="true" />
    </button>
  )
}

// ── FX rates ─────────────────────────────────────────────────────────────────

// A pair configured via the "Watch pairs" Data setting (WidgetFullscreen's
// generic `type: 'pairs'` editor, `PairsEditor`) — an arbitrary base/quote
// cross, not necessarily involving the portfolio's own base currency.
function parsePairs(raw: unknown): [string, string][] {
  const arr = Array.isArray(raw) ? raw : []
  return arr
    .filter(
      (p): p is [string, string] =>
        Array.isArray(p) && p.length === 2 && typeof p[0] === 'string' && typeof p[1] === 'string',
    )
    .map(([b, q]) => [b.toUpperCase(), q.toUpperCase()] as [string, string])
    .filter(([b, q]) => b && q && b !== q)
}

// Pairs the user flipped (stored by their unflipped "B/Q" key) read as Q per B
// instead — VND/SGD at 0.00005 is unreadable, SGD/VND at ~20,000 is not.
function parseFlipped(raw: unknown): Set<string> {
  return new Set(Array.isArray(raw) ? raw.filter((k): k is string => typeof k === 'string') : [])
}

/** What the book holds in a currency, net of what it owes in it: a net-negative position (an
 *  overdrawn wallet, a loan in that currency) is owed, never a negative amount "held". */
const Fx: ComponentType<WidgetContentProps> = ({ instance, def, onPatch }) => {
  const { formatMessage } = useAppIntl()
  const { analytics: portfolio } = useAnalytics()
  const base = getBaseCurrency()

  // Value held per non-base currency, already summed and ordered server-side.
  const exposure = portfolio?.fx_exposure ?? []
  const exposureByCcy = useMemo(
    () => new Map(exposure.map((e) => [e.currency, e.value])),
    [exposure],
  )
  const heldCurrencies = useMemo(() => exposure.map((e) => e.currency), [exposure])

  const watchPairs = useMemo(() => parsePairs(instance.config?.pairs), [instance.config?.pairs])
  const flipped = useMemo(() => parseFlipped(instance.config?.flipped), [instance.config?.flipped])
  const toggleFlip = (key: string) => {
    const next = new Set(flipped)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    onPatch({ config: { ...instance.config, flipped: [...next] } })
  }

  // Held currencies are always shown against the portfolio base; user-picked
  // "watch pairs" can be ANY base/quote cross (mirrors the handoff's
  // FX_HELD.concat(watch) + fxCross). Dedup by the literal "b/q" string, held
  // pairs first, so a watch pair that reconstructs an already-held row never
  // doubles up.
  const pairs = useMemo(() => {
    const seen = new Set<string>()
    const out: { b: string; q: string; held: boolean }[] = []
    const candidates: [string, string, boolean][] = [
      ...heldCurrencies.map((c): [string, string, boolean] => [c, base, true]),
      ...watchPairs.map((p): [string, string, boolean] => [p[0], p[1], false]),
    ]
    for (const [b, q, held] of candidates) {
      if (b === q) continue
      const k = `${b}/${q}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ b, q, held })
    }
    return out
  }, [heldCurrencies, watchPairs, base])

  // Every currency that appears on either side of a pair (minus base itself,
  // whose rate is always 1) needs a live quote to cross against.
  const fetchCurrencies = useMemo(() => {
    const s = new Set<string>()
    pairs.forEach(({ b, q }) => {
      if (b !== base) s.add(b)
      if (q !== base) s.add(q)
    })
    return [...s].sort()
  }, [pairs, base])

  const qs = fetchCurrencies.length
    ? new URLSearchParams({ fx: fetchCurrencies.join(',') }).toString()
    : null
  const { data, loading, error } = useJson<PricesResponse>(qs ? `/api/prices?${qs}` : null)
  const fx = data?.fx || {}
  // rateVsBase(c) = base units per 1 unit of c.
  const rateVsBase = (c: string): number | undefined => (c === base ? 1 : fx[c])
  const crossRate = (b: string, q: string): number | undefined => {
    const rb = rateVsBase(b)
    const rq = rateVsBase(q)
    return rb != null && rq != null ? rb / rq : undefined
  }

  if (!pairs.length) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={formatMessage(
            {
              id: 'overview.fx.empty',
              defaultMessage: 'All your holdings are in {base} — nothing to convert.',
            },
            { base },
          )}
        />
      </WidgetShell>
    )
  }

  return (
    <WidgetShell title={instance.title} base={def.title}>
      <div className="ov-fx-list">
        {pairs.map(({ b, q, held }) => {
          const key = `${b}/${q}`
          const flip = flipped.has(key)
          const [from, to] = flip ? [q, b] : [b, q]
          const rate = crossRate(from, to)
          return (
            <div className="ov-fx-row" key={key}>
              <button
                type="button"
                className="ov-fx-pair"
                onClick={() => toggleFlip(key)}
                title={formatMessage(
                  { id: 'overview.fx.showPair', defaultMessage: 'Show {from} per {to}' },
                  { from, to },
                )}
                aria-label={formatMessage(
                  {
                    id: 'overview.fx.flipPair',
                    defaultMessage: '{from} / {to}. Show {from} per {to} instead',
                  },
                  { from, to },
                )}
              >
                {from} / {to}
                <ArrowLeftRight size={12} aria-hidden="true" className="ov-fx-flip" />
              </button>
              <span className="ov-fx-note">
                {held ? (
                  <MaskedText>
                    {exposureByCcy.get(b)! < 0
                      ? formatMessage(
                          { id: 'overview.fx.owed', defaultMessage: '{amount} owed' },
                          { amount: fBase(-exposureByCcy.get(b)!) },
                        )
                      : formatMessage(
                          { id: 'overview.fx.held', defaultMessage: '{amount} held' },
                          { amount: fBase(exposureByCcy.get(b)!) },
                        )}
                  </MaskedText>
                ) : (
                  formatMessage({ id: 'overview.fx.watching', defaultMessage: 'Watching' })
                )}
              </span>
              <span className="ov-fx-rate money">
                {rate != null ? `${fPrice(rate, 4)} ${to}` : loading ? '…' : '—'}
              </span>
            </div>
          )
        })}
      </div>
      {error && !Object.keys(fx).length && (
        <Text as="p" size="xs" tone="bad">
          {formatMessage({ id: 'overview.fx.error', defaultMessage: "Couldn't fetch live rates." })}
        </Text>
      )}
      <Text as="p" size="xs" tone="faint">
        {formatMessage({
          id: 'overview.fx.help',
          defaultMessage: "Live mid rates. Day-over-day change isn't tracked for currencies yet.",
        })}
      </Text>
    </WidgetShell>
  )
}

// ── Dividends ────────────────────────────────────────────────────────────────

const Dividends: ComponentType<WidgetContentProps> = ({ instance, def, onNavigate }) => {
  const { formatMessage } = useAppIntl()
  // "Received YTD" is summed server-side (`GET /api/income`'s own summary exposes trailing-12m
  // and all-time, never year-to-date — which is why this used to be a client-side reduce over
  // the raw event list), and the upcoming feed arrives already filtered to dividends and
  // date-sorted.
  const income = useDividendSummary()
  const ytd = income.data?.received_ytd ?? 0
  const upcoming = income.data?.upcoming ?? []
  const cap = rowCap(instance, def)
  const visible = cap ? upcoming.slice(0, cap) : upcoming
  const loading = income.initialLoading

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      meta={
        <>
          {formatMessage(
            { id: 'overview.dividends.ytd', defaultMessage: '{amount} received YTD' },
            { amount: <Money as="span">{fBase(ytd)}</Money> },
          )}
        </>
      }
      footer={sourceFooter(
        def,
        onNavigate,
        formatMessage({ id: 'overview.dividends.history', defaultMessage: 'Dividend history' }),
      )}
    >
      {loading ? (
        <WidgetSkeleton rows={3} />
      ) : upcoming.length === 0 ? (
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.dividends.empty',
            defaultMessage: 'No upcoming dividend payments in the next 90 days.',
          })}
        />
      ) : (
        <div className="ov-div-list">
          {visible.map((p) => (
            <div className="ov-up-row" key={`${p.position_id}-${p.pay_date}`}>
              <span className="ov-up-date">{fDate(p.pay_date)}</span>
              <span className="ov-sym">{p.symbol}</span>
              <span className="ov-up-lbl">
                {p.name}
                {p.status === 'estimated' && (
                  <span>
                    {formatMessage({
                      id: 'overview.dividends.estimated',
                      defaultMessage: ' • est.',
                    })}
                  </span>
                )}
              </span>
              <span className="ov-up-amt money pos">+{fBase(p.amount_base)}</span>
            </div>
          ))}
          {upcoming.length > visible.length && (
            <div className="ov-more">
              {formatMessage(
                { id: 'overview.dividends.more', defaultMessage: '+{count} more expected' },
                { count: upcoming.length - visible.length },
              )}
            </div>
          )}
        </div>
      )}
    </WidgetShell>
  )
}

// ── Holdings map (treemap) ───────────────────────────────────────────────────

type GroupFacet = 'Sector' | 'Asset type' | 'Account' | 'None'
const GROUP_OPTIONS: { value: GroupFacet; label: string }[] = [
  { value: 'Sector', label: 'Sector' },
  { value: 'Asset type', label: 'Type' },
  { value: 'Account', label: 'Account' },
  { value: 'None', label: 'None' },
]

// The picker's labels → the facet keys the server groups by. Grouping holdings and totalling
// each group is a sum of money, so it happens in backend/services/overview; this widget lays
// the (already-proportional) tiles out and colours them.
const FACET_KEY: Record<GroupFacet, TreemapFacet> = {
  Sector: 'sector',
  'Asset type': 'asset_class',
  Account: 'account',
  None: 'none',
}

interface TreemapLeaf {
  /** The instrument's largest position — display fields (label, ticker, day %) come from it. */
  row: ComputedRow
  /** Server-summed figures for ALL of the instrument's positions inside this group. */
  value: number
  pctOfShown: number
  dayPl: number | null
  pl: number | null
  plPct: number | null
  positions: number
  sym: string
}
interface TreemapGroup {
  key: string
  label: string
  color: string
  total: number
  leaves: TreemapLeaf[]
}

function facetLabel(intl: IntlShape, key: string, facet: GroupFacet): string {
  if (facet === 'Asset type') return assetClassLabel(intl, key)
  return key
}

function facetColor(key: string, facet: GroupFacet): string {
  if (facet === 'Asset type') return ASSET_CLASS_COLOR[key] ?? 'var(--accent)'
  return paletteColor(key)
}

function signed(n: number, digits = 1): string {
  return (n >= 0 ? '+' : '') + fFixed(n, digits)
}

// The popup behind a tile (hover, or a tap on touch). Every figure here is a server-computed
// row field rendered verbatim — the tile itself may show none of it once it is too small to
// carry text, so this is where a holding's detail lives.
function treemapTip(intl: IntlShape, l: TreemapLeaf): string {
  const { formatMessage } = intl
  const r = l.row
  const lines = [r.label]
  const where =
    l.positions > 1
      ? formatMessage(
          { id: 'overview.treemap.accounts', defaultMessage: '{count} accounts' },
          { count: l.positions },
        )
      : (r.account_name ?? '')
  const who = [l.sym !== r.label ? l.sym : '', where].filter(Boolean).join(' · ')
  if (who) lines.push(who)
  lines.push(
    formatMessage(
      { id: 'overview.treemap.share', defaultMessage: '{amount} • {percent}% of shown' },
      { amount: fBase(l.value), percent: fFixed(l.pctOfShown, 1) },
    ),
  )
  if (r.day_change_pct != null) {
    const money = l.dayPl != null ? ` (${fBase(l.dayPl)})` : ''
    lines.push(
      formatMessage(
        { id: 'overview.treemap.today', defaultMessage: '{percent}% today{money}' },
        { percent: signed(r.day_change_pct), money },
      ),
    )
  } else {
    lines.push(
      formatMessage({ id: 'overview.treemap.noMove', defaultMessage: 'No daily move data' }),
    )
  }
  if (l.pl != null && l.plPct != null) {
    lines.push(
      formatMessage(
        { id: 'overview.treemap.unrealized', defaultMessage: 'Unrealized {amount} ({percent}%)' },
        { amount: fBase(l.pl), percent: signed(l.plPct) },
      ),
    )
  }
  return lines.join('\n')
}

function heatBg(pct: number | null | undefined): string {
  if (pct == null) return 'color-mix(in srgb, var(--line) 55%, transparent)'
  const alpha = Math.min(72, 16 + Math.abs(pct) * 9)
  const tok = pct >= 0 ? '--good' : '--bad'
  return `color-mix(in srgb, var(${tok}) ${alpha.toFixed(0)}%, transparent)`
}

const HoldingsMap: ComponentType<WidgetContentProps> = ({
  instance,
  def,
  onPatch,
  onOpenAsset,
}) => {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const groupLabels: Record<GroupFacet, string> = {
    Sector: formatMessage({ id: 'overview.option.sector', defaultMessage: 'Sector' }),
    'Asset type': formatMessage({ id: 'overview.treemap.type', defaultMessage: 'Type' }),
    Account: formatMessage({ id: 'overview.option.account', defaultMessage: 'Account' }),
    None: formatMessage({ id: 'overview.none', defaultMessage: 'None' }),
  }
  const { analytics: portfolio, loading } = useAnalytics()
  const { rows } = useValuedRows()
  const facet = (
    GROUP_OPTIONS.some((o) => o.value === instance.config?.group)
      ? instance.config?.group
      : 'Sector'
  ) as GroupFacet
  const map = portfolio?.holdings_map
  const rowByKey = useMemo(
    () => new Map(rows.map((r) => [String(r.position_id || r.instrument_id || r.label || ''), r])),
    [rows],
  )
  const groups: TreemapGroup[] = useMemo(
    () =>
      (map?.groups[FACET_KEY[facet]] ?? []).map((g) => ({
        key: g.key,
        label: facetLabel(intl, g.key, facet),
        color: facetColor(g.key, facet),
        total: g.total,
        leaves: g.leaves
          .map((leaf) => {
            const row = rowByKey.get(leaf.key)
            return row
              ? {
                  row,
                  value: leaf.value,
                  pctOfShown: leaf.pct_of_shown,
                  dayPl: leaf.day_pl,
                  pl: leaf.pl,
                  plPct: leaf.pl_pct,
                  positions: leaf.positions,
                  sym: row.symbol || row.ticker || row.label,
                }
              : null
          })
          .filter((l): l is NonNullable<typeof l> => l !== null) as TreemapLeaf[],
      })),
    [map, facet, rowByKey, intl],
  )
  const shown = map?.shown ?? 0
  const total = map?.holdings ?? 0
  const shownTotal = map?.shown_total ?? 0
  const flat = facet === 'None'

  if (loading) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetSkeleton rows={4} />
      </WidgetShell>
    )
  }
  if (!groups.length) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.treemap.empty',
            defaultMessage: 'No priced holdings yet — add positions to see the map.',
          })}
        />
      </WidgetShell>
    )
  }

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      fill
      subtitle={formatMessage({
        id: 'overview.treemap.subtitle',
        defaultMessage: "Size = value • color = today's move",
      })}
      meta={<Money as="span">{fBase(shownTotal)}</Money>}
      actions={
        <ChartToggleMenu
          ariaLabel={formatMessage({ id: 'overview.setting.group', defaultMessage: 'Group by' })}
          value={facet}
          onChange={(v) => onPatch({ config: { ...instance.config, group: v } })}
          options={GROUP_OPTIONS.map((o) => ({ ...o, label: groupLabels[o.value] }))}
        />
      }
      footer={
        total > shown ? (
          <Text as="p" size="xs" tone="faint">
            {formatMessage(
              {
                id: 'overview.treemap.showing',
                defaultMessage: 'Showing the top {count} holdings by value.',
              },
              { count: shown },
            )}
          </Text>
        ) : undefined
      }
    >
      <div className="ov-treemap">
        {groups.map((g) => (
          <div
            key={g.key}
            className="ov-treemap-group"
            style={{ flexGrow: Math.max(g.total, 1), flexBasis: 0 }}
          >
            {!flat && (
              <div className="ov-treemap-group-head">
                <i className="ov-treemap-group-dot" style={{ background: g.color }} />
                <span className="ov-treemap-group-label">{g.label}</span>
                <span className="ov-treemap-group-total money">{fBase(g.total)}</span>
              </div>
            )}
            <div className="ov-treemap-tiles">
              {g.leaves.map((l) => {
                const chg = l.row.day_change_pct
                const clickable = !!onOpenAsset && !!(l.row.ticker || l.row.symbol)
                return (
                  <div
                    key={l.row.position_id || l.row.instrument_id}
                    className={`ov-treemap-tile${clickable ? ' ov-treemap-tile--clickable' : ''}`}
                    style={{ flexGrow: Math.max(l.value, 1), background: heatBg(chg) }}
                    aria-label={l.row.label}
                    data-tip={treemapTip(intl, l)}
                    data-tip-color={g.color}
                    data-tip-tap={
                      clickable
                        ? formatMessage({
                            id: 'overview.treemap.tapAgain',
                            defaultMessage: 'Tap again to open',
                          })
                        : undefined
                    }
                    onClick={
                      clickable
                        ? () => onOpenAsset!(l.row.ticker || l.row.symbol || l.sym)
                        : undefined
                    }
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                  >
                    <span className="ov-treemap-tile-sym">{l.sym}</span>
                    {chg != null && (
                      <span className="ov-treemap-tile-chg">
                        {(chg >= 0 ? '+' : '') + fFixed(chg, 1)}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  )
}

// ── Allocation drift ─────────────────────────────────────────────────────────

const AllocationDrift: ComponentType<WidgetContentProps> = ({ instance, def }) => {
  const maskText = useMaskText()
  const intl = useAppIntl()
  const { formatMessage } = intl
  // Actual-vs-target shares, the drift in percentage points, AND the trade that would close
  // each gap are all computed server-side against the profile's target allocation — the same
  // `threshold_pp` (rebalance.DRIFT_FLAG_PP) the Investments tab's Rebalance panel uses.
  const { analytics: portfolio } = useAnalytics()
  const drift = portfolio?.drift
  const total = drift?.total ?? 0
  const hasTargets = !!drift?.has_targets
  const thresholdPp = drift?.threshold_pp ?? 5

  if (total <= 0) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.drift.empty',
            defaultMessage: 'Add investment holdings to see allocation drift.',
          })}
        />
      </WidgetShell>
    )
  }
  if (!hasTargets) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.drift.noTarget',
            defaultMessage:
              'Set a target asset mix in Investments → Holdings → Allocation to see drift.',
          })}
        />
      </WidgetShell>
    )
  }

  const driftRows = drift?.rows ?? []
  const maxDrift = Math.max(...driftRows.map((r) => Math.abs(r.drift_pp)), 1)
  const topTrade = drift?.top_trade ?? null

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      footer={
        topTrade ? (
          <Text as="p" size="xs" tone="muted">
            {topTrade.drift_pp > 0
              ? formatMessage(
                  {
                    id: 'overview.drift.trim',
                    defaultMessage: 'Trim {asset} by ~{amount} to reach target.',
                  },
                  {
                    asset: assetClassLabel(intl, topTrade.key),
                    amount: <Money as="span">{fBase(Math.abs(topTrade.trade_base))}</Money>,
                  },
                )
              : formatMessage(
                  {
                    id: 'overview.drift.topUp',
                    defaultMessage: 'Top up {asset} by ~{amount} to reach target.',
                  },
                  {
                    asset: assetClassLabel(intl, topTrade.key),
                    amount: <Money as="span">{fBase(Math.abs(topTrade.trade_base))}</Money>,
                  },
                )}
          </Text>
        ) : (
          <Text as="p" size="xs" tone="faint">
            {formatMessage(
              {
                id: 'overview.drift.within',
                defaultMessage:
                  "You're within {threshold}pp of every target — no rebalancing needed.",
              },
              { threshold: thresholdPp },
            )}
          </Text>
        )
      }
    >
      <div className="ov-drift-list">
        {driftRows.map((r) => (
          <div key={r.key} className="ov-drift-row">
            <div className="ov-drift-head">
              <i
                className="ov-drift-dot"
                style={{ background: ASSET_CLASS_COLOR[r.key] ?? 'var(--accent)' }}
              />
              <span className="ov-drift-label">{assetClassLabel(intl, r.key)}</span>
              <span className="ov-drift-delta money">
                {r.drift_pp > 0 ? '+' : ''}
                {fFixed(r.drift_pp, 1)}pp
              </span>
            </div>
            <div
              className="ov-drift-track"
              title={maskText(
                formatMessage(
                  {
                    id: 'overview.drift.actualTarget',
                    defaultMessage: 'Actual {actual}% • target {target}%',
                  },
                  { actual: fFixed(r.current_pct, 1), target: fFixed(r.target_pct, 1) },
                ),
              )}
            >
              <div className="ov-drift-center" />
              <div
                className={'ov-drift-fill ' + (r.drift_pp >= 0 ? 'over' : 'under')}
                style={{ width: `${(Math.abs(r.drift_pp) / maxDrift) * 50}%` }}
              />
            </div>
            <div className="ov-drift-nums">
              <span>
                {formatMessage(
                  { id: 'overview.drift.now', defaultMessage: '{percent} now' },
                  { percent: <span className="money">{fFixed(r.current_pct, 1)}%</span> },
                )}
              </span>
              <span className="ov-drift-tgt">
                {formatMessage(
                  { id: 'overview.drift.target', defaultMessage: '{percent} target' },
                  { percent: <span className="money">{fFixed(r.target_pct, 1)}%</span> },
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  )
}

// ── Performance vs benchmark ─────────────────────────────────────────────────

// GET /api/returns has no 6-month bucket, so the def's range setting offers exactly these.
const RANGE_OPTIONS: { value: ReturnPeriod; label: string }[] = [
  { value: '3M', label: '3M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: 'All' },
]

function fReturnPct(frac: number): string {
  return fPct(frac, { fraction: true, sign: true })
}

function useReturnsData(period: ReturnPeriod, benchmark: string): JsonState<PortfolioReturns> {
  const [state, setState] = useState<JsonState<PortfolioReturns>>({
    data: null,
    loading: true,
    error: false,
  })
  const anyWriteV = useDataVersion('*')
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: false }))
    fetchReturns(period, benchmark || undefined)
      .then((d) => {
        if (alive) setState({ data: d, loading: false, error: false })
      })
      .catch(() => {
        if (alive) setState({ data: null, loading: false, error: true })
      })
    return () => {
      alive = false
    }
  }, [period, benchmark, anyWriteV])
  return state
}

export function returnsLabel(intl: IntlShape, data: PortfolioReturns): string {
  if (intl.locale === 'en' || intl.locale.startsWith('en-')) return data.label
  const message = data.label_message
  if (
    !message ||
    !message.params ||
    typeof message.params !== 'object' ||
    Array.isArray(message.params) ||
    Object.keys(message.params).length !== 1
  )
    return data.label
  if (
    message.id === 'returns.label.since' &&
    typeof message.params.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(message.params.date)
  ) {
    return intl.formatMessage(
      { id: 'overview.performance.since', defaultMessage: 'Since {date}' },
      { date: fDate(message.params.date) },
    )
  }
  if (message.id === 'returns.label.period' && typeof message.params.period === 'string') {
    switch (message.params.period) {
      case '7D':
        return intl.formatMessage({
          id: 'overview.performance.period7d',
          defaultMessage: 'Last 7 days',
        })
      case '1M':
        return intl.formatMessage({
          id: 'overview.performance.period1m',
          defaultMessage: 'Last 1 month',
        })
      case '3M':
        return intl.formatMessage({
          id: 'overview.performance.period3m',
          defaultMessage: 'Last 3 months',
        })
      case 'YTD':
        return intl.formatMessage({
          id: 'overview.performance.periodYtd',
          defaultMessage: 'Year to date',
        })
      case '1Y':
        return intl.formatMessage({
          id: 'overview.performance.period1y',
          defaultMessage: 'Last 1 year',
        })
      case 'ALL':
        return intl.formatMessage({
          id: 'overview.performance.periodAll',
          defaultMessage: 'All time',
        })
      case 'CUSTOM':
        return intl.formatMessage({
          id: 'overview.performance.periodCustom',
          defaultMessage: 'Custom range',
        })
    }
  }
  return data.label
}

const Performance: ComponentType<WidgetContentProps> = ({ instance, def, onPatch }) => {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const configuredRange = instance.config?.range as string | undefined
  const period: ReturnPeriod = (
    RANGE_OPTIONS.some((o) => o.value === configuredRange) ? configuredRange : '1Y'
  ) as ReturnPeriod
  const benchKey = usePreferredBenchmark()
  const { data, loading, error } = useReturnsData(period, benchKey)

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      fill
      meta={data ? returnsLabel(intl, data) : undefined}
      footer={
        data?.data_quality.sufficient && !data.comparison ? (
          <Text as="p" size="xs" tone="faint">
            {formatMessage(
              {
                id: 'overview.performance.noComparison',
                defaultMessage: 'No {benchmark} comparison for this range.',
              },
              { benchmark: benchKey },
            )}
          </Text>
        ) : undefined
      }
      actions={
        <SegmentedControl
          ariaLabel={formatMessage({ id: 'overview.setting.range', defaultMessage: 'Range' })}
          value={period}
          onChange={(v) => onPatch({ config: { ...instance.config, range: v } })}
          options={RANGE_OPTIONS.map((o) => ({
            ...o,
            label:
              o.value === '3M'
                ? formatMessage({ id: 'overview.option.threeMonths', defaultMessage: '3M' })
                : o.value === '1Y'
                  ? formatMessage({ id: 'overview.option.oneYear', defaultMessage: '1Y' })
                  : formatMessage({ id: 'overview.all', defaultMessage: 'All' }),
          }))}
        />
      }
    >
      {loading ? (
        <WidgetSkeleton rows={3} />
      ) : error || !data ? (
        <Text as="p" size="sm" tone="bad">
          {formatMessage({
            id: 'overview.performance.error',
            defaultMessage: "Couldn't load performance data.",
          })}
        </Text>
      ) : !data.data_quality.sufficient ? (
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.performance.insufficient',
            defaultMessage: 'Not enough price history yet for this range.',
          })}
        />
      ) : (
        <div className="ov-perf">
          <div className="ov-perf-stats">
            <div className="ov-perf-stat">
              <Text as="span" size="xs" tone="faint">
                {data.annualized
                  ? formatMessage({
                      id: 'overview.performance.twrAnnual',
                      defaultMessage: 'TWR (ann.)',
                    })
                  : 'TWR'}
              </Text>
              <Text
                as="span"
                size="base"
                weight={600}
                tone={
                  data.twr && (data.annualized ? data.twr.annualized : data.twr.period_return) >= 0
                    ? 'good'
                    : 'bad'
                }
                className="money"
              >
                {data.twr
                  ? fReturnPct(data.annualized ? data.twr.annualized : data.twr.period_return)
                  : '—'}
              </Text>
            </div>
            {data.comparison && data.comparison.benchmark_twr != null && (
              <div className="ov-perf-stat">
                <Text as="span" size="xs" tone="faint">
                  {data.comparison.benchmark.symbol}
                </Text>
                <Text
                  as="span"
                  size="base"
                  weight={600}
                  tone={data.comparison.benchmark_twr >= 0 ? 'good' : 'bad'}
                >
                  {fReturnPct(data.comparison.benchmark_twr)}
                </Text>
              </div>
            )}
            {data.comparison?.excess_return != null && (
              <div className="ov-perf-stat">
                <Text as="span" size="xs" tone="faint">
                  {formatMessage({ id: 'overview.performance.excess', defaultMessage: 'Excess' })}
                </Text>
                <Text
                  as="span"
                  size="base"
                  weight={600}
                  tone={data.comparison.excess_return >= 0 ? 'good' : 'bad'}
                  className="money"
                >
                  {fReturnPct(data.comparison.excess_return)}
                </Text>
              </div>
            )}
          </div>
          <OvChart
            sig={`${period}|${benchKey}|${data.series.length}`}
            config={{
              type: 'line',
              data: {
                labels: data.series.map((p) => fDate(p.date)),
                datasets: [
                  {
                    label: formatMessage({ id: 'overview.performance.you', defaultMessage: 'You' }),
                    data: data.series.map((p) => p.portfolio * 100),
                    borderColor: resolveColor('var(--ink)'),
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.25,
                  },
                  ...(data.comparison
                    ? [
                        {
                          label: data.comparison.benchmark.symbol,
                          data: data.series.map((p) =>
                            p.benchmark != null ? p.benchmark * 100 : null,
                          ),
                          borderColor: resolveColor('var(--muted)'),
                          backgroundColor: 'transparent',
                          borderWidth: 1.5,
                          borderDash: [4, 3],
                          pointRadius: 0,
                          tension: 0.25,
                        },
                      ]
                    : []),
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: legend(!!data.comparison) },
                scales: {
                  x: { ticks: { color: TICK(), maxTicksLimit: 6 }, grid: { display: false } },
                  y: {
                    ticks: { color: TICK(), callback: (v: unknown) => `${v}%` },
                    grid: { color: GRID() },
                  },
                },
              },
            }}
          />
        </div>
      )}
    </WidgetShell>
  )
}

// ── Unrealized gains ─────────────────────────────────────────────────────────

const UnrealizedGains: ComponentType<WidgetContentProps> = ({ instance, def, onOpenAsset }) => {
  const { formatMessage } = useAppIntl()
  // The server decides WHICH rows have a known cost basis, their order (|P&L| desc), and the
  // total — the same `upl` figure the net-worth KPI strip shows, so the two always agree.
  const { analytics: portfolio, loading } = useAnalytics()
  const { rows } = useValuedRows()
  const rowByKey = useMemo(
    () => new Map(rows.map((r) => [String(r.position_id || r.instrument_id || r.label || ''), r])),
    [rows],
  )
  // One line per instrument: the server's summed value / P&L / P&L %, shown on the instrument's
  // largest position row (label, symbol, ticker).
  const gainRows = useMemo(
    () =>
      (portfolio?.gains.rows ?? []).flatMap((g) => {
        const row = rowByKey.get(g.key)
        return row ? [{ row, value: g.value, pl: g.pl, plPct: g.pl_pct }] : []
      }),
    [portfolio, rowByKey],
  )
  const totalPL = portfolio?.gains.total_pl ?? 0
  const cap = rowCap(instance, def)
  const visible = cap ? gainRows.slice(0, cap) : gainRows

  if (loading) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetSkeleton rows={4} />
      </WidgetShell>
    )
  }
  if (!gainRows.length) {
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.gains.empty',
            defaultMessage: 'No holdings with a known cost basis yet.',
          })}
        />
      </WidgetShell>
    )
  }

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      meta={
        <span className={`money ${plClass(totalPL)}`}>
          {totalPL >= 0 ? '+' : ''}
          {fBase(totalPL)}
        </span>
      }
    >
      <div className="ov-gains-list">
        {visible.map(({ row: r, value, pl, plPct }) => {
          const tone = plClass(pl)
          const label = r.label || r.symbol || r.ticker || '—'
          const clickable = !!onOpenAsset && !!(r.ticker || r.symbol)
          return (
            <div
              key={r.position_id ?? r.instrument_id ?? label}
              className={`ov-gains-row${clickable ? ' ov-gains-row--clickable' : ''}`}
              onClick={clickable ? () => onOpenAsset!(r.ticker || r.symbol || label) : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
            >
              <div className="ov-gains-name">
                {r.symbol && r.symbol !== label && <span className="ov-gains-sym">{r.symbol}</span>}
                <span className="ov-gains-label">{label}</span>
              </div>
              <div className="ov-gains-vals">
                <span className="ov-gains-mv money">{fBase(value)}</span>
                <span className={`ov-gains-pl money ${tone}`}>
                  {(pl ?? 0) >= 0 ? '+' : ''}
                  {fBase(pl ?? 0)}
                </span>
                <span className={`ov-gains-plpct ${tone}`}>
                  {plPct != null ? fPct(plPct, { sign: true }) : '—'}
                </span>
              </div>
            </div>
          )
        })}
        {gainRows.length > visible.length && (
          <div className="ov-more">
            {formatMessage(
              { id: 'overview.more', defaultMessage: '+{count} more' },
              { count: gainRows.length - visible.length },
            )}
          </div>
        )}
      </div>
    </WidgetShell>
  )
}

// ── Dividend forecast ────────────────────────────────────────────────────────

function monthLabel(ym: string, locale: string): string {
  const [y, m] = ym.split('-').map(Number) as [number, number]
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  )
}

const DividendForecast: ComponentType<WidgetContentProps> = ({ instance, def }) => {
  const { formatMessage, locale } = useAppIntl()
  // The next 12 calendar months, each already bucketed and summed server-side.
  const income = useDividendSummary()
  const buckets = (income.data?.forecast ?? []).map((b) => ({
    key: b.month,
    label: monthLabel(b.month, locale),
    amount: b.amount,
  }))
  const loading = income.initialLoading
  const error = !!income.error && income.data == null
  const total = income.data?.forecast_total ?? 0

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      fill
      meta={
        <>
          {formatMessage(
            { id: 'overview.dividendForecast.total', defaultMessage: '{amount} next 12m' },
            { amount: <Money as="span">{fBase(total)}</Money> },
          )}
        </>
      }
    >
      {loading ? (
        <WidgetSkeleton rows={3} />
      ) : error ? (
        <Text as="p" size="sm" tone="bad">
          {formatMessage({
            id: 'overview.dividendForecast.error',
            defaultMessage: "Couldn't load the dividend forecast.",
          })}
        </Text>
      ) : total <= 0 ? (
        <WidgetPlaceholder
          detail={formatMessage({
            id: 'overview.dividendForecast.empty',
            defaultMessage: 'No dividend income projected in the next 12 months.',
          })}
        />
      ) : (
        <OvChart
          sig={buckets.map((m) => `${m.key}:${m.amount}`).join(',')}
          config={{
            type: 'bar',
            data: {
              labels: buckets.map((m) => m.label),
              datasets: [
                {
                  data: buckets.map((m) => m.amount),
                  backgroundColor: resolveColor('var(--good)'),
                  borderRadius: 4,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: axes(),
            },
          }}
        />
      )}
    </WidgetShell>
  )
}

export const investingWidgetComponents: Record<string, ComponentType<WidgetContentProps>> = {
  fx: Fx,
  dividends: Dividends,
  'rep-treemap': HoldingsMap,
  'inv-drift': AllocationDrift,
  'inv-perf': Performance,
  'inv-gains': UnrealizedGains,
  'inv-divfc': DividendForecast,
}
