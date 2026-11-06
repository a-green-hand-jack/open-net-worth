// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import messages from './zh-CN.messages.json'
import common from '../../../i18n/zh-CN.json'
import accounts from '../accounts/zh-CN.messages.json'
import { PREVIEW } from './importsFixtures'
import { YnabReview } from './YnabReview'

vi.mock('./runs', async (load) => ({
  ...(await load<typeof import('./runs')>()),
  useRun: () => ({ data: { status: 'done', preview: PREVIEW, plan_id: 'p1' } }),
}))
afterEach(cleanup)
it('explains currency changes in Chinese while preserving plan details', () => {
  render(<IntlProvider locale="zh-CN" messages={{ ...common, ...accounts, ...messages }}><YnabReview runId="r1" planLabel="Household" onClose={vi.fn()} onStarted={vi.fn()} /></IntlProvider>)
  expect(screen.getByText('导入 Household')).toBeTruthy()
  expect(screen.getByText('账本的基准货币将从 SGD 更改为 USD。')).toBeTruthy()
  expect(screen.getByText('Checking')).toBeTruthy()
})
