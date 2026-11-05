import { useMemo, useState } from 'react'
import { defineMessages, type IntlShape } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import './activity.css'
import { fCurrency } from '../../../utils/format'
import { SummaryBar, Stack, ErrorState, TabSkeleton, Button } from '../../ui'
import { ChevronDown, Check } from '../../../ui/icons'
import { Spark } from '../../../lucius/identity'
import type { StatCard } from '../../ui'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { BottomSheet } from '../../ui/BottomSheet'
import { FilterGroupList, FilterSheet } from './FilterSheet'
import { ActivityCards, ActivityRows } from './ActivityRows'
import { useActivityView } from './useActivityView'
import type { ActivityRow } from './useActivityView'

const rangeMessages = defineMessages({
  today: { id: 'activityRange.today', defaultMessage: 'Today' },
  '7d': { id: 'activityRange.7d', defaultMessage: 'Past 7 days' },
  '30d': { id: 'activityRange.30d', defaultMessage: 'Past 30 days' },
  '60d': { id: 'activityRange.60d', defaultMessage: 'Past 60 days' },
  '90d': { id: 'activityRange.90d', defaultMessage: 'Past 90 days' },
  mtd: { id: 'activityRange.mtd', defaultMessage: 'Month-to-date' },
  ytd: { id: 'activityRange.ytd', defaultMessage: 'Year-to-date' },
})
const shortRangeMessages = defineMessages({
  today: { id: 'activityRange.short.today', defaultMessage: 'Today' },
  '7d': { id: 'activityRange.short.7d', defaultMessage: 'Past 7d' },
  '30d': { id: 'activityRange.short.30d', defaultMessage: 'Past 30d' },
  '60d': { id: 'activityRange.short.60d', defaultMessage: 'Past 60d' },
  '90d': { id: 'activityRange.short.90d', defaultMessage: 'Past 90d' },
  mtd: { id: 'activityRange.short.mtd', defaultMessage: 'MTD' },
  ytd: { id: 'activityRange.short.ytd', defaultMessage: 'YTD' },
})
const filterMessages = defineMessages({
  all: { id: 'activityFilter.all', defaultMessage: 'All' },
  buy: { id: 'activityFilter.buy', defaultMessage: 'Buys' },
  sell: { id: 'activityFilter.sell', defaultMessage: 'Sells' },
  income: { id: 'activityFilter.income', defaultMessage: 'Income' },
  transfers: { id: 'activityFilter.transfers', defaultMessage: 'Transfers' },
  vest: { id: 'activityFilter.vest', defaultMessage: 'Vests' },
  fee: { id: 'activityFilter.fee', defaultMessage: 'Fees' },
})

function rangeText(key: string, intl: IntlShape, short = false): string {
  const messages = short ? shortRangeMessages : rangeMessages
  const descriptor = messages[key as keyof typeof messages]
  if (descriptor) return intl.formatMessage(descriptor)
  const quarter = /^q([1-4])-(\d{4})$/.exec(key)
  if (!quarter) return key
  const q = Number(quarter[1])
  const year = Number(quarter[2])
  const quarterText = intl.formatMessage(
    { id: 'activityRange.quarter', defaultMessage: 'Q{quarter} {year}' },
    { quarter: q, year },
  )
  if (short) return quarterText
  const month = new Intl.DateTimeFormat(intl.locale, { month: 'short', timeZone: 'UTC' })
  return intl.formatMessage(
    { id: 'activityRange.quarterFull', defaultMessage: '{quarter} • {start}–{end}' },
    {
      quarter: quarterText,
      start: month.format(new Date(Date.UTC(year, (q - 1) * 3))),
      end: month.format(new Date(Date.UTC(year, (q - 1) * 3 + 2))),
    },
  )
}

// ── Date-range options & bounds ───────────────────────────────────────────────

// Today's ISO date as a module-level constant, consistent within a session.
const TODAY = new Date().toISOString().slice(0, 10)

