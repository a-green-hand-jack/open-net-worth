import { createIntl, type IntlShape } from 'react-intl'
import { getNumberLocale } from './format'
// luciusEngine.ts — pure-TS port of the Lucius suggestion engine from portfolio-lucius.jsx.
// All global window.INV reads are replaced with explicit typed parameters (LuciusContext).
// Nothing here touches React, the DOM, or the network.

export type AlertOp = 'above' | 'below'

export interface LuciusAsset {
  symbol: string
  name?: string
  ccy: string
  price: number
  cls?: string
  alerts?: { op: AlertOp; value: number; note?: string }[]
}

export interface LuciusHolding {
  symbol: string
  cls: string
  qty?: number
  weight: number
  plPct: number | null
}

export interface LuciusContext {
  holdingsBySymbol: Record<string, LuciusHolding> // owned positions keyed by uppercased symbol
  targets: Record<string, number> // asset_class -> target weight %
  classLabels: Record<string, string> // asset_class -> display label
}

// Default target asset allocation (% of book per class) the suggestion engine reasons against to
// decide trim-vs-accumulate. Hardcoded reference model — NOT yet sourced from the user's profile.
export const DEFAULT_TARGETS: Record<string, number> = {
  equity: 60,
  crypto: 5,
  commodity: 8,
  bond: 24,
  cash: 3,
}

// asset_class key -> human label, used only to phrase suggestion copy ("equities" vs "equity").
export const CLASS_LABELS: Record<string, string> = {
  equity: 'Equities',
  crypto: 'Crypto',
  commodity: 'Commodities',
  bond: 'Bonds',
  cash: 'Cash',
  property: 'Property',
  receivable: 'Receivables',
}

export interface AlertSuggestion {
  sourceKey?: 'trim' | 'profit' | 'protect' | 'decision' | 'early' | 'stretch' | 'entry' | 'momentum'
  op: AlertOp
  value: number
  why: string
  note: string
  /** The alert's own short name when it is taken — e.g. "Take-profit zone". */
  name?: string
}

export interface LuciusReviewItem {
  _id?: string
  id?: string
  kind: 'ticker' | 'topic'
  symbol?: string
  label?: string
  note?: string
  muted?: boolean
  // Only the count is read during review, so the element shape is intentionally loose
  // (callers pass watchlist price_alerts whose op vocabulary differs from AlertOp).
  alerts?: unknown[]
}

export interface LuciusFinding {
  key: string
  itemId?: string
  kind?: 'asset' | 'topic'
  sev: 'gap' | 'risk' | 'info'
  title: string
  text: string
  cta?: string
  noCta?: boolean
}

export interface LuciusReviewResult {
  headline: string
  findings: LuciusFinding[]
}

const defaultIntl = createIntl({ locale: 'en' })

// Currency symbol map
const LX_CCY: Record<string, string> = { USD: '$', SGD: 'S$', EUR: '€', GBP: '£' }
const lccy = (c: string): string => LX_CCY[c] ?? ''

// Per-class price bands — how far a "meaningful move" is, by volatility
export const LX_BAND: Record<string, number> = {
  equity: 0.12,
  crypto: 0.2,
  commodity: 0.08,
  bond: 0.05,
}

// Round to a "nice" number appropriate for the magnitude
export function lxRound(v: number): number {
  if (v >= 10000) return Math.round(v / 500) * 500
  if (v >= 1000) return Math.round(v / 100) * 100
  if (v >= 100) return Math.round(v / 5) * 5
  if (v >= 10) return Math.round(v * 2) / 2
  return Math.round(v * 100) / 100
}

// Format a number for display — thousands separator above 1000
export function lxFmt(v: number): string {
  return v.toLocaleString(getNumberLocale(), { maximumFractionDigits: 8 })
}

// Percent distance between value and price (absolute), rounded to integer
export function lxDist(value: number, price: number): number {
  return Math.round((Math.abs(value - price) / price) * 100)
}

// ---- suggestion engine ----

