// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import * as client from '../../../../api/client'
import { clearQueryCache } from '../../../../state/queryCache'
import { CurrencySection } from './CurrencySection'
import { catalogs, LocaleProvider } from '../../../../i18n/LocaleProvider'

function respond(profile: Record<string, unknown>) {
  return vi.spyOn(client, 'authFetch').mockImplementation(async (url, init) => {
    if (String(url).endsWith('/timezone') && init?.method === 'PUT') {
      const { timezone } = JSON.parse(String(init.body))
      return {
        ok: true,
        json: async () => ({ timezone, timezone_source: 'user' }),
      } as Response
    }
    return { ok: true, json: async () => profile } as Response
  })
}

beforeEach(() => {
  clearQueryCache()
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    timeZone: 'Asia/Singapore',
  } as Intl.ResolvedDateTimeFormatOptions)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Settings time zone', () => {
  it('requires confirmation before saving a base currency change in Chinese', async () => {
    const profile = { base_currency: 'SGD', timezone: 'Asia/Singapore', timezone_source: 'user' }
    const spy = vi.spyOn(client, 'authFetch').mockImplementation(async (url, init) => {
      if (String(url).endsWith('/base-currency-preview')) {
        return { ok: true, json: async () => ({ fields: [] }) } as Response
      }
      if (String(url) === '/api/profile' && init?.method === 'PUT') {
        return { ok: true, json: async () => ({ profile: { ...profile, base_currency: 'USD' } }) } as Response
      }
      return { ok: true, json: async () => profile } as Response
    })
    render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}><CurrencySection toast={vi.fn()} /></IntlProvider>)
    const currency = await screen.findByDisplayValue(/^SGD/)
    fireEvent.change(currency, { target: { value: 'USD' } })
    expect(await screen.findByText('将基础货币切换为 USD？')).toBeTruthy()
    expect(await screen.findByText('你没有手动输入的金额，无需重新输入。')).toBeTruthy()
    expect(spy).not.toHaveBeenCalledWith('/api/profile', expect.objectContaining({ method: 'PUT' }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(spy).not.toHaveBeenCalledWith('/api/profile', expect.objectContaining({ method: 'PUT' }))
    fireEvent.change(currency, { target: { value: 'USD' } })
    fireEvent.click(await screen.findByRole('button', { name: '切换为 USD' }))
    await waitFor(() => expect(spy).toHaveBeenCalledWith('/api/profile', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ base_currency: 'USD' }),
    })))
  })
  it('saves a time zone from the Chinese interface', async () => {
    const spy = respond({ base_currency: 'SGD', timezone: 'Asia/Singapore', timezone_source: 'auto' })
    const toast = vi.fn()
    render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}><CurrencySection toast={toast} /></IntlProvider>)
    await screen.findByText('从此浏览器检测到；如有错误请更改')
    fireEvent.change(screen.getByDisplayValue('Asia/Singapore'), { target: { value: 'Europe/Paris' } })
    await waitFor(() => expect(toast).toHaveBeenCalledWith('时区已更新'))
    expect(spy).toHaveBeenCalledWith('/api/profile/timezone', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ timezone: 'Europe/Paris' }),
    }))
  })
  it("shows the stored zone and saves a pick as the owner's choice", async () => {
    const spy = respond({
      base_currency: 'SGD',
      timezone: 'Asia/Singapore',
      timezone_source: 'auto',
    })
    const toast = vi.fn()
    render(
      <LocaleProvider>
        <CurrencySection toast={toast} />
      </LocaleProvider>,
    )
    await screen.findByText(/Detected from this browser/)
    const select = screen.getByDisplayValue('Asia/Singapore') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Europe/Paris' } })
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Time zone updated'))
    expect(spy).toHaveBeenCalledWith(
      '/api/profile/timezone',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ timezone: 'Europe/Paris' }),
      }),
    )
    await screen.findByText('Set by you')
  })

  it('offers to switch to the browser zone only when it differs from the stored one', async () => {
    respond({ base_currency: 'SGD', timezone: 'Europe/Paris', timezone_source: 'user' })
    render(
      <LocaleProvider>
        <CurrencySection toast={vi.fn()} />
      </LocaleProvider>,
    )
    await screen.findByText(/Use this browser's \(Asia\/Singapore\)/)
  })
})
