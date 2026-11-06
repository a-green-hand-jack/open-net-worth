import { createIntl } from 'react-intl'
import { expect, it } from 'vitest'
import { catalogs } from '../../../../i18n/catalogs'
import type { CashFlowNode } from '../../../../types/aggregates'
import { moneyFlowSystemLabel } from './moneyFlowSystemLabels'

it('only translates matching system IDs, kinds and labels', () => {
  const intl = createIntl({ locale: 'zh-CN', messages: catalogs['zh-CN'] })
  const node = {
    id: 'saved',
    kind: 'saved',
    label: 'Saved',
    amount: 10,
    pct: 10,
    column: 2,
  } as CashFlowNode
  expect(moneyFlowSystemLabel(intl, node)).toBe('已储蓄')
  expect(moneyFlowSystemLabel(intl, { ...node, id: 'inc:custom', kind: 'income' })).toBe('Saved')
  expect(moneyFlowSystemLabel(intl, { ...node, label: 'Personal' })).toBe('Personal')
  expect(moneyFlowSystemLabel(intl, { ...node, kind: 'income' })).toBe('Saved')
})
