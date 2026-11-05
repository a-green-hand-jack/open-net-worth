// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import * as client from '../../../../api/client'
import { clearQueryCache } from '../../../../state/queryCache'
import { LocaleProvider } from '../../../../i18n/LocaleProvider'
import { CurrencySection } from './CurrencySection'

afterEach(() => {
  cleanup()
  clearQueryCache()
  vi.restoreAllMocks()
})

it('saves a chosen language and can return to following the browser', async () => {
  let language: string | null = null
  const fetch = vi.spyOn(client, 'authFetch').mockImplementation(async (_url, init) => {
    if (init?.method === 'PUT') {
      language = JSON.parse(String(init.body)).language
      return { ok: true, json: async () => ({ profile: { language } }) } as Response
    }
    return { ok: true, json: async () => ({ language }) } as Response
  })
  render(
    <LocaleProvider>
      <CurrencySection toast={vi.fn()} />
    </LocaleProvider>,
  )
  const select = await screen.findByLabelText('Interface language')
  await waitFor(() => expect((select as HTMLSelectElement).disabled).toBe(false))
  fireEvent.change(select, { target: { value: 'zh-CN' } })
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ language: 'zh-CN' }) }),
    ),
  )
  await waitFor(() => expect((select as HTMLSelectElement).value).toBe('zh-CN'))
  fireEvent.change(select, { target: { value: '' } })
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ language: null }) }),
    ),
  )
})

it('retains the saved language when saving a new choice fails', async () => {
  vi.spyOn(client, 'authFetch').mockImplementation(async (_url, init) => {
    if (init?.method === 'PUT')
      return { ok: false, status: 503, json: async () => ({}) } as Response
    return { ok: true, json: async () => ({ language: 'en' }) } as Response
  })
  const toast = vi.fn()
  render(
    <LocaleProvider>
      <CurrencySection toast={toast} />
    </LocaleProvider>,
  )
  const select = (await screen.findByLabelText('Interface language')) as HTMLSelectElement
  await waitFor(() => expect(select.value).toBe('en'))
  fireEvent.change(select, { target: { value: 'zh-CN' } })
  await waitFor(() => expect(toast).toHaveBeenCalledWith('Could not save (HTTP 503)'))
  expect(select.value).toBe('en')
  expect(select.disabled).toBe(false)
})

it('keeps the browser fallback and prevents overwriting an unread profile until retry succeeds', async () => {
  const fetch = vi.spyOn(client, 'authFetch')
  fetch.mockRejectedValueOnce(new Error('offline'))
  fetch.mockResolvedValue({ ok: true, json: async () => ({ language: 'en' }) } as Response)
  render(
    <LocaleProvider>
      <CurrencySection toast={vi.fn()} />
    </LocaleProvider>,
  )
  expect((await screen.findByRole('alert')).textContent).toContain('Could not load your language preference')
  const select = screen.getByLabelText('Interface language') as HTMLSelectElement
  expect(select.disabled).toBe(true)
  expect(fetch.mock.calls.every(([, init]) => init?.method !== 'PUT')).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(select.disabled).toBe(false))
  expect(select.value).toBe('en')
})
