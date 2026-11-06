// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { AvailCell } from './budgetMove'
import { RTA_KEY } from './useBudgetModel'
import messages from './zh-CN.messages.json'

afterEach(cleanup)

describe('localized budget transfers', () => {
  it('moves the same amount to the Ready to Assign sentinel', () => {
    const transfer = vi.fn()
    render(
      <IntlProvider locale="zh-CN" messages={messages} onError={() => {}}>
        <AvailCell
          c={{ key: 'synthetic-envelope', label: 'Example', available: 100 }}
          allGroups={[]}
          rta={50}
          onTransfer={transfer}
        />
      </IntlProvider>,
    )
    fireEvent.click(screen.getByTitle('转移资金'))
    fireEvent.click(screen.getByRole('button', { name: '选择信封…' }))
    fireEvent.click(screen.getByRole('option', { name: /待分配/ }))
    fireEvent.click(screen.getByRole('button', { name: '确定' }))
    expect(transfer).toHaveBeenCalledWith('synthetic-envelope', RTA_KEY, 100)
  })
})
