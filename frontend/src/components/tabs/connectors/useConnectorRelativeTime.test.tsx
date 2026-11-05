// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import messages from './zh-CN.messages.json'
import { useConnectorRelativeTime } from './useConnectorRelativeTime'

it('formats elapsed provider status in Chinese', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
  const wrapper = ({ children }: { children: ReactNode }) => <IntlProvider locale="zh-CN" messages={messages}>{children}</IntlProvider>
  const { result } = renderHook(() => useConnectorRelativeTime(), { wrapper })
  expect(result.current('2026-01-01T11:58:00Z')).toContain('2分钟')
  expect(result.current(null)).toBe('从未')
  vi.useRealTimers()
})
