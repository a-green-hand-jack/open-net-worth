// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { authFetch } from '../../api/client'
import { useSkills } from '../../hooks/useSkills'
import type { Skill } from '../../types/skills'
import { Skills } from './Skills'
import { IntlProvider } from 'react-intl'
import messages from '../skills/zh-CN.messages.json'
import commonMessages from '../../i18n/zh-CN.json'
import starterRegistry from '../skills/starterSkills.registry.json'

vi.mock('../../api/client', () => ({ authFetch: vi.fn() }))
vi.mock('../../hooks/useSkills', () => ({ useSkills: vi.fn() }))

const authFetchMock = vi.mocked(authFetch)
const useSkillsMock = vi.mocked(useSkills)

function skill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'monthly-close',
    name: 'Monthly close',
    description: 'Close the month',
    body: 'Review the requested month.',
    enabled: true,
    author: 'builtin',
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

function setup(skills: Skill[]) {
  const onRunSkill = vi.fn()
  const createSkill = vi.fn().mockResolvedValue({ ok: true })
  const updateSkill = vi.fn().mockResolvedValue({ ok: true })

  useSkillsMock.mockReturnValue({
    skills,
    loading: false,
    error: null,
    refresh: vi.fn(),
    createSkill,
    updateSkill,
    deleteSkill: vi.fn().mockResolvedValue({ ok: true }),
  })
  render(<Skills onRunSkill={onRunSkill} />)
  return { onRunSkill, createSkill, updateSkill }
}

function selectSkill(name: string) {
  const row = screen.getByText(name).closest('[role="treeitem"]')
  if (!row) throw new Error(`Skills tree row not found for ${name}`)
  fireEvent.click(row)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  authFetchMock.mockResolvedValue({ ok: true, json: async () => ({}) } as Response)
})

