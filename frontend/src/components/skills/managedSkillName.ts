import type { Skill } from '../../types/skills'
import { skillDisplayName } from './starterMessages'

/** Localize a known managed display name without changing skill identifiers or content. */
export function managedSkillName(locale: string, skill: Skill): string {
  return skillDisplayName(locale, skill)
}