export function luciusSuggestAlerts(asset: LuciusAsset, ctx: LuciusContext, intl: IntlShape = defaultIntl): AlertSuggestion[] {
  // No live price yet → every level/distance math divides by zero (NaN% in the UI).
  if (!asset.price || asset.price <= 0) return []
  const H = ctx.holdingsBySymbol[asset.symbol.toUpperCase()] ?? null
  const cls = H ? H.cls : (asset.cls ?? 'equity')
  const band = LX_BAND[cls] ?? 0.12
  const price = asset.price
  const ccy = lccy(asset.ccy)
  const existing = (asset.alerts ?? []).map((a) => Number(a.value))
  const tooClose = (v: number) => existing.some((e) => Math.abs(e - v) / price < 0.025)
  const out: AlertSuggestion[] = []

  if (H !== null) {
    const target = ctx.targets[cls] ?? 0
    const cost = H.plPct != null ? price / (1 + H.plPct / 100) : price
    const over = H.weight - target

    // upside suggestion
    const up = lxRound(price * (1 + band))
    if (over > 1.5) {
      const trimShares = H.qty != null ? Math.max(1, Math.round(H.qty * (over / H.weight))) : null
      const originalClassLabel = ctx.classLabels[cls] ?? cls
      const clsLabel = CLASS_LABELS[cls] === originalClassLabel
        ? intl.formatMessage({ id: 'intel.assist.classLabel', defaultMessage: '{kind, select, equity {equities} crypto {crypto} commodity {commodities} bond {bonds} cash {cash} property {property} receivable {receivables} other {{label}}}' }, { kind: cls, label: originalClassLabel })
        : originalClassLabel
      out.push({
        sourceKey: 'trim',
        name: intl.formatMessage({ id: 'intel.assist.suggestion.nameTrimBackToTarget', defaultMessage: "Trim back to target" }),
        op: 'above',
        value: up,
        why: intl.formatMessage({ id: 'intel.assist.suggestion.trimWhy', defaultMessage: 'At {weight}% of your book, {symbol} is already over your {target}% {classLabel} target.' }, { weight: H.weight.toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }), symbol: asset.symbol, target, classLabel: clsLabel }),
        note: intl.formatMessage({ id: 'intel.assist.suggestion.trimNote', defaultMessage: 'If it rises ~{distance}% to {price}, trim back toward {target}%{hasUnits, select, yes { (~{quantity} {unit, select, crypto {units} other {shares}})} other {}} rather than letting the position get bigger. Check first whether the move is news or momentum.' }, { distance: lxDist(up, price), price: ccy + lxFmt(up), target, hasUnits: trimShares != null ? 'yes' : 'no', quantity: trimShares ?? 0, unit: cls }),
      })
    } else {
      out.push({
        sourceKey: 'profit',
        name: intl.formatMessage({ id: 'intel.assist.suggestion.nameTakeProfitZone', defaultMessage: "Take-profit zone" }),
        op: 'above',
        value: up,
        why: intl.formatMessage({ id: "intel.assist.suggestion.upWhy", defaultMessage: "{price} is ~{distance}% above today — a level worth banking some profit." }, { price: ccy + lxFmt(up), distance: lxDist(up, price) }),
        note: intl.formatMessage({ id: "intel.assist.suggestion.upNote", defaultMessage: "Review taking partial profit on {symbol}; confirm the move isn't a single-day spike before acting." }, { symbol: asset.symbol }),
      })
    }

    // downside suggestion
    if (H.plPct != null && H.plPct > 25) {
      const dn = lxRound(price * (1 - band))
      out.push({
        sourceKey: 'protect',
        name: intl.formatMessage({ id: 'intel.assist.suggestion.nameProtectTheGain', defaultMessage: "Protect the gain" }),
        op: 'below',
        value: dn,
        why: intl.formatMessage({ id: "intel.assist.suggestion.protectWhy", defaultMessage: "You're up {gain}% on {symbol} — this protects the gain (~{distance}% below today)." }, { gain: H.plPct.toLocaleString(getNumberLocale(), { maximumFractionDigits: 0 }), symbol: asset.symbol, distance: lxDist(dn, price) }),
        note: intl.formatMessage({ id: "intel.assist.suggestion.protectNote", defaultMessage: "If it falls to {price} and support breaks, consider a trailing stop or trimming to lock in profit." }, { price: ccy + lxFmt(dn) }),
      })
    } else if (H.plPct != null && H.plPct < -3) {
      const dn = lxRound(cost * 0.9)
      out.push({
        sourceKey: 'decision',
        name: intl.formatMessage({ id: 'intel.assist.suggestion.nameDecisionPoint', defaultMessage: "Decision point" }),
        op: 'below',
        value: dn,
        why: intl.formatMessage({ id: "intel.assist.suggestion.decisionWhy", defaultMessage: "{symbol} is down {loss}%; ~10% below your cost ({price}) is a clear decision point." }, { symbol: asset.symbol, loss: Math.abs(H.plPct).toLocaleString(getNumberLocale(), { maximumFractionDigits: 0 }), price: ccy + lxFmt(dn) }),
        note: intl.formatMessage({ id: "intel.assist.suggestion.decisionNote", defaultMessage: "If it reaches {price}, decide whether the thesis still holds before averaging down or cutting." }, { price: ccy + lxFmt(dn) }),
      })
    } else {
      const dn = lxRound(price * (1 - band))
      out.push({
        sourceKey: 'early',
        name: intl.formatMessage({ id: 'intel.assist.suggestion.nameEarlyWarning', defaultMessage: "Early warning" }),
        op: 'below',
        value: dn,
        why: intl.formatMessage({ id: "intel.assist.suggestion.earlyWhy", defaultMessage: "{price} is ~{distance}% below today — an early warning if it rolls over." }, { price: ccy + lxFmt(dn), distance: lxDist(dn, price) }),
        note: intl.formatMessage({ id: "intel.assist.suggestion.earlyNote", defaultMessage: "If {symbol} drops to {price}, check for thesis-breaking news and decide to hold, add, or cut." }, { symbol: asset.symbol, price: ccy + lxFmt(dn) }),
      })
    }

    // crypto stretch level
    if (cls === 'crypto') {
      const target = ctx.targets[cls] ?? 0
      const stretch = lxRound(price * (1 + band * 2))
      out.push({
        sourceKey: 'stretch',
        name: intl.formatMessage({ id: 'intel.assist.suggestion.nameStretchTarget', defaultMessage: "Stretch target" }),
        op: 'above',
        value: stretch,
        why: intl.formatMessage({ id: "intel.assist.suggestion.stretchWhy", defaultMessage: "A stretch target ~{distance}% up — crypto can move fast and overshoot." }, { distance: lxDist(stretch, price) }),
        note: intl.formatMessage({ id: "intel.assist.suggestion.stretchNote", defaultMessage: "If {symbol} spikes to {price}, take meaningful profit and rebalance crypto back to your {target}% target." }, { symbol: asset.symbol, price: ccy + lxFmt(stretch), target }),
      })
    }
  } else {
    // not owned — entry levels
    const dn = lxRound(price * (1 - band))
    out.push({
      sourceKey: 'entry',
        name: intl.formatMessage({ id: 'intel.assist.suggestion.nameEntryZone', defaultMessage: "Entry zone" }),
      op: 'below',
      value: dn,
      why: intl.formatMessage({ id: "intel.assist.suggestion.entryWhy", defaultMessage: "You don't own {symbol}. {price} (~{distance}% lower) would be a more attractive entry." }, { symbol: asset.symbol, price: ccy + lxFmt(dn), distance: lxDist(dn, price) }),
      note: intl.formatMessage({ id: "intel.assist.suggestion.entryNote", defaultMessage: "If it dips to {price}, assess whether it's a buying opportunity or a broken setup before starting a position." }, { price: ccy + lxFmt(dn) }),
    })
    const up = lxRound(price * (1 + band * 0.7))
    out.push({
      sourceKey: 'momentum',
        name: intl.formatMessage({ id: 'intel.assist.suggestion.nameMomentumBreak', defaultMessage: "Momentum break" }),
      op: 'above',
      value: up,
      why: intl.formatMessage({ id: "intel.assist.suggestion.momentumWhy", defaultMessage: "A break above {price} would confirm momentum if you're waiting to enter." }, { price: ccy + lxFmt(up) }),
      note: intl.formatMessage({ id: "intel.assist.suggestion.momentumNote", defaultMessage: "On a confirmed break, consider a starter position sized against the rest of the book." }, {}),
    })
  }

  return out.filter((s) => !tooClose(s.value))
}

