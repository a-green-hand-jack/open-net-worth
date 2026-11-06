// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { IntlProvider } from 'react-intl'
import messages from './zh-CN.messages.json'
import { useTradingNotices } from './useTradingNotices'
import { useTradingErrorText } from './useTradingErrorText'
import { TradingRequestError } from '../../../api/trading'

function Probe({ partial = false }: { partial?: boolean }) {
  const notices = useTradingNotices()
  const errorText = useTradingErrorText()
  const fallback = partial ? ['First warning', 'Second warning'] : ['Decision link not recorded']
  const values = notices(
    [
      {
        id: 'trading.notice.decision_missing',
        default_message: 'Decision link not recorded',
        params: {},
      },
    ],
    fallback,
  )
  return (
    <>
      <div>{values.join(' / ')}</div>
      <div>
        {errorText(
          new TradingRequestError(
            'A comparison needs distinct participant runs',
            'trading.error.comparison_distinct',
          ),
        )}
      </div>
      <div>{errorText(new TradingRequestError('Unknown error', 'unknown.id'))}</div>
      <div>
        {errorText(
          new TradingRequestError('Run must be ready to start', 'trading.error.run_state_action', {
            expected: 'ready',
            action: 'start',
          }),
        )}
      </div>
    </>
  )
}

describe('trading structured messages', () => {
  it('translates known notices and errors while retaining unknown errors', () => {
    render(
      <IntlProvider locale="zh-CN" messages={messages} onError={() => {}}>
        <Probe />
      </IntlProvider>,
    )
    expect(screen.getByText('未记录决策链接')).toBeTruthy()
    expect(screen.getByText('比较需要不同的参与运行。')).toBeTruthy()
    expect(screen.getByText('Unknown error')).toBeTruthy()
    expect(screen.getByText('启动前，运行必须处于就绪状态。')).toBeTruthy()
  })
  it('retains all original warnings when structured data is incomplete', () => {
    render(
      <IntlProvider locale="zh-CN" messages={messages} onError={() => {}}>
        <Probe partial />
      </IntlProvider>,
    )
    expect(screen.getByText('First warning / Second warning')).toBeTruthy()
  })
})
