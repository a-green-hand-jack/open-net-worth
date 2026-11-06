// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, it } from 'vitest'
import type { ReactNode } from 'react'
import messages from './zh-CN.messages.json'
import { useConnectorPrompt } from './useConnectorPrompts'

it('localizes built-in suggested prompts without rewriting custom text', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <IntlProvider locale="zh-CN" messages={messages}>{children}</IntlProvider>
  const { result } = renderHook(() => useConnectorPrompt(), { wrapper })
  expect(result.current('plaid', 0, 'Reconnect my bank account')).toBe('重新连接我的银行账户')
  expect(result.current('plaid', 0, 'A custom prompt')).toBe('A custom prompt')
})
