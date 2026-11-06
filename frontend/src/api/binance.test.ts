import { expect, it, vi } from 'vitest'
import { authFetch } from './client'
import { binanceApi } from './binance'

vi.mock('./client', () => ({ authFetch: vi.fn() }))
vi.mock('../state/queryCache', () => ({ invalidateQueryCache: vi.fn() }))

it('uses the matching backend endpoint and method for each Binance operation', async () => {
  vi.mocked(authFetch).mockImplementation(async () => new Response('{}'))
  await binanceApi.status()
  await binanceApi.configure({
    environment: 'testnet',
    quote_currency: 'USD',
    account_scope: 'subaccount',
    isolated_account: true,
    enabled: true,
  })
  await binanceApi.test()
  expect(
    vi.mocked(authFetch).mock.calls.map(([url, init]) => [url, init?.method ?? 'GET']),
  ).toEqual([
    ['/api/binance/status', 'GET'],
    ['/api/binance/config', 'PUT'],
    ['/api/binance/test', 'POST'],
  ])
})