// ---- alert instruction drafter ----

export function luciusDraftAlertInstruction(
  asset: LuciusAsset,
  row: { op: AlertOp; value?: number | string },
  owned: boolean,
  intl: IntlShape = defaultIntl,
): string {
  const ccy = lccy(asset.ccy)
  const val = row.value != null ? `${ccy}${lxFmt(Number(row.value))}` : intl.formatMessage({ id: 'intel.assist.draft.level', defaultMessage: 'this level' })
  if (row.op === 'above') {
    return owned
      ? intl.formatMessage({ id: "intel.assist.draft.aboveOwned", defaultMessage: "If {symbol} reaches {value}, review taking partial profit — check whether the move is news-driven, and consider trimming toward your target weight." }, { symbol: asset.symbol, value: val })
      : intl.formatMessage({ id: "intel.assist.draft.aboveNew", defaultMessage: "If {symbol} breaks {value}, consider a starter position on confirmed momentum; size it against the rest of the book." }, { symbol: asset.symbol, value: val })
  }
  return owned
    ? intl.formatMessage({ id: "intel.assist.draft.belowOwned", defaultMessage: "If {symbol} falls to {value}, reassess the thesis before holding through — decide whether to add, hold, or cut." }, { symbol: asset.symbol, value: val })
    : intl.formatMessage({ id: "intel.assist.draft.belowNew", defaultMessage: "If {symbol} dips to {value}, assess whether it's an entry opportunity or a broken setup before buying." }, { symbol: asset.symbol, value: val })
}

