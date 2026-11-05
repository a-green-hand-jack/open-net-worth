// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../i18n/catalogs'
import { PermissionModeControl } from './PermissionModeControl'

afterEach(cleanup)

it('explains skip approvals in Chinese and returns the original permission value', () => {
  const onChange = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <PermissionModeControl value="manual" onChange={onChange} />
    </IntlProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: '审批模式: 手动审批' }))
  const skip = screen.getByRole('menuitemradio', { name: '跳过所有审批' })
  expect(skip.getAttribute('data-tooltip')).toBe('Lucius 不会暂停，即使操作不安全。')
  fireEvent.click(skip)
  expect(onChange).toHaveBeenCalledWith('skip')
})

it('returns the auto mode when the Chinese auto option is selected', () => {
  const onChange = vi.fn()
  render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
    <PermissionModeControl value="manual" onChange={onChange} />
  </IntlProvider>)
  fireEvent.click(screen.getByRole('button', { name: '审批模式: 手动审批' }))
  fireEvent.click(screen.getByRole('menuitemradio', { name: '自动审批' }))
  expect(onChange).toHaveBeenCalledWith('auto')
})
