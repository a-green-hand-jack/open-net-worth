import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import contract from '../../../../backend/core/lots_message_contract.json'
import messages from './zh-CN.messages.json'
import { LOTS_MESSAGE_PARAMS, lotsMessage } from './lotsMessages'

describe('lot application errors', () => {
  const intl = createIntl({ locale: 'zh-CN', messages })
  it('covers the backend IDs and required parameters', () =>
    expect(LOTS_MESSAGE_PARAMS).toEqual(contract))
  it('translates only known IDs with exactly matching string parameters', () => {
    const error = {
      detail: 'original',
      message_id: 'lots.error.quantityBelowSold',
      message_params: { sold: '4' },
    }
    expect(lotsMessage(error, 'fallback', intl)).toContain('已卖出 4 份')
    expect(lotsMessage({ ...error, message_params: { sold: 4 } }, 'fallback', intl)).toBe(
      'original',
    )
    expect(lotsMessage({ ...error, message_id: 'unknown' }, 'fallback', intl)).toBe('original')
    expect(
      lotsMessage(
        { detail: 'lot details', message_id: 'lots.error.identicalOpen', message_params: {} },
        'fallback',
        intl,
      ),
    ).toBe('lot details')
  })
})
