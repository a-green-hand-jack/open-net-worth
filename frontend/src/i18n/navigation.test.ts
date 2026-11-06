import { createIntl } from 'react-intl'
import { expect, it } from 'vitest'
import { TABS, TAB_LABELS } from '../tabs'
import { catalogs } from './LocaleProvider'
import { tabLabel } from './navigation'

it('keeps English labels and provides Chinese labels for every navigation target', () => {
  const english = createIntl({ locale: 'en', defaultLocale: 'en' })
  const chinese = createIntl({ locale: 'zh-CN', defaultLocale: 'en', messages: catalogs['zh-CN'] })
  for (const tab of TABS) {
    expect(tabLabel(english, tab)).toBe(TAB_LABELS[tab])
    expect(catalogs['zh-CN']?.[`nav.${tab}`]).toBeTruthy()
    expect(tabLabel(chinese, tab)).toBeTruthy()
  }
  expect(tabLabel(chinese, 'settings')).toBe('设置')
})
