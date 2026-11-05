// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { catalogs } from '../../../../i18n/catalogs'
import { SearchFetchCostPanel } from './SearchFetchCostPanel'

afterEach(cleanup)

it('shows translated labels and preserves the synthetic cost total', () => {
  render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
    <SearchFetchCostPanel rows={[["Synthetic A", 1.25, 2], ["Synthetic B", 0.5, 1]]}
      formatCost={(value) => `US$${value.toFixed(2)}`} periodLabel="今天" />
  </IntlProvider>)
  expect(screen.getByText('搜索与抓取')).toBeTruthy()
  expect(screen.getByText('预计总额 · 今天')).toBeTruthy()
  expect(screen.getByText('US$1.75')).toBeTruthy()
  expect(screen.getByText('Synthetic A')).toBeTruthy()
})
