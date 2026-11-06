// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { IntlProvider } from 'react-intl'
import type { ProposedChange } from '../../../types/chat'
import messages from '../zh-CN.messages.json'
import { CardHeader } from './CardHeader'
import { ChangePreview } from '../ChangePreview'
import schemaVersion from './toolSchemaEnums.version.json'
import { ToolPreviewBody } from './bodies/GenericBodies'

afterEach(cleanup)
it('describes the action while preserving the user-provided asset name', () => {
  const change = { type: 'lot_dispose', display: { is_taxable: true, symbol: 'ACME' } } as ProposedChange
  render(<IntlProvider locale="zh-CN" messages={messages}><CardHeader change={change} /></IntlProvider>)
  expect(screen.getByText('记录卖出')).toBeTruthy()
  expect(screen.getByText('ACME')).toBeTruthy()
})

it('describes the selected budget operation', () => {
  const change = { type: 'tool_permission', grant_tool: 'apply_budget_operation', display: { arguments: { operation: 'set_caps', engine_id: 'proportional' } } } as ProposedChange
  render(<IntlProvider locale="zh-CN" messages={messages}><CardHeader change={change} /></IntlProvider>)
  expect(screen.getByText('设置各项上限 (50/30/20)')).toBeTruthy()
})

it('reports that an approved action failed and preserves its error', () => {
  const change = { type: 'tool_permission', grant_tool: 'create_automation', status: 'confirmed' } as ProposedChange
  render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} failure="synthetic error" /></IntlProvider>)
  expect(screen.getByText('✗ 已批准，但执行失败：synthetic error')).toBeTruthy()
})

it('warns in Chinese when an acquisition does not deduct cash', () => {
  const change = { type: 'lot_acquire', display: { kind: 'buy', symbol: 'ACME', quantity: 2, unit_cost: 10, cost_currency: 'USD' } } as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} /></IntlProvider>)
  expect(view.container.textContent).toContain('未入账')
  expect(view.container.querySelector('[title*="不会扣除现金"]')).toBeTruthy()
})

it('distinguishes an unsnoozed target using its stable operation id', () => {
  const change = { type: 'set_target', display: { op: 'Unsnooze target', op_id: 'unsnooze', envelope_name: 'Groceries' } } as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} /></IntlProvider>)
  expect(view.container.textContent).toContain('取消推迟目标')
  expect(view.container.textContent).toContain('Groceries')
})

it('translates target operations in a batch without exposing metadata', () => {
  const change = { type: 'set_target_batch', display: { op: 'Set target (batch)', rows: [{ op: 'Unsnooze target', op_id: 'unsnooze', envelope_name: 'Groceries' }] } } as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} /></IntlProvider>)
  expect(view.container.textContent).toContain('取消推迟目标')
  expect(view.container.textContent).not.toContain('op_id')
})

it('preserves tracking-start warnings in Chinese', () => {
  const change = { type: 'txn_create', warnings: [{ type: 'straddle', message: 'original warning', message_id: 'ledger.warning.straddle', message_params: {} }] } as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} /></IntlProvider>)
  expect(view.container.textContent).toContain('此转账无法平衡')
})

it('does not translate third-party MCP argument names or values', () => {
  const change = { type: 'external_mcp_call', display: { name: 'custom_tool', server: 'Example', args: { account: 'ACME' } } } as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} /></IntlProvider>)
  expect(view.container.textContent).toContain('Account')
  expect(view.container.textContent).toContain('ACME')
})

it('translates an enum only when the recorded schema version and path match', () => {
  const makeChange = (version?: string) => ({ type: 'tool_permission', grant_tool: 'create_account', enum_schema_version: version, display: { arguments: { type: 'cash', name: 'cash', description: 'cash' } } }) as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={makeChange(schemaVersion.sha256)} /></IntlProvider>)
  expect(view.container.textContent).toContain('现金')
  expect(view.container.textContent).toContain('cash')
  expect(view.container.textContent).toContain('类型')
  expect(view.container.textContent).toContain('名称')
  expect(view.container.textContent).toContain('Description')
  view.rerender(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={makeChange()} /></IntlProvider>)
  expect(view.container.textContent).not.toContain('现金')
  expect(view.container.textContent?.match(/cash/g)).toHaveLength(3)
  expect(view.container.textContent).toContain('Type')
  expect(view.container.textContent).toContain('Description')
  view.rerender(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={makeChange('wrong-version')} /></IntlProvider>)
  expect(view.container.textContent).not.toContain('现金')
  expect(view.container.textContent).toContain('Description')
})

it('uses the complete nested path for a schema enum', () => {
  const change = { type: 'tool_permission', grant_tool: 'add_positions', enum_schema_version: schemaVersion.sha256, display: { arguments: { adds: [{ account_type: 'credit', description: 'credit' }] } } } as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} /></IntlProvider>)
  expect(view.container.textContent).toContain('信用卡')
  expect(view.container.textContent).toContain('credit')
})

it('does not translate values inside a free-form input object', () => {
  const change = { type: 'tool_permission', grant_tool: 'run_code', enum_schema_version: schemaVersion.sha256, display: { arguments: { input: { type: 'cash' } } } } as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} /></IntlProvider>)
  expect(view.container.textContent).toContain('cash')
  expect(view.container.textContent).not.toContain('现金')
})

it('translates declared enum arrays without translating free text', () => {
  const change = { type: 'tool_permission', grant_tool: 'get_transactions', enum_schema_version: schemaVersion.sha256, display: { arguments: { transaction_types: ['expense', 'income'], description: 'income' } } } as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} /></IntlProvider>)
  expect(view.container.textContent).toContain('支出, 收入')
  expect(view.container.textContent).toContain('income')
})

it('translates nested fields only when their full paths are declared', () => {
  const change = { type: 'tool_permission', grant_tool: 'update_profile', enum_schema_version: schemaVersion.sha256, display: { arguments: { changes: { marital_status: 'single', custom_note: 'single' } } } } as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} /></IntlProvider>)
  expect(view.container.textContent).toContain('婚姻状况: 单身')
  expect(view.container.textContent).toContain('custom note: single')
})

it('does not treat dots or wildcards in user keys as schema path separators', () => {
  const change = { type: 'tool_permission', grant_tool: 'update_profile', enum_schema_version: schemaVersion.sha256, display: { arguments: { 'changes.marital_status': 'single', changes: { 'liabilities.*.name': 'single' } } } } as ProposedChange
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ChangePreview change={change} /></IntlProvider>)
  expect(view.container.textContent).not.toContain('单身')
  expect(view.container.textContent).toContain('single')
  expect(view.container.textContent).toContain('liabilities.*.name')
})

it('localizes projected preview fields only when they equal the original arguments', () => {
  const change = { type: 'tool_permission', grant_tool: 'create_account', enum_schema_version: schemaVersion.sha256 } as ProposedChange
  const preview = { kind: 'future_preview', data: { type: 'cash', name: 'derived name' }, raw_arguments: { type: 'cash', name: 'original name' } }
  const view = render(<IntlProvider locale="zh-CN" messages={messages}><ToolPreviewBody change={change} preview={preview} /></IntlProvider>)
  expect(view.container.textContent).toContain('类型')
  expect(view.container.textContent).toContain('现金')
  expect(view.container.textContent).toContain('Name')
  expect(view.container.textContent).not.toContain('名称')
})
