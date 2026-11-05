// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, it, vi } from 'vitest'
import zh from '../i18n/zh-CN.json'
import { ErrorBoundary } from './ErrorBoundary'

it('translates the fallback controls and preserves the original error', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const Broken = (): never => {
    throw new Error('external diagnostic')
  }
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <ErrorBoundary label="应用">
        <Broken />
      </ErrorBoundary>
    </IntlProvider>,
  )
  expect(screen.getByRole('alert').textContent).toContain('应用出现问题。')
  expect(screen.getByText('external diagnostic')).toBeTruthy()
  expect(screen.getByRole('button', { name: '重试' })).toBeTruthy()
  log.mockRestore()
})
