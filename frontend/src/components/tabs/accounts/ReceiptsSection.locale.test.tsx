// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../i18n/catalogs'

const unlink = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('../../../hooks/useTransactionReceipts', () => ({
  useTransactionReceipts: () => ({
    status: 'ok',
    receipts: [
      {
        receiptId: 'receipt-1',
        filename: 'example.pdf',
        mediaType: 'application/pdf',
        createdAt: '',
      },
    ],
    upload: vi.fn(),
    unlink,
    refresh: vi.fn(),
  }),
}))
vi.mock('./TxnDetail', () => ({ fmtDay: () => '' }))
vi.mock('./ReceiptViewer', () => ({ ReceiptViewer: () => null }))
import { ReceiptsSection } from './ReceiptsSection'

afterEach(cleanup)

it('localizes receipt actions while preserving the filename and unlink target', async () => {
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <ReceiptsSection txnId="txn-1" />
    </IntlProvider>,
  )
  expect(screen.getByText('收据（1）')).toBeTruthy()
  expect(screen.getByText('example.pdf')).toBeTruthy()
  fireEvent.click(screen.getByText('移除'))
  fireEvent.click(screen.getByText('确认'))
  await waitFor(() => expect(unlink).toHaveBeenCalledWith('receipt-1'))
})
