// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import messages from './pickers.zh-CN.json'
import { AddPayeeField } from './pickers'
import type { Account } from './types'

afterEach(cleanup)

it('finds another account with the Chinese transfer prefix and selects its id', () => {
  const onSelectTransfer = vi.fn()
  const accounts = [
    { id: 'from', name: 'Source', type: 'cash' },
    { id: 'to', name: 'Target', type: 'cash' },
  ] as Account[]
  render(
    <IntlProvider locale="zh-CN" messages={messages}>
      <AddPayeeField
        value="转入/转出"
        onChange={vi.fn()}
        options={[]}
        advance={vi.fn()}
        accounts={accounts}
        fromAccountId="from"
        onSelectTransfer={onSelectTransfer}
      />
    </IntlProvider>,
  )
  fireEvent.focus(screen.getByPlaceholderText('收款方'))
  expect(screen.queryByText('转入/转出 Source')).toBeNull()
  fireEvent.mouseDown(screen.getByText('转入/转出 Target'))
  expect(onSelectTransfer).toHaveBeenCalledWith('to')
})

it('uses the active locale transfer phrase without hardcoding a language', () => {
  const onSelectTransfer = vi.fn()
  const accounts = [
    { id: 'from', name: 'Source', type: 'cash' },
    { id: 'to', name: 'Target', type: 'cash' },
  ] as Account[]
  render(
    <IntlProvider
      locale="fr"
      messages={{
        ...messages,
        'accounts.payeePicker.placeholder': 'Payee',
        'accounts.payeePicker.transfer': 'Vers {account}',
      }}
    >
      <AddPayeeField
        value="Vers"
        onChange={vi.fn()}
        options={[]}
        advance={vi.fn()}
        accounts={accounts}
        fromAccountId="from"
        onSelectTransfer={onSelectTransfer}
      />
    </IntlProvider>,
  )
  fireEvent.focus(screen.getByPlaceholderText('Payee'))
  fireEvent.mouseDown(screen.getByText('Vers Target'))
  expect(onSelectTransfer).toHaveBeenCalledWith('to')
})
