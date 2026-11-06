// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import messages from './zh-CN.messages.json'
import { useStatementSkipReason } from './useStatementSkipReason'
import { mapServerPreview } from './importHelpers'

afterEach(cleanup)

it('preserves both structured skip paths and translates known IDs with raw parameters', () => {
  const structured = { id: 'statement.skip.status', params: { status: 'PENDING' } }
  const fromDecision = mapServerPreview({ rows: [{ index: 0, skip: true, skip_reason: "status 'PENDING' (not completed)", skip_reason_message: structured }] } as never)
  const fromLegacy = mapServerPreview({ skip_samples: [{ line: 1, reason: "status 'PENDING' (not completed)", reason_message: structured }] } as never)
  expect(fromDecision.skipped[0]?.reason_message).toEqual(structured)
  expect(fromLegacy.skipped[0]?.reason_message).toEqual(structured)
  function Reasons() {
    const reason = useStatementSkipReason()
    return <><span>{reason(fromDecision.skipped[0]!)}</span><span>{reason({ reason: 'external detail', reason_message: { id: 'statement.skip.future' } })}</span><span>{reason({ reason: "No account named 'My Account'.", reason_message: { id: 'statement.skip.account_named', params: { name: 'My Account' } } })}</span></>
  }
  render(<IntlProvider locale="zh-CN" messages={messages}><Reasons /></IntlProvider>)
  expect(screen.getByText('状态为“PENDING”（未完成）')).toBeTruthy()
  expect(screen.getByText('external detail')).toBeTruthy()
  expect(screen.getByText('没有名为“My Account”的账户。')).toBeTruthy()
})

it('keeps the English status fallback wording and parameter', () => {
  function Reason() {
    const reason = useStatementSkipReason()
    return <span>{reason({ reason: "status 'PENDING' (not completed)", reason_message: { id: 'statement.skip.status', params: { status: 'PENDING' } } })}</span>
  }
  render(<IntlProvider locale="en"><Reason /></IntlProvider>)
  expect(screen.getByText("status 'PENDING' (not completed)")).toBeTruthy()
})
