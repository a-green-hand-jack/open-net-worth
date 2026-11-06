import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authFetch } from './client'
import { PermissionRefusedError, setToolPermission } from './toolPermissionsV2'

vi.mock('./client', () => ({ authFetch: vi.fn() }))
const mockedFetch = vi.mocked(authFetch)

describe('permission refusal metadata', () => {
  beforeEach(() => mockedFetch.mockReset())
  it('keeps the old detail and known metadata on a refusal', async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: 'unchanged',
          message_id: 'permissions.error.automationMissing',
          message_params: {},
        }),
        { status: 409 },
      ),
    )
    try {
      await setToolPermission({ tool: 'run_code', level: 'always_allow' })
      throw new Error('expected refusal')
    } catch (err) {
      expect(err).toBeInstanceOf(PermissionRefusedError)
      expect(err).toMatchObject({
        message: 'unchanged',
        messageId: 'permissions.error.automationMissing',
        messageParams: {},
      })
    }
  })
  it('preserves old server detail without inventing metadata', async () => {
    mockedFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: 'old server' }), { status: 409 }),
    )
    await expect(
      setToolPermission({ tool: 'run_code', level: 'always_allow' }),
    ).rejects.toMatchObject({ message: 'old server', messageId: undefined })
  })
  it('keeps raw detail when metadata contains a non-primitive parameter', async () => {
    mockedFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: 'raw',
          message_id: 'permissions.error.automationMissing',
          message_params: { extra: {} },
        }),
        { status: 409 },
      ),
    )
    await expect(
      setToolPermission({ tool: 'run_code', level: 'always_allow' }),
    ).rejects.toMatchObject({ message: 'raw', messageId: undefined })
  })
})
