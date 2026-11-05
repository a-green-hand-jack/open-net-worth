// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import zh from '../../../i18n/zh-CN.json'
import { RecordOptionModal } from './RecordOptionModal'

vi.mock('../../../state/queryCache', () => ({ fetchCachedQuery: () => Promise.resolve([]) }))
vi.mock('../../../api/client', () => ({
  authFetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
}))
afterEach(cleanup)
it('keeps the preset key and localizes validation in Chinese', () => {
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <RecordOptionModal onClose={vi.fn()} onDone={vi.fn()} />
    </IntlProvider>,
  )
  const strategy = screen.getByLabelText('策略') as HTMLSelectElement
  expect(strategy.value).toBe('covered_call')
  fireEvent.click(screen.getByRole('button', { name: '记录期权' }))
  expect(screen.getByText('请选择标的。')).toBeTruthy()
})
