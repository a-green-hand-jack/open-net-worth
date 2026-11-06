// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { expect, it, vi } from 'vitest'
import { setDisplayFormats } from '../../../utils/format'
import zh from './zh-CN.messages.json'
import { BulkBar } from './BulkBar'

it('uses the profile number format for the selected transaction count', () => {
  setDisplayFormats({ number_format: 'dot' })
  const noop = vi.fn()
  try {
    render(
      <IntlProvider locale="zh-CN" messages={zh}>
        <BulkBar
          count={1234}
          total={{ amount: 0, currency: null, approx: false }}
          accounts={[]}
          categories={[]}
          railCollapsed={false}
          railWidth={286}
          onClear={noop}
          onCategory={noop}
          onAskLucius={noop}
          onMarkCleared={noop}
          onMarkUncleared={noop}
          onMarkReviewed={noop}
          onHide={noop}
          onUnhide={noop}
          onDuplicate={noop}
          onMemo={noop}
          onMove={noop}
          onExport={noop}
          onDelete={noop}
        />
      </IntlProvider>,
    )
    expect(screen.getByText('1.234 笔交易')).toBeTruthy()
  } finally {
    setDisplayFormats({})
  }
})
