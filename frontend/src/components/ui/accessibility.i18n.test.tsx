// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it } from 'vitest'
import messages from '../shared/zh-CN.messages.json'
import { PasswordField } from './PasswordField'
import { InfoPopover } from './InfoPopover'
import { FormField } from './FormField'
import { PageTabs } from './PageTabs'
import { SafeMarkdownImage } from './SafeMarkdownImage'

afterEach(cleanup)

it('localizes default accessible labels while preserving supplied labels', () => {
  render(<IntlProvider locale="zh-CN" messages={messages}>
    <PasswordField />
    <InfoPopover text="help" />
    <InfoPopover text="help" label="Custom label" />
    <FormField label="Field" info={<b>details</b>}><input /></FormField>
    <PageTabs tabs={[{ key: 'one', label: 'One' }]} value="one" onChange={() => {}} />
    <PageTabs tabs={[{ key: 'one', label: 'One' }]} value="one" onChange={() => {}} ariaLabel="Custom tabs" />
  </IntlProvider>)
  fireEvent.click(screen.getByRole('button', { name: '显示密钥' }))
  expect(screen.getByRole('button', { name: '隐藏密钥' })).toBeTruthy()
  expect(screen.getAllByRole('button', { name: '更多信息' })).toHaveLength(2)
  expect(screen.getByRole('button', { name: 'Custom label' })).toBeTruthy()
  expect(screen.getByRole('tablist', { name: '页面分区' })).toBeTruthy()
  expect(screen.getByRole('tablist', { name: 'Custom tabs' })).toBeTruthy()
})

it('localizes the blocked-image notice without fetching or changing the target', () => {
  const { container } = render(<IntlProvider locale="zh-CN" messages={messages}>
    <SafeMarkdownImage src="https://example.org/image.png?private=1" alt="Original alt" />
  </IntlProvider>)
  expect(container.querySelector('img')).toBeNull()
  const link = screen.getByRole('link', { name: '已阻止远程图片（example.org） · 打开' })
  expect(link.getAttribute('href')).toBe('https://example.org/image.png?private=1')
  expect(link.getAttribute('title')).toBe('Original alt')
  expect(link.getAttribute('rel')).toContain('noopener')
})
