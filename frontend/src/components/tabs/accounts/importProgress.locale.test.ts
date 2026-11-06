import { expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import messages from './zh-CN.messages.json'
import { progressPhaseLabel } from './importHelpers'

it('localizes known progress while preserving an unknown server label', () => {
  const intl = createIntl({ locale: 'zh-CN', messages })
  expect(progressPhaseLabel('read', 2, 5, undefined, intl)).toBe('正在读取第 2 页，共 5 页')
  expect(progressPhaseLabel('future_stage', null, null, 'Provider status', intl)).toBe('Provider status')
  expect(progressPhaseLabel('readPage', null, null, 'Provider status', intl)).toBe('Provider status')
})
