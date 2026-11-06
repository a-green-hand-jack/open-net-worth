// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import { AlertForm } from './AlertForm'
import messages from '../zh-CN.messages.json'
import common from '../../../i18n/zh-CN.json'

vi.mock('./alertRouting', async (load) => {
  const actual = await load<typeof import('./alertRouting')>()
  return { ...actual, useAlertRouting: () => undefined }
})
afterEach(cleanup)
it('keeps alert direction and notification routing clear in Chinese', () => {
  const save = vi.fn()
  render(<IntlProvider locale="zh-CN" messages={{ ...common, ...messages }}><AlertForm draft={{ id: null, name: '', mode: 'price', op: '>=', value: 90, move: 5, after: '0', channels: [], note: '', enabled: true }} sym="ACME" name="Example" ccy="$" price={100} saving={false} error={null} onCancel={vi.fn()} onSave={save} /></IntlProvider>)
  expect(screen.getByText(/将立即触发提醒/)).toBeTruthy()
  expect(screen.getByText('仅显示在情报中，不会发送到应用外。')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '创建提醒' }))
  expect(save.mock.calls[0]?.[0].op).toBe('>=')
})
