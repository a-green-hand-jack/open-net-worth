// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import messages from './visible-scan.zh-CN.messages.json'
import { ColorDot } from './budgetParts'

afterEach(cleanup)
it('localizes the default category color label and retains custom labels', () => {
  render(<IntlProvider locale="zh-CN" messages={messages} onError={() => {}}>
    <ColorDot color="#ffffff" onPick={vi.fn()} />
    <ColorDot color="#000000" onPick={vi.fn()} label="Custom category" />
  </IntlProvider>)
  expect(screen.getByRole('button', { name: '设置类别颜色' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Custom category' })).toBeTruthy()
})
