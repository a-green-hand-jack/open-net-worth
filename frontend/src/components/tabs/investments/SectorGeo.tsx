// SectorGeo — sector & geography exposure panel. Verbatim port of prototype SectorGeo().
// Toggle: Sector | Region. Shows ranked bars with concentration flag.

import { useMemo, useState } from 'react'
import { defineMessages, type IntlShape } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { BookRow, DerivedBook } from './useInvestmentsBook'

const sectorMessages = defineMessages({
  Technology: { id: 'sectorGeo.sector.Technology', defaultMessage: 'Technology' },
  Communication: { id: 'sectorGeo.sector.Communication', defaultMessage: 'Communication' },
  Consumer: { id: 'sectorGeo.sector.Consumer', defaultMessage: 'Consumer' },
  Financials: { id: 'sectorGeo.sector.Financials', defaultMessage: 'Financials' },
  Healthcare: { id: 'sectorGeo.sector.Healthcare', defaultMessage: 'Healthcare' },
  Energy: { id: 'sectorGeo.sector.Energy', defaultMessage: 'Energy' },
  Industrials: { id: 'sectorGeo.sector.Industrials', defaultMessage: 'Industrials' },
  Materials: { id: 'sectorGeo.sector.Materials', defaultMessage: 'Materials' },
  'Real Estate': { id: 'sectorGeo.sector.RealEstate', defaultMessage: 'Real Estate' },
  Utilities: { id: 'sectorGeo.sector.Utilities', defaultMessage: 'Utilities' },
  'Broad market': { id: 'sectorGeo.sector.BroadMarket', defaultMessage: 'Broad market' },
  'Fixed income': { id: 'sectorGeo.sector.FixedIncome', defaultMessage: 'Fixed income' },
  'Digital assets': { id: 'sectorGeo.sector.DigitalAssets', defaultMessage: 'Digital assets' },
  Commodities: { id: 'sectorGeo.sector.Commodities', defaultMessage: 'Commodities' },
  Other: { id: 'sectorGeo.sector.Other', defaultMessage: 'Other' },
})
const regionMessages = defineMessages({
  'United States': { id: 'sectorGeo.region.UnitedStates', defaultMessage: 'United States' },
  Europe: { id: 'sectorGeo.region.Europe', defaultMessage: 'Europe' },
  Singapore: { id: 'sectorGeo.region.Singapore', defaultMessage: 'Singapore' },
  'Global ex-US': { id: 'sectorGeo.region.GlobalExUs', defaultMessage: 'Global ex-US' },
  Global: { id: 'sectorGeo.region.Global', defaultMessage: 'Global' },
  'United Kingdom': { id: 'sectorGeo.region.UnitedKingdom', defaultMessage: 'United Kingdom' },
  'Hong Kong': { id: 'sectorGeo.region.HongKong', defaultMessage: 'Hong Kong' },
  Japan: { id: 'sectorGeo.region.Japan', defaultMessage: 'Japan' },
})

function exposureLabel(
  key: string,
  known: boolean,
  view: 'sector' | 'geography',
  intl: IntlShape,
): string {
  if (!known) return key
  const messages: Record<string, { id: string; defaultMessage: string }> =
    view === 'sector' ? sectorMessages : regionMessages
  const descriptor = Object.hasOwn(messages, key) ? messages[key] : undefined
  return descriptor ? intl.formatMessage(descriptor) : key
}

const SECTOR_MAP: Record<string, string> = {
  NVDA: 'Technology',
  AAPL: 'Technology',
  MSFT: 'Technology',
  AMD: 'Technology',
  AVGO: 'Technology',
  ADBE: 'Technology',
  CRM: 'Technology',
  GOOGL: 'Communication',
  META: 'Communication',
  NFLX: 'Communication',
  AMZN: 'Consumer',
  TSLA: 'Consumer',
  WMT: 'Consumer',
  PG: 'Consumer',
  COST: 'Consumer',
  HD: 'Consumer',
  JPM: 'Financials',
  V: 'Financials',
  MA: 'Financials',
  'BRK.B': 'Financials',
  UNH: 'Healthcare',
  JNJ: 'Healthcare',
  LLY: 'Healthcare',
  ABBV: 'Healthcare',
  XOM: 'Energy',
}

