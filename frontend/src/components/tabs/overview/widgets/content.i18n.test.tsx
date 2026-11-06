// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../../../i18n/LocaleProvider'
import { WIDGET_DEFINITIONS } from '../definitions'
import { contentWidgetComponents } from './content'
import { LuxCoffee } from './luxCoffee'
import { SeriesLegend } from './seriesLegend'

const spend = vi.hoisted(() =>
  vi.fn(() => ({ initialLoading: false, error: null, data: { weeks: [], total: 0, average: 0 } })),
)
vi.mock('../../../../hooks/serverState', () => ({ useSpendByWeek: spend }))
afterEach(() => {
  cleanup()
  spend.mockClear()
})

it('translates note controls without rewriting the user note', () => {
  const Widget = contentWidgetComponents.text!
  const def = WIDGET_DEFINITIONS.find((item) => item.defId === 'text')!
  const onPatch = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <Widget
        instance={{
          instanceId: 'w',
          defId: 'text',
          x: 0,
          y: 0,
          w: 4,
          h: 200,
          config: { markdown: 'Edit' },
        }}
        def={def}
        onPatch={onPatch}
      />
    </IntlProvider>,
  )
  expect(screen.getByText('Edit')).toBeTruthy()
  fireEvent.click(screen.getByRole('tab', { name: '编辑' }))
  expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Edit')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My note' } })
  expect(onPatch).toHaveBeenCalledWith({ config: { markdown: 'My note' } })
})

it('translates legend controls without altering labels', () => {
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <SeriesLegend
        groups={[
          {
            items: [
              { key: '1', label: 'More', color: 'red' },
              { key: '2', label: 'Two', color: 'red' },
              { key: '3', label: 'Three', color: 'red' },
              { key: '4', label: 'Four', color: 'red' },
            ],
          },
        ]}
      />
    </IntlProvider>,
  )
  expect(screen.getByText('More')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /另有 1 项/ }))
  expect(screen.getAllByRole('button', { name: '收起' }).length).toBeGreaterThan(0)
})

it('translates coffee empty state without changing the query term', () => {
  const def = WIDGET_DEFINITIONS.find((item) => item.defId === 'lux-coffee')!
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <LuxCoffee
        instance={{ instanceId: 'w', defId: 'lux-coffee', x: 0, y: 0, w: 4, h: 200, config: {} }}
        def={def}
        onPatch={vi.fn()}
      />
    </IntlProvider>,
  )
  expect(spend).toHaveBeenCalledWith('coffee', 6)
  expect(screen.getByText(/最近 6 周没有与“coffee”匹配的交易/)).toBeTruthy()
})
