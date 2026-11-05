import { getNumberLocale } from '../../utils/format'
import { useEffect, useState } from 'react'
import { useAppIntl } from '../../i18n/useAppIntl'
import type { RealizedPnl } from '../../types/portfolio'
import { fBase, fDate, plClass } from '../../utils/format'
import { authFetch } from '../../api/client'
import { Panel, SummaryBar, Text, type StatTone } from '../ui'
import { ChevronDown, ChevronRight } from '../../ui/icons'

// Map a P&L sign → a SummaryBar tone (gain green / loss red), matching the sibling panels.
function plTone(n: number): StatTone | undefined {
  if (n > 0) return 'pos'
  if (n < 0) return 'neg'
  return undefined
}

interface Props {
  // instrument_id → display name, so the panel can label events/by-instrument rows.
  instrumentNames: Record<string, string>
}

// Realized P&L panel on the Investments tab (P2-INV1b). Reads GET /api/realized-pnl —
// the base figure is recomputed in the service from each event's native gain + current
// FX, so it never goes stale after a base-currency change. All gain arithmetic is the
// service's; this component only formats. Lot detail (the consumed lots per disposal +
// per-line long/short term) is exposed by expanding an event row.
export function RealizedPnlPanel({ instrumentNames }: Props) {
  const { formatMessage } = useAppIntl()
  const [data, setData] = useState<RealizedPnl | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    let alive = true
    authFetch('/api/realized-pnl')
      .then((r) => r.json())
      .then((d: RealizedPnl) => {
        if (!alive) return
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setError(true)
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  if (loading) return null
  if (error || !data) return null
  // Nothing realized yet — keep the tab clean rather than showing an empty card.
  if (!data.events.length) return null

  // Prefer the name hydrated by the read path (survives a fully-sold holding leaving the
  // live portfolio), then the held-rows map, then the raw id as a last resort.
  const instLabel = (ev: {
    instrument_id: string
    instrument_name?: string
    instrument_symbol?: string
  }) =>
    ev.instrument_name ||
    ev.instrument_symbol ||
    instrumentNames[ev.instrument_id] ||
    ev.instrument_id

  function toggle(id: string) {
    setExpanded((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const total = data.realized_total_base
  const { long, short, unknown } = data.by_term

  const signed = (n: number) => (n >= 0 ? '+' : '') + fBase(n)
  const cards = [
    {
      label: formatMessage({ id: 'shared.realized.total', defaultMessage: 'Total realized' }),
      value: signed(total),
      tone: plTone(total),
    },
    {
      label: formatMessage({ id: 'shared.realized.long', defaultMessage: 'Long-term' }),
      value: signed(long),
      tone: plTone(long),
    },
    {
      label: formatMessage({ id: 'shared.realized.short', defaultMessage: 'Short-term' }),
      value: signed(short),
      tone: plTone(short),
    },
    ...(unknown !== 0
      ? [
          {
            label: formatMessage({
              id: 'shared.realized.unclassified',
              defaultMessage: 'Unclassified',
            }),
            value: signed(unknown),
            tone: plTone(unknown),
          },
        ]
      : []),
  ]

  return (
    <Panel
      title={formatMessage({ id: 'shared.realized.title', defaultMessage: 'Realized P&L' })}
      badge={data.events.length}
      className="realized-pnl"
    >
      <Text as="p" size="sm" tone="muted" className="realized-subtitle">
        {formatMessage({
          id: 'shared.realized.subtitle',
          defaultMessage: 'All-time, booked on disposals.',
        })}
      </Text>

      <SummaryBar cards={cards} />

      <div style={{ overflowX: 'auto' }} className="realized-table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                {formatMessage({ id: 'shared.realized.disposed', defaultMessage: 'Disposed' })}
              </th>
              <th>{formatMessage({ id: 'shared.realized.holding', defaultMessage: 'Holding' })}</th>
              <th className="num">
                {formatMessage({ id: 'shared.realized.quantity', defaultMessage: 'Qty' })}
              </th>
              <th>{formatMessage({ id: 'shared.realized.method', defaultMessage: 'Method' })}</th>
              <th className="num">
                {formatMessage(
                  {
                    id: 'shared.realized.realizedCurrency',
                    defaultMessage: 'Realized ({currency})',
                  },
                  { currency: data.base_currency },
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.events.map((ev) => {
              const open = expanded.has(ev.id)
              const gain = ev.realized_gain_base
              return (
                <>
                  <tr
                    key={ev.id}
                    className="realized-row"
                    onClick={() => toggle(ev.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="realized-caret">
                        {open ? (
                          <ChevronDown size="1em" aria-hidden="true" />
                        ) : (
                          <ChevronRight size="1em" aria-hidden="true" />
                        )}
                      </span>
                      {fDate(ev.disposed_at, 'short', 'always')}
                    </td>
                    <td>
                      <strong>{instLabel(ev)}</strong>
                      {!ev.is_taxable && (
                        <span className="wrapper-badge">
                          {formatMessage({
                            id: 'shared.realized.transfer',
                            defaultMessage: 'transfer',
                          })}
                        </span>
                      )}
                    </td>
                    <td className="num">{ev.quantity.toLocaleString(getNumberLocale())}</td>
                    <td className="muted">
                      {ev.method === 'specific_id'
                        ? formatMessage({
                            id: 'shared.realized.specific',
                            defaultMessage: 'Specific',
                          })
                        : 'FIFO'}
                    </td>
                    <td className={`num ${gain == null ? 'muted' : plClass(gain)}`}>
                      {gain == null ? '—' : (gain >= 0 ? '+' : '') + fBase(gain)}
                    </td>
                  </tr>
                  {open && (
                    <tr key={ev.id + '-detail'} className="realized-detail-row">
                      <td colSpan={5}>
                        <div className="realized-detail">
                          <span className="realized-detail-title">
                            {formatMessage({
                              id: 'shared.realized.lots',
                              defaultMessage: 'Lots consumed',
                            })}
                          </span>
                          <table className="realized-lots">
                            <thead>
                              <tr>
                                <th>
                                  {formatMessage({
                                    id: 'shared.realized.acquired',
                                    defaultMessage: 'Acquired',
                                  })}
                                </th>
                                <th className="num">
                                  {formatMessage({
                                    id: 'shared.realized.quantity',
                                    defaultMessage: 'Qty',
                                  })}
                                </th>
                                <th className="num">
                                  {formatMessage({
                                    id: 'shared.realized.unitCost',
                                    defaultMessage: 'Unit cost',
                                  })}
                                </th>
                                <th>
                                  {formatMessage({
                                    id: 'shared.realized.term',
                                    defaultMessage: 'Term',
                                  })}
                                </th>
                                <th className="num">
                                  {formatMessage(
                                    {
                                      id: 'shared.realized.gainCurrency',
                                      defaultMessage: 'Gain ({currency})',
                                    },
                                    { currency: ev.proceeds_currency },
                                  )}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {ev.consumptions.map((c, i) => (
                                <tr key={i}>
                                  <td>
                                    {c.acquired_at ? fDate(c.acquired_at, 'short', 'always') : '—'}
                                  </td>
                                  <td className="num">{c.qty.toLocaleString(getNumberLocale())}</td>
                                  <td className="num">
                                    {c.unit_cost == null ? '—' : c.unit_cost.toLocaleString(getNumberLocale())}
                                  </td>
                                  <td>
                                    <span className={`term-badge term-${c.term}`}>
                                      {c.term === 'short'
                                        ? formatMessage({
                                            id: 'shared.realized.termShort',
                                            defaultMessage: 'short',
                                          })
                                        : c.term === 'long'
                                          ? formatMessage({
                                              id: 'shared.realized.termLong',
                                              defaultMessage: 'long',
                                            })
                                          : formatMessage({
                                              id: 'shared.realized.termUnknown',
                                              defaultMessage: 'unknown',
                                            })}
                                    </span>
                                  </td>
                                  <td
                                    className={`num ${
                                      c.realized_gain == null ? 'muted' : plClass(c.realized_gain)
                                    }`}
                                  >
                                    {c.realized_gain == null
                                      ? '—'
                                      : (c.realized_gain >= 0 ? '+' : '') +
                                        c.realized_gain.toLocaleString(getNumberLocale())}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
