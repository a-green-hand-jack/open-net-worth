import { createIntl, createIntlCache } from 'react-intl'
import { describe, expect, it } from 'vitest'
import messages from './zh-CN.messages.json'
import { formatMoneyFlowLabel } from '../../shared/moneyFlowMessages'

const intl = createIntl({ locale: 'zh-CN', messages }, createIntlCache())

describe('money flow system labels', () => {
  it('translates system labels while retaining user names', () => {
    expect(formatMoneyFlowLabel(intl, { id: 'moneyFlow.label.saved' }, 'Saved')).toBe('已储蓄')
    expect(formatMoneyFlowLabel(intl, undefined, 'Saved')).toBe('Saved')
    expect(
      formatMoneyFlowLabel(
        intl,
        { id: 'moneyFlow.label.otherGroup', params: { group: 'My group' } },
        'Other My group',
      ),
    ).toBe('其他My group')
    expect(
      formatMoneyFlowLabel(
        intl,
        {
          id: 'moneyFlow.label.otherGroup',
          params: { group: 'Spending', group_message: { id: 'moneyFlow.label.spending' } },
        },
        'Other Spending',
      ),
    ).toBe('其他支出')
  })
  it('preserves the original for unknown or malformed metadata', () => {
    expect(formatMoneyFlowLabel(intl, { id: 'future.label' }, 'Original')).toBe('Original')
    expect(
      formatMoneyFlowLabel(
        intl,
        { id: 'moneyFlow.label.saved', params: { extra: true } },
        'Original',
      ),
    ).toBe('Original')
    expect(
      formatMoneyFlowLabel(
        intl,
        { id: 'moneyFlow.label.otherGroup', params: { group: 5 } },
        'Original',
      ),
    ).toBe('Original')
  })
})
