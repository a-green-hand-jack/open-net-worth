import { defineMessages, type IntlShape } from 'react-intl'

const classes = defineMessages({
  equity: { id: 'portfolio.class.equity', defaultMessage: 'Equities' },
  bond: { id: 'portfolio.class.bond', defaultMessage: 'Bonds' },
  commodity: { id: 'portfolio.class.commodity', defaultMessage: 'Commodities' },
  crypto: { id: 'portfolio.class.crypto', defaultMessage: 'Crypto' },
  option: { id: 'portfolio.class.option', defaultMessage: 'Options' },
  cash: { id: 'portfolio.class.cash', defaultMessage: 'Cash' },
  other: { id: 'portfolio.class.other', defaultMessage: 'This asset class' },
})

interface Message {
  id: string
  params?: Record<string, unknown>
}

export function portfolioMessage(
  intl: IntlShape,
  msg: Message | undefined,
  fallback: string,
): string {
  if (!msg || typeof msg.id !== 'string') return fallback
  const p = msg.params ?? {}
  switch (msg.id) {
    case 'portfolio.ontrackTag':
      return intl.formatMessage({ id: 'portfolio.ontrackTag', defaultMessage: 'On track' })
    case 'portfolio.ontrack':
      return intl.formatMessage({
        id: 'portfolio.ontrack',
        defaultMessage:
          'Your portfolio is within guidelines. No rebalancing or concentration alerts.',
      })
    case 'portfolio.concentrationTag':
      return intl.formatMessage({
        id: 'portfolio.concentrationTag',
        defaultMessage: 'Concentration',
      })
    case 'portfolio.rebalanceTag':
      return intl.formatMessage({ id: 'portfolio.rebalanceTag', defaultMessage: 'Rebalance' })
    case 'portfolio.vestingTag':
      return intl.formatMessage({ id: 'portfolio.vestingTag', defaultMessage: 'Vesting' })
    case 'portfolio.incomeTag':
      return intl.formatMessage({ id: 'portfolio.incomeTag', defaultMessage: 'Income' })
    case 'portfolio.todayTag':
      return intl.formatMessage({ id: 'portfolio.todayTag', defaultMessage: 'Today' })
    case 'portfolio.concentration':
      return typeof p.name === 'string' &&
        typeof p.percent === 'string' &&
        typeof p.over === 'string' &&
        typeof p.guideline === 'string' &&
        (p.custom === 'yes' || p.custom === 'no')
        ? intl.formatMessage(
            {
              id: 'portfolio.concentration',
              defaultMessage:
                '{name} is {percent}% of your investments, {over} percentage points over {custom, select, yes {your} other {the}} {guideline}% single-name guideline.',
            },
            {
              name: p.name,
              percent: p.percent,
              over: p.over,
              guideline: p.guideline,
              custom: p.custom,
            },
          )
        : fallback
    case 'portfolio.rebalance': {
      if (
        typeof p.count !== 'number' ||
        typeof p.asset_class !== 'string' ||
        typeof p.drift !== 'string' ||
        (p.direction !== 'above' && p.direction !== 'below')
      )
        return fallback
      const key = Object.hasOwn(classes, p.asset_class)
        ? (p.asset_class as keyof typeof classes)
        : 'other'
      return intl.formatMessage(
        {
          id: 'portfolio.rebalance',
          defaultMessage:
            '{count, plural, one {# asset class} other {# asset classes}} off target. {subject} {verb, select, plural {are} other {is}} {drift} percentage points {direction, select, above {above} other {below}} your target. Review your target mix.',
        },
        {
          count: p.count,
          subject: intl.formatMessage(classes[key]),
          verb: ['equity', 'bond', 'commodity', 'option'].includes(key) ? 'plural' : 'singular',
          drift: p.drift,
          direction: p.direction,
        },
      )
    }
    case 'portfolio.vesting':
      return typeof p.symbol === 'string' &&
        typeof p.days === 'number' &&
        typeof p.value === 'string' &&
        (p.has_value === 'yes' || p.has_value === 'no')
        ? intl.formatMessage(
            {
              id: 'portfolio.vesting',
              defaultMessage:
                '{symbol} vests in {days, plural, one {# day} other {# days}}{hasValue, select, yes { ({value} indicative)} other {}}. Plan for the tax event.',
            },
            { symbol: p.symbol, days: p.days, value: p.value, hasValue: p.has_value },
          )
        : fallback
    case 'portfolio.income':
      return typeof p.symbol === 'string' &&
        typeof p.days === 'number' &&
        typeof p.amount === 'string'
        ? intl.formatMessage(
            {
              id: 'portfolio.income',
              defaultMessage:
                '{symbol} goes ex-div in {days, plural, one {# day} other {# days}} — {amount} projected.',
            },
            { symbol: p.symbol, days: p.days, amount: p.amount },
          )
        : fallback
    case 'portfolio.today':
      return typeof p.amount === 'string' && typeof p.percent === 'string'
        ? intl.formatMessage(
            { id: 'portfolio.today', defaultMessage: 'Portfolio is {amount} ({percent}%) today.' },
            { amount: p.amount, percent: p.percent },
          )
        : fallback
    default:
      return fallback
  }
}
