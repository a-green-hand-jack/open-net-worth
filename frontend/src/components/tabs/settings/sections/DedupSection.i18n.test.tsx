// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import zh from '../../../../i18n/zh-CN.json'
import { DedupSection } from './DedupSection'

const save = vi.fn().mockResolvedValue({})
vi.mock('../../../../api/matches', () => ({
  getDedupConfig: vi.fn(),
  listMatchDecisions: vi.fn(),
  setDedupConfig: (...args: unknown[]) => save(...args),
  forgetMatchDecision: vi.fn(),
}))
vi.mock('../../../../hooks/useModels', () => ({
  useModels: () => ({ models: [], defaultModel: '' }),
}))
vi.mock('../../../../state/queryCache', () => ({
  useCachedFetchState: (key: string) =>
    key.includes('/config')
      ? {
          data: { policy: 'auto_transfers', l3_enabled: false, l3_model: '', l3_max_per_run: 3 },
          initialLoading: false,
          refresh: vi.fn(),
        }
      : {
          data: {
            decisions: [
              {
                signature: 'x',
                verdict: 'same',
                payee_label: 'Dana Store',
                amount_bucket: '$12',
                created_at: '2026-01-01',
              },
            ],
          },
          refresh: vi.fn(),
        },
}))
afterEach(cleanup)

it('translates policy labels while keeping saved keys and user payee text', async () => {
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <DedupSection toast={vi.fn()} />
    </IntlProvider>,
  )
  expect(screen.getByText(/Dana Store/).textContent).toContain('Dana Store')
  const select = screen.getByRole('combobox', { name: '自动合并策略' })
  fireEvent.change(select, { target: { value: 'review_all' } })
  await waitFor(() => expect(save).toHaveBeenCalledWith({ policy: 'review_all' }))
})

it('keeps English labels and persisted policy keys in English', () => {
  render(
    <IntlProvider locale="en">
      <DedupSection toast={vi.fn()} />
    </IntlProvider>,
  )
  const select = screen.getByRole('combobox', { name: 'Auto-merge policy' })
  expect(select).toHaveProperty('value', 'auto_transfers')
  expect(screen.getByText(/Dana Store/).textContent).toContain('Dana Store')
  expect(screen.getByRole('option', { name: /Balanced/ })).toBeTruthy()
})
