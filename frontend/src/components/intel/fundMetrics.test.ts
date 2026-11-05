import { expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import messages from './zh-CN.messages.json'
import { fundMetric } from './fundMetrics'

it('translates built-in metric ids and preserves unknown provider text', () => {
  const intl = createIntl({ locale: 'zh-CN', messages })
  expect(fundMetric('pe_ratio', 'P/E', 'original', intl).label).toBe('市盈率')
  expect(fundMetric('external', 'provider label', 'provider help', intl)).toEqual({ label: 'provider label', help: 'provider help' })
})
