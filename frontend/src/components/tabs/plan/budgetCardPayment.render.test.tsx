// @vitest-environment jsdom
//
// Without the side panel (a phone), a card's payment detail floats as a modal — its explanation
// and Assign button included (owner, 2026-09-28).
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CardPaymentPanel } from './budgetCardPayment'
import type { LocalCat } from './useBudgetModel'
import { IntlProvider } from 'react-intl'
import messages from './zh-CN.messages.json'

vi.mock('../../../api/client', () => ({
  authFetch: vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve(null) })),
}))

afterEach(cleanup)

const card = {
  key: 'env-cc',
  label: 'Visa',
  color: '#3b86dd',
  isPaymentEnvelope: true,
  assigned: 100,
  paymentOwed: 2000,
  availableForPayment: 800,
  paymentUnderfunded: 1200,
} as LocalCat

describe('CardPaymentPanel as a modal', () => {
  it('preserves the amount assigned in Chinese', () => {
    const onAssign = vi.fn()
    render(
      <IntlProvider locale="zh-CN" messages={messages} onError={() => {}}>
        <CardPaymentPanel
          c={card}
          month="2026-10"
          note=""
          onSaveNote={vi.fn()}
          onBack={vi.fn()}
          onOpenAccounts={vi.fn()}
          onAssign={onAssign}
          inline={false}
        />
      </IntlProvider>,
    )
    expect(screen.getByText(/此账单还需/).textContent).toContain('1,200')
    fireEvent.click(screen.getByText('为什么？'))
    expect(screen.getByText(/预算开始之前的债务/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^分配/ }))
    expect(onAssign).toHaveBeenCalledWith(1300)
  })

  it('explains the shortfall and assigns it on top of what is assigned', () => {
    const onAssign = vi.fn()
    render(
      <CardPaymentPanel
        c={card}
        month="2026-10"
        note=""
        onSaveNote={vi.fn()}
        onBack={vi.fn()}
        onOpenAccounts={vi.fn()}
        onAssign={onAssign}
        inline={false}
      />,
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByText('Why is this?'))
    expect(screen.getByText(/debt from before your budget started/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Assign/ }))
    expect(onAssign).toHaveBeenCalledWith(1300)
  })
})
