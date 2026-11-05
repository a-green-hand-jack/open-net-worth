import { describe, expect, it } from 'vitest'
import registry from './starterSkills.registry.json'
import translations from './starterSkills.zh-CN.json'
import { skillDisplayName, starterField } from './starterMessages'
import type { Skill } from '../../types/skills'

describe('starter skill provenance', () => {
  it('covers all first-party starters and translates only verified unchanged fields', () => {
    expect(Object.keys(translations).sort()).toEqual(Object.keys(registry).sort())
    for (const [id, entry] of Object.entries(registry)) {
      const source = {
        id,
        name_sha256: entry.name.sha256,
        description_sha256: entry.description.sha256,
      }
      expect(starterField('zh-CN', 'name', entry.name.english, id, source)).not.toBe(
        entry.name.english,
      )
      expect(starterField('zh-CN', 'description', entry.description.english, id, source)).not.toBe(
        entry.description.english,
      )
      expect(starterField('en', 'name', entry.name.english, id, source)).toBe(entry.name.english)
      expect(starterField('zh-CN', 'name', entry.name.english, 'other', source)).toBe(
        entry.name.english,
      )
      expect(starterField('zh-CN', 'description', 'user edit', id, source)).toBe('user edit')
      expect(
        starterField('zh-CN', 'name', entry.name.english, id, { ...source, name_sha256: 'bad' }),
      ).toBe(entry.name.english)
      expect(starterField('zh-CN', 'name', entry.name.english, id)).toBe(entry.name.english)
    }
  })
})

it('localizes the managed statement skill name without changing other skills', () => {
  const skill = { id: 'statement-import', name: 'statement-import', author: 'builtin' } as Skill
  expect(skillDisplayName('zh-CN', skill)).toBe('导入账单')
  expect(skillDisplayName('en', skill)).toBe('statement-import')
  expect(skillDisplayName('zh-CN', { ...skill, author: 'user' })).toBe('statement-import')
  expect(skillDisplayName('zh-CN', { ...skill, name: 'custom name' })).toBe('custom name')
})
