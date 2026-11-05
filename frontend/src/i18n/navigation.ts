import { defineMessages, type IntlShape } from 'react-intl'
import type { TabId } from '../tabs'

const labels = defineMessages({
  lucius: { id: 'nav.lucius', defaultMessage: 'Lucius' },
  dashboard: { id: 'nav.dashboard', defaultMessage: 'Dashboard' },
  inbox: { id: 'nav.inbox', defaultMessage: 'Inbox' },
  investments: { id: 'nav.investments', defaultMessage: 'Investments' },
  accounts: { id: 'nav.accounts', defaultMessage: 'Accounts' },
  assets: { id: 'nav.assets', defaultMessage: 'Assets' },
  commitments: { id: 'nav.commitments', defaultMessage: 'Commitments' },
  plan: { id: 'nav.plan', defaultMessage: 'Plan' },
  intel: { id: 'nav.intel', defaultMessage: 'Intel' },
  skills: { id: 'nav.skills', defaultMessage: 'Skills' },
  automations: { id: 'nav.automations', defaultMessage: 'Automations' },
  build: { id: 'nav.build', defaultMessage: 'Build' },
  profile: { id: 'nav.profile', defaultMessage: 'Profile' },
  connectors: { id: 'nav.connectors', defaultMessage: 'Connectors' },
  settings: { id: 'nav.settings', defaultMessage: 'Settings' },
  help: { id: 'nav.help', defaultMessage: 'Help' },
} satisfies Record<TabId, { id: string; defaultMessage: string }>)

export const tabLabel = (intl: IntlShape, tab: TabId) => intl.formatMessage(labels[tab])
