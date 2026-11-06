// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import zh from '../../../i18n/zh-CN.json'
import { OptionsTab } from './OptionsTab'

const p = {
  id: 'option-1',
  underlying_symbol: 'ACME',
  option_type: 'CALL',
  side: 'short',
  contracts: 2,
  strike: 25,
  expiry: '2027-01-01',
  dte: 30,
  premium: 100,
  mark: -20,
  status: 'OTM',
  strategy_group: 'income',
  collateral: 0,
  note: 'User note',
  strategy_tag: 'User strategy',
  strategy_preset: null as 'covered_call' | null,
}
vi.mock('./useOptionsView', () => ({
  useOptionsView: () => ({
    baseCurrency: 'USD',
    summaryCards: [{ label: 'Open positions', labelKey: 'open', value: '1' }],
    incomePositions: [p],
    hedgePositions: [],
    netMark: -20,
    loading: false,
    error: false,
    refetch: vi.fn(),
  }),
}))
afterEach(cleanup)
it('translates only explicitly identified presets and preserves historical labels', () => {
  p.strategy_tag = 'covered_call'
  p.strategy_preset = null
  const { rerender } = render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <OptionsTab />
    </IntlProvider>,
  )
  expect(screen.getByText('covered_call')).toBeTruthy()
  p.strategy_preset = 'covered_call'
  rerender(
    <IntlProvider locale="zh-CN" messages={zh}>
      <OptionsTab />
    </IntlProvider>,
  )
  expect(screen.getByText('备兑看涨')).toBeTruthy()
  p.strategy_preset = null
  p.strategy_tag = 'User strategy'
})
it('localizes option status and deletion warning without altering user notes', () => {
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <OptionsTab />
    </IntlProvider>,
  )
  expect(screen.getByText('价外')).toBeTruthy()
  expect(screen.getByText('User note')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '删除' }))
  expect(screen.getByText(/不会记录任何现金交易/)).toBeTruthy()
})
