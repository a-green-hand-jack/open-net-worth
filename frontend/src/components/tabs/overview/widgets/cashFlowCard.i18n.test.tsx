// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../../../i18n/catalogs'
import { CashFlowCard } from './cashFlowCard'

vi.mock('../../../../hooks/serverState', () => ({
  useCashFlowGraph: () => ({
    initialLoading: false,
    data: {
      flow_total: 100,
      income_total: 100,
      spend_total: 30,
      saved: 70,
      shortfall: 0,
      columns: 3,
      nodes: [
        { id: 'inc:a', label: 'Saved', kind: 'income', column: 0, amount: 100, pct: 100 },
        { id: 'total', label: 'Income', kind: 'total', column: 1, amount: 100, pct: 100 },
        { id: 'saved', label: 'Saved', kind: 'saved', column: 2, amount: 70, pct: 70 },
        {
          id: 'sg:__unbudgeted__',
          label: 'Not in budget',
          kind: 'spend_group',
          column: 2,
          amount: 30,
          pct: 30,
        },
      ],
      links: [
        { source: 'inc:a', target: 'total', amount: 100 },
        { source: 'total', target: 'saved', amount: 70 },
        { source: 'total', target: 'sg:__unbudgeted__', amount: 30 },
      ],
    },
  }),
}))
vi.mock('../../../../hooks/useElementWidth', () => ({
  useElementSize: () => [vi.fn(), { w: 400, h: 220 }],
}))
vi.mock('../WidgetShell', () => ({
  WidgetShell: ({
    children,
    footer,
    meta,
  }: {
    children: React.ReactNode
    footer: React.ReactNode
    meta: React.ReactNode
  }) => (
    <div>
      {meta}
      {children}
      {footer}
    </div>
  ),
}))
afterEach(cleanup)

it('translates card controls and chart description without rewriting user labels or totals', () => {
  const onNavigate = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <CashFlowCard
        instance={{ title: 'Flow' } as never}
        def={{ title: 'Flow', source: { tab: 'plan' } } as never}
        onPatch={vi.fn()}
        onNavigate={onNavigate}
      />
    </IntlProvider>,
  )
  expect(screen.getAllByText('Saved').length).toBeGreaterThan(0)
  expect(screen.getByText('已储蓄')).toBeTruthy()
  expect(screen.getByText('未纳入预算')).toBeTruthy()
  expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/收入.*100.*支出.*30/)
  expect(screen.getByText('已扣除退款和报销')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '在计划中打开' }))
  expect(onNavigate).toHaveBeenCalledWith('plan')
})
