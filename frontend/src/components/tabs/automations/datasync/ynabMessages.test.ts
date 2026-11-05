import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import messages from '../zh-CN.messages.json'
import { ynabMessage } from './ynabMessages'
import contract from '../../../../../../backend/core/ynab_sync_message_contract.json'
import { setDisplayFormats } from '../../../../utils/format'

const intl = createIntl({ locale: 'zh-CN', messages })
const counts = { sent: 2, pulled: 1, categories: 0, review: 3, deferred: 0 }
describe('YNAB generated message provenance', () => {
  it('uses the profile number format in Chinese summaries', () => {
    setDisplayFormats({ number_format: 'dot' })
    try {
      const summary = ynabMessage(intl, { message_id: 'ynab.summary.complete', params: { sent: 1234, pulled: 0, categories: 2345, review: 0, deferred: 0 } }, 'original')
      expect(summary).toContain('1.234')
      expect(summary).toContain('2.345')
      const en = createIntl({ locale: 'en' })
      expect(ynabMessage(en, { message_id: 'ynab.summary.complete', params: { sent: 1234, pulled: 0, categories: 0, review: 0, deferred: 0 } }, 'original')).toBe('1.234 sent to YNAB')
      const start = { count: '1', account: 'Example', start: '2026-01-01', earliest: '2025-12-01', now: '1,234.50 USD', counted: '2,234.50 USD', difference: '1,000.00 USD', nowValue: 1234.5, countedValue: 2234.5, differenceValue: 1000, currency: 'USD' }
      expect(ynabMessage(en, { message_id: 'ynab.sync.reason.beforeStart', params: start }, 'original')).toContain('1.234,50 USD')
      expect(ynabMessage(intl, { message_id: 'ynab.sync.reason.beforeStart', params: start }, 'original')).toContain('1.234,50 USD')
    } finally {
      setDisplayFormats({})
    }
  })
  it('covers the backend registry and rejects missing or extra parameters', () => {
    for (const [message_id, names] of Object.entries(contract)) {
      const params = Object.fromEntries(names.map((name) => [name, message_id === 'ynab.summary.complete' || name.endsWith('Value') ? 1 : name === 'month' ? '2026-01' : '1']))
      expect(ynabMessage(intl, { message_id, params }, 'original'), message_id).not.toBe('original')
      expect(
        ynabMessage(intl, { message_id, params: { ...params, extra: 1 } }, 'original'),
        message_id,
      ).toBe('original')
      for (const name of names) {
        const incomplete = { ...params }
        delete incomplete[name]
        expect(ynabMessage(intl, { message_id, params: incomplete }, 'original'), message_id).toBe(
          'original',
        )
      }
    }
  })
  it('renders only well-formed marked summaries and phases', () => {
    expect(ynabMessage(intl, { message_id: 'ynab.phase.reading', params: {} }, 'original')).toBe(
      '正在读取 YNAB',
    )
    const summary = ynabMessage(
      intl,
      { message_id: 'ynab.summary.complete', params: counts },
      'original',
    )
    expect(summary).toContain('2 项发送至 YNAB')
    expect(summary).toContain('3 项待审核')
    expect(
      ynabMessage(
        intl,
        { message_id: 'ynab.summary.complete', params: { ...counts, sent: -1 } },
        'original',
      ),
    ).toBe('original')
    expect(
      ynabMessage(
        intl,
        { message_id: 'ynab.summary.complete', params: { ...counts, extra: 0 } },
        'original',
      ),
    ).toBe('original')
    expect(
      ynabMessage(
        intl,
        { message_id: 'ynab.phase.done', params: [] as unknown as Record<string, unknown> },
        'original',
      ),
    ).toBe('original')
    expect(ynabMessage(intl, undefined, 'user original')).toBe('user original')
  })
})
