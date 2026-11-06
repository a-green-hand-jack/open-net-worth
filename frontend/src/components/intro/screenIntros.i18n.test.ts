import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import { screenIntros } from './screenIntros'
import messages from '../firstrun/zh-CN.messages.json'

describe('screen introduction translations', () => {
  it('localizes guidance and the Lucius prefill without changing guide targets', () => {
    const config = screenIntros(createIntl({ locale: 'zh-CN', messages })).accounts
    expect(config.steps[0]?.title).toBe('所有账户，一个账本')
    expect(config.start?.target).toBe('setup-accounts')
    expect(config.lucius).toContain('请帮我设置账户')
  })
})
