// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it } from 'vitest'
import messages from '../../scan2.zh-CN.messages.json'
import { FileDropMask } from './FileDropMask'

afterEach(cleanup)
it('shows a translated attachment drop instruction', () => {
  render(<IntlProvider locale="zh-CN" messages={messages}><FileDropMask /></IntlProvider>)
  expect(screen.getByText('拖放文件以附加')).toBeTruthy()
})
