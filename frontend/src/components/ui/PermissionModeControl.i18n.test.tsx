// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, it, vi } from 'vitest'
import zh from '../../i18n/zh-CN.json'
import { PermissionModeControl } from './PermissionModeControl'

it('explains skip approvals in Chinese and returns the original permission value', () => {
  const onChange = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <PermissionModeControl value="manual" onChange={onChange} />
    </IntlProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: '审批模式: 手动审批' }))
  const skip = screen.getByRole('menuitemradio', { name: '跳过所有审批' })
  expect(skip.getAttribute('data-tooltip')).toBe('Lucius 不会暂停，即使操作不安全。')
  fireEvent.click(skip)
  expect(onChange).toHaveBeenCalledWith('skip')
})
