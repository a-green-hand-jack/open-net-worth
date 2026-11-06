// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, it, expect } from 'vitest'

afterEach(cleanup)
import { useAppIntl } from './useAppIntl'
import { LocaleProvider } from './LocaleProvider'
import { useSetLocalePreference } from './localeContext'
import { fDate, setDisplayFormats } from '../utils/format'

function Example() {
  const intl = useAppIntl()
  const select = useSetLocalePreference()
  return (
    <>
      <span>
        {intl.formatMessage({ id: 'settings.language.title', defaultMessage: 'Language' })}
      </span>
      <button onClick={() => select('zh-CN')}>Chinese</button>
      <button onClick={() => select('en')}>English</button>
    </>
  )
}

it('updates visible text and document language when the profile preference changes', async () => {
  render(
    <LocaleProvider>
      <Example />
    </LocaleProvider>,
  )
  fireEvent.click(screen.getByText('Chinese'))
  expect(screen.getByText('语言')).toBeTruthy()
  await waitFor(() => expect(document.documentElement.lang).toBe('zh-CN'))
  fireEvent.click(screen.getByText('English'))
  expect(screen.getByText('Language')).toBeTruthy()
  await waitFor(() => expect(document.documentElement.lang).toBe('en'))
})

function DateSurface({ label }: { label: string }) {
  useAppIntl()
  return <span data-testid={label}>{fDate('2026-11-06', 'short', 'always')}</span>
}

it('updates dates on separate surfaces when language or date order changes', () => {
  setDisplayFormats({ date_format: null })
  render(<LocaleProvider><Example /><DateSurface label="lots" /><DateSurface label="transactions" /></LocaleProvider>)
  fireEvent.click(screen.getByText('Chinese'))
  expect(screen.getByTestId('lots').textContent).toBe('2026年11月6日')
  expect(screen.getByTestId('transactions').textContent).toBe('2026年11月6日')
  act(() => setDisplayFormats({ date_format: 'dmy' }))
  expect(screen.getByTestId('lots').textContent).toBe('6日11月2026年')
  expect(screen.getByTestId('transactions').textContent).toBe('6日11月2026年')
  act(() => setDisplayFormats({ date_format: 'mdy' }))
  expect(screen.getByTestId('lots').textContent).toBe('11月6日2026年')
  act(() => setDisplayFormats({ date_format: 'iso' }))
  expect(screen.getByTestId('transactions').textContent).toBe('2026年11月6日')
  act(() => setDisplayFormats({}))
})
