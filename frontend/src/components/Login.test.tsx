// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../i18n/catalogs'
import { Login } from './Login'

const authFetch = vi.hoisted(() => vi.fn())
vi.mock('../api/client', () => ({ authFetch }))
vi.mock('../brand-context', () => ({ useBrand: () => ({ app_name: 'Open Net Worth' }) }))

afterEach(() => {
  cleanup()
  authFetch.mockReset()
})

async function submitWith(res: { status: number; headers?: Headers }) {
  authFetch.mockResolvedValue({ ok: res.status < 400, ...res })
  render(<Login onAuthenticated={() => {}} />)
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('Login', () => {
  it('shows Chinese login errors without calling the success handler', async () => {
    const success = vi.fn()
    authFetch.mockResolvedValue({ ok: false, status: 401 })
    render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}><Login onAuthenticated={success} /></IntlProvider>)
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'synthetic-password' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))
    expect(await screen.findByText('密码错误')).toBeTruthy()
    expect(success).not.toHaveBeenCalled()
    expect(screen.getByText('onw reset-password')).toBeTruthy()
  })

  it('says how long to wait on a 429, from Retry-After', async () => {
    await submitWith({ status: 429, headers: new Headers({ 'Retry-After': '601' }) })
    expect(await screen.findByText('Too many attempts. Try again in 11 minutes.')).toBeTruthy()
  })

  it('falls back to the 15 minute window without Retry-After', async () => {
    await submitWith({ status: 429, headers: new Headers() })
    expect(await screen.findByText('Too many attempts. Try again in 15 minutes.')).toBeTruthy()
  })

  it('points at the real recovery path', () => {
    render(<Login onAuthenticated={() => {}} />)
    expect(screen.getByText(/in the desktop app, set a new one in settings/i)).toBeTruthy()
    expect(screen.getByText('onw reset-password')).toBeTruthy()
    expect(screen.getByRole('link', { name: /more options/i }).getAttribute('href')).toContain(
      '/troubleshooting/lost-password/',
    )
  })
})
