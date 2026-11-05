import { getNumberLocale } from '../../../utils/format'
// WatchBoard — the Watchlist sub-tab's two densities: broker-style cards (fixed columns: Last,
// Change, Change %, Volume) and a table whose columns the owner picks in Manage Columns.
// A name you also hold carries a Pos · P&L · Unrlz line under its symbol, as a broker shows it.

import { useAppIntl } from '../../../i18n/useAppIntl'
import { watchColumnLabel } from './watchColumnMessages'
import type { WatchQuoteRow } from '../../../types/watchlistQuotes'
import { Sparkline } from '../../ui/Sparkline'
import { IntelStoryDot } from '../../shared/IntelStoryDot'
import type { TickerStories } from '../../../hooks/useIntelStoryIndex'
import { fCompact, fPct, fUnitPrice } from '../../../utils/format'
import type { WatchSort, WatchSortKey } from './useWatchlistBoard'
import { fChange, fSignedBase, quoteDigits, tone, type WatchColumn } from './watchColumns'

interface CommonProps {
  rows: WatchQuoteRow[]
  sort: WatchSort
  onSort: (key: WatchSortKey) => void
  showSpark: boolean
  onOpen: (row: WatchQuoteRow) => void
  /** Upper-cased ticker → live Intel stories (useIntelStoryIndex), as on Holdings. */
  storyIndex?: Map<string, TickerStories>
  onOpenStory?: (storyId: string) => void
}

type StoryProps = Pick<CommonProps, 'storyIndex' | 'onOpenStory'>

function Stories({ r, storyIndex, onOpenStory }: { r: WatchQuoteRow } & StoryProps) {
  if (!onOpenStory) return null
  return <IntelStoryDot stories={storyIndex?.get(r.ticker.toUpperCase())} onOpen={onOpenStory} />
}

function SortHead({
  k,
  label,
  sort,
  onSort,
}: {
  k: WatchSortKey
  label: string
  sort: WatchSort
  onSort: (key: WatchSortKey) => void
}) {
  const { formatMessage } = useAppIntl()
  return (
    <span
      className="mk-ch-sort"
      role="button"
      tabIndex={0}
      aria-label={formatMessage(
        { id: 'watchColumns.sortBy', defaultMessage: 'Sort by {label}' },
        { label },
      )}
      onClick={() => onSort(k)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSort(k)
        }
      }}
    >
      {label} <span className="ar">{sort.key === k ? (sort.dir > 0 ? '▲' : '▼') : ''}</span>
    </span>
  )
}

function Identity({ r, ...story }: { r: WatchQuoteRow } & StoryProps) {
  const { formatMessage } = useAppIntl()
  const p = r.position
  return (
    <div className="mk-wid">
      <div className="mk-wsym">
        {r.ticker}
        <Stories r={r} {...story} />
      </div>
      {p ? (
        <div className="mk-wpos mask">
          <span>
            {formatMessage({ id: 'watchCards.position', defaultMessage: 'Pos' })}{' '}
            <b>{p.quantity.toLocaleString(getNumberLocale())}</b>
          </span>
          <span>
            {formatMessage({ id: 'watchCards.pnl', defaultMessage: 'P&L' })}{' '}
            <b style={{ color: tone(p.day_pl) }}>{fSignedBase(p.day_pl)}</b>
          </span>
          <span>
            {formatMessage({ id: 'watchCards.unrealized', defaultMessage: 'Unrlz' })}{' '}
            <b style={{ color: tone(p.unrealized) }}>{fSignedBase(p.unrealized)}</b>
          </span>
        </div>
      ) : (
        <div className="mk-nm">{r.name}</div>
      )}
    </div>
  )
}

// Table rows are one line, like the Holdings table: symbol, exchange, then the name truncating.
function IdentityLine({ r, ...story }: { r: WatchQuoteRow } & StoryProps) {
  return (
    <span className="mk-hcell">
      <span className="mk-hsym">{r.ticker}</span>
      <Stories r={r} {...story} />
      {r.exchange && <span className="mk-wexch mk-wexch--line">{r.exchange}</span>}
      <span className="mk-hnm"> • {r.name}</span>
    </span>
  )
}

function Spark({ r }: { r: WatchQuoteRow }) {
  if (!r.spark) return <span className="mk-wspark mk-wspark--none" aria-hidden="true" />
  const up = r.spark[r.spark.length - 1]! >= r.spark[0]!
  return (
    <Sparkline values={r.spark} up={up} width={90} height={24} endDot fluid className="mk-wspark" />
  )
}

