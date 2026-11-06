// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import zh from '../../../../i18n/zh-CN.json'
import planZh from '../../plan/zh-CN.messages.json'
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
        {
          id: 'total',
          label: 'Income',
          label_message: { id: 'moneyFlow.label.income', params: {} },
          kind: 'total',
          column: 1,
          amount: 100,
          pct: 100,
        },
        {
          id: 'saved',
          label: 'Saved',
          label_message: { id: 'moneyFlow.label.saved', params: {} },
          kind: 'saved',
          column: 2,
          amount: 70,
          pct: 70,
        },
        { id: 'spend', label: 'Spend', kind: 'spend_group', column: 2, amount: 30, pct: 30 },
      ],
      links: [
        { source: 'inc:a', target: 'total', amount: 100 },
        { source: 'total', target: 'saved', amount: 70 },
        { source: 'total', target: 'spend', amount: 30 },
      ],
    },
  }),
}))
vi.mock('../../../../hooks/useElementWidth', () => ({
  useElementSize: () => [vi.fn(), { w: 400, h: 220 }],
}))
vi.mock('../WidgetShell', () => ({
  WidgetShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
afterEach(cleanup)
it('translates system nodes while preserving a user label with identical English text', () => {
  render(
    <IntlProvider locale="zh-CN" messages={{ ...zh, ...planZh }}>
      <CashFlowCard instance={{ title: 'Flow' } as never} def={{ title: 'Flow' } as never} onPatch={vi.fn()} />
    </IntlProvider>,
  )
  expect(screen.getByText('Saved')).toBeTruthy()
  expect(screen.getByText('已储蓄')).toBeTruthy()
})
