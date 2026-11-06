import { useContext, useSyncExternalStore } from 'react'
import { createIntl, IntlContext } from 'react-intl'
import { getFormatRevision, subscribeDisplayFormats } from '../utils/format'

const english = createIntl({ locale: 'en', defaultLocale: 'en' })

export function useAppIntl() {
  useSyncExternalStore(subscribeDisplayFormats, getFormatRevision, getFormatRevision)
  return useContext(IntlContext) ?? english
}