// The instrument's own sector (the price provider's names) folded into this panel's buckets.
const SECTOR_ALIASES: Record<string, string> = {
  Technology: 'Technology',
  'Information Technology': 'Technology',
  'Communication Services': 'Communication',
  'Consumer Cyclical': 'Consumer',
  'Consumer Defensive': 'Consumer',
  'Consumer Discretionary': 'Consumer',
  'Consumer Staples': 'Consumer',
  'Financial Services': 'Financials',
  Financials: 'Financials',
  Healthcare: 'Healthcare',
  'Health Care': 'Healthcare',
  Energy: 'Energy',
  Industrials: 'Industrials',
  'Basic Materials': 'Materials',
  Materials: 'Materials',
  'Real Estate': 'Real Estate',
  Utilities: 'Utilities',
}

const SECTOR_COLOR: Record<string, string> = {
  Technology: '#3b86dd',
  Communication: '#22b8cf',
  Consumer: '#e0a032',
  Financials: '#1d9e75',
  Healthcare: '#9a7fd0',
  Energy: '#e2554f',
  Industrials: '#6b7280',
  Materials: '#bd7a1a',
  'Real Estate': '#d4537e',
  Utilities: '#2ba39a',
  'Broad market': '#5b6472',
  'Fixed income': '#2ba39a',
  'Digital assets': '#9a7fd0',
  Commodities: '#c8921a',
  Other: '#6b7280',
}

const REGION_COLOR: Record<string, string> = {
  'United States': '#3b86dd',
  Europe: '#9a7fd0',
  Singapore: '#e0a032',
  'Global ex-US': '#22b8cf',
  Global: '#1d9e75',
  'United Kingdom': '#e2554f',
  'Hong Kong': '#bd7a1a',
  Japan: '#d4537e',
}

const REGION_BY_CCY: Record<string, string> = {
  USD: 'United States',
  EUR: 'Europe',
  SGD: 'Singapore',
  GBP: 'United Kingdom',
  HKD: 'Hong Kong',
  JPY: 'Japan',
}

function rowSector(r: BookRow): { label: string; known: boolean } {
  const known = (label: string) => ({ label, known: true })
  if (r.cls === 'crypto') return known('Digital assets')
  if (r.cls === 'commodity') return known('Commodities')
  if (r.cls === 'bond') return known('Fixed income')
  if (r.sub === 'etf' || r.sub === 'etc') {
    return known(/QQQ|VGT|XLK|SMH|tech/i.test(r.sym + ' ' + r.name) ? 'Technology' : 'Broad market')
  }
  // The instrument's recorded sector first. The prototype this was ported from hashed any
  // ticker outside a short list into a sector, so a bank (DBS) read "Communication"
  // (persona QA 2026-10-13); an unknown is "Other", never a guess.
  const own = (r._raw.sector ?? '').trim()
  if (own) {
    const alias = Object.hasOwn(SECTOR_ALIASES, own) ? SECTOR_ALIASES[own] : undefined
    return alias ? known(alias) : { label: own, known: false }
  }
  return known(SECTOR_MAP[r.sym] ?? 'Other')
}

function rowRegion(r: BookRow): string {
  if (r.cls === 'crypto' || r.cls === 'commodity') return 'Global'
  const label = r.sym + ' ' + r.name
  if (/ex-us|intl|emerging|developed|VXUS|BNDX/i.test(label)) return 'Global ex-US'
  // An all-world fund holds the US too (VWRA is ~60% US) — never "ex-US".
  if (/world|acwi|VWRA/i.test(label)) return 'Global'
  return REGION_BY_CCY[r.ccy] ?? 'United States'
}

function exposureBreakdown(
  all: BookRow[],
  keyFn: (r: BookRow) => { label: string; known: boolean },
) {
  const m = new Map<string, number>()
  const known = new Map<string, boolean>()
  let tot = 0
  all.forEach((r) => {
    const { label: k, known: isKnown } = keyFn(r)
    m.set(k, (m.get(k) ?? 0) + r.value)
    known.set(k, (known.get(k) ?? true) && isKnown)
    tot += r.value
  })
  const rows = [...m.entries()]
    .map(([k, v]) => ({ k, v, known: known.get(k) ?? false, pct: tot ? (v / tot) * 100 : 0 }))
    .sort((a, b) => b.v - a.v)
  return { rows, tot }
}

