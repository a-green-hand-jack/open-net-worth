import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import { catalogs } from '../i18n/LocaleProvider'
import { tooManyAttemptsMessage } from './rateLimit'

describe('authentication rate limit message', () => {
  const en = createIntl({ locale: 'en' })
  const zh = createIntl({ locale: 'zh-CN', messages: catalogs['zh-CN'] })
  it('rounds up retry time and uses the selected language', () => {
    const res = { headers: new Headers({ 'Retry-After': '61' }) }
    expect(tooManyAttemptsMessage(res, en)).toBe('Too many attempts. Try again in 2 minutes.')
    expect(tooManyAttemptsMessage(res, zh)).toBe('尝试次数过多。请在 2 分钟后重试。')
  })
  it('keeps the fifteen-minute fallback when the header is missing', () => {
    expect(tooManyAttemptsMessage({ headers: new Headers() }, zh)).toBe('尝试次数过多。请在 15 分钟后重试。')
  })
})
