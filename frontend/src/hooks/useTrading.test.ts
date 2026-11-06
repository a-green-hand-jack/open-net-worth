import { beforeEach, expect, it, vi } from 'vitest'
import { useQueryCache } from '../state/queryCache'
import { useTradingOverview, useTradingRun } from './useTrading'

vi.mock('../state/queryCache', () => ({ useQueryCache: vi.fn(() => ({})) }))
beforeEach(() => vi.clearAllMocks())

it('does not fetch an unselected workspace or run', () => {
  useTradingOverview('')
  useTradingRun('')
  for (const call of vi.mocked(useQueryCache).mock.calls) {
    expect(call[2]).toMatchObject({ enabled: false })
  }
})

it('uses run-scoped cache keys when a run is selected', () => {
  useTradingRun('run-demo')
  expect(vi.mocked(useQueryCache).mock.calls.map((call) => call[0])).toEqual([
    '/api/trading/runs/run-demo',
    '/api/trading/runs/run-demo/accounts',
    '/api/trading/runs/run-demo/orders',
    '/api/trading/runs/run-demo/fills',
    '/api/trading/runs/run-demo/performance',
  ])
})
