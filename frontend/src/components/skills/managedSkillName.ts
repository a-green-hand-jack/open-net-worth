import type { Skill } from '../../types/skills'

/** Localize a known managed display name without changing skill identifiers or content. */
export function managedSkillName(locale: string, skill: Skill): string {
  if (
    locale === 'zh-CN' &&
    skill.author === 'builtin' &&
    skill.id === 'statement-import' &&
    skill.name === skill.id
  ) {
    return '导入账单'
  }
  return skill.name
}
