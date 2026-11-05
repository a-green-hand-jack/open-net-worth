// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import * as client from '../../../../api/client'
import { LocaleProvider } from '../../../../i18n/LocaleProvider'
import { clearQueryCache } from '../../../../state/queryCache'
import { LanguageSection } from './LanguageSection'

afterEach(() => {
  cleanup()
  clearQueryCache()
  vi.restoreAllMocks()
})

it('saves and immediately displays the chosen language, then follows the browser', async () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
  let language: string | null = null
  const fetch = vi.spyOn(client, 'authFetch').mockImplementation(async (_url, init) => {
    if (init?.method === 'PUT') {
      language = JSON.parse(String(init.body)).language
      return { ok: true, json: async () => ({ profile: { language } }) } as Response
    }
    return { ok: true, json: async () => ({ language }) } as Response
  })
  const toast = vi.fn()
  render(
    <LocaleProvider>
      <LanguageSection toast={toast} />
    </LocaleProvider>,
  )
  const select = (await screen.findByLabelText('Interface language')) as HTMLSelectElement
  await waitFor(() => expect(select.disabled).toBe(false))
  fireEvent.change(select, { target: { value: 'zh-CN' } })
  await waitFor(() => expect(screen.getByLabelText('界面语言')).toBeTruthy())
  expect(toast).toHaveBeenCalledWith('语言已更新')
  expect(select.value).toBe('zh-CN')
  fireEvent.change(select, { target: { value: '' } })
  await waitFor(() => expect(screen.getByLabelText('Interface language')).toBeTruthy())
  expect(fetch).toHaveBeenCalledWith(
    '/api/profile',
    expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ language: null }),
    }),
  )
})

it('retains the saved preference when a write fails', async () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
  vi.spyOn(client, 'authFetch').mockImplementation(async (_url, init) =>
    init?.method === 'PUT'
      ? ({ ok: false, status: 503 } as Response)
      : ({ ok: true, json: async () => ({ language: 'en' }) } as Response),
  )
  const toast = vi.fn()
  render(
    <LocaleProvider>
      <LanguageSection toast={toast} />
    </LocaleProvider>,
  )
  const select = (await screen.findByLabelText('Interface language')) as HTMLSelectElement
  await waitFor(() => expect(select.value).toBe('en'))
  fireEvent.change(select, { target: { value: 'zh-CN' } })
  await waitFor(() => expect(toast).toHaveBeenCalledWith('Could not save language. Try again.'))
  expect(select.value).toBe('en')
  expect(select.disabled).toBe(false)
})

it('prevents overwriting a profile that could not be read and allows retry', async () => {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-US'])
  const fetch = vi.spyOn(client, 'authFetch').mockRejectedValueOnce(new Error('offline'))
  fetch.mockResolvedValue({ ok: true, json: async () => ({ language: 'en' }) } as Response)
  render(
    <LocaleProvider>
      <LanguageSection toast={vi.fn()} />
    </LocaleProvider>,
  )
  expect((await screen.findByRole('alert')).textContent).toContain('Could not load')
  expect((screen.getByLabelText('Interface language') as HTMLSelectElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() =>
    expect((screen.getByLabelText('Interface language') as HTMLSelectElement).disabled).toBe(false),
  )
  expect(fetch.mock.calls.every(([, init]) => init?.method !== 'PUT')).toBe(true)
})
