// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { createIntl, IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../../../i18n/catalogs'
import { assetClassLabel } from '../assetClassMessages'
import { WIDGET_DEFINITIONS } from '../definitions'
import { netWorthWidgetComponents } from './netWorth'

vi.mock('../useWidgetData', () => ({
  useAnalytics: () => ({
    loading: false,
    netWorth: 100,
    analytics: {
      kpis: { has_market: false, cash: 0, debt: 0, debt_accounts: 0 },
      allocation: { total: 100, rows: [{ key: 'equity', value: 100, pct: 100 }] },
      venues: { total: 100, rows: [{ key: 'Equities', value: 100, pct: 100 }] },
    },
  }),
  useNetWorthSeries: () => ({
    history: [],
    stats: { ranges: { '3M': { delta: 10, pct: 5, span_months: 3 } } },
    loading: false,
  }),
}))
afterEach(cleanup)

function renderWidget(id: string) {
  const Widget = netWorthWidgetComponents[id]!
  const def = WIDGET_DEFINITIONS.find((entry) => entry.defId === id)!
  return render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <Widget
        instance={{ instanceId: `w-${id}`, defId: id, x: 0, y: 0, w: 4, h: 300, config: {} }}
        def={def}
        onPatch={vi.fn()}
      />
    </IntlProvider>,
  )
}

it('translates system asset classes while preserving institution names and amounts', () => {
  const allocation = renderWidget('alloc')
  expect(screen.getByText('股票')).toBeTruthy()
  expect(allocation.container.textContent).toMatch(/100/)
  cleanup()
  renderWidget('venues')
  expect(screen.getByText('Equities')).toBeTruthy()
  const intl = createIntl({ locale: 'zh-CN', messages: catalogs['zh-CN'] })
  expect(assetClassLabel(intl, 'future-class')).toBe('future-class')
})

it('keeps the net-worth change under the amount masking convention', () => {
  const { container } = renderWidget('networth-nums')
  expect(container.querySelector('.ov-delta-chip')?.classList.contains('money')).toBe(true)
  expect(container.textContent).toContain('3 个月')
})
