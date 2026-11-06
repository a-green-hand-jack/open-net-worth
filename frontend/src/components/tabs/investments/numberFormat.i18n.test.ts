import { afterEach, expect, it } from 'vitest'
import { setDisplayFormats } from '../../../utils/format'
import { fChange, WATCH_COLUMNS } from './watchColumns'
import type { WatchQuoteRow } from '../../../types/watchlistQuotes'

afterEach(() => setDisplayFormats({ number_format: null }))

it('uses the profile number format for watchlist quantities and ratios', () => {
  setDisplayFormats({ number_format: 'dot' })
  const ratio = WATCH_COLUMNS.find(column => column.key === 'volume_ratio')!
  const position = WATCH_COLUMNS.find(column => column.key === 'pos')!
  const row = { volume_ratio: 1.25, position: { quantity: 1234.5 } } as unknown as WatchQuoteRow
  expect(ratio.cell(row)).toBe('1,25×')
  expect(position.cell(row)).toBe('1.234,5')
  expect(fChange(0)).toBe('0,00')
})
