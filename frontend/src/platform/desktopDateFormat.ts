import { resolveLocale } from '../i18n/locale'

/** Send both profile preferences together so the native UI never observes a mixed profile. */
export function syncDesktopDisplay(language: unknown, value: unknown): void {
  const format = value === 'dmy' || value === 'mdy' || value === 'iso' ? value : null
  const bridge = window.onwDesktopClient
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  if (bridge?.setProfileDisplay)
    bridge.setProfileDisplay(resolveLocale(language, languages), format)
  else bridge?.setDateFormat?.(format)
}

/** While loading, leave native startup pending; a failure without cache falls back to the OS. */
export function syncDesktopProfileSnapshot(
  profile: { language?: unknown; date_format?: unknown } | undefined,
  error: unknown,
): void {
  if (profile) syncDesktopDisplay(profile.language, profile.date_format)
  else if (error) syncDesktopDisplay(null, null)
}
