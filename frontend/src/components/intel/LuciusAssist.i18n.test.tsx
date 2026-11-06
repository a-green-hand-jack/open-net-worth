// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import messages from './zh-CN.messages.json'
import { LuciusAlertSuggest } from './LuciusAssist'

afterEach(() => { cleanup(); vi.useRealTimers() })

it('renders generated suggestions in the current language when it changes during generation', () => {
  vi.useFakeTimers()
  const asset = { symbol: 'ACME', ccy: 'USD', price: 100 }
  const ctx = { holdingsBySymbol: {}, targets: {}, classLabels: {} }
  const onAdd = vi.fn()
  const tree = (locale: string) => <IntlProvider locale={locale} messages={locale === 'en' ? {} : messages} onError={() => {}}><LuciusAlertSuggest asset={asset} ctx={ctx} onAdd={onAdd} /></IntlProvider>
  const { rerender } = render(tree('en'))
  fireEvent.click(screen.getByRole('button', { name: 'Suggest alerts' }))
  rerender(tree('zh-CN'))
  act(() => { vi.advanceTimersByTime(800) })
  expect(screen.getByText(/你没有持有 ACME/)).toBeTruthy()
  expect(onAdd).not.toHaveBeenCalled()
})
