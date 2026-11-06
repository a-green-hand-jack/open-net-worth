// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { TradingAccount, TradingOrder } from '../../../types/trading'
import { TradingHoldings } from './TradingHoldings'
import { TradingOrders } from './TradingOrders'
import { TradingPerformance } from './TradingPerformance'

vi.mock('../overview/charts', () => ({ OvChart: () => null }))
afterEach(cleanup)

const account = {
  id: 'synthetic-account', run_id: 'synthetic-run', name: 'Synthetic', venue: 'simulation',
  currency: 'USD', capital: '1000', cash: '800', reconciliation_status: 'unverified',
  positions: { ACME: { instrument: { symbol: 'ACME', venue: 'simulation', asset_class: 'stock', currency: 'USD' }, quantity: '2', market_price: null, market_value: null, cost_basis: '200', unrealized_pnl: null } },
} as TradingAccount
const order: TradingOrder = {
  id: 'synthetic-order', run_id: 'synthetic-run', account_id: account.id,
  instrument: { symbol: 'ACME', venue: 'simulation', asset_class: 'stock', currency: 'USD' },
  side: 'buy', quantity: '2', filled_quantity: '0', order_type: 'market',
  status: 'submission_unknown', created_at: '2026-01-05T14:30:00Z', request_id: 'synthetic-request',
}

it('shows missing prices as unknown rather than zero', () => {
  render(<TradingHoldings accounts={[account]} />)
  const row = screen.getByText('ACME').closest('tr')!
  expect(row.textContent).toContain('—')
  expect(screen.getByText('unverified')).toBeTruthy()
})

it('warns about an unknown broker outcome and does not offer cancellation', () => {
  render(<TradingOrders orders={[order]} fills={[]} busy={false} onCancel={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'View order ACME' }))
  expect(screen.getByText(/broker outcome is unknown/i)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Cancel order ACME' })).toBeNull()
  expect(screen.getByText('No fills recorded')).toBeTruthy()
})

it('requires confirmation before requesting cancellation', async () => {
  const cancel = vi.fn().mockResolvedValue(undefined)
  render(<TradingOrders orders={[{ ...order, status: 'open' }]} fills={[]} busy={false} onCancel={cancel} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel order ACME' }))
  expect(cancel).not.toHaveBeenCalled()
  expect(screen.getByText(/may still fill before the broker confirms/i)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Request cancellation' }))
  await waitFor(() => expect(cancel).toHaveBeenCalledWith(expect.objectContaining({ id: order.id })))
})

it('discloses incomplete valuations without showing a zero value', () => {
  render(<TradingPerformance performance={{ base_currency: 'USD', initial_equity: '1000', equity: null, valuation_complete: false }} />)
  expect(screen.getByText(/missing or stale prices and FX are not treated as zero/i)).toBeTruthy()
  expect(screen.getByText(/Current equity/).textContent).toContain('—')
})
