import { createIntl, createIntlCache } from 'react-intl'
import { describe, expect, it } from 'vitest'
import zh from '../../i18n/zh-CN.json'
import { inboxMessage } from './inboxMessages'

describe('inbox presentation metadata', () => {
  it('preserves financial figures and distinguishes payment status', () => {
    const intl = createIntl({ locale: 'zh-CN', messages: zh }, createIntlCache())
    const p = {
      name: 'Synthetic card',
      currency: 'USD',
      amount: '1,234.56',
      due: 'overdue',
      days: 3,
    }
    expect(inboxMessage(intl, { id: 'inbox.server.payment', params: p }, 'original')).toBe(
      'Synthetic card（USD 1,234.56）逾期 3 天。请立即还款以避免利息。',
    )
    expect(
      inboxMessage(
        intl,
        { id: 'inbox.server.partialPayment', params: { ...p, due: 'today', days: 0 } },
        'original',
      ),
    ).toContain('仍有 USD 1,234.56 未偿还（今天到期）')
  })
  it('translates known messages while preserving user and model parameters', () => {
    const intl = createIntl({ locale: 'zh-CN', messages: zh }, createIntlCache())
    expect(
      inboxMessage(
        intl,
        {
          id: 'inbox.server.refusedSummary',
          params: { attempted: '用户内容', reason: 'model text' },
        },
        'original',
      ),
    ).toBe('已拒绝：用户内容\n原因：model text')
    expect(inboxMessage(intl, { id: 'unknown', params: {} }, 'original')).toBe('original')
    expect(
      inboxMessage(intl, { id: 'inbox.server.cliTitle', params: { label: 12 } }, 'original'),
    ).toBe('original')
    expect(
      inboxMessage(
        intl,
        {
          id: 'inbox.server.holdingSummary',
          params: { items: [{ symbol: 'ACME', before: '1', after: '2' }] },
        },
        'original',
      ),
    ).toContain('ACME 1 → 2')
    expect(
      inboxMessage(
        intl,
        {
          id: 'inbox.server.lotSummary',
          params: { items: [{ quantity: '2', symbol: 'ACME', date: '2026-01-01' }] },
        },
        'original',
      ),
    ).toContain('2 ACME（购入日期：2026-01-01）')
  })
})
