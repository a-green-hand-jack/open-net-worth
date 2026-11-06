// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../../i18n/catalogs'
import { WidgetAlertDialog } from './WidgetAlertDialog'
import { WidgetDisplayPanel } from './WidgetDisplayPanel'

afterEach(cleanup)

it('saves a translated alert with the original comparison and numeric value', () => {
  const onSave = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <WidgetAlertDialog open onClose={vi.fn()} alert={null} onSave={onSave} />
    </IntlProvider>,
  )
  fireEvent.change(screen.getByLabelText('比较条件'), { target: { value: '>=' } })
  fireEvent.change(screen.getByLabelText('阈值'), { target: { value: '42' } })
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  expect(onSave).toHaveBeenCalledWith({ op: '>=', value: 42 })
})

it('saves translated display controls using their original settings', () => {
  const onSave = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <WidgetDisplayPanel open onClose={vi.fn()} defId="hero" onSave={onSave} />
    </IntlProvider>,
  )
  fireEvent.click(screen.getByLabelText('隐藏标题'))
  fireEvent.click(screen.getByRole('button', { name: '蓝色' }))
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ hideTitle: true, accent: 'blue' }))
})
