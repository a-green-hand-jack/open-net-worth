// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import messages from './zh-CN.messages.json'
import commonMessages from '../../../i18n/zh-CN.json'
import { DeleteEnvelopeModal } from './budgetEnvelopeOps'

vi.mock('../../../hooks/useBudget', async (original) => ({
  ...(await original<typeof import('../../../hooks/useBudget')>()),
  fetchEnvelopeDeletePreview: vi.fn(async () => ({ delta_rta: 100, available: -50 })),
}))

afterEach(cleanup)

describe('delete envelope translation', () => {
  it('preserves the deletion effects and the amounts', async () => {
    render(
      <IntlProvider locale="zh-CN" messages={{ ...commonMessages, ...messages }} onError={() => {}}>
        <DeleteEnvelopeModal
          envelopeId="synthetic"
          month="2026-07"
          envelopeName="Example"
          categoryLabels={['Food']}
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      </IntlProvider>,
    )
    expect(screen.getByText(/不会删除类别或交易/)).toBeTruthy()
    expect((await screen.findByText(/返回待分配金额/)).textContent).toContain('100')
    expect(screen.getByText(/删除不会消除其/).textContent).toContain('50')
  })
})
