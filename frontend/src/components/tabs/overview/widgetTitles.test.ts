import { createIntl } from 'react-intl'
import { describe, expect, it } from 'vitest'
import { WIDGET_DEFINITIONS } from './definitions'
import { localizeWidgetDefinition } from './widgetTitles'
import messages from './zh-CN.messages.json'

const en = createIntl({ locale: 'en' })
const zh = createIntl({ locale: 'zh-CN', messages })

describe('built-in widget definitions', () => {
  it('preserves English defaults and translates each built-in title, label and description', () => {
    for (const def of WIDGET_DEFINITIONS) {
      const english = localizeWidgetDefinition(en, def)
      expect([english.title, english.label, english.desc]).toEqual([def.title, def.label, def.desc])
      const chinese = localizeWidgetDefinition(zh, def)
      expect(chinese.title, def.defId).not.toBe(def.title)
      expect(chinese.label, def.defId).not.toBe(def.label)
      expect(chinese.desc, def.defId).not.toBe(def.desc)
    }
  })
})
