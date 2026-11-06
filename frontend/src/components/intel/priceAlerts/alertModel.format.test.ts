import { afterEach, expect, it } from 'vitest'
import { setDisplayFormats } from '../../../utils/format'
import { draftFromRecord, draftToBody, fmt } from './alertModel'

afterEach(() => setDisplayFormats({ number_format: null }))

it('formats alert prices using the profile without changing saved numeric thresholds', () => {
  setDisplayFormats({ number_format: 'dot' })
  expect(fmt(1234.5)).toBe('1.234,50')
  const draft = draftFromRecord({ kind: 'price', op: '>=', value: 1234.5 })
  expect(draftToBody(draft).value).toBe(1234.5)
})
