import { defineMessages, type IntlShape } from 'react-intl'

const classLabels = defineMessages({
  equity: { id: 'investments.class.equity', defaultMessage: 'Equities' },
  bond: { id: 'investments.class.bond', defaultMessage: 'Fixed income' },
  commodity: { id: 'investments.class.commodity', defaultMessage: 'Commodities' },
  crypto: { id: 'investments.class.crypto', defaultMessage: 'Crypto' },
  option: { id: 'investments.class.option', defaultMessage: 'Options' },
  property: { id: 'investments.class.property', defaultMessage: 'Property' },
  other_asset: { id: 'investments.class.otherAsset', defaultMessage: 'Other assets' },
  receivable: { id: 'investments.class.receivable', defaultMessage: 'Receivables' },
  cash: { id: 'investments.class.cash', defaultMessage: 'Cash on hand' },
  fixed_deposit: { id: 'investments.class.fixedDeposit', defaultMessage: 'Fixed deposits' },
  settlement_cash: { id: 'investments.class.settlementCash', defaultMessage: 'Settlement cash' },
  retirement: { id: 'investments.class.retirement', defaultMessage: 'Retirement cash' },
  credit: { id: 'investments.class.credit', defaultMessage: 'Credit' },
  loan: { id: 'investments.class.loan', defaultMessage: 'Loans' },
})

export function investmentClassLabel(cls: string, fallback: string, intl: IntlShape): string {
  const descriptor = classLabels[cls as keyof typeof classLabels]
  return descriptor ? intl.formatMessage(descriptor) : fallback
}
