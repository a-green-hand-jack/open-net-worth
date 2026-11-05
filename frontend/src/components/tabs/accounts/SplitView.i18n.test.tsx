// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import messages from './visible.zh-CN.messages.json'
import { SplitChip, SplitLines } from './SplitView'

afterEach(cleanup)

it('localizes split controls while preserving user categories and notes', () => {
  const splits = [{ category: 'cat_a', amount: 10, note: 'User note' }, { category: 'missing', amount: 5, note: '' }]
  const catMap = { cat_a: { id: 'cat_a', label: 'User category', color: '#aaa', kind: 'expense' as const } }
  const toggle = vi.fn()
  render(<IntlProvider locale="zh-CN" messages={messages}><SplitChip splits={splits} catMap={catMap} open={false} onToggle={toggle} /><SplitLines splits={splits} catMap={catMap} currency="USD" sign="−" className="test" /></IntlProvider>)
  fireEvent.click(screen.getByRole('button', { name: /User category/ }))
  expect(toggle).toHaveBeenCalledOnce()
  expect(screen.getByTitle('拆分到 2 个类别 — 显示明细')).toBeTruthy()
  expect(screen.getByText('User note')).toBeTruthy()
  expect(screen.getByText('未分类')).toBeTruthy()
})
