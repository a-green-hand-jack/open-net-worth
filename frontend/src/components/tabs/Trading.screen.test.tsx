// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Trading } from './Trading'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate, useSearch: () => ({ view: 'workspaces' }) }))
vi.mock('../../hooks/useTrading', () => ({
  useTradingWorkspaces: () => ({ data: { items: [], total: 0 }, initialLoading: false }),
  useTradingOverview: () => ({ data: undefined, initialLoading: false }),
}))
vi.mock('../../lucius/useScreenContract', () => ({ useRegisterScreenCommands: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('shows the empty workspace and opens expert setup', () => {
  render(<Trading />)
  expect(screen.getByRole('heading', { name: 'Trading' })).toBeTruthy()
  expect(screen.getByText('Give an agent a trading mandate')).toBeTruthy()
  fireEvent.click(screen.getAllByRole('button', { name: 'Expert setup' })[0])
  expect(screen.getByRole('dialog')).toBeTruthy()
})

it('navigates to scenario comparison', () => {
  render(<Trading />)
  fireEvent.click(screen.getByRole('tab', { name: 'Compare' }))
  expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/trading', search: expect.objectContaining({ view: 'compare' }) }))
})
