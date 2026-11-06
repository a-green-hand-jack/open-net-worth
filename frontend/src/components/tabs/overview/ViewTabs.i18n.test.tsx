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
  expect(onAdd).toHaveBeenCalledWith('New view')
  fireEvent.click(screen.getByRole('button', { name: '删除视图 My view' }))
  expect(onDelete).toHaveBeenCalledWith('second')
  fireEvent.doubleClick(screen.getByRole('tab', { name: /My view/ }))
  const input = screen.getByDisplayValue('My view')
  fireEvent.change(input, { target: { value: 'Custom name' } })
  fireEvent.blur(input)
  expect(onRename).toHaveBeenCalledWith('second', 'Custom name')
})
