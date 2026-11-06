// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { binanceApi, type BinanceStatus } from '../../../api/binance'
import { BinanceSection } from './BinanceSection'
import { hasConfigForm } from './ConnectorConfig'
import type { Connector } from './types'
import { useConnectorSaveHost } from './formSave'

vi.mock('../../../api/binance', () => ({
  binanceApi: { status: vi.fn(), configure: vi.fn(), test: vi.fn() },
}))

const status: BinanceStatus = {
  connector_id: 'binance',
  configured: false,
  enabled: false,
  environment: 'testnet',
  quote_currency: 'USDT',
  account_scope: 'dedicated_account',
  isolated_account: false,
  has_api_key: false,
  has_api_secret: false,
  venue: 'binance-testnet',
  verification: 'unverified',
  verified_at: null,
  available_cash: null,
  total_cash: null,
  non_quote_balances: null,
  open_orders: null,
}
function Host() {
  const host = useConnectorSaveHost()
  return (
    <host.Provider>
      <BinanceSection />
      <button disabled={!host.state?.dirty || host.state.saving} onClick={() => void host.run()}>
        Save
      </button>
    </host.Provider>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(binanceApi.status).mockResolvedValue(status)
})
afterEach(cleanup)

it('registers a configuration form for the Binance connector', () => {
  expect(hasConfigForm({ kind: 'binance' } as Connector)).toBe(true)
})

it('defaults to testnet and requires the complete pair and exclusive allocation', async () => {
  vi.mocked(binanceApi.configure).mockResolvedValue({
    ...status,
    configured: true,
    enabled: true,
    isolated_account: true,
    has_api_key: true,
    has_api_secret: true,
  })
  render(<Host />)
  expect(await screen.findByLabelText('Environment')).toHaveProperty('value', 'testnet')
  const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement
  expect(save.disabled).toBe(true)
  fireEvent.change(screen.getByLabelText(/API key/), { target: { value: 'synthetic-key' } })
  fireEvent.change(screen.getByLabelText(/API secret/), { target: { value: 'synthetic-secret' } })
  expect(save.disabled).toBe(true)
  fireEvent.click(screen.getByLabelText(/reserved exclusively/i))
  await waitFor(() => expect(save.disabled).toBe(false))
  fireEvent.click(save)
  await waitFor(() =>
    expect(binanceApi.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: 'testnet',
        isolated_account: true,
        api_key: 'synthetic-key',
        api_secret: 'synthetic-secret',
      }),
    ),
  )
  await waitFor(() => expect(screen.getByLabelText(/API key/)).toHaveProperty('value', ''))
  expect(screen.getByLabelText(/API secret/)).toHaveProperty('value', '')
})

it('requires a new credential pair when changing environment', async () => {
  vi.mocked(binanceApi.status).mockResolvedValue({
    ...status,
    configured: true,
    enabled: true,
    isolated_account: true,
    has_api_key: true,
    has_api_secret: true,
  })
  render(<Host />)
  fireEvent.change(await screen.findByLabelText('Environment'), { target: { value: 'live' } })
  expect(screen.getByText(/Changing environment requires a new key pair/i)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement).disabled).toBe(true)
})

it('never retrieves saved credentials when the eye is toggled', async () => {
  vi.mocked(binanceApi.status).mockResolvedValue({
    ...status,
    configured: true,
    enabled: true,
    isolated_account: true,
    has_api_key: true,
    has_api_secret: true,
  })
  render(<Host />)
  const key = await screen.findByLabelText(/API key/)
  expect(key).toHaveProperty('value', '')
  fireEvent.click(screen.getAllByRole('button', { name: 'Show secret' })[0]!)
  expect(key).toHaveProperty('value', '')
  expect(binanceApi.status).toHaveBeenCalledTimes(1)
})