// Returns the last ~6 full quarters ending before the current partial quarter,
// starting from the quarter containing `todayISO`. The current (partial) quarter
// is included first so users can always filter to "this quarter so far".
export function buildRecentQuarters(
  todayISO: string,
): { k: string; label: string; short: string; start: string; end: string }[] {
  const [yr = 0, mo = 1] = todayISO.split('-').map(Number)
  // Quarter index 0-3 for months 1-12
  const curQ = Math.floor((mo - 1) / 3) // 0=Q1 1=Q2 2=Q3 3=Q4 (3 months per quarter)
  // Use integer (year*4 + curQ) to step backwards
  const curIdx = yr * 4 + curQ
  const QUARTER_MONTHS: [string, string, string][] = [
    ['01', '03', 'Jan–Mar'],
    ['04', '06', 'Apr–Jun'],
    ['07', '09', 'Jul–Sep'],
    ['10', '12', 'Oct–Dec'],
  ]
  // Last day of the quarter end-month (30 or 31; none end on 28/29)
  const QUARTER_END_DAY = ['31', '30', '30', '31']
  const quarters = []
  // Emit 6 quarters starting at current quarter
  for (let i = 0; i < 6; i++) {
    const idx = curIdx - i
    const q = idx % 4 // 0-3
    const y = Math.floor(idx / 4)
    const [mStart, mEnd, label] = QUARTER_MONTHS[q]!
    const k = `q${q + 1}-${y}`
    const start = `${y}-${mStart}-01`
    const end = `${y}-${mEnd}-${QUARTER_END_DAY[q]}`
    const qLabel = `Q${q + 1} ${y}`
    quarters.push({ k, label: `${qLabel} • ${label}`, short: qLabel, start, end })
  }
  return quarters
}

interface RangeOption {
  k: string
  label: string
  short: string
}

// Build the flat options list: fixed ranges + dynamic quarters
function buildRangeOptions(todayISO: string): (RangeOption & { start?: string; end?: string })[] {
  const fixed: RangeOption[] = [
    { k: 'today', label: 'Today', short: 'Today' },
    { k: '7d', label: 'Past 7 days', short: 'Past 7d' },
    { k: '30d', label: 'Past 30 days', short: 'Past 30d' },
    { k: '60d', label: 'Past 60 days', short: 'Past 60d' },
    { k: '90d', label: 'Past 90 days', short: 'Past 90d' },
    { k: 'mtd', label: 'Month-to-date', short: 'MTD' },
    { k: 'ytd', label: 'Year-to-date', short: 'YTD' },
  ]
  const quarters = buildRecentQuarters(todayISO)
  return [...fixed, ...quarters]
}

const ACT_RANGES = buildRangeOptions(TODAY)

// Returns [startISO, endISO] (inclusive) for the given range key.
export function actRangeBounds(k: string, todayISO: string = TODAY): [string, string] {
  const ago = (n: number) => {
    const d = new Date(todayISO)
    d.setDate(d.getDate() - n)
    return d.toISOString().slice(0, 10)
  }
  switch (k) {
    case 'today':
      return [todayISO, todayISO]
    case '7d':
      return [ago(7), todayISO]
    case '30d':
      return [ago(30), todayISO]
    case '60d':
      return [ago(60), todayISO]
    case '90d':
      return [ago(90), todayISO]
    case 'mtd':
      return [todayISO.slice(0, 7) + '-01', todayISO]
    case 'ytd':
      return [todayISO.slice(0, 4) + '-01-01', todayISO]
    default: {
      // Quarter key: q1-2026, q2-2025, etc.
      const match = ACT_RANGES.find((r) => r.k === k)
      if (match && 'start' in match && match.start && match.end) {
        return [match.start, match.end]
      }
      // Fallback: 90d
      return [ago(90), todayISO]
    }
  }
}

// ── Type filter ───────────────────────────────────────────────────────────────

// Filter group → type set membership (null = show all)
const FILTER_TYPES: Record<string, string[] | null> = {
  all: null,
  buy: ['buy'],
  sell: ['sell'],
  income: ['dividend', 'coupon', 'interest'],
  // Money or shares moving between venues — never a sale, never P&L.
  transfers: ['deposit', 'withdrawal', 'transfer'],
  vest: ['vest'],
  fee: ['fee'],
}

const FILTER_LABELS: [string, string][] = [
  ['all', 'All'],
  ['buy', 'Buys'],
  ['sell', 'Sells'],
  ['income', 'Income'],
  ['transfers', 'Transfers'],
  ['vest', 'Vests'],
  ['fee', 'Fees'],
]

// ── Sub-components ────────────────────────────────────────────────────────────

// The Realized-G/L tax callout that used to render here was REMOVED (owner call
// 2026-07-12): tax surfacing on the Activity tab is deferred until tax features
// are designed properly. The underlying data still exists (GET /api/realized-pnl)
// — only the banner is gone.

// ── Date-range dropdown ───────────────────────────────────────────────────────

interface RangeDropdownProps {
  range: string
  open: boolean
  presentation: 'menu' | 'sheet'
  onToggle: () => void
  onSelect: (k: string) => void
  onClose: () => void
}

