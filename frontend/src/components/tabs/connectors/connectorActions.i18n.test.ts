import { expect, it, vi } from 'vitest'
import type { ConnectorDetailEntry } from './model'
import { removeNativeConnector, setConnectorEnabled } from './connectorActions'

const fetchMock = vi.fn()
vi.mock('../../../api/client', () => ({ authFetch: (...args: unknown[]) => fetchMock(...args) }))
const entry = { id: 'telegram', name: 'Telegram' } as ConnectorDetailEntry
it('passes the identified stop refusal through without hiding its safety detail', async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        detail: 'credentials were NOT cleared',
        message_id: 'connector.error.telegramStop',
        message_params: {},
      }),
      { status: 502 },
    ),
  )
  const result = await removeNativeConnector(entry)
  expect(result).toMatchObject({
    ok: false,
    error: 'credentials were NOT cleared',
    serverMessage: { id: 'connector.error.telegramStop', params: {} },
  })
})
it('passes the identified enable refusal through with its parameters', async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        detail: 'raw detail',
        message_id: 'connector.error.alwaysOn',
        message_params: { connector: 'example' },
      }),
      { status: 422 },
    ),
  )
  const result = await setConnectorEnabled(entry, false)
  expect(result).toMatchObject({
    ok: false,
    error: 'raw detail',
    serverMessage: { id: 'connector.error.alwaysOn', params: { connector: 'example' } },
  })
})
