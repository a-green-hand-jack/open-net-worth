// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, it } from 'vitest'
import type { ReactNode } from 'react'
import messages from './zh-CN.messages.json'
import { useOAuthError } from './useOAuthError'

it('localizes stable OAuth reasons and retains provider details', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <IntlProvider locale="zh-CN" messages={messages}>{children}</IntlProvider>
  const { result } = renderHook(() => useOAuthError(), { wrapper })
  expect(result.current('no_registration', 'fallback')).toContain('无法自动创建')
  expect(result.current('dcr_rejected', 'provider detail')).toBe('provider detail')
  expect(result.current('start_http', 'fallback', 503)).toBe('无法启动登录（503）')
})
