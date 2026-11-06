import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import contract from '../../../../backend/core/skill_error_contract.json'
import messages from './zh-CN.messages.json'
import { skillError } from './skillErrors'

const intl = createIntl({ locale: 'zh-CN', messages })
describe('skill error provenance', () => {
  it('covers the server contract and rejects missing or extra parameters', () => {
    for (const [message_id, names] of Object.entries(contract)) {
      if (message_id === 'skills.error.validation') continue
      const params = Object.fromEntries(names.map((name) => [name, 'example']))
      expect(
        skillError(intl, { message_id, message_params: params }, 'original'),
        message_id,
      ).not.toBe('original')
      expect(
        skillError(intl, { message_id, message_params: { ...params, extra: 'x' } }, 'original'),
        message_id,
      ).toBe('original')
      for (const name of names) {
        const incomplete = { ...params }
        delete incomplete[name]
        expect(
          skillError(intl, { message_id, message_params: incomplete }, 'original'),
          message_id,
        ).toBe('original')
      }
    }
  })
  it('preserves paths and external reasons', () => {
    expect(
      skillError(
        intl,
        { message_id: 'skills.error.unsafePath', message_params: { path: '../my/file' } },
        'original',
      ),
    ).toContain('../my/file')
    expect(
      skillError(
        intl,
        {
          message_id: 'skills.error.invalidBundle',
          message_params: { reason: 'custom parser detail', reason_message_id: '' },
        },
        'original',
      ),
    ).toContain('custom parser detail')
    expect(skillError(intl, { message_id: 'unknown', message_params: {} }, 'original')).toBe(
      'original',
    )
  })
})
