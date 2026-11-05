// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../../i18n/catalogs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as client from '../../../../api/client'
import { AppearanceSection } from './AppearanceSection'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('onw-theme', 'system')
  vi.spyOn(client, 'authFetch').mockResolvedValue({
    ok: true,
    json: async () => ({ app_name: 'Open Net Worth', accent_color: '', logo_url: '' }),
  } as Response)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Appearance theme selector', () => {
  it('offers System, Dark, Warm, and Light as distinct device choices', () => {
    render(<AppearanceSection toast={vi.fn()} />)

    const options = screen.getAllByRole('option') as HTMLOptionElement[]
    expect(options.map((option) => [option.value, option.textContent])).toEqual([
      ['system', 'System'],
      ['dark', 'Dark'],
      ['warm', 'Warm'],
      ['light', 'Light'],
    ])
    expect(screen.queryByText(/Following your system|currently dark/i)).toBeNull()
  })

  it('shows Chinese theme labels while preserving the stored theme value', () => {
    render(
      <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
        <AppearanceSection toast={vi.fn()} />
      </IntlProvider>,
    )
    const select = screen.getByLabelText('配色方案') as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      '跟随系统',
      '深色',
      '暖色',
      '浅色',
    ])
    fireEvent.change(select, { target: { value: 'dark' } })
    expect(localStorage.getItem('onw-theme')).toBe('dark')
    expect(select.value).toBe('dark')
  })
})
