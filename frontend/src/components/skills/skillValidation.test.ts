import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import contract from '../../../../backend/core/skill_validation_contract.json'
import messages from './zh-CN.messages.json'
import { skillValidation } from './skillValidation'
import { skillError } from './skillErrors'

const intl = createIntl({ locale: 'zh-CN', messages })
describe('skill validation messages', () => {
  it('covers the validator registry and rejects parameter drift', () => {
    for (const [message_id, names] of Object.entries(contract)) {
      const params = Object.fromEntries(names.map((name) => [name, 'example']))
      expect(skillValidation(intl, { text: 'original', message_id, params }), message_id).not.toBe(
        'original',
      )
      expect(
        skillValidation(intl, { text: 'original', message_id, params: { ...params, extra: 'x' } }),
        message_id,
      ).toBe('original')
      for (const name of names) {
        const incomplete = { ...params }
        delete incomplete[name]
        expect(
          skillValidation(intl, { text: 'original', message_id, params: incomplete }),
          message_id,
        ).toBe('original')
      }
    }
  })
  it('translates verified aggregate parts while preserving unknown diagnostics', () => {
    const items = [
      {
        text: "frontmatter 'name' is required",
        message_id: 'skills.validation.nameRequired',
        params: {},
      },
      { text: 'External parser detail' },
    ]
    const original = items.map((item) => item.text).join('; ')
    const displayed = skillError(
      intl,
      { message_id: 'skills.error.validation', message_params: {}, message_items: items },
      original,
    )
    expect(displayed).toContain('前置元数据')
    expect(displayed).toContain('External parser detail')
    const nested = skillError(
      intl,
      {
        message_id: 'skills.error.invalidBundle',
        message_params: {
          reason: `invalid bundle manifest: ${original}`,
          reason_message_id: 'skills.validation.manifestInvalid',
        },
        message_items: items,
      },
      `Invalid skill bundle: invalid bundle manifest: ${original}`,
    )
    expect(nested).toContain('文件包清单无效')
    expect(nested).toContain('External parser detail')
    expect(
      skillError(
        intl,
        {
          message_id: 'skills.error.invalidSkillFile',
          message_params: { reason: original },
          message_items: items,
        },
        `Invalid SKILL.md: ${original}`,
      ),
    ).toContain('前置元数据')
    expect(
      skillError(
        intl,
        { message_id: 'skills.error.validation', message_params: {}, message_items: items },
        'different original',
      ),
    ).toBe('different original')
  })
})
