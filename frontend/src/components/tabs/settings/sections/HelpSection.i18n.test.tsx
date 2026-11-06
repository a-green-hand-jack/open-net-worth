// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../../i18n/LocaleProvider'

const { navigate, requestOpen, openReportProblem } = vi.hoisted(() => ({
  navigate: vi.fn(), requestOpen: vi.fn(), openReportProblem: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('../../../../state/chatComposer', () => ({ useChatComposerOptional: () => ({ requestOpen }) }))
vi.mock('../../../../state/reportProblem', () => ({ openReportProblem }))

import { HelpSection } from './HelpSection'

afterEach(cleanup)

it('shows Chinese help controls while retaining navigation and feedback review', () => {
  render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}><HelpSection /></IntlProvider>)
  expect(screen.getByText('帮助中心')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '打开' }))
  expect(navigate).toHaveBeenCalledWith({ to: '/help' })
  expect(screen.getByRole('link', { name: '访问' }).getAttribute('href')).toBe('https://docs.opennetworth.ai')
  fireEvent.click(screen.getByRole('button', { name: '询问 Lucius' }))
  expect(requestOpen).toHaveBeenCalledWith(true)
  fireEvent.click(screen.getByRole('button', { name: '发送反馈…' }))
  expect(openReportProblem).toHaveBeenCalledOnce()
})
