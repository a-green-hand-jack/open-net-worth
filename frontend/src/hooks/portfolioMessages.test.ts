import { createIntl, createIntlCache } from 'react-intl'
import { expect, it } from 'vitest'
import zh from '../i18n/zh-CN.json'
import { portfolioMessage } from './portfolioMessages'

it('renders declared portfolio messages while retaining financial inputs and safe fallback', () => {
  const intl = createIntl({ locale: 'zh-CN', messages: zh }, createIntlCache())
  const concentration = {
    id: 'portfolio.concentration',
    params: { name: 'ACME', percent: '50', over: '30', guideline: '20', custom: 'no' },
  }
  expect(portfolioMessage(intl, concentration, 'original')).toContain('ACME 占你的投资组合 50%')
  const income = {
    id: 'portfolio.income',
    params: { symbol: 'ACME', days: 1, amount: 'USD 1,234.56' },
  }
  expect(portfolioMessage(intl, income, 'original')).toContain('USD 1,234.56')
  expect(portfolioMessage(intl, { id: 'unknown', params: {} }, 'original')).toBe('original')
})

it('keeps the existing English wording for generated financial facts', () => {
  const intl = createIntl({ locale: 'en', defaultLocale: 'en' }, createIntlCache())
  expect(
    portfolioMessage(
      intl,
      {
        id: 'portfolio.rebalance',
        params: { count: 1, asset_class: 'equity', drift: '5.0', direction: 'above' },
      },
      'fallback',
    ),
  ).toBe(
    '1 asset class off target. Equities are 5.0 percentage points above your target. Review your target mix.',
  )
  expect(
    portfolioMessage(
      intl,
      {
        id: 'portfolio.vesting',
        params: { symbol: 'ACME', days: 1, value: '$10.00', has_value: 'yes' },
      },
      'fallback',
    ),
  ).toBe('ACME vests in 1 day ($10.00 indicative). Plan for the tax event.')
  expect(
    portfolioMessage(
      intl,
      { id: 'portfolio.income', params: { symbol: 'ACME', days: 2, amount: '$10.00' } },
      'fallback',
    ),
  ).toBe('ACME goes ex-div in 2 days — $10.00 projected.')
})
