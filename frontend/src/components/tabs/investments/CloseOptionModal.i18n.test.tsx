// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import zh from '../../../i18n/zh-CN.json'
import { CloseOptionModal } from './CloseOptionModal'

const close = vi.fn().mockResolvedValue({})
vi.mock('../../../api/options', () => ({ closeOption: (...args: unknown[]) => close(...args) }))
vi.mock('../../../state/queryCache', () => ({ fetchCachedQuery: () => Promise.resolve([]) }))
const position = {
  id: 'option-1',
  underlying_symbol: 'ACME',
  option_type: 'CALL' as const,
  side: 'short' as const,
  contracts: 2,
  strike: 25,
  expiry: '2027-01-01',
  dte: 30,
  premium: 0,
  mark: 0,
  status: 'OTM' as const,
  strategy_group: 'income' as const,
  collateral: 0,
  note: '',
  strategy_tag: '',
  strategy_preset: null,
}
afterEach(cleanup)
it('localizes option details and preserves the close request', async () => {
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <CloseOptionModal position={position} onClose={vi.fn()} onDone={vi.fn()} />
    </IntlProvider>,
  )
  expect(screen.getByText(/ACME 看涨期权/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '平仓' }))
  await waitFor(() =>
    expect(close).toHaveBeenCalledWith(
      'option-1',
      expect.objectContaining({
        close_premium_per_share: undefined,
        premium_account_id: undefined,
      }),
    ),
  )
})
