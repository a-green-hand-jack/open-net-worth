import { createIntl } from 'react-intl'
import { expect, it } from 'vitest'
import { guidedFactsFor } from './assetCategoryRules'
import { factLabel, factPlaceholder } from './factCopy'

it('keeps English guided presentation aligned with the canonical stored prompts', () => {
  const intl = createIntl({ locale: 'en', defaultLocale: 'en' })
  for (const category of [
    'property',
    'vehicle',
    'watch',
    'art',
    'metal',
    'policy',
    'other',
    'c_custom',
  ]) {
    for (const prompt of guidedFactsFor(category)) {
      expect(factLabel(intl, prompt)).toBe(prompt[0])
      expect(factPlaceholder(intl, prompt)).toBe(prompt[2])
    }
  }
})
