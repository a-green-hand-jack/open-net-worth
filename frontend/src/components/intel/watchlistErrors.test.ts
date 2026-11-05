import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createIntl, createIntlCache } from 'react-intl'
import messages from './zh-CN.messages.json'
import { localizeWatchlistError, messages as descriptors, params } from './watchlistErrors'

const intl = createIntl({ locale: 'zh-CN', messages }, createIntlCache())

describe('watchlist error localization', () => {
  it('localizes a known server error while retaining the user-provided symbol', () => {
    expect(localizeWatchlistError({ message_id: 'watchlist.error.symbolNotFound', message_params: { symbol: 'ACME' } }, intl))
      .toContain('ACME')
    expect(localizeWatchlistError({ message_id: 'watchlist.error.blankName', message_params: {} }, intl)).toBe('自选列表名称不能为空')
  })
  it('translates known intent field names without translating arbitrary input', () => {
    expect(localizeWatchlistError({ message_id: 'watchlist.error.intentPositive', message_params: { field: 'buy_below' } }, intl)).toContain('买入上限')
    expect(localizeWatchlistError({ message_id: 'watchlist.error.intentPositive', message_params: { field: 'custom' } }, intl)).toContain('custom')
  })
  it('leaves unknown or malformed messages to the original server-text fallback', () => {
    expect(localizeWatchlistError({ message_id: 'watchlist.error.unknown', message_params: {} }, intl)).toBeNull()
    expect(localizeWatchlistError({ message_id: 'watchlist.error.symbolNotFound', message_params: {} }, intl)).toBeNull()
  })
})

it('covers every watchlist backend error and parameter', () => {
  const contract = JSON.parse(readFileSync('../backend/core/watchlist_message_contract.json', 'utf8')) as Record<string, string[]>
  expect(Object.keys(descriptors).sort()).toEqual(Object.keys(contract).map(id => id.split('.').at(-1)).sort())
  for (const [id, fields] of Object.entries(contract)) expect(params[id.split('.').at(-1)!]).toEqual(fields)
})
