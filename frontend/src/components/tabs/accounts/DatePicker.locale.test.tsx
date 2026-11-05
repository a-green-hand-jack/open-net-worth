// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import messages from './zh-CN.messages.json'
import { AddDateField } from './pickers'

afterEach(cleanup)

it('shows Chinese calendar labels while preserving the selected ISO date', () => {
  const onChange = vi.fn()
  render(<IntlProvider locale="zh-CN" messages={messages}><AddDateField value="2026-11-03" onChange={onChange} advance={vi.fn()} /></IntlProvider>)
  fireEvent.click(screen.getByRole('button', { name: '11/03/2026' }))
  expect(screen.getByText('2026年11月')).toBeTruthy()
  expect(screen.getByRole('button', { name: '今天' })).toBeTruthy()
  fireEvent.mouseDown(screen.getByRole('button', { name: '4' }))
  expect(onChange).toHaveBeenCalledWith('2026-11-04')
})
