import { useEffect, useState, type ReactNode } from 'react'
import { IntlProvider } from 'react-intl'
import { LocaleContext } from './localeContext'
import { resolveLocale, type Locale } from './locale'

const catalogs: Record<Locale, Record<string, string> | undefined> = {
  en: undefined,
  'zh-CN': { 'auth.signingBackIn': '正在重新登录…' },
}

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