// ---- topic instruction drafter ----

export function luciusDraftTopicInstruction(label: string, intl: IntlShape = defaultIntl): string {
  const l = (label ?? '').toLowerCase()
  let mid =
    intl.formatMessage({ id: "intel.assist.topic.general", defaultMessage: "Flag anything material to my portfolio — holdings directly affected, sector or macro spillover, and clear risk-on/risk-off signals." })
  if (/rate|fed|inflation|cpi|yield|fomc/.test(l))
    mid =
      intl.formatMessage({ id: "intel.assist.topic.rates", defaultMessage: "Flag rate-path shifts and inflation surprises, and what they mean for my bond sleeve (TLT, SSB) and rate-sensitive equities." })
  else if (/oil|energy|opec|gas|crude/.test(l))
    mid =
      intl.formatMessage({ id: "intel.assist.topic.energy", defaultMessage: "Flag supply or price shocks and the knock-on for inflation, energy names, and broad risk appetite." })
  else if (/ai|chip|semi|nvidia|gpu|datacenter|data center/.test(l))
    mid =
      intl.formatMessage({ id: "intel.assist.topic.ai", defaultMessage: "Flag demand, supply, and policy shifts, and the impact on my NVDA, MSFT, and ASML positions." })
  else if (/crypto|bitcoin|\bbtc\b|\beth\b|etf flow|stablecoin/.test(l))
    mid =
      intl.formatMessage({ id: "intel.assist.topic.crypto", defaultMessage: "Flag ETF flows, regulation, and liquidity shifts, and the impact on my BTC and ETH positions and overall crypto weight." })
  else if (/war|conflict|geopolit|sanction|tension|hormuz|tariff/.test(l))
    mid =
      intl.formatMessage({ id: "intel.assist.topic.geopolitics", defaultMessage: "Flag escalation or de-escalation: safe-haven gold bid, oil spikes, shipping disruption, and risk-off equity moves." })
  return intl.formatMessage({ id: 'intel.assist.topic.instruction', defaultMessage: 'Track developments on {label}. {details} Summarise what changed, why it matters to my book, and any action worth considering.' }, { label, details: mid })
}

