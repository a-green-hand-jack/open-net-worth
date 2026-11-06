import { defineMessages, type IntlShape } from 'react-intl'
import type { AssetCategory } from '../../../types/assets'
import type { ClassCardModel } from './assetsData'

const labels = defineMessages({
  property: { id: 'assets.category.property', defaultMessage: 'Property' },
  vehicle: { id: 'assets.category.vehicle', defaultMessage: 'Vehicle' },
  watch: { id: 'assets.category.watch', defaultMessage: 'Watch & jewellery' },
  art: { id: 'assets.category.art', defaultMessage: 'Art & collectibles' },
  metal: { id: 'assets.category.metal', defaultMessage: 'Precious metals' },
  policy: { id: 'assets.category.policy', defaultMessage: 'Insurance & endowments' },
  other: { id: 'assets.category.other', defaultMessage: 'Other' },
})

const plurals = defineMessages({
  property: { id: 'assets.categoryPlural.property', defaultMessage: 'Property' },
  vehicle: { id: 'assets.categoryPlural.vehicle', defaultMessage: 'Vehicles' },
  watch: { id: 'assets.categoryPlural.watch', defaultMessage: 'Watches & jewellery' },
  art: { id: 'assets.categoryPlural.art', defaultMessage: 'Art & collectibles' },
  metal: { id: 'assets.categoryPlural.metal', defaultMessage: 'Precious metals' },
  policy: { id: 'assets.categoryPlural.policy', defaultMessage: 'Insurance & endowments' },
  other: { id: 'assets.categoryPlural.other', defaultMessage: 'Other' },
})

const classNames = defineMessages({
  cash: { id: 'assets.class.cash', defaultMessage: 'Cash & Savings' },
  investments: { id: 'assets.class.investments', defaultMessage: 'Investments' },
  retirement: { id: 'assets.class.retirement', defaultMessage: 'Retirement' },
  receivable: { id: 'assets.class.receivable', defaultMessage: 'Receivables' },
  debt: { id: 'assets.class.debt', defaultMessage: 'Debt' },
})
const classDescriptions = defineMessages({
  cash: { id: 'assets.class.cashDescription', defaultMessage: 'Bank & e-wallet accounts' },
  investments: {
    id: 'assets.class.investmentsDescription',
    defaultMessage: 'Non-retirement brokerage & crypto',
  },
  retirement: { id: 'assets.class.retirementDescription', defaultMessage: 'Retirement accounts' },
  receivable: { id: 'assets.class.receivableDescription', defaultMessage: 'Money owed to you' },
  debt: { id: 'assets.class.debtDescription', defaultMessage: 'Money you owe' },
})
const classShortNames = defineMessages({
  cash: { id: 'assets.classShort.cash', defaultMessage: 'Cash' },
  investments: { id: 'assets.classShort.investments', defaultMessage: 'Investments' },
  retirement: { id: 'assets.classShort.retirement', defaultMessage: 'Retirement' },
  receivable: { id: 'assets.classShort.receivable', defaultMessage: 'Receivables' },
  debt: { id: 'assets.classShort.debt', defaultMessage: 'Debt' },
})

export const assetClassName = (intl: IntlShape, key: ClassCardModel['key']) =>
  intl.formatMessage(classNames[key])
export const assetClassDescription = (intl: IntlShape, key: ClassCardModel['key']) =>
  intl.formatMessage(classDescriptions[key])
export const assetClassShortName = (intl: IntlShape, key: ClassCardModel['key']) =>
  intl.formatMessage(classShortNames[key])

export function assetCategoryLabel(intl: IntlShape, category: AssetCategory): string {
  if (!category.custom && Object.hasOwn(labels, category.key)) {
    return intl.formatMessage(labels[category.key as keyof typeof labels])
  }
  return category.label
}

export function assetCategoryPlural(intl: IntlShape, category: AssetCategory): string {
  if (!category.custom && Object.hasOwn(plurals, category.key)) {
    return intl.formatMessage(plurals[category.key as keyof typeof plurals])
  }
  return category.plural
}