export function WatchCards({
  rows,
  sort,
  onSort,
  showSpark,
  onOpen,
  storyIndex,
  onOpenStory,
}: CommonProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const cls = `mk-wcard${showSpark ? ' mk-wcard--spark' : ''}`
  return (
    <section className="intel-sec">
      <div className={`${cls} mk-wcardhead`}>
        <SortHead
          k="sym"
          label={formatMessage({ id: 'watchColumns.instrument', defaultMessage: 'Instrument' })}
          sort={sort}
          onSort={onSort}
        />
        {showSpark && (
          <span className="mk-wc-spark">
            {formatMessage({ id: 'watchCards.days30', defaultMessage: '30D' })}
          </span>
        )}
        <SortHead
          k="price"
          label={watchColumnLabel('last', 'Last', intl)}
          sort={sort}
          onSort={onSort}
        />
        <SortHead
          k="change"
          label={watchColumnLabel('change', 'Change', intl)}
          sort={sort}
          onSort={onSort}
        />
        <SortHead
          k="change_pct"
          label={watchColumnLabel('change_pct', 'Change %', intl)}
          sort={sort}
          onSort={onSort}
        />
        <SortHead
          k="volume"
          label={watchColumnLabel('volume', 'Volume', intl)}
          sort={sort}
          onSort={onSort}
        />
      </div>
      {rows.map((r) => {
        const dir = (r.change_pct ?? 0) > 0 ? 'up' : (r.change_pct ?? 0) < 0 ? 'down' : 'flat'
        return (
          <article
            key={r.ticker}
            className="mk-hold clickable"
            role="button"
            tabIndex={0}
            aria-label={formatMessage(
              { id: 'watchCards.open', defaultMessage: 'Open {ticker}' },
              { ticker: r.ticker },
            )}
            onClick={() => onOpen(r)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onOpen(r)
            }}
          >
            <div className={`${cls}${r.position ? ' mk-wcard--held' : ''}`}>
              <Identity r={r} storyIndex={storyIndex} onOpenStory={onOpenStory} />
              {showSpark && (
                <span className="mk-wc-spark">
                  <Spark r={r} />
                </span>
              )}
              <span className="mk-wc-num mk-wc-last">
                {fUnitPrice(r.price, r.currency ?? undefined, quoteDigits(r))}
              </span>
              {/* Two grid cells on a wide card (display: contents); one pill + change group on a phone. */}
              <span className="mk-wc-move">
                <span className="mk-wc-num mk-wc-chg" style={{ color: tone(r.change) }}>
                  {fChange(r.change, quoteDigits(r))}
                </span>
                <span className={`mk-day ${dir}`}>{fPct(r.change_pct, { sign: true })}</span>
              </span>
              <span className="mk-wc-num mk-wc-vol">
                <span className="mk-wc-vlab">
                  {formatMessage({ id: 'watchCards.volume', defaultMessage: 'Vol' })}{' '}
                </span>
                {r.volume == null ? '—' : fCompact(r.volume)}
              </span>
              {r.position && (
                <span className="mk-wc-pos mask">
                  {formatMessage({ id: 'watchCards.position', defaultMessage: 'Pos' })}{' '}
                  {r.position.quantity.toLocaleString(getNumberLocale())} ·{' '}
                  <span style={{ color: tone(r.position.day_pl) }}>
                    {fSignedBase(r.position.day_pl)}
                  </span>
                </span>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export function WatchTable({
  rows,
  sort,
  onSort,
  showSpark,
  onOpen,
  columns,
  storyIndex,
  onOpenStory,
}: CommonProps & { columns: WatchColumn[] }) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const minWidth = 240 + (showSpark ? 110 : 0) + columns.reduce((s, c) => s + c.width, 0)
  const th = (k: WatchSortKey | undefined, label: string, key = label) =>
    k ? (
      <th
        key={key}
        onClick={() => onSort(k)}
        title={formatMessage({ id: 'watchColumns.sort', defaultMessage: 'Sort by this column' })}
      >
        {label} <span className="ar">{sort.key === k ? (sort.dir > 0 ? '▲' : '▼') : ''}</span>
      </th>
    ) : (
      <th key={key} className="nostick">
        {label}
      </th>
    )
  return (
    <div className="mk-tbl-wrap">
      <div className="mk-tbl-scroll">
        <table className="mk-tbl mk-wtbl" style={{ minWidth }}>
          <colgroup>
            <col />
            {showSpark && <col style={{ width: 110 }} />}
            {columns.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {th(
                'sym',
                formatMessage({ id: 'watchColumns.instrument', defaultMessage: 'Instrument' }),
              )}
              {showSpark &&
                th(undefined, formatMessage({ id: 'watchCards.days30', defaultMessage: '30D' }))}
              {columns.map((c) => th(c.sortKey, watchColumnLabel(c.key, c.label, intl), c.key))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ticker} className="data drill" onClick={() => onOpen(r)}>
                <td className="left">
                  <IdentityLine r={r} storyIndex={storyIndex} onOpenStory={onOpenStory} />
                </td>
                {showSpark && (
                  <td>
                    <Spark r={r} />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={c.mask ? 'mask' : undefined}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
