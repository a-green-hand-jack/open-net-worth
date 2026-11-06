import { createIntl } from 'react-intl'
import { expect, it } from 'vitest'
import type { VaultItem } from '../../api/vault'
import messages from './zh-CN.messages.json'
import { removalActions, vaultSublabel } from './vaultFormat'

it('translates removal consequences without changing private state or user names', () => {
  const intl = createIntl({ locale: 'zh-CN', messages })
  const chatFile = { kind: 'file', origin: 'chat', private: true, filename: 'contract.pdf', added_at: '2026-01-01' } as VaultItem
  const actions = removalActions(chatFile, intl)
  expect(actions[0]?.body).toContain('保持私密')
  expect(actions[0]?.keeps).toBe(true)
  expect(actions[1]?.body).toContain('永久删除')
  expect(actions[1]?.deleteFile).toBe(true)
  const asset = { ...chatFile, kind: 'asset', asset_name: 'My Custom Asset' } as VaultItem
  expect(removalActions(asset, intl)[0]?.body).toContain('My Custom Asset')
  expect(vaultSublabel(asset, intl)).toContain('My Custom Asset')
})
