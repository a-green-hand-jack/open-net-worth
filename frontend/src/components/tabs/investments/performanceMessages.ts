import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'

const messages = defineMessages({
  'performance.risk.excellent': {
    id: 'performance.risk.excellent',
    defaultMessage: 'excellent return for the risk taken',
  },
  'performance.risk.solid': {
    id: 'performance.risk.solid',
    defaultMessage: 'solid return for the risk taken',
  },
  'performance.risk.modest': {
    id: 'performance.risk.modest',
    defaultMessage: 'modest return for the risk taken',
  },
  'performance.risk.below': {
    id: 'performance.risk.below',
    defaultMessage: 'return below the risk-free rate',
  },
  'performance.risk.more': {
    id: 'performance.risk.more',
    defaultMessage: 'swings ~{percent}% more than the market',
  },
  'performance.risk.less': {
    id: 'performance.risk.less',
    defaultMessage: 'swings ~{percent}% less than the market',
  },
  'performance.risk.tracks': {
    id: 'performance.risk.tracks',
    defaultMessage: 'tracks the market closely',
  },
  'performance.risk.drawdown': {
    id: 'performance.risk.drawdown',
    defaultMessage: 'worst dip ~−{percent}%',
  },
  'performance.risk.volatility': {
    id: 'performance.risk.volatility',
    defaultMessage: 'annualized volatility ~{percent}%',
  },
})
const sharpe = new Set([
  'performance.risk.excellent',
  'performance.risk.solid',
  'performance.risk.modest',
  'performance.risk.below',
])
const percentage = new Set([
  'performance.risk.more',
  'performance.risk.less',
  'performance.risk.drawdown',
  'performance.risk.volatility',
])
export interface RiskSummaryMessage {
  id: string
  params: Record<string, unknown>
  text: string
}
export function formatRiskSummary(
  intl: IntlShape,
  parts: RiskSummaryMessage[] | undefined,
  fallback: string | null,
): string {
  if (!parts?.length) return fallback ?? ''
  const out: string[] = []
  for (const part of parts) {
    if (
      !part ||
      typeof part.id !== 'string' ||
      !Object.hasOwn(messages, part.id) ||
      !part.params ||
      typeof part.params !== 'object'
    )
      return fallback ?? ''
    const keys = Object.keys(part.params)
    const descriptor = messages[part.id as keyof typeof messages] as MessageDescriptor
    if (sharpe.has(part.id)) {
      if (keys.length !== 1 || typeof part.params.short_window !== 'boolean') return fallback ?? ''
      const text = intl.formatMessage(descriptor)
      out.push(
        part.params.short_window
          ? intl.formatMessage(
              { id: 'performance.risk.shortWindow', defaultMessage: '{text} (short window)' },
              { text },
            )
          : text,
      )
    } else if (percentage.has(part.id)) {
      if (
        keys.length !== 1 ||
        typeof part.params.percent !== 'number' ||
        !Number.isFinite(part.params.percent)
      )
        return fallback ?? ''
      out.push(intl.formatMessage(descriptor, { percent: part.params.percent }))
    } else {
      if (keys.length) return fallback ?? ''
      out.push(intl.formatMessage(descriptor))
    }
  }
  return out.join(' • ')
}