// ---- list reviewer ----

export function luciusReviewList(
  list: { name: string; muted?: boolean; items: LuciusReviewItem[] },
  ctx: LuciusContext,
  intl: IntlShape = defaultIntl,
): LuciusReviewResult {
  const findings: LuciusFinding[] = []
  const assets = list.items.filter((i) => i.kind === 'ticker')
  const topics = list.items.filter((i) => i.kind === 'topic')

  if (list.muted) {
    findings.push({
      key: 'muted',
      sev: 'info',
      title: intl.formatMessage({ id: "intel.assist.review.mutedTitle", defaultMessage: "This list is muted" }),
      text: intl.formatMessage({ id: "intel.assist.review.mutedText", defaultMessage: "Nothing here will alert you until you unmute the list." }),
      noCta: true,
    })
  }

  for (const a of assets) {
    if (a.muted) continue
    const itemId = a._id ?? a.id
    const sym = (a.symbol ?? '').toUpperCase()
    const H = ctx.holdingsBySymbol[sym] ?? null
    if (!(a.alerts ?? []).length) {
      findings.push({
        key: itemId ?? sym,
        itemId,
        kind: 'asset',
        sev: 'gap',
        title: intl.formatMessage({ id: 'intel.assist.review.noPriceAlerts', defaultMessage: '{symbol} has no price alerts' }, { symbol: a.symbol ?? '' }),
        text: H
          ? intl.formatMessage({ id: "intel.assist.review.ownedNoAlert", defaultMessage: "You hold this but won't be notified on a meaningful move." })
          : intl.formatMessage({ id: "intel.assist.review.noAlert", defaultMessage: "You won't be notified on a meaningful move." }),
        cta: intl.formatMessage({ id: "intel.assist.review.suggest", defaultMessage: "Suggest alerts" }),
      })
    } else if (H != null) {
      const target = ctx.targets[H.cls] ?? 0
      if (H.weight > target + 3) {
        findings.push({
          key: (itemId ?? sym) + ':ow',
          itemId,
          kind: 'asset',
          sev: 'risk',
          title: intl.formatMessage({ id: 'intel.assist.review.overweight', defaultMessage: '{symbol} is overweight' }, { symbol: a.symbol ?? '' }),
          text: intl.formatMessage({ id: 'intel.assist.review.overweightText', defaultMessage: '{weight}% of your book vs a {target}% target — a trim alert would help.' }, { weight: H.weight.toLocaleString(getNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }), target: target.toLocaleString(getNumberLocale()) }),
          cta: intl.formatMessage({ id: "intel.assist.review.addAlert", defaultMessage: "Add alert" }),
        })
      }
    }
  }

  for (const t of topics) {
    const itemId = t._id ?? t.id
    if ((t.note ?? '').trim().length < 40) {
      findings.push({
        key: itemId ?? t.label ?? 'topic',
        itemId,
        kind: 'topic',
        sev: 'gap',
        title: intl.formatMessage({ id: 'intel.assist.review.topicTitle', defaultMessage: '“{label}” needs instructions' }, { label: t.label ?? '' }),
        text: intl.formatMessage({ id: "intel.assist.review.topicText", defaultMessage: "Vague topics produce noisy alerts. Lucius can draft focused instructions." }),
        cta: intl.formatMessage({ id: "intel.assist.review.draft", defaultMessage: "Draft instructions" }),
      })
    }
  }

  const actionable = findings.filter((f) => !f.noCta).length
  const headline =
    actionable === 0
      ? intl.formatMessage({ id: 'intel.assist.review.covered', defaultMessage: '{name} looks well-covered — tickers have alerts and topics are specific.' }, { name: list.name })
      : intl.formatMessage({ id: 'intel.assist.review.headline', defaultMessage: '{count, plural, one {# thing} other {# things}} to tighten up in {name}.' }, { count: actionable, name: list.name })

  return { headline, findings }
}
