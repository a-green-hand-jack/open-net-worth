import { createIntl, createIntlCache } from 'react-intl'
import { expect, it } from 'vitest'
import zh from '../../../i18n/zh-CN.json'
import { matchingMessage } from './matchingMessages'

it('translates declared reasons without translating embedded user text', () => {
  const intl = createIntl({ locale: 'zh-CN', messages: zh }, createIntlCache())
  expect(
    matchingMessage(
      intl,
      { id: 'matching.shared_reference', params: { token: 'ACME-42' } },
      'original',
    ),
  ).toBe('共同参考号 ACME-42')
  expect(
    matchingMessage(intl, { id: 'matching.wordless', params: { days: 2 } }, 'original'),
  ).toContain('相隔 2 天')
  expect(matchingMessage(intl, { id: 'matching.unknown', params: {} }, 'original')).toBe('original')
  expect(
    matchingMessage(intl, { id: 'matching.wordless', params: { days: 'bad' } }, 'original'),
  ).toBe('original')
})
