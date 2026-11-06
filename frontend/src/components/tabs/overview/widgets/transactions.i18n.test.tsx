// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../../../i18n/catalogs'
import { WIDGET_DEFINITIONS } from '../definitions'
import type { WidgetInstance } from '../types'
import { transactionsWidgetComponents } from './transactions'

const authFetch = vi.hoisted(() => vi.fn())
vi.mock('../../../../api/client', () => ({ authFetch }))
afterEach(() => {
  cleanup()
  authFetch.mockReset()
})

it('translates transaction labels while preserving account and payee names', async () => {
  authFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      transactions: [
        {
          id: 'tr',
          date: '2026-10-12',
          kind: 'transfer',
          from_account_name: 'Saved',
          to_account_name: 'Income',
          base_amount: 10,
        },
        {
          id: 'buy',
          date: '2026-10-13',
          kind: 'investment',
          from_account_id: 'a',
          ticker: 'ACME',
          quantity: 2,
          base_amount: 20,
        },
        {
          id: 'other',
          date: '2026-10-13',
          kind: 'expense',
          payee_name: 'Transfer',
          base_amount: 5,
        },
      ],
    }),
  })
  const Comp = transactionsWidgetComponents['recent-added-txns']!
  const def = WIDGET_DEFINITIONS.find((d) => d.defId === 'recent-added-txns')!
  const instance: WidgetInstance = {
    instanceId: 'w',
    defId: def.defId,
    x: 0,
    y: 0,
    w: 4,
    h: 240,
    config: {},
  }
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <Comp instance={instance} def={def} onPatch={vi.fn()} onNavigate={vi.fn()} />
    </IntlProvider>,
  )
  expect(await screen.findByText('Saved → Income')).toBeTruthy()
  expect(screen.getByText('买入 2 ACME')).toBeTruthy()
  expect(screen.getByText('Transfer')).toBeTruthy()
  expect(screen.getByText('打开交易记录')).toBeTruthy()
})
