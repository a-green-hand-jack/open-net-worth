// Regression guard for owner feedback ("they are still not the same") — the Funding tab's
// "How it's funded" bar and the Overview tab's condensed "Funding" digest must render a
// byte-identical Meter for the same commitment, since both now go through the same
// shared FundingCoverageBar component instead of two hand-maintained copies.
// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../i18n/LocaleProvider'
import { Funding } from './detailFunding'
import { OverviewTab } from './detailOverview'
import { setBaseCurrency } from '../../../utils/format'
import type { Commitment } from '../../../types/commitments'
import type { DetailMutations } from './detailTypes'

setBaseCurrency('SGD')

vi.mock('../../../api/client', () => ({ authFetch: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouterState: () => ({ matches: [] }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const commitment: Commitment = {
  id: 'c1',
  name: 'Test commitment',
  kind: 'purchase',
  currency: 'SGD',
  status: 'active',
  linked_position_id: null,
  linked_account_id: null,
  note: '',
  created_at: '2026-01-01T00:00:00Z',
  installments: [
    {
      id: 'i1',
      label: '1st',
      description: '',
      due_date: '2026-08-01',
      amount: 30000,
      status: 'upcoming',
      paid_txn_id: null,
    },
  ],
  funding_plan: [
    {
      id: 'w1',
      type: 'windfall',
      label: 'Bonus',
      amount: 30000,
      currency: 'SGD',
      ref_position_id: null,
      sell_quantity: null,
      available_date: null,
      ref_account_id: null,
      repayment_commitment_id: null,
      note: '',
      disabled: false,
      cadence: null,
      status: 'planned',
      realized_txn_id: null,
      value_base: 30000,
    },
  ],
}

const m = {
  onAskLucius: vi.fn(),
  onOpenCommitment: vi.fn(),
  onOpenTxn: vi.fn(),
  updateInstallment: vi.fn(),
  removeInstallment: vi.fn(),
  payInstallment: vi.fn(),
  linkTxn: vi.fn(),
  updateFunding: vi.fn(),
  removeFunding: vi.fn(),
  addFunding: vi.fn(),
  updateAction: vi.fn(),
  addAction: vi.fn(),
  setActionMissed: vi.fn(),
  rename: vi.fn(),
  updateNote: vi.fn(),
  setStatus: vi.fn(),
  deleteCommitment: vi.fn(),
} as unknown as DetailMutations

describe('Funding bar parity — Funding tab vs. Overview digest', () => {
  it('translates the empty overview and keeps navigation working', () => {
    const goTo = vi.fn()
    render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}><OverviewTab
      commitment={{ ...commitment, installments: [], funding_plan: [] }}
      fx={{ SGD: 1 }} envelope={null} positions={{}} goTo={goTo} m={m}
    /></IntlProvider>)
    expect(screen.getByText('下次付款')).toBeTruthy()
    expect(screen.getByText('所有付款均已完成。')).toBeTruthy()
    fireEvent.click(screen.getByText('完整计划'))
    expect(goTo).toHaveBeenCalledWith('schedule')
  })

  it('translates action controls while keeping the user label and action id', () => {
    const updateAction = vi.fn()
    render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}><OverviewTab
      commitment={{ ...commitment, actions: [{
        id: 'a1', label: 'Synthetic custom action', category: '', due_date: '2099-01-01',
        start_by: null, amount: null, currency: 'SGD', status: 'pending', counterparty: '',
        note: '', funding_id: null, reminder_automation_id: null,
      }] }}
      fx={{ SGD: 1 }} envelope={null} positions={{}} goTo={() => {}} m={{ ...m, updateAction }}
    /></IntlProvider>)
    expect(screen.getByText('Synthetic custom action')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '标记完成' }))
    expect(updateAction).toHaveBeenCalledWith('a1', { status: 'done' })
  })

  it('keeps an unfunded amount inside the money masking element', () => {
    const { container } = render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}><OverviewTab
      commitment={{ ...commitment, funding_plan: [] }}
      fx={{ SGD: 1 }} envelope={null} positions={{}} goTo={() => {}} m={m}
    /></IntlProvider>)
    expect(container.querySelector('.c2-exp-sec-note.bad .money')?.textContent).toBeTruthy()
  })
  it('renders an identical Meter for the same commitment', () => {
    const funding = render(
      <Funding commitment={commitment} fx={{ SGD: 1 }} envelope={null} positions={{}} m={m} />,
    )
    const fundingBarHtml = funding.container.querySelector('.ui-meter')!.outerHTML
    cleanup()

    const overview = render(
      <OverviewTab
        commitment={commitment}
        fx={{ SGD: 1 }}
        envelope={null}
        positions={{}}
        goTo={() => {}}
        m={m}
      />,
    )
    const overviewBarHtml = overview.container.querySelector('.ui-meter')!.outerHTML

    expect(overviewBarHtml).toBe(fundingBarHtml)
  })
})
