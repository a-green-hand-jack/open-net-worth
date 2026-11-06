import { createIntl, createIntlCache } from 'react-intl'
import { describe, expect, it } from 'vitest'
import type { ConversationMeta } from '../../hooks/useConversations'
import zh from '../../i18n/zh-CN.json'
import { displayConversationTitle } from './conversationTitle'

describe('conversation placeholder titles', () => {
  it('translates only the marked placeholder, preserving an identical user title', () => {
    const intl = createIntl({ locale: 'zh-CN', messages: zh }, createIntlCache())
    const conv = {
      id: '1',
      title: 'New conversation',
      titleSource: 'placeholder',
    } as ConversationMeta
    expect(displayConversationTitle(conv, intl)).toBe('新对话')
    expect(displayConversationTitle({ ...conv, titleSource: 'user' }, intl)).toBe(
      'New conversation',
    )
    expect(displayConversationTitle({ ...conv, titleSource: 'auto' }, intl)).toBe(
      'New conversation',
    )
    const onboarding = { ...conv, title: 'Onboarding to Open Net Worth' }
    expect(displayConversationTitle({ ...onboarding, titleSource: 'onboarding' }, intl)).toBe(
      'Open Net Worth 入门',
    )
    expect(displayConversationTitle({ ...onboarding, titleSource: 'auto' }, intl)).toBe(
      'Onboarding to Open Net Worth',
    )
    expect(displayConversationTitle({ ...onboarding, titleSource: 'user' }, intl)).toBe(
      'Onboarding to Open Net Worth',
    )
  })
})
