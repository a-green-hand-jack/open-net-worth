// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { IntlProvider } from 'react-intl'
import zh from '../../../i18n/zh-CN.json'
import { ActivityRows } from './ActivityRows'

afterEach(cleanup)
it('translates activity type and preserves account and transaction details', () => {
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <ActivityRows
        baseCurrency="USD"
        rows={[
          {
            source_id: 'one',
            source_kind: 'test',
            date: '2026-01-01',
            type: 'buy',
            symbol: 'ACME',
            name: 'Acme',
            detail: 'User description',
            account_id: 'a',
            account_name: 'Personal Account',
            amount_base: -100,
            signed: true,
            currency: 'USD',
            instrument_id: null,
            links: {},
          },
        ]}
      />
    </IntlProvider>,
  )
  expect(screen.getByText('买入')).toBeTruthy()
  expect(screen.getByText('User description')).toBeTruthy()
  expect(screen.getByText('Personal Account')).toBeTruthy()
})
