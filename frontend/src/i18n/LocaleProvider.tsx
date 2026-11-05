import { useEffect, useState, type ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { LocaleContext } from './localeContext'
import { resolveLocale } from './locale'
import { catalogs } from './catalogs'

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [preference, select] = useState<unknown>(null)
  const [languages, setLanguages] = useState<readonly string[]>(() =>
    navigator.languages?.length ? navigator.languages : [navigator.language],
  )
  const locale = resolveLocale(preference, languages)
  useEffect(() => {
    const update = () =>
      setLanguages(navigator.languages?.length ? navigator.languages : [navigator.language])
    window.addEventListener('languagechange', update)
    return () => window.removeEventListener('languagechange', update)
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  return (
    <LocaleContext.Provider value={select}>
      <IntlProvider locale={locale} defaultLocale="en" messages={catalogs[locale]}>
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  )
}
