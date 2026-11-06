import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import contract from '../../../../../backend/core/automation_error_contract.json'
import messages from './zh-CN.messages.json'
import { automationError } from './automationErrors'

const intl = createIntl({ locale: 'zh-CN', messages })
describe('automation API error provenance', () => {
  it('covers registered messages and rejects parameter drift', () => {
    for (const [messageId, names] of Object.entries(contract)) {
      const params = Object.fromEntries(names.map((name) => [name, 'example_id']))
      expect(
        automationError(
          intl,
          Object.assign(new Error('original'), { messageId, messageParams: params }),
          'fallback',
        ),
        messageId,
      ).not.toBe('original')
      expect(
        automationError(
          intl,
          Object.assign(new Error('original'), {
            messageId,
            messageParams: { ...params, extra: 1 },
          }),
          'fallback',
        ),
        messageId,
      ).toBe('original')
      for (const name of names) {
        const incomplete = { ...params }
        delete incomplete[name]
        expect(
          automationError(
            intl,
            Object.assign(new Error('original'), { messageId, messageParams: incomplete }),
            'fallback',
          ),
          messageId,
        ).toBe('original')
      }
    }
  })
  it('preserves unknown external errors and malformed metadata', () => {
    expect(automationError(intl, new Error('external'), 'fallback')).toBe('external')
    expect(
      automationError(
        intl,
        Object.assign(new Error('external'), {
          messageId: 'automation.error.object',
          messageParams: [],
        }),
        'fallback',
      ),
    ).toBe('external')
    const named = Object.assign(new Error('original'), {
      messageId: 'automation.error.referenceMissing',
      messageParams: { noun: 'account', reference: 'account', choices: 'account, income' },
    })
    const shown = automationError(intl, named, 'fallback')
    expect(shown).toContain('账户')
    expect(shown).toContain('account, income')
  })
})
