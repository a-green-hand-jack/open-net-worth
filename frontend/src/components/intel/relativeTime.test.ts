import { afterEach, expect, it, vi } from 'vitest'
import { createIntl } from 'react-intl'
import { intelTimeAgo } from './relativeTime'

afterEach(() => vi.useRealTimers())
it('formats elapsed time in the selected language without changing the age', () => {
  vi.useFakeTimers().setSystemTime(new Date('2026-11-05T12:00:00Z'))
  expect(intelTimeAgo('2026-11-05T11:58:00Z', createIntl({ locale: 'en' }))).toBe('2m ago')
  expect(intelTimeAgo('2026-11-05T11:58:00Z', createIntl({ locale: 'zh-CN' }))).toBe('2分钟前')
  expect(intelTimeAgo('invalid', createIntl({ locale: 'zh-CN' }))).toBe('')
})
