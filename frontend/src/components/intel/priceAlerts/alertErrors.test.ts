import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createIntl, createIntlCache } from 'react-intl'
import messages from '../zh-CN.messages.json'
import { AlertRequestError, alertErrorText, messages as descriptors, params } from './alertErrors'

const intl = createIntl({ locale: 'zh-CN', messages }, createIntlCache())
describe('alert errors', () => {
  it('translates validated application errors with their parameter', () => {
    expect(alertErrorText(new AlertRequestError('original', { message_id: 'alert.error.moveRange', message_params: { max: 100 } }), intl, 'fallback')).toContain('100')
  })
  it('preserves unknown and malformed server messages', () => {
    expect(alertErrorText(new AlertRequestError('external', { message_id: 'external', message_params: {} }), intl, 'fallback')).toBe('external')
    expect(alertErrorText(new AlertRequestError('original', { message_id: 'alert.error.moveRange', message_params: {} }), intl, 'fallback')).toBe('original')
  })
})

it('covers every alert backend error and parameter', () => {
  const contract = JSON.parse(readFileSync('../backend/core/alert_message_contract.json', 'utf8')) as Record<string, string[]>
  expect(Object.keys(descriptors).sort()).toEqual(Object.keys(contract).map(id => id.split('.').at(-1)).sort())
  for (const [id, fields] of Object.entries(contract)) expect(params[id.split('.').at(-1)!]).toEqual(fields)
})
