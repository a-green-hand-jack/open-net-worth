// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import zh from '../../../i18n/zh-CN.json'
import { WatchlistTab } from './WatchlistTab'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../../../hooks/useIntelStoryIndex', () => ({
  useIntelStoryIndex: () => new Map(),
  requestIntelStoryFocus: vi.fn(),
}))
vi.mock('./useWatchlistBoard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./useWatchlistBoard')>()),
  useWatchlistBoard: () => ({
    board: { watchlists: [], rows: [] },
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))
afterEach(cleanup)
it('renders the empty watchlist state in Chinese', () => {
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <WatchlistTab onNavigate={vi.fn()} />
    </IntlProvider>,
  )
  expect(screen.getByText('暂无观察列表')).toBeTruthy()
  expect(screen.getByRole('button', { name: '前往情报' })).toBeTruthy()
})
