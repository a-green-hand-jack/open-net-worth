import { useContext, useSyncExternalStore } from 'react'
import { getFormatRevision, subscribeDisplayFormats } from '../utils/format'
import { createIntl, IntlContext } from 'react-intl'

// Standalone component hosts, including the design gallery, may not mount the app provider.
const english = createIntl({ locale: 'en', defaultLocale: 'en' })

export function useAppIntl() {
  useSyncExternalStore(subscribeDisplayFormats, getFormatRevision, getFormatRevision)
  return useContext(IntlContext) ?? english
}
