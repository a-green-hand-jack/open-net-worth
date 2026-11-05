// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { IntlProvider } from 'react-intl'
import { OnboardingWizard } from './OnboardingWizard'
import messages from './firstrun/zh-CN.messages.json'
import common from '../i18n/zh-CN.json'
import accounts from './tabs/accounts/zh-CN.messages.json'

afterEach(cleanup)

it('shows the password setup in Chinese without changing its optional behavior', async () => {
  render(
    <IntlProvider locale="zh-CN" messages={{ ...common, ...accounts, ...messages }}>
      <OnboardingWizard
        onDone={vi.fn()}
        onOpenChat={vi.fn()}
        authRequired={false}
        onAuthChanged={vi.fn()}
        onProfileChanged={vi.fn()}
      />
    </IntlProvider>,
  )
  expect(screen.getByText('欢迎使用 Open Net Worth')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '开始' }))
  expect(await screen.findByLabelText('新密码')).toBeTruthy()
  expect(screen.getByRole('button', { name: '跳过，不设密码' })).toBeTruthy()
})