interface Props {
  d: DerivedBook
}

function Card({
  title,
  meta,
  children,
}: {
  title: string
  meta?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mk-card">
      <div className="mk-card-head">
        <span className="mk-card-title">{title}</span>
        {meta && <span className="mk-card-meta">{meta}</span>}
      </div>
      <div className="mk-card-body">{children}</div>
    </div>
  )
}

export function SectorGeo({ d }: Props) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const [view, setView] = useState<'sector' | 'geography'>('sector')

  const bd = useMemo(
    () =>
      exposureBreakdown(
        d.all,
        view === 'sector' ? rowSector : (r) => ({ label: rowRegion(r), known: true }),
      ),
    [d.all, view],
  )

  const colorMap = view === 'sector' ? SECTOR_COLOR : REGION_COLOR
  const max = Math.max(1, ...bd.rows.map((r) => r.pct))

  const tech = bd.rows.find((r) => r.k === 'Technology')
  const techHi = view === 'sector' && tech && tech.pct >= 30
  const top = bd.rows[0]
  const regionHi = view === 'geography' && top && top.pct >= 70

  return (
    <Card
      title={formatMessage({ id: 'sectorGeo.title', defaultMessage: 'Sector & geography' })}
      meta={
        <div className="mk-seg">
          <button className={view === 'sector' ? 'on' : ''} onClick={() => setView('sector')}>
            {formatMessage({ id: 'sectorGeo.sector', defaultMessage: 'Sector' })}
          </button>
          <button className={view === 'geography' ? 'on' : ''} onClick={() => setView('geography')}>
            {formatMessage({ id: 'sectorGeo.region', defaultMessage: 'Region' })}
          </button>
        </div>
      }
    >
      <div className="sec-list">
        {bd.rows.map((s) => (
          <div className="sec-row" key={s.k}>
            <div className="sec-top">
              <span className="sec-k">
                <span className="sec-dot" style={{ background: colorMap[s.k] ?? '#6b7280' }} />
                {exposureLabel(s.k, s.known, view, intl)}
              </span>
              <span className="sec-v mask">{s.pct.toFixed(0)}%</span>
            </div>
            <div className="sec-track">
              <span
                className="sec-fill"
                style={{ width: (s.pct / max) * 100 + '%', background: colorMap[s.k] ?? '#6b7280' }}
              />
            </div>
          </div>
        ))}
      </div>
      {techHi && (
        <div className="mk-flag">
          <span className="mk-stress-mark">▲</span>
          <span>
            {formatMessage(
              {
                id: 'sectorGeo.techWarning',
                defaultMessage:
                  'Technology is <pct>{percent}%</pct> of your book across multiple holdings — a deeper concentration than any single ticker shows. A tech selloff would hit harder than the asset-class mix suggests.',
              },
              { percent: Math.round(tech!.pct), pct: (chunks) => <b>{chunks}</b> },
            )}
          </span>
        </div>
      )}
      {regionHi && (
        <div className="mk-flag">
          <span className="mk-stress-mark">▲</span>
          <span>
            {formatMessage(
              {
                id: 'sectorGeo.regionWarning',
                defaultMessage:
                  '<name>{region}</name> is <pct>{percent}%</pct> of your book — limited geographic diversification. International exposure would cushion a domestic drawdown.',
              },
              {
                region: exposureLabel(top!.k, top!.known, view, intl),
                percent: Math.round(top!.pct),
                name: (chunks) => <b>{chunks}</b>,
                pct: (chunks) => <b>{chunks}</b>,
              },
            )}
          </span>
        </div>
      )}
      <div className="mk-lots-note">
        {formatMessage({
          id: 'sectorGeo.note',
          defaultMessage:
            'Look-through by where revenue and listing sit, not just asset class. ETFs counted at fund level.',
        })}
      </div>
    </Card>
  )
}
