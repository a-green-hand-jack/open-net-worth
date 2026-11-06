import registry from './starterSkills.registry.json'
import chinese from './starterSkills.zh-CN.json'
import type { Skill } from '../../types/skills'
export const starterCatalogs: Record<
  string,
  Record<string, Record<'name' | 'description', string>> | undefined
> = { 'zh-CN': chinese }

interface StarterSource {
  id: string
  name_sha256?: string
  description_sha256?: string
}
/** Translate only first-party snapshots whose text and server-provided source match this version. */
export function starterField(
  locale: string,
  field: 'name' | 'description',
  value: string,
  id: string,
  source?: StarterSource | null,
): string {
  if (!source || source.id !== id) return value
  const entry = (
    registry as Record<string, Record<'name' | 'description', { english: string; sha256: string }>>
  )[source.id]?.[field]
  const translated = starterCatalogs[locale]?.[source.id]?.[field]
  return entry &&
    translated &&
    source[`${field}_sha256`] === entry.sha256 &&
    value === entry.english
    ? translated
    : value
}

const managedNames: Record<string, Record<string, string>> = {
  'zh-CN': { 'statement-import': '导入账单' },
}

/** Managed built-ins are installed separately from the starter skill catalog. */
export function skillDisplayName(locale: string, skill: Skill): string {
  if (skill.author === 'builtin' && skill.name === skill.id) {
    const translated = managedNames[locale]?.[skill.id]
    if (translated) return translated
  }
  return starterField(locale, 'name', skill.name, skill.id, skill.starter_source)
}
