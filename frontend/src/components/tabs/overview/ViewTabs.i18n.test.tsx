// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../../i18n/catalogs'
import { ViewTabs } from './ViewTabs'

afterEach(cleanup)

it('translates view controls while preserving names and actions', () => {
  const onAdd = vi.fn()
  const onDelete = vi.fn()
  const onRename = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <ViewTabs
        views={[
          { viewId: 'first', name: 'Overview', widgets: [] },
          { viewId: 'second', name: 'My view', widgets: [] },
        ]}
        activeViewId="second"
        onSelect={vi.fn()}
        onAdd={onAdd}
        onRename={onRename}
        onRequestDelete={onDelete}
        onReorder={vi.fn()}
        editing
      />
    </IntlProvider>,
  )
  expect(screen.getByRole('tablist', { name: '仪表盘视图' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '添加视图' }))
  expect(onAdd).toHaveBeenCalledWith('')
  fireEvent.click(screen.getByRole('button', { name: '删除视图 My view' }))
  expect(onDelete).toHaveBeenCalledWith('second')
  fireEvent.doubleClick(screen.getByRole('tab', { name: /My view/ }))
  const input = screen.getByDisplayValue('My view')
  fireEvent.change(input, { target: { value: 'Custom name' } })
  fireEvent.blur(input)
  expect(onRename).toHaveBeenCalledWith('second', 'Custom name')
})

it('translates marked defaults while preserving legacy and renamed views', () => {
  const onRename = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <ViewTabs
        views={[
          { viewId: 'default', name: 'Overview', nameSource: 'preset_overview', widgets: [] },
          { viewId: 'legacy', name: 'Reports', widgets: [] },
          { viewId: 'edited', name: 'My view', nameSource: 'default_view', widgets: [] },
        ]}
        activeViewId="default"
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onRename={onRename}
        onRequestDelete={vi.fn()}
        onReorder={vi.fn()}
        editing
      />
    </IntlProvider>,
  )
  expect(screen.getByRole('tab', { name: '概览' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'Reports' })).toBeTruthy()
  expect(screen.getByRole('tab', { name: 'My view' })).toBeTruthy()
  fireEvent.doubleClick(screen.getByRole('tab', { name: '概览' }))
  fireEvent.blur(screen.getByDisplayValue('概览'))
  expect(onRename).not.toHaveBeenCalled()
})
