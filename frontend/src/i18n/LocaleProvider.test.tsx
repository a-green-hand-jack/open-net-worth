// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from './LocaleProvider'
import { browserLocale, resolveLocale } from './locale'
import { useSetLocalePreference } from './localeContext'
import { useAppIntl } from './useAppIntl'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function Example() {
  const intl = useAppIntl()
  const select = useSetLocalePreference()
  return <>
    <span>{intl.formatMessage({ id: 'auth.signingBackIn', defaultMessage: 'Signing you back in…' })}</span>
    <button onClick={() => select('zh-CN')}>Chinese</button>
    <button onClick={() => select('en')}>English</button>
    <button onClick={() => select(null)}>Browser</button>
  </>
}

describe('interface language', () => {
  it('prioritizes the profile and does not map traditional Chinese to simplified', () => {
    expect(resolveLocale('en', ['zh-CN'])).toBe('en')
    expect(resolveLocale('zh-CN', ['en-US'])).toBe('zh-CN')
    expect(browserLocale(['zh-TW', 'en-US'])).toBe('en')
    expect(browserLocale(['zh-Hant', 'zh-Hans-CN'])).toBe('zh-CN')
    expect(browserLocale(['not a locale', 'zh-SG'])).toBe('zh-CN')
    expect(browserLocale(['fr-FR'])).toBe('en')
  })

  it('updates messages and document language when a preference changes or clears', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
    render(<LocaleProvider><Example /></LocaleProvider>)
    expect(screen.getByText('Signing you back in…')).toBeTruthy()
    fireEvent.click(screen.getByText('Chinese'))
    expect(screen.getByText('正在重新登录…')).toBeTruthy()
    await waitFor(() => expect(document.documentElement.lang).toBe('zh-CN'))
    fireEvent.click(screen.getByText('Browser'))
    expect(screen.getByText('Signing you back in…')).toBeTruthy()
    await waitFor(() => expect(document.documentElement.lang).toBe('en'))
  })

  it('uses English for standalone components without a provider', () => {
    render(<Example />)
    expect(screen.getByText('Signing you back in…')).toBeTruthy()
  })
})
