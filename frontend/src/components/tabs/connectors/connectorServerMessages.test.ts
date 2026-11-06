import { createIntl, createIntlCache } from 'react-intl'
import { describe, expect, it } from 'vitest'
import zh from './zh-CN.messages.json'
import { formatConnectorBody, formatConnectorServerMessage } from './connectorServerMessages'

const intl = createIntl({ locale: 'zh-CN', messages: zh }, createIntlCache())
describe('connector application errors', () => {
  it('preserves the Telegram safety refusal in Chinese', () => {
    const text = formatConnectorServerMessage(
      intl,
      { id: 'connector.error.telegramStop', params: {} },
      'raw',
    )
    expect(text).toContain('未清除其凭据')
    expect(text).toContain('仍在运行')
  })
  it('preserves provider details for unknown or malformed metadata', () => {
    expect(
      formatConnectorServerMessage(intl, { id: 'provider.future', params: {} }, 'provider detail'),
    ).toBe('provider detail')
    expect(
      formatConnectorServerMessage(
        intl,
        { id: 'connector.error.alwaysOn', params: { connector: 123 } },
        'raw',
      ),
    ).toBe('raw')
  })
  it('translates identified Plaid errors but preserves external details', () => {
    expect(
      formatConnectorBody(
        intl,
        { detail: 'raw', message_id: 'connector.error.plaidBankNotLinked', message_params: {} },
        'fallback',
      ),
    ).toBe('该银行尚未关联。')
    expect(formatConnectorBody(intl, { detail: 'provider says reconnect' }, 'fallback')).toBe(
      'provider says reconnect',
    )
  })
  it('translates an identified GoCardless error', () => {
    expect(formatConnectorBody(intl, {
      detail: 'That bank is not linked',
      message_id: 'connector.error.goCardlessBankNotLinked',
      message_params: {},
    }, 'fallback')).toBe('该银行未关联')
  })
  it('translates MCP application errors while retaining the server identifier', () => {
    expect(formatConnectorBody(intl, {
      detail: 'unknown mcp server: local',
      message_id: 'connector.error.mcpUnknown',
      message_params: { server: 'local' },
    }, 'fallback')).toBe('未知 MCP 服务器：local')
  })
})
