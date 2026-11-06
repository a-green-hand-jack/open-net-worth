// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { catalogs } from '../../../i18n/catalogs'
import { AddWidgetPicker } from './AddWidgetPicker'
import { WIDGET_DEFINITIONS } from './definitions'

afterEach(cleanup)

describe('widget picker language', () => {
  it('finds a built-in widget in Chinese and keeps its stable ID', () => {
    const onPick = vi.fn()
    const onAdded = vi.fn()
    render(
      <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
        <AddWidgetPicker
          open
          onClose={vi.fn()}
          definitions={WIDGET_DEFINITIONS}
          onPick={onPick}
          onAdded={onAdded}
        />
      </IntlProvider>,
    )
    fireEvent.change(screen.getByLabelText('搜索小组件'), { target: { value: '净资产与趋势' } })
    fireEvent.click(screen.getByText('净资产与趋势'))
    expect(onPick).toHaveBeenCalledWith('hero')
    expect(onAdded).toHaveBeenCalledWith(expect.stringContaining('净资产与趋势'))
  })

  it('preserves a changed widget label', () => {
    const custom = { ...WIDGET_DEFINITIONS[0]!, label: 'My personal label' }
    render(
      <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
        <AddWidgetPicker open onClose={vi.fn()} definitions={[custom]} onPick={vi.fn()} />
      </IntlProvider>,
    )
    expect(screen.getByText('My personal label')).toBeTruthy()
  })
})
