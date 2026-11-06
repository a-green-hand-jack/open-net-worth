// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import type { Skill } from '../../types/skills'
import { SkillDetailPane } from './SkillDetailPane'
import { SkillsTree } from './SkillsTree'
import { managedSkillName } from './managedSkillName'
import { catalogs } from '../../i18n/catalogs'

const skill: Skill = {
  id: 'statement-import',
  name: 'statement-import',
  description: 'Original description',
  body: 'Original English instructions.',
  enabled: true,
  author: 'builtin',
  created_at: '',
  updated_at: '',
}
afterEach(cleanup)

it('shows the translated empty state without altering the create action', () => {
  const onCreate = vi.fn()
  render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
    <SkillsTree skills={[]} selectedSkillId={null} selectedFile={null}
      onSelectSkill={vi.fn()} onSelectFile={vi.fn()} onCreateFirstSkill={onCreate}
      searchQuery="" onSearchChange={vi.fn()} bundles={{}} bundleLoading={{}}
      onExpandSkill={vi.fn()} expandedSkills={new Set()} />
  </IntlProvider>)
  fireEvent.click(screen.getByRole('button', { name: '创建第一个技能' }))
  expect(onCreate).toHaveBeenCalledTimes(1)
})

it('only translates the managed built-in display name', () => {
  expect(managedSkillName('zh-CN', skill)).toBe('导入账单')
  expect(managedSkillName('en', skill)).toBe('statement-import')
  expect(managedSkillName('zh-CN', { ...skill, author: 'user' })).toBe('statement-import')
  expect(managedSkillName('zh-CN', { ...skill, name: 'Custom title' })).toBe('Custom title')
  expect(skill.body).toBe('Original English instructions.')
})

it('shows and searches the translated name without changing the original instructions', () => {
  render(
    <IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
      <SkillsTree
        skills={[skill]}
        selectedSkillId={skill.id}
        selectedFile={null}
        onSelectSkill={vi.fn()}
        onSelectFile={vi.fn()}
        onCreateFirstSkill={vi.fn()}
        searchQuery="导入账单"
        onSearchChange={vi.fn()}
        bundles={{}}
        bundleLoading={{}}
        onExpandSkill={vi.fn()}
        expandedSkills={new Set()}
      />
      <SkillDetailPane
        skill={skill}
        selectedFile={null}
        bundle={null}
        bundleLoading={false}
        bundleError={false}
        mobileActive={false}
        onToggleEnabled={vi.fn()}
        toggling={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRun={vi.fn()}
        onChanged={vi.fn()}
        onBack={vi.fn()}
      />
    </IntlProvider>,
  )
  expect(screen.getAllByText('导入账单').length).toBeGreaterThan(0)
  expect(screen.getByText('Original English instructions.')).toBeTruthy()
  expect(screen.getByText('Original description')).toBeTruthy()
})
