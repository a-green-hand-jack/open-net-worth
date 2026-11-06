import { createIntl } from 'react-intl'
import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { VaultRequestError, addVaultFile } from '../../api/vault'
import { authFetch } from '../../api/client'
import { setDisplayFormats } from '../../utils/format'
import messages from './zh-CN.messages.json'
import { vaultError, vaultErrorParams } from './vaultErrors'

vi.mock('../../api/client', () => ({ authFetch: vi.fn() }))
afterEach(() => { vi.clearAllMocks(); setDisplayFormats({ number_format: null }) })
const intl = createIntl({ locale: 'zh-CN', messages })

it('covers the backend contract and preserves unknown or malformed messages', () => {
  const contract = JSON.parse(readFileSync('../backend/core/vault_error_contract.json', 'utf8'))
  expect(vaultErrorParams).toEqual(contract)
  const source = readFileSync('src/components/vault/vaultErrors.ts', 'utf8')
  const cases = [...source.matchAll(/case '(vault\.error\.[A-Za-z]+)'/g)].map(match => match[1]).sort()
  expect(cases).toEqual(Object.keys(contract).sort())
  const error = (id: string, params: unknown) => new VaultRequestError('original external text', { message_id: id, message_params: params })
  expect(vaultError(error('unknown', {}), intl)).toBe('original external text')
  expect(vaultError(error('vault.error.tagLength', { limit: 12 }), intl)).toBe('original external text')
  expect(vaultError(error('vault.error.tagLength', { limit: '12', extra: 'x' }), intl)).toBe('original external text')
  expect(vaultError(error('vault.error.tagLength', { limit: 'not a number' }), intl)).toBe('original external text')
  expect(vaultError(error('vault.error.orphanRemoval', { title: 'My personal file.pdf' }), intl)).toContain('My personal file.pdf')
})

it('carries backend error metadata through the real upload API and respects number format', async () => {
  setDisplayFormats({ number_format: 'dot' })
  vi.mocked(authFetch).mockResolvedValue({ ok: false, status: 422, json: async () => ({ detail: 'raw reason', message_id: 'vault.error.tagLength', message_params: { limit: '1234' } }) } as Response)
  let caught: unknown
  try { await addVaultFile(new File(['x'], 'personal.txt')) } catch (error) { caught = error }
  expect(caught).toBeInstanceOf(VaultRequestError)
  expect(vaultError(caught, intl)).toContain('1.234')
  expect(vaultError(caught, createIntl({ locale: 'en' }))).toContain('1.234')
})
