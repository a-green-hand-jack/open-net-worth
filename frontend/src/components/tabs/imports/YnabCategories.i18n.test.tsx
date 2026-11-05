// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import messages from './zh-CN.messages.json'
import { PREVIEW } from './importsFixtures'
import { Categories } from './YnabCategories'

afterEach(cleanup)
it('translates category choices without changing user category names', () => {
  render(<IntlProvider locale="zh-CN" messages={messages}><Categories preview={PREVIEW} catLinks={{}} proposals={{}} checking={false} onChoose={vi.fn()} /></IntlProvider>)
  expect(screen.getByText('YNAB 类别')).toBeTruthy()
  expect(screen.getByText('Rent')).toBeTruthy()
  expect(screen.getByText('匹配您的组 Bills')).toBeTruthy()
  expect(screen.getByLabelText('Rent 在此处的类别')).toBeTruthy()
})
