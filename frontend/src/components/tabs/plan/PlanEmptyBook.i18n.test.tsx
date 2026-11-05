import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IntlProvider } from 'react-intl'
import { PlanEmptyBook } from './PlanEmptyBook'
import messages from './zh-CN.messages.json'
import commonMessages from '../../../i18n/zh-CN.json'

describe('Plan empty book language', () => {
  it('renders translated actions without translating supplied content', () => {
    const html = renderToStaticMarkup(
      <IntlProvider locale="zh-CN" messages={{ ...commonMessages, ...messages }}>
        <PlanEmptyBook
          icon={null}
          title="User title"
          body="User body"
          onAddAccount={() => {}}
          onAskLucius={() => {}}
        />
      </IntlProvider>,
    )
    expect(html).toContain('添加账户')
    expect(html).toContain('通过 Lucius 添加')
    expect(html).toContain('User title')
  })
})
