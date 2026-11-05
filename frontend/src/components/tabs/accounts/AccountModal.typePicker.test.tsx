// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import messages from './zh-CN.messages.json'
import AccountModal from './AccountModal'
import { TYPE_LABELS, TYPE_MEANING } from './categories'

afterEach(cleanup)

function renderTypeStep() {
  render(<AccountModal open mode="add" institutions={[]} onClose={() => {}} onSave={vi.fn()} />)
  fireEvent.click(screen.getByLabelText(/Account type:/))
}

describe('AccountModal type picker', () => {
  it('searches account types in Chinese and retains the underlying type', () => {
    render(
      <IntlProvider locale="zh-CN" messages={messages}>
        <AccountModal open mode="add" institutions={[]} onClose={() => {}} onSave={vi.fn()} />
      </IntlProvider>,
    )
    fireEvent.click(screen.getByLabelText('账户类型：现金。更改'))
    fireEvent.change(screen.getByPlaceholderText(/养老金/), { target: { value: '定期' } })
    fireEvent.click(screen.getByRole('button', { name: /定期存款/ }))
    expect(screen.getByLabelText('账户类型：定期存款。更改')).toBeTruthy()
  })
  it('shows seven rows with their meaning and no band/locked/on-budget controls', () => {
    renderTypeStep()
    for (const t of Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[]) {
      expect(screen.getByText(TYPE_LABELS[t])).toBeTruthy()
      expect(screen.getByText(TYPE_MEANING[t])).toBeTruthy()
    }
    expect(screen.queryByText(/Net-worth band/)).toBeNull()
    expect(screen.queryByText(/Locked/)).toBeNull()
    expect(screen.queryByRole('tab', { name: 'On budget' })).toBeNull()
  })
})
