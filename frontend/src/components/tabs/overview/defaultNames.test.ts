import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import messages from './zh-CN.messages.json'
import { displaySectionTitle, displayViewName } from './defaultNames'

const zh = createIntl({ locale: 'zh-CN', messages })
const en = createIntl({ locale: 'en' })

describe('dashboard default names', () => {
  it('translates only marked defaults and keeps historical names verbatim', () => {
    const view = {
      viewId: 'v',
      name: 'Overview',
      nameSource: 'preset_overview' as const,
      widgets: [],
    }
    expect(displayViewName(zh, view)).toBe('概览')
    expect(displayViewName(en, view)).toBe('Overview')
    expect(displayViewName(zh, { ...view, name: 'Investing', nameSource: 'preset_investing' })).toBe('投资')
    expect(displayViewName(zh, { ...view, name: 'Cash flow', nameSource: 'preset_cash_flow' })).toBe('现金流')
    expect(displayViewName(zh, { ...view, name: 'Plan', nameSource: 'preset_plan' })).toBe('规划')
    expect(displayViewName(zh, { viewId: 'v', name: 'Overview', widgets: [] })).toBe('Overview')
    expect(displayViewName(zh, { ...view, name: 'My custom view' })).toBe('My custom view')
    const section = {
      kind: 'section' as const,
      instanceId: 's',
      title: 'Section',
      titleSource: 'default_section' as const,
      x: 0,
      y: 0,
      w: 12,
      h: 30,
    }
    expect(displaySectionTitle(zh, section)).toBe('分区')
    expect(displaySectionTitle(zh, { ...section, titleSource: undefined })).toBe('Section')
    expect(displaySectionTitle(zh, { ...section, title: 'My custom section' })).toBe('My custom section')
  })
})
