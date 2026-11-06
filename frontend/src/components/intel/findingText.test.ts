import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import messages from './zh-CN.messages.json'
import { findingText, requiredParams } from './findingText'
import type { WatchFinding } from '../../types/watchPulse'

const intl = createIntl({ locale: 'zh-CN', messages })
const finding: WatchFinding = { kind: 'big_move', tone: 'bad', weight: 30, severity: 'medium', text: 'Original text' }

describe('watch pulse finding localization', () => {
  it('preserves direction and numbers from structured metadata', () => {
    expect(findingText({ ...finding, text_message: { id: 'watchPulse.scored_move', params: { direction: 'down', percent: '5.2', multiple: '2.1' } } }, intl)).toContain('下跌 5.2%')
  })
  it('localizes benchmark comparisons and event timing without losing parameters', () => {
    const compared = findingText({ ...finding, text_message: { id: 'watchPulse.move_with_benchmark', params: { direction: 'down', percent: '6.0', gap: '7.0', relative: 'behind', comparison: 'ACME' } } }, intl)
    expect(compared).toContain('落后 ACME 7.0')
    expect(findingText({ ...finding, text_message: { id: 'watchPulse.earnings', params: { days: 1, thesis: 'yes' } } }, intl)).toContain('明天公布财报')
  })
  it('renders every registered message when its parameters are supplied', () => {
    for (const [id, fields] of Object.entries(requiredParams)) {
      const params = Object.fromEntries(fields.map(field => [field, field === 'days' ? 2 : 'value']))
      expect(findingText({ ...finding, text_message: { id: `watchPulse.${id}`, params } }, intl), id).not.toBe('Original text')
    }
  })
  it('preserves the original for unknown or incomplete metadata', () => {
    expect(findingText({ ...finding, text_message: { id: 'watchPulse.unknown', params: {} } }, intl)).toBe('Original text')
    expect(findingText({ ...finding, text_message: { id: 'watchPulse.scored_move', params: {} } }, intl)).toBe('Original text')
    expect(findingText(finding, intl)).toBe('Original text')
  })
})
