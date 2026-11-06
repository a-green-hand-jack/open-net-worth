// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import messages from './pickers.zh-CN.json'
import { AddCategoryField } from './pickers'

afterEach(cleanup)

it('keeps a user category group name even when it matches a built-in English label', () => {
  render(
    <IntlProvider locale="zh-CN" messages={messages}>
      <AddCategoryField
        value=""
        onChange={vi.fn()}
        advance={vi.fn()}
        options={[{ id: 'custom', label: 'My category', group: 'Income', color: '' }] as never}
      />
    </IntlProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: /分类/ }))
  expect(screen.getByText('Income')).toBeTruthy()
  expect(screen.getByText('My category')).toBeTruthy()
})
