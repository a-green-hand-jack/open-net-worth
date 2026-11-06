import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import contract from '../../../../backend/core/positions_message_contract.json'
import messages from './zh-CN.messages.json'
import { POSITION_MESSAGE_PARAMS, positionsMessage } from './positionsMessages'

describe('position error provenance', () => {
  const intl = createIntl({ locale: 'zh-CN', messages })
  it('tracks every server ID and preserves unknown or malformed errors', () => {
    expect(POSITION_MESSAGE_PARAMS).toEqual(contract)
    for (const [message_id, names] of Object.entries(contract)) {
      const message_params = Object.fromEntries(names.map((key) => [key, 'example']))
      const body = { detail: 'original', message_id, message_params }
      expect(positionsMessage(body, 'fallback', intl), message_id).not.toBe('original')
      expect(positionsMessage({ ...body, message_params: { ...message_params, extra: 'x' } }, 'fallback', intl)).toBe('original')
    }
    expect(positionsMessage({ detail: 'external', message_id: 'unknown', message_params: {} }, '', intl)).toBe('external')
  })
})
