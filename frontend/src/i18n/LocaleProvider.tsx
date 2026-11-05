import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { setInterfaceLocale } from '../utils/format'
import { IntlProvider } from 'react-intl'
import { resolveLocale, type Locale } from './locale'
import zh from './zh-CN.json'
import tradingZh from '../components/tabs/trading/zh-CN.messages.json'
import accountsZh from '../components/tabs/accounts/zh-CN.messages.json'
import accountsVisibleZh from '../components/tabs/accounts/visible.zh-CN.messages.json'
import planZh from '../components/tabs/plan/zh-CN.messages.json'
import planVisibleZh from '../components/tabs/plan/visible-scan.zh-CN.messages.json'
import connectorsZh from '../components/tabs/connectors/zh-CN.messages.json'
import chatZh from '../components/chat/zh-CN.messages.json'
import overviewZh from '../components/tabs/overview/zh-CN.messages.json'
import intelZh from '../components/intel/zh-CN.messages.json'
import builderZh from '../components/tabs/builder.zh-CN.messages.json'
import automationsZh from '../components/tabs/automations/zh-CN.messages.json'
import skillsZh from '../components/skills/zh-CN.messages.json'
import importsZh from '../components/tabs/imports/zh-CN.messages.json'
import settingsRemainingZh from '../components/tabs/settings/remaining.zh-CN.messages.json'
import sharedZh from '../components/shared/zh-CN.messages.json'
import equityZh from '../components/tabs/equity/zh-CN.messages.json'
import firstrunZh from '../components/firstrun/zh-CN.messages.json'
import investmentsZh from '../components/tabs/investments/zh-CN.messages.json'
import vaultZh from '../components/vault/zh-CN.messages.json'
import remainingA11yZh from '../components/remaining-a11y.zh-CN.messages.json'
import scanFixesZh from '../components/scan-fixes.zh-CN.messages.json'
import scan2Zh from '../components/scan2.zh-CN.messages.json'
import visibleScan2Zh from '../components/visible-scan2.zh-CN.messages.json'
import { LocaleContext } from './localeContext'

export const catalogs: Record<Locale, Record<string, string> | undefined> = {
  en: undefined,
  'zh-CN': {
    ...zh,
    ...tradingZh,
    ...accountsZh,
    ...accountsVisibleZh,
    ...planZh,
    ...planVisibleZh,
    ...connectorsZh,
    ...chatZh,
    ...overviewZh,
    ...intelZh,
    ...builderZh,
    ...automationsZh,
    ...skillsZh,
    ...importsZh,
    ...settingsRemainingZh,
    ...sharedZh,
    ...equityZh,
    ...firstrunZh,
    ...investmentsZh,
    ...vaultZh,
    ...remainingA11yZh,
    ...scanFixesZh,
    ...scan2Zh,
    ...visibleScan2Zh,
  },
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [preference, select] = useState<unknown>(null)
  const [languages, setLanguages] = useState<readonly string[]>(() =>
    navigator.languages?.length ? navigator.languages : [navigator.language],
  )
  const locale = resolveLocale(preference, languages)
  useLayoutEffect(() => { setInterfaceLocale(locale) }, [locale])
  useEffect(() => {
    const update = () =>
      setLanguages(navigator.languages?.length ? navigator.languages : [navigator.language])
    window.addEventListener('languagechange', update)
    return () => window.removeEventListener('languagechange', update)
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale
    window.onwDesktopClient?.setLocale?.(locale)
  }, [locale])
  return (
    <LocaleContext.Provider value={select}>
      <IntlProvider locale={locale} defaultLocale="en" messages={catalogs[locale]}>
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  )
}