// Wide: an anchored menu under the button. Phone: the app's standard bottom sheet, like the
// type filter beside it — a 13-row menu floating over the cards read as a stray card and
// clipped against the viewport edge (owner, 2026-09-04: "move date filters to bottom sheet").
function RangeDropdown({
  range,
  open,
  presentation,
  onToggle,
  onSelect,
  onClose,
}: RangeDropdownProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  return (
    <div className="act-dd-wrap">
      <button
        className="act-dd-btn"
        type="button"
        onClick={onToggle}
        aria-label={formatMessage(
          { id: 'investmentActivity.dateRangeLabel', defaultMessage: 'Date range: {range}' },
          { range: rangeText(range, intl, true) },
        )}
        aria-haspopup={presentation === 'sheet' ? 'dialog' : 'menu'}
        aria-expanded={open}
      >
        {rangeText(range, intl, true)}
        <span className="cv">
          <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
        </span>
      </button>
      {open && presentation === 'menu' && (
        <>
          <div className="act-dd-scrim" onClick={onClose} />
          <div className="act-dd-menu">
            {ACT_RANGES.map((rg) => (
              <button
                key={rg.k}
                className="act-dd-item"
                type="button"
                onClick={() => {
                  onSelect(rg.k)
                  onClose()
                }}
              >
                {rangeText(rg.k, intl)}
                {range === rg.k && <Check className="ck" size={14} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </>
      )}
      {open && presentation === 'sheet' && (
        <BottomSheet
          title={formatMessage({
            id: 'investmentActivity.dateRange',
            defaultMessage: 'Date range',
          })}
          onClose={onClose}
        >
          <FilterGroupList
            groups={[
              {
                title: formatMessage({ id: 'investmentActivity.range', defaultMessage: 'Range' }),
                options: ACT_RANGES.map((rg) => ({ id: rg.k, label: rangeText(rg.k, intl) })),
                value: range,
                onChange: onSelect,
              },
            ]}
            onPick={onClose}
          />
        </BottomSheet>
      )}
    </div>
  )
}

// ── Activity table ────────────────────────────────────────────────────────────

interface ActivityTableProps {
  rows: ActivityRow[]
  total: number
  baseCurrency: string
  range: string
  rangeOpen: boolean
  onRangeToggle: () => void
  onRangeSelect: (k: string) => void
  onRangeClose: () => void
  onAskLucius?: (text: string) => void
}

function ActivityTable({
  rows,
  total,
  baseCurrency,
  range,
  rangeOpen,
  onRangeToggle,
  onRangeSelect,
  onRangeClose,
  onAskLucius,
}: ActivityTableProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const isMobile = useIsMobile()
  const [filter, setFilter] = useState<string>('all')
  const [q, setQ] = useState('')

  // Three filters compose: type chip AND search text.
  // Date-range filtering is done server-side (rows already scoped by [dateFrom, dateTo]).
  const shown = useMemo(() => {
    const types = FILTER_TYPES[filter]
    return rows.filter((r) => {
      if (types && !types.includes(r.type)) return false
      if (q) {
        const haystack = (
          (r.symbol || '') +
          ' ' +
          (r.name || '') +
          ' ' +
          (r.detail || '') +
          ' ' +
          (r.account_name || '') +
          ' ' +
          r.type
        ).toLowerCase()
        if (!haystack.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [rows, filter, q])

  return (
    <section className="act-card">
      {/* Filter row. Wide: chips LEFT, [range dropdown + search] RIGHT. Phone: the chips
          collapse into the FilterSheet and the row becomes [search (fills) | range | filter] —
          the same merged-filter toolbar Holdings uses (owner, 2026-09-04). */}
      <div className="act-filter-row">
        <div className="act-filter">
          {FILTER_LABELS.map(([k]) => (
            <button
              key={k}
              type="button"
              className={'act-chip' + (filter === k ? ' on' : '')}
              onClick={() => setFilter(k)}
            >
              {formatMessage(filterMessages[k as keyof typeof filterMessages]!)}
            </button>
          ))}
        </div>
        <div className="act-filter-right">
          <RangeDropdown
            range={range}
            open={rangeOpen}
            presentation={isMobile ? 'sheet' : 'menu'}
            onToggle={onRangeToggle}
            onSelect={onRangeSelect}
            onClose={onRangeClose}
          />
          <input
            className="act-search-c"
            type="search"
            placeholder={formatMessage({
              id: 'investmentActivity.searchPlaceholder',
              defaultMessage: 'Search…',
            })}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={formatMessage({
              id: 'investmentActivity.search',
              defaultMessage: 'Search activity',
            })}
          />
          <FilterSheet
            className="act-type-filter"
            presentation={isMobile ? 'sheet' : 'popover'}
            title={formatMessage({
              id: 'investmentActivity.filter',
              defaultMessage: 'Filter activity',
            })}
            active={filter !== 'all'}
            groups={[
              {
                title: formatMessage({
                  id: 'investmentActivity.filterType',
                  defaultMessage: 'Type',
                }),
                options: FILTER_LABELS.map(([id]) => ({
                  id,
                  label: formatMessage(filterMessages[id as keyof typeof filterMessages]!),
                })),
                value: filter,
                onChange: setFilter,
              },
            ]}
          />
        </div>
      </div>
      {isMobile ? (
        <ActivityCards rows={shown} baseCurrency={baseCurrency} />
      ) : (
        <ActivityRows rows={shown} baseCurrency={baseCurrency} />
      )}
      <div
        style={{
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          padding: '16px 18px 18px',
        }}
      >
        <span
          className="ui-text--sm ui-text--faint"
          style={{ flex: 1, minWidth: 220, fontSize: 11, color: 'var(--faint)' }}
        >
          {formatMessage(
            {
              id: 'investmentActivity.showing',
              defaultMessage:
                'Showing {shown} of {total} transactions. Vests add shares without a cash movement.',
            },
            { shown: shown.length, total },
          )}
        </span>
        {onAskLucius && (
          <Button
            size="sm"
            variant="primary"
            className="fi-lucius"
            iconLeft={<Spark size={15} ariaHidden />}
            onClick={() => onAskLucius('Summarize my investment activity this month.')}
          >
            {formatMessage({
              id: 'investmentActivity.ask',
              defaultMessage: 'Ask Lucius about activity',
            })}
          </Button>
        )}
      </div>
    </section>
  )
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function buildSummaryCards(
  count30d: number,
  netInvested30d: number,
  income30d: number,
  fees30d: number,
  baseCurrency: string,
  intl: IntlShape,
): StatCard[] {
  const fAmt = (n: number) => fCurrency(Math.abs(n), baseCurrency)
  const sign = (n: number) => (n >= 0 ? '+' : '−')
  return [
    {
      label: intl.formatMessage({
        id: 'investmentActivity.summary.activity',
        defaultMessage: 'Activity • 30d',
      }),
      value: String(count30d),
    },
    {
      // Positive = money moved INTO investments; negative = net divestment.
      // No red tone either way — divesting is a direction, not a loss.
      label: intl.formatMessage({
        id: 'investmentActivity.summary.netInvested',
        defaultMessage: 'Net invested • 30d',
      }),
      value: sign(netInvested30d) + fAmt(netInvested30d),
    },
    {
      label: intl.formatMessage({
        id: 'investmentActivity.summary.income',
        defaultMessage: 'Income • 30d',
      }),
      value: '+' + fAmt(income30d),
      tone: income30d > 0 ? 'pos' : undefined,
    },
    // Fees have no direction (always a cost) — plain number, no forced sign
    // (owner call 2026-07-12: signs are for values that can go either way).
    {
      label: intl.formatMessage({
        id: 'investmentActivity.summary.fees',
        defaultMessage: 'Fees • 30d',
      }),
      value: fAmt(fees30d),
    },
  ]
}

// ── Main component ────────────────────────────────────────────────────────────

export interface ActivityTabProps {
  onAskLucius?: (text: string) => void
  onNavigate?: (tab: string) => void
}

export function ActivityTab({ onAskLucius }: ActivityTabProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  // Range state lives here so it drives the API fetch
  const [range, setRange] = useState('90d')
  const [rangeOpen, setRangeOpen] = useState(false)

  const [dateFrom, dateTo] = actRangeBounds(range)
  const { data, loading, error, retry } = useActivityView(dateFrom, dateTo)

  if (loading)
    return (
      <TabSkeleton
        variant="activity"
        label={formatMessage({
          id: 'investmentActivity.loading',
          defaultMessage: 'Loading activity…',
        })}
        header={false}
      />
    )
  if (error)
    return (
      <ErrorState
        message={formatMessage({
          id: 'investmentActivity.error',
          defaultMessage: 'Could not load activity.',
        })}
        onRetry={retry}
      />
    )
  if (!data) return null

  const { rows, total, summary } = data

  // NOTE: we intentionally do NOT early-return an empty state when rows are empty —
  // that would hide the filter row (range / chips / search) and trap the user with no
  // way to widen the range. The table body shows a "no activity in this range" message
  // instead, keeping all controls reachable.
  const cards = buildSummaryCards(
    summary.count30d,
    summary.netInvested30d,
    summary.income30d,
    summary.fees30d,
    summary.baseCurrency,
    intl,
  )

  return (
    <Stack gap="--space-5">
      <SummaryBar cards={cards} />
      <ActivityTable
        rows={rows}
        total={total}
        baseCurrency={data.baseCurrency}
        range={range}
        rangeOpen={rangeOpen}
        onRangeToggle={() => setRangeOpen((o) => !o)}
        onRangeSelect={setRange}
        onRangeClose={() => setRangeOpen(false)}
        onAskLucius={onAskLucius}
      />
    </Stack>
  )
}
