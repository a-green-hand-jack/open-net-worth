import type { IntlShape } from 'react-intl'
import { ASSET_CLASS_LABEL } from '../../../utils/constants'

export function assetClassLabel(intl: IntlShape, key: string): string {
  const { formatMessage } = intl
  switch (key) {
    case 'equity':
      return formatMessage({ id: 'overview.asset.equity', defaultMessage: 'Equities' })
    case 'bond':
      return formatMessage({ id: 'overview.asset.bond', defaultMessage: 'Fixed income' })
    case 'commodity':
      return formatMessage({ id: 'overview.asset.commodity', defaultMessage: 'Commodities' })
    case 'crypto':
      return formatMessage({ id: 'overview.asset.crypto', defaultMessage: 'Crypto' })
    case 'option':
      return formatMessage({ id: 'overview.asset.option', defaultMessage: 'Options' })
    case 'property':
      return formatMessage({ id: 'overview.asset.property', defaultMessage: 'Property' })
    case 'other_asset':
      return formatMessage({ id: 'overview.asset.other', defaultMessage: 'Other assets' })
    case 'receivable':
      return formatMessage({ id: 'overview.asset.receivable', defaultMessage: 'Receivables' })
    case 'cash':
      return formatMessage({ id: 'overview.asset.cash', defaultMessage: 'Cash on hand' })
    case 'fixed_deposit':
      return formatMessage({ id: 'overview.asset.fixedDeposit', defaultMessage: 'Fixed deposits' })
    case 'settlement_cash':
      return formatMessage({ id: 'overview.asset.settlement', defaultMessage: 'Settlement cash' })
    case 'retirement':
      return formatMessage({ id: 'overview.asset.retirement', defaultMessage: 'Retirement cash' })
    case 'credit':
      return formatMessage({ id: 'overview.asset.credit', defaultMessage: 'Credit' })
    case 'loan':
      return formatMessage({ id: 'overview.asset.loan', defaultMessage: 'Loans' })
    default:
      return ASSET_CLASS_LABEL[key] ?? key
  }
}
