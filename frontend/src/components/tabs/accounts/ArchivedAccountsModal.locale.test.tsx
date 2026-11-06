// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../i18n/catalogs'
import { ArchivedAccountsModal } from './ArchivedAccountsModal'
import { fromApiAccount } from './data'

afterEach(cleanup)

it('translates archive controls and retains the original account when restoring', () => {
  const account = fromApiAccount({
    id: 'account-synthetic',
    name: 'My Account',
    kind: 'asset',
    type: 'cash',
    currency: 'USD',
    balance: 12,
    balance_base: 12,
    cleared_balance: 12,
    cleared_balance_base: 12,
  })
  const onRestore = vi.fn()
  const common = {
    open: true,
    accounts: [account],
    loading: false,
    error: null,
    transactions: [],
    loadingTransactions: false,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    onBack: vi.fn(),
    onRestore,
    onDelete: vi.fn(),
  }
  const view = render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <ArchivedAccountsModal {...common} selected={null} />
    </IntlProvider>,
  )
  expect(screen.getByText('已归档账户')).toBeTruthy()
  expect(screen.getByText('My Account')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /My Account/ }))
  expect(common.onSelect).toHaveBeenCalledWith(account)
  view.rerender(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <ArchivedAccountsModal {...common} selected={account} />
    </IntlProvider>,
  )
  expect(screen.getByText('此账户没有交易记录。')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '恢复账户' }))
  expect(onRestore).toHaveBeenCalledWith(account)
})
