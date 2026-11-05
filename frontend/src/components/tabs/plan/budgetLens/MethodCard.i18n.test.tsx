import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { IntlProvider } from 'react-intl'
import { MethodCard } from './MethodCard'
import { METHODS } from './methodsData'
import messages from '../zh-CN.messages.json'

describe('budget method translations', () => {
  it('renders the zero-based method and its details in Chinese', () => {
    const method = METHODS.find((item) => item.id === 'zero_based')!
    const html = renderToStaticMarkup(
      <IntlProvider locale="zh-CN" messages={messages}>
        <MethodCard m={method} mode="static" more onMore={() => {}} />
      </IntlProvider>,
    )
    expect(html).toContain('零基预算')
    expect(html).toContain('让每一笔钱都有用途')
    expect(html).toContain('规划每一笔资金')
    expect(html).toContain('每一笔钱均已分配')
  })
})
