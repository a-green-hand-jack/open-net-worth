// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, it, vi } from 'vitest'
import { catalogs } from '../../i18n/catalogs'
import { CreateSkillMenu } from './CreateSkillMenu'

afterEach(cleanup)

it('opens the Chinese creation menu and preserves its actions', () => {
  const actions = [vi.fn(), vi.fn(), vi.fn(), vi.fn()] as const
  render(<IntlProvider locale="zh-CN" messages={catalogs['zh-CN']}>
    <CreateSkillMenu onCreateWithLucius={actions[0]} onWriteInstructions={actions[1]}
      onUpload={actions[2]} onBrowseStarters={actions[3]} />
  </IntlProvider>)
  const trigger = screen.getByRole('button', { name: '新建技能' })
  for (const [index, label] of ['使用 Lucius 创建', '编写技能指令', '上传技能', '浏览入门技能'].entries()) {
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('menuitem', { name: new RegExp(label) }))
    expect(actions[index]).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
  }
})
