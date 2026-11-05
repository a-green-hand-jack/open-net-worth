import { describe, expect, it } from 'vitest'
import registry from './starterSkills.registry.json'
import translations from './starterSkills.zh-CN.json'
import { starterField } from './starterMessages'

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
