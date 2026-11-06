// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import { DuplicateReview } from './DuplicateReview'
import messages from './zh-CN.messages.json'

vi.mock('../../state/queryCache', () => ({ fetchCachedQuery: vi.fn().mockResolvedValue([]) }))
afterEach(cleanup)
it('explains that flagged transactions were already inserted and can be deleted', () => {
  render(<IntlProvider locale="zh-CN" messages={messages}><DuplicateReview duplicates={[]} onSendMessage={vi.fn()} /></IntlProvider>)
  expect(screen.getByText(/这些交易已入账/)).toBeTruthy()
  expect((screen.getByRole('button', { name: '删除所选项目（0）' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByRole('button', { name: '全部保留' })).toBeTruthy()
})
