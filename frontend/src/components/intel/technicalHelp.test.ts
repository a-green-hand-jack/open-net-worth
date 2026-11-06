import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import messages from './zh-CN.messages.json'
import { technicalHelp } from './technicalHelp'

const intl = createIntl({ locale: 'zh-CN', messages })
describe('technical indicator explanations', () => {
  it('uses the stable indicator id and preserves unknown explanations', () => {
    expect(technicalHelp('sma_50', 'original', intl)).toContain('50')
    expect(technicalHelp('unknown', 'external explanation', intl)).toBe('external explanation')
  })
})
