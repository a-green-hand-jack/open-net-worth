import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import { formatCashflowMessage } from './cashflowMessages'
import messages from './zh-CN.messages.json'

const intl = createIntl({ locale: 'zh-CN', messages })

describe('cash flow message IDs', () => {
  it('translates only marked application defaults', () => {
    expect(formatCashflowMessage(intl, { id: 'cashflow.label.salary', params: {} }, 'Salary')).toBe(
      '工资',
    )
    expect(formatCashflowMessage(intl, undefined, 'Salary')).toBe('Salary')
    expect(
      formatCashflowMessage(intl, { id: 'cashflow.label.salary', params: { extra: 1 } }, 'Salary'),
    ).toBe('Salary')
    expect(formatCashflowMessage(intl, { id: 'unknown', params: {} }, 'External text')).toBe(
      'External text',
    )
  })

  it('localizes known cadence values and preserves unknown or malformed ones', () => {
    expect(
      formatCashflowMessage(
        intl,
        { id: 'cashflow.note.recurring', params: { cadence: 'monthly' } },
        'monthly · recurring',
      ),
    ).toBe('每月 · 定期')
    expect(
      formatCashflowMessage(
        intl,
        { id: 'cashflow.note.recurring', params: { cadence: 'custom' } },
        'custom · recurring',
      ),
    ).toBe('custom · 定期')
    expect(formatCashflowMessage(intl, { id: 'cashflow.note.recurring', params: {} }, 'raw')).toBe(
      'raw',
    )
    expect(
      formatCashflowMessage(
        intl,
        { id: 'cashflow.note.recurring', params: { cadence: 'monthly', extra: 1 } },
        'raw',
      ),
    ).toBe('raw')
    expect(
      formatCashflowMessage(
        intl,
        { id: 'cashflow.note.recurring', params: { cadence: '' } },
        'recurring',
      ),
    ).toBe('定期')
  })
})
