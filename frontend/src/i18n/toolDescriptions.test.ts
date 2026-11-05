import { describe, expect, it } from 'vitest'
import { createIntl } from 'react-intl'
import type { ToolPermission } from '../api/toolPermissionsV2'
import registry from './toolDescriptions.registry.json'
import translations from './toolDescriptions.zh-CN.json'
import { toolPermissionDescription, toolPermissionTitle } from './toolDescriptions'

describe('tool permission descriptions', () => {
  it('has a nonempty Chinese description for every snapshotted first-party tool', () => {
    for (const tool of Object.keys(registry)) {
      expect(translations[tool as keyof typeof translations]?.trim()).toBeTruthy()
    }
  })
  it('translates only an identified first-party description with the expected content', () => {
    const entry = registry.delete_accounts
    const row = {
      tool: 'delete_accounts', connector_id: 'core', description: entry.english,
      description_source: { tool: 'delete_accounts', sha256: entry.sha256 },
    } as ToolPermission
    expect(toolPermissionDescription(row, 'zh-CN')).toBe('永久删除一个或多个账户。')
    expect(toolPermissionDescription(row, 'en')).toBe(entry.english)
    expect(toolPermissionDescription({ ...row, connector_id: 'mcp:external' }, 'zh-CN')).toBe(entry.english)
    expect(toolPermissionDescription({ ...row, description: 'external content' }, 'zh-CN')).toBe('external content')
    expect(toolPermissionDescription({ ...row, description_source: { ...row.description_source!, sha256: 'wrong' } }, 'zh-CN')).toBe(entry.english)
    expect(toolPermissionDescription({ ...row, description_source: null }, 'zh-CN')).toBe(entry.english)
    const intl = createIntl({ locale: 'zh-CN', messages: { 'chat.tool.action.delete_accounts': '删除账户' } })
    expect(toolPermissionTitle(row, intl, 'Delete Accounts')).toBe('删除账户')
    expect(toolPermissionTitle({ ...row, connector_id: 'mcp:external' }, intl, 'Delete Accounts')).toBe('Delete Accounts')
  })
})
