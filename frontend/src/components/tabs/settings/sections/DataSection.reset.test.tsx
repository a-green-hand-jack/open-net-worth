// @vitest-environment jsdom
//
// The reset dialog must say what a reset really does to sign-in: it deletes the book's data and
// app settings, but keeps the password and sign-in settings (they live outside the portable
// manifest — see POST /api/reset). It used to say settings were deleted, so someone resetting a
// book they could not sign in to expected a clean, passwordless start and got neither.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as client from '../../../../api/client'
import { clearQueryCache } from '../../../../state/queryCache'
import { DataSection } from './DataSection'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../../i18n/catalogs'

beforeEach(() => {
  clearQueryCache()
  vi.spyOn(client, 'authFetch').mockImplementation(async (input) => {
    const path = String(input)
    const body = path.startsWith('/api/backup/settings')
      ? { enabled: true, retention_days: 30 }
      : path.startsWith('/api/backup')
        ? { backups: [], last_backup_at: null }
        : { uploads: [] }
    return { ok: true, status: 200, json: async () => body } as Response
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('DataSection reset dialog', () => {
  it('requires the literal RESET confirmation in Chinese', async () => {
    render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}><DataSection toast={vi.fn()} /></IntlProvider>)
    fireEvent.click(await screen.findByRole('button', { name: '重置实例…' }))
    const action = screen.getByRole('button', { name: '我已了解，重置' }) as HTMLButtonElement
    expect(action.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('输入 RESET 以确认'), { target: { value: '重置' } })
    expect(action.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('输入 RESET 以确认'), { target: { value: 'RESET' } })
    expect(action.disabled).toBe(false)
  })
  it('says the password and sign-in settings are kept', async () => {
    render(<DataSection toast={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: /reset instance/i }))

    const dialog = await screen.findByText(/Everything is deleted/)
    expect(dialog.textContent).toMatch(/Your password and sign-in settings are kept\./)
    expect(dialog.textContent).not.toMatch(/and settings\./)
  })
})
