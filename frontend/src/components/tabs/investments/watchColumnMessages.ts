import { defineMessages, type IntlShape } from 'react-intl'

const names = defineMessages({
  last: { id: 'watchColumns.last', defaultMessage: 'Last' },
  change: { id: 'watchColumns.change', defaultMessage: 'Change' },
  change_pct: { id: 'watchColumns.change_pct', defaultMessage: 'Change %' },
  prev_close: { id: 'watchColumns.prev_close', defaultMessage: 'Prev close' },
  open: { id: 'watchColumns.open', defaultMessage: 'Open' },
  ccy: { id: 'watchColumns.ccy', defaultMessage: 'Cur' },
  volume: { id: 'watchColumns.volume', defaultMessage: 'Volume' },
  avg_volume: { id: 'watchColumns.avg_volume', defaultMessage: 'Avg volume' },
  volume_ratio: { id: 'watchColumns.volume_ratio', defaultMessage: 'Vol / avg' },
  day_range: { id: 'watchColumns.day_range', defaultMessage: 'Day range' },
  range52: { id: 'watchColumns.range52', defaultMessage: '52w range' },
  week52_low: { id: 'watchColumns.week52_low', defaultMessage: '52w low' },
  week52_high: { id: 'watchColumns.week52_high', defaultMessage: '52w high' },
  market_cap: { id: 'watchColumns.market_cap', defaultMessage: 'Mkt cap' },
  pe: { id: 'watchColumns.pe', defaultMessage: 'P/E' },
  earnings: { id: 'watchColumns.earnings', defaultMessage: 'Earnings' },
  pos: { id: 'watchColumns.pos', defaultMessage: 'Position' },
  value: { id: 'watchColumns.value', defaultMessage: 'Mkt value' },
  day_pl: { id: 'watchColumns.day_pl', defaultMessage: 'Daily P&L' },
  unrealized: { id: 'watchColumns.unrealized', defaultMessage: 'Unrealized P&L' },
})
const groups = defineMessages({
  Prices: { id: 'watchColumns.group.prices', defaultMessage: 'Prices' },
  'High / Low / Volume': { id: 'watchColumns.group.ranges', defaultMessage: 'High / Low / Volume' },
  Fundamentals: { id: 'watchColumns.group.fundamentals', defaultMessage: 'Fundamentals' },
  'Position & P&L': { id: 'watchColumns.group.position', defaultMessage: 'Position & P&L' },
})

export function watchColumnLabel(key: string, fallback: string, intl: IntlShape): string {
  const descriptor = names[key as keyof typeof names]
  return descriptor ? intl.formatMessage(descriptor) : fallback
}

export function watchGroupLabel(key: string, intl: IntlShape): string {
  const descriptor = groups[key as keyof typeof groups]
  return descriptor ? intl.formatMessage(descriptor) : key
}
