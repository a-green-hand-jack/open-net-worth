// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, it } from 'vitest'
import type { ReactNode } from 'react'
import messages from './zh-CN.messages.json'
import { useConnectorActionMessage } from './useConnectorActionMessage'

it('warns in Chinese when the live bot did not confirm a settings change', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <IntlProvider locale="zh-CN" messages={messages}>{children}</IntlProvider>
  const { result } = renderHook(() => useConnectorActionMessage(), { wrapper })
  const message = result.current({ ok: true, unconfirmed: true, message: 'fallback' }, 'Telegram', false)
  expect(message).toContain('未确认')
  expect(message).toContain('旧配置')
  expect(message).toContain('断开')
})
