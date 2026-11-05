import { useState } from 'react'
import { createIntl } from 'react-intl'
import { authFetch } from '../../../../api/client'
import { PROFILE_KEY, fetchJson } from '../../../../hooks/serverState'
import { SUPPORTED_LOCALES, resolveLocale } from '../../../../i18n/locale'
import { catalogs } from '../../../../i18n/catalogs'
import { useSetLocalePreference } from '../../../../i18n/localeContext'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { setCachedQueryData, useCachedFetchState } from '../../../../state/queryCache'
import { Field, Panel, Select, useSectionBusy } from '../ds'
import type { SectionProps } from '../ds'

interface ProfileLanguage {
  language?: string | null
  [key: string]: unknown
}

export function LanguageSection({ toast }: SectionProps) {
  const intl = useAppIntl()
  const setPreference = useSetLocalePreference()
  const {
    data: profile,
    initialLoading,
    error,
    refresh,
  } = useCachedFetchState<ProfileLanguage>(
    PROFILE_KEY,
    () => fetchJson<ProfileLanguage>(PROFILE_KEY),
    { staleTime: 0 },
  )
  const [saving, setSaving] = useState(false)
  useSectionBusy(initialLoading && !profile)

  async function save(language: string | null) {
    setSaving(true)
    try {
      const response = await authFetch(PROFILE_KEY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      })
      if (!response.ok) throw new Error('save failed')
      const { profile: saved } = (await response.json()) as { profile: ProfileLanguage }
      setCachedQueryData(PROFILE_KEY, saved)
      setPreference(saved.language)
      const locale = resolveLocale(
        saved.language,
        navigator.languages?.length ? navigator.languages : [navigator.language],
      )
      toast(
        createIntl({ locale, defaultLocale: 'en', messages: catalogs[locale] }).formatMessage({
          id: 'language.saved',
          defaultMessage: 'Language updated',
        }),
      )
    } catch {
      toast(
        intl.formatMessage({
          id: 'language.failed',
          defaultMessage: 'Could not save language. Try again.',
        }),
      )
    } finally {
      setSaving(false)
    }
  }

  const label = intl.formatMessage({
    id: 'settings.section.language',
    defaultMessage: 'Interface language',
  })
  return (
    <Panel
      title={label}
      sub={intl.formatMessage({
        id: 'language.description',
        defaultMessage: 'Choose the interface language for this profile on all devices',
      })}
    >
      <div className="rd-formgrid">
        <Field label={label}>
          <Select
            aria-label={label}
            value={profile?.language || ''}
            disabled={saving || initialLoading || !profile}
            onChange={(event) => void save(event.target.value || null)}
          >
            <option value="">
              {intl.formatMessage({ id: 'language.browser', defaultMessage: 'Follow browser' })}
            </option>
            {SUPPORTED_LOCALES.map(({ id, label: name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        {Boolean(error) && !profile && (
          <div role="alert">
            {intl.formatMessage({
              id: 'language.loadFailed',
              defaultMessage:
                'Could not load your language preference. The browser language is in use.',
            })}
            <button type="button" onClick={() => void refresh()}>
              {intl.formatMessage({ id: 'language.retry', defaultMessage: 'Try again' })}
            </button>
          </div>
        )}
      </div>
    </Panel>
  )
}
