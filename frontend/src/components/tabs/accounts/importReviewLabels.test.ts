import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import { catalogs } from '../../../i18n/catalogs'
import { importFlagLabel, importMatchKind } from './importReviewLabels'
import { existingSourcePhrase, existingTxnLine, transferLine } from './importHelpers'

describe('statement review labels', () => {
  const chinese = createIntl({ locale: 'zh-CN', messages: catalogs['zh-CN'] })
  const english = createIntl({ locale: 'en', messages: {} })
  it('localizes known flags and transaction kinds without changing their keys', () => {
    expect(importFlagLabel('near_duplicate', chinese)).toBe('已在您的账户中？')
    expect(importFlagLabel('transfer_pair', english)).toBe('Opposite legs — one transfer?')
    expect(importMatchKind('transfer', chinese)).toBe('转账')
    expect(importMatchKind('expense', english)).toBe('Expense')
  })
  it('preserves unknown server values and handles empty kinds', () => {
    expect(importFlagLabel('custom-source', chinese)).toBe('custom-source')
    expect(importFlagLabel('constructor', chinese)).toBe('constructor')
    expect(importMatchKind('custom-kind', chinese)).toBe('custom-kind')
    expect(importMatchKind(null, chinese)).toBe('—')
  })
  it('localizes transfer and source labels without changing the accounts or direction', () => {
    const accounts = [
      { id: 'a', name: 'Custom A' },
      { id: 'b', name: 'Custom B' },
    ]
    const transfer = { kind: 'transfer', account_id: 'a', to_account_id: 'b' }
    expect(transferLine(transfer, accounts, {}, { intl: chinese })).toBe(
      '转账 • Custom A → Custom B',
    )
    expect(
      transferLine(transfer, accounts, {}, { anchorAccountId: 'a', compact: true, intl: chinese }),
    ).toBe('转账 → Custom B')
    expect(
      transferLine(transfer, accounts, {}, { anchorAccountId: 'b', compact: true, intl: chinese }),
    ).toBe('转账 ← Custom A')
    expect(existingSourcePhrase('import', chinese)).toBe('来自先前导入')
    expect(
      existingTxnLine({ ...transfer, source: 'ai' }, accounts, {}, 'USD', { intl: chinese }),
    ).toContain('转账 • Custom A → Custom B • 通过 Lucius')
  })
})
