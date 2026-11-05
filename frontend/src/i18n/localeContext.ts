import { createContext, useContext } from 'react'

export const LocaleContext = createContext<(preference: unknown) => void>(() => {})
export const useSetLocalePreference = () => useContext(LocaleContext)
