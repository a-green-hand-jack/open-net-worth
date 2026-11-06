// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { TradingRun } from '../../../types/trading'
import { tradingApi } from '../../../api/trading'
import { RunTools } from './RunTools'

vi.mock('../../../api/trading', () => ({
  tradingApi: { issueAccess: vi.fn(), revokeAccess: vi.fn(), agent: vi.fn(), script: vi.fn() },
}))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('discards the scoped credential when its dialog closes', async () => {
  vi.mocked(tradingApi.issueAccess).mockResolvedValue({ token: 'synthetic-grant', endpoint: '/synthetic', expires_at: '2026-01-01T00:00:00Z' })
  const run = { id: 'synthetic-run', state: 'running', workspace_snapshot: { agent_kind: 'external' } } as TradingRun
  render(<RunTools run={run} />)
  fireEvent.click(screen.getByRole('button', { name: 'External agent access' }))
  fireEvent.click(screen.getByRole('button', { name: 'Issue run credential' }))
  await waitFor(() => expect(screen.getByLabelText('Scoped credential')).toHaveProperty('value', 'synthetic-grant'))
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByLabelText('Scoped credential')).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'External agent access' }))
  expect(screen.queryByLabelText('Scoped credential')).toBeNull()
  expect(screen.getByRole('button', { name: 'Issue run credential' })).toBeTruthy()
})
