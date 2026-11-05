import config from '../../../backend/core/interface_locales.json'

// The union also checks that all desktop bridge implementations support a registered locale.
export type Locale = 'en' | 'zh-CN'
type LocaleEntry = {
  id: Locale
  label: string
  language: string
  scripts?: readonly string[]
  regions?: readonly string[]
}
export const SUPPORTED_LOCALES: readonly LocaleEntry[] = config as readonly LocaleEntry[]
export const DEFAULT_LOCALE: Locale = 'en'

export function browserLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    try {
      const locale = new Intl.Locale(language)
      const match = SUPPORTED_LOCALES.find(
        (entry) =>
          entry.language === locale.language &&
          (!entry.scripts || !locale.script || entry.scripts.includes(locale.script)) &&
          (!entry.regions ||
            !!locale.script ||
            !locale.region ||
            entry.regions.includes(locale.region)),
      )
      if (match) return match.id
    } catch {
      // Invalid browser language tags are ignored, allowing later preferences to match.
    }
  }
  return DEFAULT_LOCALE
}

export function resolveLocale(preference: unknown, languages: readonly string[]): Locale {
  const match = SUPPORTED_LOCALES.find((entry) => entry.id === preference)
  return match?.id ?? browserLocale(languages)
}
