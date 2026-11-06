// @vitest-environment jsdom
import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import type { PortfolioReturns } from '../../../../types/portfolio'
import { returnsLabel } from './investing'
import messages from './investing.zh-CN.json'

const intl = createIntl({ locale: 'zh-CN', messages })
function result(label_message: PortfolioReturns['label_message']) {
  return { label: 'Original external label', label_message } as PortfolioReturns
}

describe('performance label provenance', () => {
  it('preserves the server label in English', () => {
    const english = createIntl({ locale: 'en' })
    expect(
      returnsLabel(english, result({ id: 'returns.label.period', params: { period: '1Y' } })),
    ).toBe('Original external label')
  })
  it('translates known server period metadata', () => {
    expect(
      returnsLabel(intl, result({ id: 'returns.label.period', params: { period: '1Y' } })),
    ).toBe('过去一年')
  })
  it('preserves the original when metadata is missing, unknown or invalid', () => {
    for (const metadata of [
      null,
      { id: 'returns.label.period', params: { period: 'OTHER' } },
      { id: 'returns.label.period', params: { period: '1Y', extra: 'x' } },
      { id: 'unknown', params: {} },
      { id: 'returns.label.period', params: ['1Y'] as unknown as Record<string, unknown> },
    ]) {
      expect(returnsLabel(intl, result(metadata))).toBe('Original external label')
    }
  })
})
