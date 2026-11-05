// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import zh from '../../../i18n/zh-CN.json'
import { WatchColumnsModal } from './WatchColumnsModal'

afterEach(cleanup)
it('shows Chinese column names while storing stable column keys', () => {
  const onChange = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <WatchColumnsModal open value={['last']} onChange={onChange} onClose={vi.fn()} />
    </IntlProvider>,
  )
  fireEvent.click(screen.getByLabelText('涨跌'))
  expect(onChange).toHaveBeenCalledWith(['last', 'change'])
})
