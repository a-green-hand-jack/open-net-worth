// @vitest-environment jsdom
import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import messages from './reports.zh-CN.json'
import { reportLabel } from './reports'

const intl = createIntl({ locale: 'zh-CN', messages })

describe('report label provenance', () => {
  it('translates only the server-marked generated labels', () => {
    expect(
      reportLabel(intl, {
        label: 'Uncategorized',
        label_message: { id: 'reports.label.uncategorized', params: {} },
      }),
    ).toBe('未分类')
    expect(
      reportLabel(intl, {
        label: 'Uncategorized income',
        label_message: { id: 'reports.label.uncategorizedIncome', params: {} },
      }),
    ).toBe('未分类收入')
    expect(reportLabel(intl, { label: 'Uncategorized' })).toBe('Uncategorized')
    expect(
      reportLabel(intl, {
        label: 'External',
        label_message: {
          id: 'reports.label.uncategorized',
          params: [] as unknown as Record<string, unknown>,
        },
      }),
    ).toBe('External')
    expect(
      reportLabel(intl, {
        label: 'External',
        label_message: { id: 'reports.label.uncategorized', params: { extra: 1 } },
      }),
    ).toBe('External')
    expect(
      reportLabel(intl, { label: 'External', label_message: { id: 'unknown', params: {} } }),
    ).toBe('External')
  })
})
