import { useContext } from 'react'
import { createIntl, IntlContext } from 'react-intl'

const english = createIntl({ locale: 'en', defaultLocale: 'en' })

export function useAppIntl() {
  return useContext(IntlContext) ?? english
}
