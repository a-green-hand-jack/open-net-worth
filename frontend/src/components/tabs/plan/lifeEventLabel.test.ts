import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import messages from './zh-CN.messages.json'
import {
  displayLifeEventLabel,
  editedLifeEventLabel,
  displayIncomeLabel,
  editedIncomeLabel,
} from './lifeEventLabel'

const zh = createIntl({ locale: 'zh-CN', messages })
const en = createIntl({ locale: 'en' })

describe('life event default labels', () => {
  it('switches system defaults by language and keeps legacy/user names', () => {
    const home = { label: '🏠 Home', labelSource: 'preset_home' as const }
    expect(displayLifeEventLabel(zh, home)).toBe('🏠 房屋')
    expect(displayLifeEventLabel(en, home)).toBe('🏠 Home')
    expect(displayLifeEventLabel(zh, { label: '🏠 Home' })).toBe('🏠 Home')
    expect(displayLifeEventLabel(zh, { label: '👶 New baby', labelSource: 'preset_baby' })).toBe(
      '👶 新生儿',
    )
    expect(displayLifeEventLabel(zh, { label: '🎓 Tuition', labelSource: 'preset_tuition' })).toBe(
      '🎓 学费',
    )
    expect(
      displayLifeEventLabel(zh, { label: '💰 Inheritance', labelSource: 'preset_inheritance' }),
    ).toBe('💰 遗产')
    expect(
      displayLifeEventLabel(zh, { label: '✈️ Sabbatical', labelSource: 'preset_sabbatical' }),
    ).toBe('✈️ 长期休假')
  })
  it('preserves default provenance when unchanged, and clears it when renamed', () => {
    const home = { label: '🏠 Home', labelSource: 'preset_home' as const }
    expect(editedLifeEventLabel(zh, home, '🏠 房屋')).toEqual(home)
    expect(editedLifeEventLabel(zh, home, 'My home')).toEqual({ label: 'My home' })
    expect(editedLifeEventLabel(en, home, '🏠 房屋', '🏠 房屋')).toEqual(home)
    expect(editedLifeEventLabel(en, home, 'Renamed', '🏠 房屋')).toEqual({ label: 'Renamed' })
    const blank = editedLifeEventLabel(zh, home, '')
    expect(blank).toEqual({ label: 'Event', labelSource: 'default_event' })
    expect(displayLifeEventLabel(zh, blank)).toBe('事件')
  })
})

describe('income stream default labels', () => {
  it('localizes only a marked default, preserving and clearing provenance on edit', () => {
    const income = { label: 'Income', labelSource: 'default_income' as const }
    expect(displayIncomeLabel(zh, income)).toBe('收入')
    expect(displayIncomeLabel(zh, { label: 'Income' })).toBe('Income')
    expect(editedIncomeLabel(zh, income, '收入')).toEqual(income)
    expect(editedIncomeLabel(zh, income, 'Pension')).toEqual({ label: 'Pension' })
    expect(editedIncomeLabel(en, income, '收入', '收入')).toEqual(income)
    expect(editedIncomeLabel(en, income, 'Pension', '收入')).toEqual({ label: 'Pension' })
    expect(editedIncomeLabel(zh, income, '')).toEqual(income)
  })
})
