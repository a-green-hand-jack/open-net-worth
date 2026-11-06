// @vitest-environment jsdom
//
// A widget's editor (title, Show as, its own settings such as Categories) used to be
// reachable only through Customize's "Edit" or the unlabeled full-screen button. The view
// mode ⋯ menu now offers "Edit…", opening that same editor.

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../i18n/catalogs'
import { DashboardGrid } from './DashboardGrid'
import type { UseDashboardLayout } from './useDashboardLayout'

vi.mock('./registry', async () => {
  const { WidgetShell } = await import('./WidgetShell')
  return {
    WIDGET_COMPONENTS: {
      hero: () => <WidgetShell base="Net worth">hero</WidgetShell>,
      movers: () => <WidgetShell base="Movers">movers</WidgetShell>,
    },
  }
})

function layout(): UseDashboardLayout {
  const widgets = [
    {
      instanceId: 'net-worth',
      defId: 'hero',
      x: 0,
      y: 0,
      w: 12,
      h: 224,
      config: {},
      limit: null,
    },
    {
      instanceId: 'below',
      defId: 'movers',
      x: 0,
      y: 224,
      w: 12,
      h: 168,
      config: {},
      limit: null,
    },
  ]
  const activeView = { viewId: 'overview', name: 'Overview', widgets }
  return {
    loading: false,
    error: null,
    dismissError: vi.fn(),
    state: { activeViewId: activeView.viewId, views: [activeView] },
    views: [activeView],
    activeView,
    activeViewId: activeView.viewId,
    setActiveViewId: vi.fn(),
    addView: vi.fn(),
    renameView: vi.fn(),
    deleteView: vi.fn(),
    reorderViews: vi.fn(),
    addWidget: vi.fn(),
    addWidgetWithConfig: vi.fn(),
    addSection: vi.fn(),
    removeItem: vi.fn(),
    duplicateItem: vi.fn(),
    patchItem: vi.fn(),
    dragItem: vi.fn(),
    resizeItem: vi.fn(),
    newlyAddedId: null,
    clearNewlyAdded: vi.fn(),
    snapshot: vi.fn(),
    restoreSnapshot: vi.fn(),
    isDirty: false,
    pickerDefinitions: [],
  } as unknown as UseDashboardLayout
}

describe('DashboardGrid widget menu', () => {
  afterEach(() => cleanup())

  it('displays a marked default section in Chinese and keeps custom renames', () => {
    const state = layout()
    state.activeView!.widgets.push({
      kind: 'section',
      instanceId: 's1',
      title: 'Section',
      titleSource: 'default_section',
      x: 0,
      y: 500,
      w: 12,
      h: 30,
    })
    render(
      <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
        <DashboardGrid layout={state} editing />
      </IntlProvider>,
    )
    fireEvent.doubleClick(screen.getByText('分区'))
    fireEvent.blur(screen.getByDisplayValue('分区'))
    expect(state.patchItem).not.toHaveBeenCalled()
    fireEvent.doubleClick(screen.getByText('分区'))
    const input = screen.getByDisplayValue('分区')
    fireEvent.change(input, { target: { value: 'Personal' } })
    fireEvent.blur(input)
    expect(state.patchItem).toHaveBeenCalledWith('s1', {
      title: 'Personal',
      titleSource: undefined,
    })
  })

  it('opens the widget editor from "Edit…" without entering Customize', () => {
    render(<DashboardGrid layout={layout()} editing={false} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Widget options' })[0]!)
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit…' }))
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy()
  })
})
