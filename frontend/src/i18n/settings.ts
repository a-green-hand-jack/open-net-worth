import { defineMessages, type IntlShape } from 'react-intl'
import type { Section } from '../components/tabs/Settings'

const sections = defineMessages({
  profile: { id: 'settings.section.profile', defaultMessage: 'Profile' },
  language: { id: 'settings.section.language', defaultMessage: 'Interface language' },
  model: { id: 'settings.section.model', defaultMessage: 'AI' },
  chat: { id: 'settings.section.chat', defaultMessage: 'Chat' },
  memory: { id: 'settings.section.memory', defaultMessage: 'Memory' },
  permissions: { id: 'settings.section.permissions', defaultMessage: 'Permissions' },
  dedup: { id: 'settings.section.dedup', defaultMessage: 'Duplicate Detection' },
  intel: { id: 'settings.section.intel', defaultMessage: 'Intelligence' },
  appearance: { id: 'settings.section.appearance', defaultMessage: 'Appearance' },
  desktop: { id: 'settings.section.desktop', defaultMessage: 'Desktop' },
  shortcuts: { id: 'settings.section.shortcuts', defaultMessage: 'Phone shortcuts' },
  mcp: { id: 'settings.section.mcp', defaultMessage: 'MCP' },
  currency: { id: 'settings.section.currency', defaultMessage: 'Currency & format' },
  security: { id: 'settings.section.security', defaultMessage: 'Security' },
  data: { id: 'settings.section.data', defaultMessage: 'Data' },
  terminal: { id: 'settings.section.terminal', defaultMessage: 'Terminal' },
  help: { id: 'settings.section.help', defaultMessage: 'Help' },
  developer: { id: 'settings.section.developer', defaultMessage: 'Developer' },
  aiUsage: { id: 'settings.section.aiUsage', defaultMessage: 'Cost & Performance' },
})

export const settingsSection = (intl: IntlShape, key: Section) => intl.formatMessage(sections[key])

const groups = defineMessages({
  Account: { id: 'settings.group.account', defaultMessage: 'Account' },
  Assistant: { id: 'settings.group.assistant', defaultMessage: 'Assistant' },
  App: { id: 'settings.group.app', defaultMessage: 'App' },
  'Phone & other apps': { id: 'settings.group.phone', defaultMessage: 'Phone & other apps' },
  Advanced: { id: 'settings.group.advanced', defaultMessage: 'Advanced' },
  Support: { id: 'settings.group.support', defaultMessage: 'Support' },
})
export const settingsGroup = (intl: IntlShape, key: keyof typeof groups) =>
  intl.formatMessage(groups[key])
export type SettingsGroup = keyof typeof groups
