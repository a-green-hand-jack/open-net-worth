// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import messages from './zh-CN.messages.json'
import { useAuditLabel } from './useAuditLabel'

afterEach(cleanup)

it('translates known audit labels but preserves names and unknown labels', () => {
  function Labels() {
    const label = useAuditLabel()
    return <><span>{label({ id: 'audit.source.bank', params: {} }, 'Bank feed')}</span><span>{label(null, 'Named Automation')}</span><span>{label({ id: 'audit.future' }, 'Future source')}</span></>
  }
  render(<IntlProvider locale="zh-CN" messages={messages}><Labels /></IntlProvider>)
  expect(screen.getByText('银行同步')).toBeTruthy()
  expect(screen.getByText('Named Automation')).toBeTruthy()
  expect(screen.getByText('Future source')).toBeTruthy()
})
