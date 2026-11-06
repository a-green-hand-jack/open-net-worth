import { describe, expect, it } from 'vitest'
import { createIntl, createIntlCache } from 'react-intl'
import zh from '../../../i18n/zh-CN.json'
import { formatRiskSummary } from './performanceMessages'

const intl = createIntl({ locale: 'zh-CN', messages: zh }, createIntlCache())
describe('risk summary localization', () => {
  it('preserves server-computed values and formats known message IDs', () => {
    expect(
      formatRiskSummary(
        intl,
        [{ id: 'performance.risk.more', params: { percent: 30 }, text: 'swings ~30% more' }],
        'original',
      ),
    ).toBe('波动比市场高约 30%')
  })
  it('preserves the short-window qualification', () => {
    expect(
      formatRiskSummary(
        intl,
        [{ id: 'performance.risk.excellent', params: { short_window: true }, text: 'raw' }],
        'original',
      ),
    ).toBe('承担的风险获得了极佳回报（短时间窗口）')
  })
  it('retains the original summary for unknown IDs or malformed parameters', () => {
    expect(
      formatRiskSummary(intl, [{ id: 'future', params: {}, text: 'future' }], 'original'),
    ).toBe('original')
    expect(
      formatRiskSummary(
        intl,
        [{ id: 'performance.risk.more', params: { percent: '30' }, text: 'raw' }],
        'original',
      ),
    ).toBe('original')
  })
})
