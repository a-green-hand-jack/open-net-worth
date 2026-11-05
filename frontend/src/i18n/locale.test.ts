import { describe, expect, it } from 'vitest'
import { browserLocale, resolveLocale, SUPPORTED_LOCALES } from './locale'
import { catalogs } from './LocaleProvider'
import { toolDescriptionCatalogs } from './toolDescriptions'
import { starterCatalogs } from '../components/skills/starterMessages'
import toolRegistry from './toolDescriptions.registry.json'
import starterRegistry from '../components/skills/starterSkills.registry.json'

describe('interface language selection', () => {
  it('uses the saved preference over the browser', () => {
    expect(resolveLocale('en', ['zh-CN'])).toBe('en')
    expect(resolveLocale('zh-CN', ['en-US'])).toBe('zh-CN')
  })

  it('matches supported browser languages without treating traditional Chinese as simplified', () => {
    expect(browserLocale(['zh-TW', 'en-US'])).toBe('en')
    expect(browserLocale(['zh-Hant', 'zh-Hans-CN'])).toBe('zh-CN')
    expect(browserLocale(['zh-CN-u-ca-gregory'])).toBe('zh-CN')
    expect(browserLocale(['zh-SG'])).toBe('zh-CN')
    expect(browserLocale(['zh-Hant-CN', 'en'])).toBe('en')
    expect(browserLocale(['fr-FR'])).toBe('en')
  })
})

it('registers every supported locale across all message catalogs', () => {
  const ids = SUPPORTED_LOCALES.map((entry) => entry.id).sort()
  for (const id of ids) {
    expect(resolveLocale(id, [])).toBe(id)
    expect(browserLocale([id])).toBe(id)
  }
  expect(Object.keys(catalogs).sort()).toEqual(ids)
  const translated = ids.filter((id) => id !== 'en')
  expect(Object.keys(toolDescriptionCatalogs).sort()).toEqual(translated)
  expect(Object.keys(starterCatalogs).sort()).toEqual(translated)
  for (const id of translated) {
    expect(Object.keys(catalogs[id] ?? {}).length).toBeGreaterThan(0)
    expect(Object.keys(toolDescriptionCatalogs[id] ?? {}).sort()).toEqual(Object.keys(toolRegistry).sort())
    expect(Object.keys(starterCatalogs[id] ?? {}).sort()).toEqual(Object.keys(starterRegistry).sort())
    for (const value of Object.values(toolDescriptionCatalogs[id] ?? {})) expect(value.trim()).not.toBe('')
    for (const value of Object.values(starterCatalogs[id] ?? {})) {
      expect(value.name.trim()).not.toBe('')
      expect(value.description.trim()).not.toBe('')
    }
  }
})
