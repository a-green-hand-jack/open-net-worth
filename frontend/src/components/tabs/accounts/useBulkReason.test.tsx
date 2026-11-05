// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import messages from './zh-CN.messages.json'
import { useBulkReason } from './useBulkReason'
import { normalizeBulkResult } from './useAccountsLedger'

afterEach(cleanup)

it('preserves structured skipped reasons and translates only known IDs', () => {
  const result = normalizeBulkResult({ updated: [], skipped: [
    { id: 'a', reason: 'move not supported on transfers', reason_message: { id: 'ledger.bulk.transfer_move', params: {} } },
    { id: 'b', reason: 'provider detail', reason_message: { id: 'ledger.bulk.future', params: {} } },
  ] }, ['a', 'b'])
  function Results() {
    const reason = useBulkReason()
    return <>{result.skipped.map((item) => <span key={item.id}>{reason(item)}</span>)}</>
  }
  render(<IntlProvider locale="zh-CN" messages={messages}><Results /></IntlProvider>)
  expect(screen.getByText('转账不支持移动账户')).toBeTruthy()
  expect(screen.getByText('provider detail')).toBeTruthy()
})
