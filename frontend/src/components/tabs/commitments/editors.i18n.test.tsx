// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { describe, expect, it, vi } from 'vitest'
import messages from '../../../i18n/zh-CN.json'
import { EditRow } from './editors'

describe('commitment inline editor language', () => {
  it('shows Chinese labels and controls when Chinese is selected', () => {
    render(<IntlProvider locale="zh-CN" messages={messages}>
      <EditRow draft={{ label: '', amount: '' }} setDraft={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} onDelete={vi.fn()} descKey="note" ccy="USD" />
    </IntlProvider>)
    expect(screen.getByPlaceholderText('标签')).toBeTruthy()
    expect(screen.getByPlaceholderText('金额（USD）')).toBeTruthy()
    expect(screen.getByPlaceholderText('说明（可选）')).toBeTruthy()
    expect(screen.getByRole('button', { name: '保存' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '删除' })).toBeTruthy()
  })
})
