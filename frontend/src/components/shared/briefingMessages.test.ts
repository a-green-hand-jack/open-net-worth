import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import contract from '../../../../backend/core/briefing_message_contract.json'
import messages from './zh-CN.messages.json'
import { briefingError, BRIEFING_ERROR_IDS } from './briefingMessages'

describe('briefing application error metadata', () => {
  const intl = createIntl({ locale: 'zh-CN', messages })
  it('covers the backend error contract', () => {
    expect(Object.fromEntries(BRIEFING_ERROR_IDS.map((id) => [id, []]))).toEqual(contract)
  })
  it('only translates known IDs with a strict empty parameter object', () => {
    expect(
      briefingError('original', { message_id: 'briefing.error.unreadable', params: {} }, intl),
    ).toContain('简报无法读取')
    expect(
      briefingError('original', { message_id: 'briefing.error.unreadable', params: [] }, intl),
    ).toBe('original')
    expect(briefingError('original', { message_id: 'unknown', params: {} }, intl)).toBe('original')
  })
})
