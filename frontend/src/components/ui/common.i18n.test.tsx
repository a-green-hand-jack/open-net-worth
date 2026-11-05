// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it } from 'vitest'
import { catalogs } from '../../i18n/catalogs'
import { PasswordField } from './PasswordField'
import { InfoPopover } from './InfoPopover'

afterEach(cleanup)

it('translates default accessibility labels and preserves caller labels', () => {
  render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
    <PasswordField />
    <InfoPopover text="help" />
    <InfoPopover text="help" label="Custom label" />
  </IntlProvider>)
  fireEvent.click(screen.getByRole('button', { name: '显示密钥' }))
  expect(screen.getByRole('button', { name: '隐藏密钥' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '更多信息' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Custom label' })).toBeTruthy()
})
