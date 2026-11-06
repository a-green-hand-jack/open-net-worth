import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import contract from '../../../../../backend/core/automation_template_keys.json'
import { ALL_TEMPLATES } from './automationTemplates'
import { templateField, templateText } from './templateMessages'
import messages from './zh-CN.messages.json'

const intl = createIntl({ locale: 'zh-CN', messages })
describe('template provenance', () => {
  it('translates every offered template while keeping its canonical data', () => {
    for (const template of ALL_TEMPLATES) {
      expect(contract).toContain(template.key)
      expect(templateText(intl, template).name).not.toBe(template.name)
      expect(templateText(intl, template).description).not.toBe(template.description)
      expect(templateText(intl, template).instructions).not.toBe(template.instructions)
      expect(templateField(intl, 'name', template.name, template.key)).toBe(
        templateText(intl, template).name,
      )
      expect(templateField(intl, 'instructions', template.instructions, template.key)).toBe(
        templateText(intl, template).instructions,
      )
    }
  })
  it('preserves user values, historical text, and mismatched sources', () => {
    const template = ALL_TEMPLATES[0]!
    expect(templateField(intl, 'name', template.name)).toBe(template.name)
    expect(templateField(intl, 'name', 'Custom', template.key)).toBe('Custom')
    expect(templateField(intl, 'name', template.name, 'unknown')).toBe(template.name)
  })
})
