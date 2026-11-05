// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider, createIntl } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { AutomationEditorModal } from './AutomationEditorModal'
import { automationTriggerLabel } from './AutomationTriggerSummary'
import { RECOMMENDED_TEMPLATES } from './automationTemplates'
import messages from './zh-CN.messages.json'
import common from '../../../i18n/zh-CN.json'

afterEach(cleanup)
const intl = createIntl({ locale: 'zh-CN', messages })

it('localizes trigger structure without rewriting user account names', () => {
  const trigger = {
    kind: 'event',
    event: 'txn',
    when: { conditions: [{ field: 'account', op: 'is', value: 'a1' }] },
    limit: 'each',
  } as const
  expect(
    automationTriggerLabel(
      trigger,
      { accounts: [{ id: 'a1', label: 'My custom bank' }], instruments: [] },
      intl,
    ),
  ).toContain('My custom bank')
  expect(
    automationTriggerLabel(
      trigger,
      { accounts: [{ id: 'a1', label: 'My custom bank' }], instruments: [] },
      intl,
    ),
  ).toContain('账户')
})

it('retains canonical template fields and clears only the edited source', async () => {
  const template = RECOMMENDED_TEMPLATES[1]!
  const onSubmit = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={{ ...common, ...messages }}>
      <AutomationEditorModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        seed={{
          ...template,
          template_source: {
            name: template.key,
            description: template.key,
            instructions: template.key,
          },
        }}
      />
    </IntlProvider>,
  )
  const name = screen.getByLabelText('名称 *') as HTMLInputElement
  expect(name.value).toBe('每日简报')
  const instructions = screen.getByLabelText('指令 *') as HTMLTextAreaElement
  expect(instructions.value).toContain('每日简报技能')
  fireEvent.change(name, { target: { value: '我的名称' } })
  fireEvent.click(screen.getByRole('button', { name: '创建自动化' }))
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      name: '我的名称',
      description: template.description,
      instructions: template.instructions,
      template_source: { name: undefined, description: template.key, instructions: template.key },
    }),
  )
})

it('clears only instruction provenance when the user edits the translated text', () => {
  const template = RECOMMENDED_TEMPLATES[1]!
  const onSubmit = vi.fn()
  render(
    <IntlProvider locale="zh-CN" messages={{ ...common, ...messages }}>
      <AutomationEditorModal
        open
        onClose={vi.fn()}
        onSubmit={onSubmit}
        seed={{
          ...template,
          template_source: {
            name: template.key,
            description: template.key,
            instructions: template.key,
          },
        }}
      />
    </IntlProvider>,
  )
  fireEvent.change(screen.getByLabelText('指令 *'), { target: { value: '我自己的指令' } })
  fireEvent.click(screen.getByRole('button', { name: '创建自动化' }))
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      name: template.name,
      instructions: '我自己的指令',
      template_source: { name: template.key, description: template.key, instructions: undefined },
    }),
  )
})
