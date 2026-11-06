// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../../../i18n/catalogs'
import { WIDGET_DEFINITIONS } from '../definitions'
import { trackingBudgetingWidgetComponents } from './trackingBudgeting'

vi.mock('../../../../hooks/serverState', () => ({
  usePlanningSummary: () => ({
    data: {
      days_left: 3,
      envelopes: {
        budgeted_spent: 30,
        budgeted_total: 100,
        budgeted_rows: [
          { key: 'a', label: 'Saved', assigned: 100, spent: 30, fill_pct: 30, over: false },
        ],
      },
    },
    initialLoading: false,
    error: null,
  }),
}))
vi.mock('../useWidgetData', () => ({ useAnalytics: () => ({ analytics: null, loading: false }) }))
afterEach(cleanup)

it('translates budget progress while preserving the user category and navigation', () => {
  const Widget = trackingBudgetingWidgetComponents['bud-vsactual']!
  const def = WIDGET_DEFINITIONS.find((item) => item.defId === 'bud-vsactual')!
  const navigate = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <Widget
        instance={{ instanceId: 'w', defId: def.defId, x: 0, y: 0, w: 4, h: 300, config: {} }}
        def={def}
        onPatch={vi.fn()}
        onNavigate={navigate}
      />
    </IntlProvider>,
  )
  expect(screen.getByText('Saved')).toBeTruthy()
  expect(screen.getByText('本月剩余 3 天')).toBeTruthy()
  expect(screen.getByRole('progressbar').getAttribute('aria-label')).toContain('Saved：已支出')
  fireEvent.click(screen.getByRole('button', { name: '编辑预算' }))
  expect(navigate).toHaveBeenCalledWith('plan')
})
