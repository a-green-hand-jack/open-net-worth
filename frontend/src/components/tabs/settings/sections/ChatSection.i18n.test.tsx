// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import { authFetch } from '../../../../api/client'
import { SCREEN_AWARENESS_DEFAULT_CHANGED_EVENT } from '../../../../hooks/useChatSuggestionsEnabled'
import { catalogs } from '../../../../i18n/catalogs'
import { clearQueryCache } from '../../../../state/queryCache'
import { ChatSection } from './ChatSection'

vi.mock('../../../../api/client', () => ({ authFetch: vi.fn() }))
beforeEach(() => {
  clearQueryCache()
  vi.clearAllMocks()
  vi.mocked(authFetch).mockImplementation(async (_url, init) => {
    const patch = init?.body ? JSON.parse(String(init.body)) : {}
    return new Response(
      JSON.stringify(
        init?.method === 'PUT' ? { profile: patch } : { screen_awareness_default: true },
      ),
    )
  })
})
afterEach(cleanup)

it('translates screen awareness while preserving its profile write and change event', async () => {
  const changed = vi.fn()
  window.addEventListener(SCREEN_AWARENESS_DEFAULT_CHANGED_EVENT, changed)
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <ChatSection toast={vi.fn()} />
    </IntlProvider>,
  )
  const toggle = await screen.findByRole('switch', { name: '默认开启屏幕感知' })
  await waitFor(() => expect(toggle.hasAttribute('disabled')).toBe(false))
  fireEvent.click(toggle)
  await waitFor(() =>
    expect(
      vi
        .mocked(authFetch)
        .mock.calls.some(
          ([, init]) =>
            init?.method === 'PUT' &&
            JSON.parse(String(init.body)).screen_awareness_default === false,
        ),
    ).toBe(true),
  )
  expect(changed).toHaveBeenCalledTimes(1)
  window.removeEventListener(SCREEN_AWARENESS_DEFAULT_CHANGED_EVENT, changed)
})
