// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, it, vi } from 'vitest'
import zh from '../../../i18n/zh-CN.json'
import { EmptyPreview } from './EmptyPreview'

it('shows translated built-in account and asset choices', () => {
  render(
    <IntlProvider locale="zh-CN" defaultLocale="en" messages={zh}>
      <EmptyPreview
        cats={[
          { key: 'property', label: 'Property', plural: 'Property', color: 'red', custom: false },
        ]}
        onAddAccount={vi.fn()}
        onAddAsset={vi.fn()}
      />
    </IntlProvider>,
  )
  expect(screen.getByRole('button', { name: '添加银行账户' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '添加房产' })).toBeTruthy()
  expect(screen.getByText('住宅、公寓、土地')).toBeTruthy()
})
