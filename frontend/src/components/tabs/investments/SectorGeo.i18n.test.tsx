// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { IntlProvider } from 'react-intl'
import zh from '../../../i18n/zh-CN.json'
import { SectorGeo } from './SectorGeo'
import type { BookRow, DerivedBook } from './useInvestmentsBook'

const row = (sym: string, sector: string, value: number) =>
  ({
    sym,
    name: sym,
    value,
    cls: 'equity',
    sub: '',
    ccy: 'USD',
    _raw: { sector },
  }) as unknown as BookRow
afterEach(cleanup)
it('localizes known sector buckets while keeping external names and values', () => {
  const d = {
    all: [row('ONE', 'Information Technology', 60), row('TWO', 'Custom sector', 40)],
  } as unknown as DerivedBook
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <SectorGeo d={d} />
    </IntlProvider>,
  )
  expect(screen.getByText('科技')).toBeTruthy()
  expect(screen.getByText('Custom sector')).toBeTruthy()
  expect(screen.getAllByText('60%').length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button', { name: '地区' }))
  expect(screen.getAllByText('美国').length).toBeGreaterThan(0)
})
it('does not relabel a mixed bucket that contains an unknown external sector', () => {
  const d = { all: [row('ONE', '', 60), row('TWO', 'Other', 40)] } as unknown as DerivedBook
  render(
    <IntlProvider locale="zh-CN" messages={zh}>
      <SectorGeo d={d} />
    </IntlProvider>,
  )
  expect(screen.getByText('Other')).toBeTruthy()
  expect(screen.getByText('100%')).toBeTruthy()
})
