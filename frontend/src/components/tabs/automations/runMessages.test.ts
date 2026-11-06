import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import contract from '../../../../../backend/core/automation_run_message_contract.json'
import messages from './zh-CN.messages.json'
import { automationRunMessage } from './runMessages'

const intl = createIntl({ locale: 'zh-CN', messages })
describe('automation run message provenance', () => {
  it('covers registered messages and rejects parameter drift', () => {
    for (const [id, names] of Object.entries(contract)) {
      expect(names).toEqual([])
      expect(automationRunMessage(intl, { id, params: {} }, 'original')).not.toBe('original')
      expect(automationRunMessage(intl, { id, params: { unexpected: 1 } }, 'original')).toBe(
        'original',
      )
    }
  })
  it('preserves user text and malformed metadata', () => {
    expect(automationRunMessage(intl, undefined, 'user text')).toBe('user text')
    expect(
      automationRunMessage(
        intl,
        { id: 'automations.run.interrupted', params: [] as unknown as Record<string, unknown> },
        'user text',
      ),
    ).toBe('user text')
  })
})
