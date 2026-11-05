// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, it } from 'vitest'
import type { ReactNode } from 'react'
import messages from './zh-CN.messages.json'
import { useConnectorDescription, useConnectorLongDescription, useCuratedLongDescription } from './useConnectorDescription'

it('localizes known native descriptions while retaining third-party descriptions', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <IntlProvider locale="zh-CN" messages={messages}>{children}</IntlProvider>
  const { result } = renderHook(() => useConnectorDescription(), { wrapper })
  expect(result.current('plaid', 'source description', false)).toContain('美国')
  expect(result.current('plaid', 'server supplied', true)).toBe('server supplied')
  expect(result.current('unknown', 'external description', false)).toBe('external description')
})

it('preserves native read-only guarantees in Chinese descriptions', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <IntlProvider locale="zh-CN" messages={messages}>{children}</IntlProvider>
  const { result } = renderHook(() => useConnectorLongDescription(), { wrapper })
  expect(result.current('ibkr', '', false)).toContain('不能下单')
  expect(result.current('plaid', 'untrusted server copy', true)).toBe('untrusted server copy')
})

it('retains real-money and testnet distinctions in curated descriptions', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <IntlProvider locale="zh-CN" messages={messages}>{children}</IntlProvider>
  const { result } = renderHook(() => useCuratedLongDescription(), { wrapper })
  expect(result.current('mcp-public', '')).toContain('每笔订单均使用真实资金')
  expect(result.current('mcp-bybit', '')).toContain('BYBIT_TESTNET=true')
  expect(result.current('unknown', 'server supplied')).toBe('server supplied')
})
