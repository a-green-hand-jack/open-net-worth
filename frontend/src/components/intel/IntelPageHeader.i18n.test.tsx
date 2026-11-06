// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import { IntelPageHeader } from './IntelPageHeader'
import { ScanConfirmModal } from './ScanConfirmModal'
import messages from './zh-CN.messages.json'
import commonMessages from '../../i18n/zh-CN.json'

afterEach(cleanup)
it('shows scan controls and the quota warning in Chinese', () => {
  const scan = vi.fn()
  const view = render(<IntlProvider locale="zh-CN" messages={{ ...commonMessages, ...messages }}><IntelPageHeader scanning={false} onScan={scan} /></IntlProvider>)
  expect(screen.getByRole('heading', { name: '情报' })).toBeTruthy()
  view.rerender(<IntlProvider locale="zh-CN" messages={{ ...commonMessages, ...messages }}><ScanConfirmModal open onCancel={vi.fn()} onConfirm={scan} /></IntlProvider>)
  expect(screen.getByText(/计入您的搜索配额/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '立即扫描' }))
  expect(scan).toHaveBeenCalledOnce()
})