describe('Skills direct-run handoff', () => {
  it('translates a verified starter while preserving the invocation ID and user content', () => {
    const entry = starterRegistry['budget-review']
    const onRunSkill = vi.fn()
    useSkillsMock.mockReturnValue({
      skills: [
        skill({
          id: 'budget-review',
          name: entry.name.english,
          description: entry.description.english,
          body: 'My original instructions',
          starter_source: {
            id: 'budget-review',
            name_sha256: entry.name.sha256,
            description_sha256: entry.description.sha256,
          },
        }),
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      createSkill: vi.fn(),
      updateSkill: vi.fn(),
      deleteSkill: vi.fn(),
    })
    render(
      <IntlProvider locale="zh-CN" messages={{ ...commonMessages, ...messages }}>
        <Skills onRunSkill={onRunSkill} />
      </IntlProvider>,
    )
    selectSkill('预算检查')
    expect(screen.getByText('My original instructions')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '运行' }))
    expect(onRunSkill).toHaveBeenCalledWith('/budget-review')
  })

  it('localizes identified file diagnostics while leaving external details intact', () => {
    const raw = ["frontmatter 'name' is required", 'External parser detail']
    useSkillsMock.mockReturnValue({
      skills: [
        skill({
          author: 'user',
          validation_errors: raw,
          validation_messages: [
            { text: raw[0]!, message_id: 'skills.validation.nameRequired', params: {} },
            { text: raw[1]! },
          ],
        }),
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
      createSkill: vi.fn(),
      updateSkill: vi.fn(),
      deleteSkill: vi.fn(),
    })
    render(
      <IntlProvider locale="zh-CN" messages={{ ...commonMessages, ...messages }}>
        <Skills onRunSkill={vi.fn()} />
      </IntlProvider>,
    )
    selectSkill('Monthly close')
    expect(screen.getByRole('alert').textContent).toContain('前置元数据')
    expect(screen.getByRole('alert').textContent).toContain('External parser detail')
  })
  it('clicking Run stages a canonical immutable id instead of a renamed label, without a network/model submission', () => {
    const { onRunSkill } = setup([skill({ id: 'budget-review', name: 'Renamed review label' })])
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    selectSkill('Renamed review label')
    const requestsBeforeRun = authFetchMock.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))

    expect(onRunSkill).toHaveBeenCalledOnce()
    expect(onRunSkill).toHaveBeenCalledWith('/budget-review')
    expect(authFetchMock).toHaveBeenCalledTimes(requestsBeforeRun)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('stages only the skill id; task details belong in the conversation', () => {
    const { onRunSkill } = setup([
      skill({
        id: 'monthly-close',
        name: 'Renamed monthly close',
      }),
    ])
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    selectSkill('Renamed monthly close')
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))
    expect(onRunSkill).toHaveBeenCalledOnce()
    expect(onRunSkill).toHaveBeenCalledWith('/monthly-close')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

// The 'Skills parameter-name validation' block is gone with the Parameters editor it drove
// (removed 2026-08-10). Agent Skills take task input from the conversation; there is no
// parameter editor or template-substitution runtime.

describe('Skills deterministic edge-state fixtures', () => {
  it('edits Claude Code and OpenAI compatibility metadata in one save', async () => {
    const { updateSkill } = setup([
      skill({
        id: 'review-pr',
        name: 'review-pr',
        author: 'user',
        claude: {
          when_to_use: 'When reviewing pull requests',
          argument_hint: '[pr-number]',
          arguments: ['pr'],
        },
        openai: {
          interface: { display_name: 'Review PR' },
          policy: { allow_implicit_invocation: true },
        },
      }),
    ])

    selectSkill('review-pr')
    fireEvent.click(screen.getByRole('button', { name: 'review-pr actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))

    const dialog = screen.getByRole('dialog', { name: 'Edit "review-pr"' })
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Claude Code' }))
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Manual only' }))
    fireEvent.change(within(dialog).getByLabelText('When to use'), {
      target: { value: 'Only when explicitly reviewing a PR' },
    })
    fireEvent.change(within(dialog).getByLabelText('Named arguments'), {
      target: { value: 'pr format' },
    })

    fireEvent.click(within(dialog).getByRole('tab', { name: 'OpenAI' }))
    fireEvent.change(within(dialog).getByLabelText('Display name'), {
      target: { value: 'Pull request review' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(updateSkill).toHaveBeenCalledOnce())
    expect(updateSkill.mock.calls[0]![1]).toMatchObject({
      claude: {
        when_to_use: 'Only when explicitly reviewing a PR',
        arguments: ['pr', 'format'],
        disable_model_invocation: true,
        user_invocable: true,
      },
      openai: {
        interface: { display_name: 'Pull request review' },
        policy: { allow_implicit_invocation: true },
      },
    })
  })

  it('keeps dependency identifier focus while typing the full value', () => {
    setup([
      skill({
        id: 'dependency-skill',
        name: 'dependency-skill',
        author: 'user',
        openai: { dependencies: { tools: [{ type: 'mcp', value: '' }] } },
      }),
    ])

    selectSkill('dependency-skill')
    fireEvent.click(screen.getByRole('button', { name: 'dependency-skill actions' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit "dependency-skill"' })
    fireEvent.click(within(dialog).getByRole('tab', { name: 'OpenAI' }))
    const identifier = within(dialog).getByLabelText('Identifier') as HTMLInputElement
    identifier.focus()

    for (const value of ['m', 'mc', 'mcp', 'mcp-', 'mcp-ledger']) {
      fireEvent.change(identifier, { target: { value } })
      expect(document.activeElement).toBe(identifier)
    }
    expect(identifier.value).toBe('mcp-ledger')
  })

  it('creates an instruction-only skill without requiring tool controls', async () => {
    const { createSkill } = setup([])

    fireEvent.click(screen.getByRole('button', { name: 'Create your first skill' }))
    const dialog = screen.getByRole('dialog', { name: 'New skill' })
    fireEvent.change(dialog.querySelector<HTMLInputElement>('#skill-name')!, {
      target: { value: 'balance-helper' },
    })
    fireEvent.change(dialog.querySelector<HTMLInputElement>('#skill-desc')!, {
      target: { value: 'Trace a balance discrepancy.' },
    })
    fireEvent.change(dialog.querySelector<HTMLTextAreaElement>('#skill-body')!, {
      target: { value: 'Trace the balance carefully.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create skill' }))

    await waitFor(() => expect(createSkill).toHaveBeenCalledOnce())
    expect(createSkill.mock.calls[0]![0]).toMatchObject({
      name: 'balance-helper',
      description: 'Trace a balance discrepancy.',
      body: 'Trace the balance carefully.',
    })
    expect(createSkill.mock.calls[0]![0]).not.toHaveProperty('allowed_tools')
  })

  it('keeps an invalid new skill open until the required description is supplied', async () => {
    const { createSkill } = setup([])

    fireEvent.click(screen.getByRole('button', { name: 'Create your first skill' }))
    const dialog = screen.getByRole('dialog', { name: 'New skill' })
    fireEvent.change(dialog.querySelector<HTMLInputElement>('#skill-name')!, {
      target: { value: 'balance-helper' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create skill' }))

    expect(createSkill).not.toHaveBeenCalled()
    expect(within(dialog).getByRole('alert').textContent).toContain('needs a description')
  })

  it('renders an isolated empty skills state with a direct create call to action', () => {
    setup([])

    expect(screen.getByText(/No skills yet/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Create your first skill' }))
    expect(screen.getByRole('dialog', { name: 'New skill' })).toBeTruthy()
  })
})
