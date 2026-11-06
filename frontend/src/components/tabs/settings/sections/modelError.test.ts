import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import contract from '../../../../../../backend/core/model_config_message_contract.json'
import messages from '../remaining.zh-CN.messages.json'
import { MODEL_ERROR_PARAMS, modelError } from './modelError'

const zh = createIntl({ locale: 'zh-CN', messages })
const en = createIntl({ locale: 'en' })

describe('model error translation', () => {
  it('covers the backend contract and its parameters', () => {
    expect(
      Object.fromEntries(Object.entries(MODEL_ERROR_PARAMS).map(([id, param]) => [id, [param]])),
    ).toEqual(contract)
  })
  it('translates trusted messages and preserves unknown or malformed errors', () => {
    const body = {
      detail: 'original',
      message_id: 'models.error.unknownProvider',
      message_params: { provider: 'custom' },
    }
    expect(modelError(body, 'fallback', zh)).toBe('未知服务商：custom。')
    expect(modelError(body, 'fallback', en)).toBe('original')
    expect(
      modelError({ ...body, message_params: { provider: 'custom', extra: 'x' } }, 'fallback', zh),
    ).toBe('original')
    expect(modelError({ ...body, message_id: 'unknown' }, 'fallback', zh)).toBe('original')
  })
})
