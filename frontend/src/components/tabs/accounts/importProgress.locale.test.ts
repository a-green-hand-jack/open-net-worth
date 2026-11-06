import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import { catalogs } from '../../../i18n/catalogs'
import { progressPhaseLabel } from './importHelpers'

describe('import progress localization', () => {
  it('translates known stages and interpolates page numbers', () => {
    const intl = createIntl({ locale: 'zh-CN', messages: catalogs['zh-CN'] })
    expect(progressPhaseLabel('read', 2, 5, undefined, intl)).toBe('正在读取第 2 页，共 5 页')
    expect(progressPhaseLabel('reconcile', null, null, undefined, intl)).toBe(
      '正在根据账单自身余额核对',
    )
  })
  it('preserves server-provided unknown stage labels and English fallback', () => {
    const intl = createIntl({ locale: 'zh-CN', messages: catalogs['zh-CN'] })
    expect(progressPhaseLabel('new-stage', null, null, 'custom source text', intl)).toBe(
      'custom source text',
    )
    expect(progressPhaseLabel('read', 2, 5)).toBe('Reading page 2 of 5')
  })
})
