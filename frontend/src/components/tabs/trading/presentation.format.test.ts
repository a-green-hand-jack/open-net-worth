import { afterEach, describe, expect, it } from 'vitest'
import { setDisplayFormats } from '../../../utils/format'
import { tradingMoney, tradingPercent } from './presentation'

afterEach(() => setDisplayFormats({ number_format: null }))

describe('trading display formats', () => {
  it('uses the profile number format for money and percentages', () => {
    setDisplayFormats({ number_format: 'dot' })
    expect(tradingMoney(1234.5, 'USD')).toContain('1.234,50')
    expect(tradingPercent(12.34)).toBe('12,34%')
  })
})
