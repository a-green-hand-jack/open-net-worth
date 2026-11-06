// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import messages from './pickers.zh-CN.json'
import { CurrencyPicker } from './ds'

afterEach(cleanup)

it('searches localized currency names while returning the unchanged currency code', () => {
  const onChange = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={messages}>
      <CurrencyPicker value="USD" onChange={onChange} />
    </IntlProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: /USD/ }))
  fireEvent.change(screen.getByPlaceholderText('搜索货币…'), { target: { value: '人民币' } })
  fireEvent.mouseDown(screen.getByText('CNY'))
  expect(onChange).toHaveBeenCalledWith('CNY')
})
