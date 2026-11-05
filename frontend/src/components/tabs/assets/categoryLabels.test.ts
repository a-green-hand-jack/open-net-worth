import { createIntl } from 'react-intl'
import { expect, it } from 'vitest'
import zh from '../../../i18n/zh-CN.json'
import { assetCategoryLabel, assetCategoryPlural } from './categoryLabels'

it('translates built-in labels without changing user-created category names', () => {
  const intl = createIntl({ locale: 'zh-CN', messages: zh })
  const category = {
    key: 'property',
    label: 'Property',
    plural: 'Property',
    color: '',
    custom: false,
  }
  expect(assetCategoryLabel(intl, category)).toBe('房产')
  expect(assetCategoryLabel(intl, { ...category, custom: true, label: 'My Home' })).toBe('My Home')
  expect(assetCategoryLabel(intl, { ...category, key: 'unknown', label: 'Custom name' })).toBe(
    'Custom name',
  )
  expect(assetCategoryPlural(intl, { ...category, key: 'vehicle', plural: 'Vehicles' })).toBe(
    '交通工具',
  )
  expect(assetCategoryPlural(intl, { ...category, custom: true, plural: 'My Homes' })).toBe(
    'My Homes',
  )
})
