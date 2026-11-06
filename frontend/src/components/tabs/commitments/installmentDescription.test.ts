import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import zh from '../../../i18n/zh-CN.json'
import type { Installment } from '../../../types/commitments'
import { displayInstallmentDescription, rescheduledDescription } from './installmentDescription'

const intl = createIntl({ locale: 'zh-CN', messages: zh })
const base: Installment = {
  id: 'i',
  label: 'First',
  description: 'User note',
  due_date: '2026-04-01',
  amount: 100,
  status: 'upcoming',
  paid_txn_id: null,
}

describe('reschedule description provenance', () => {
  it('keeps user text, translates generated segments, and retains canonical saved text', () => {
    const changed = rescheduledDescription(base)
    const item = { ...base, ...changed }
    expect(changed.description).toContain('User note · moved from ')
    expect(displayInstallmentDescription(item, intl)).toContain('User note · 从 ')
    const again = rescheduledDescription({ ...item, due_date: '2026-05-01' })
    expect(again.description_source?.moves).toHaveLength(2)
    expect(displayInstallmentDescription({ ...item, ...again }, intl).match(/改期/g)).toHaveLength(
      2,
    )
  })
  it('keeps historical or mismatched text unchanged', () => {
    const old = { ...base, description: 'User note · moved from 1 Apr' }
    expect(displayInstallmentDescription(old, intl)).toBe(old.description)
    const changed = rescheduledDescription(base)
    expect(
      displayInstallmentDescription({ ...base, ...changed, description: 'User edit' }, intl),
    ).toBe('User edit')
  })
})
