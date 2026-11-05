import { defineMessages, type IntlShape } from 'react-intl'
import type { FactPrompt } from './assetCategoryRules'

const labels = defineMessages({
  kept: { id: 'assets.fact.kept', defaultMessage: 'Where it’s kept' },
  address: { id: 'assets.fact.address', defaultMessage: 'Address or unit' },
  tenure: { id: 'assets.fact.tenure', defaultMessage: 'Tenure' },
  area: { id: 'assets.fact.area', defaultMessage: 'Floor area' },
  tenant: { id: 'assets.fact.tenant', defaultMessage: 'Tenanted' },
  plate: { id: 'assets.fact.plate', defaultMessage: 'Plate number' },
  coe: { id: 'assets.fact.coe', defaultMessage: 'COE expires' },
  odo: { id: 'assets.fact.odo', defaultMessage: 'Mileage' },
  ref: { id: 'assets.fact.ref', defaultMessage: 'Brand & reference' },
  serial: { id: 'assets.fact.serial', defaultMessage: 'Serial number' },
  papers: { id: 'assets.fact.papers', defaultMessage: 'Box & papers' },
  artist: { id: 'assets.fact.artist', defaultMessage: 'Artist' },
  medium: { id: 'assets.fact.medium', defaultMessage: 'Medium & year' },
  prov: { id: 'assets.fact.prov', defaultMessage: 'Provenance' },
  weight: { id: 'assets.fact.weight', defaultMessage: 'Weight' },
  purity: { id: 'assets.fact.purity', defaultMessage: 'Purity' },
  form: { id: 'assets.fact.form', defaultMessage: 'Form & serial' },
  insurer: { id: 'assets.fact.insurer', defaultMessage: 'Insurer' },
  polno: { id: 'assets.fact.polno', defaultMessage: 'Policy number' },
  sumass: { id: 'assets.fact.sumass', defaultMessage: 'Sum assured' },
  premium: { id: 'assets.fact.premium', defaultMessage: 'Premium' },
  detail: { id: 'assets.fact.detail', defaultMessage: 'Detail' },
})

const placeholders = defineMessages({
  kept: {
    id: 'assets.factPlaceholder.kept',
    defaultMessage: 'Home safe / bank vault / on the wall',
  },
  address: { id: 'assets.factPlaceholder.address', defaultMessage: '#14-02, 88 Marina Rise' },
  tenure: { id: 'assets.factPlaceholder.tenure', defaultMessage: 'Freehold / 99-yr' },
  area: { id: 'assets.factPlaceholder.area', defaultMessage: '1,184 sqft' },
  tenant: { id: 'assets.factPlaceholder.tenant', defaultMessage: 'No / S$3,800 pm' },
  plate: { id: 'assets.factPlaceholder.plate', defaultMessage: 'SLA 4417 X' },
  coe: { id: 'assets.factPlaceholder.coe', defaultMessage: 'Feb 2032' },
  odo: { id: 'assets.factPlaceholder.odo', defaultMessage: '41,200 km' },
  ref: { id: 'assets.factPlaceholder.ref', defaultMessage: 'Rolex 124060' },
  serial: { id: 'assets.factPlaceholder.serial', defaultMessage: 'optional' },
  papers: { id: 'assets.factPlaceholder.papers', defaultMessage: 'Yes / No' },
  artist: { id: 'assets.factPlaceholder.artist', defaultMessage: 'Tan Swie Hian' },
  medium: { id: 'assets.factPlaceholder.medium', defaultMessage: 'Ink on paper, 1998' },
  prov: { id: 'assets.factPlaceholder.prov', defaultMessage: 'Gallery invoice 2021' },
  weight: { id: 'assets.factPlaceholder.weight', defaultMessage: '300 g' },
  purity: { id: 'assets.factPlaceholder.purity', defaultMessage: '999.9' },
  form: { id: 'assets.factPlaceholder.form', defaultMessage: '3 × 100g PAMP bars' },
  insurer: { id: 'assets.factPlaceholder.insurer', defaultMessage: 'Great Eastern' },
  polno: { id: 'assets.factPlaceholder.polno', defaultMessage: 'GE-4471-2093' },
  sumass: { id: 'assets.factPlaceholder.sumass', defaultMessage: 'S$60,000' },
  premium: { id: 'assets.factPlaceholder.premium', defaultMessage: 'S$3,600 / yr' },
  detail: { id: 'assets.factPlaceholder.detail', defaultMessage: 'optional' },
})

export function factLabel(intl: IntlShape, [label, key]: FactPrompt): string {
  return Object.hasOwn(labels, key) ? intl.formatMessage(labels[key as keyof typeof labels]) : label
}

export function factPlaceholder(intl: IntlShape, [, key, placeholder]: FactPrompt): string {
  return Object.hasOwn(placeholders, key)
    ? intl.formatMessage(placeholders[key as keyof typeof placeholders])
    : placeholder
}
