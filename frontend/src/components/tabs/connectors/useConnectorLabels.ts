import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { ConnectorCategory, FamilyKey, StatusFilter } from './model'

const family = defineMessages({
  channels: { id: 'connectors.family.channels', defaultMessage: 'Channels' },
  data: { id: 'connectors.family.data', defaultMessage: 'Data sources' },
  web: { id: 'connectors.family.web', defaultMessage: 'Web' },
  mcp: { id: 'connectors.family.mcp', defaultMessage: 'MCP' },
})
const status = defineMessages({
  all: { id: 'connectors.status.all', defaultMessage: 'All' },
  connected: { id: 'connectors.status.connected', defaultMessage: 'Connected' },
  attention: { id: 'connectors.status.attention', defaultMessage: 'Attention' },
})
const add = defineMessages({
  channels: { id: 'connectors.add.channels', defaultMessage: 'Add a channel' },
  data: { id: 'connectors.add.data', defaultMessage: 'Add a data source' },
  web: { id: 'connectors.add.web', defaultMessage: 'Add a web provider' },
  mcp: { id: 'connectors.add.mcp', defaultMessage: 'Add an MCP server' },
})
const categories = defineMessages({
  "Accounting": { id: 'connectors.category.accounting', defaultMessage: "Accounting" },
  "Banking": { id: 'connectors.category.banking', defaultMessage: "Banking" },
  "Brokerage": { id: 'connectors.category.brokerage', defaultMessage: "Brokerage" },
  "Browsing": { id: 'connectors.category.browsing', defaultMessage: "Browsing" },
  "Crypto": { id: 'connectors.category.crypto', defaultMessage: "Crypto" },
  "Economic data": { id: 'connectors.category.economic_data', defaultMessage: "Economic data" },
  "Email": { id: 'connectors.category.email', defaultMessage: "Email" },
  "Expenses": { id: 'connectors.category.expenses', defaultMessage: "Expenses" },
  "Filings": { id: 'connectors.category.filings', defaultMessage: "Filings" },
  "Market data": { id: 'connectors.category.market_data', defaultMessage: "Market data" },
  "Messaging": { id: 'connectors.category.messaging', defaultMessage: "Messaging" },
  "Payments": { id: 'connectors.category.payments', defaultMessage: "Payments" },
  "Research": { id: 'connectors.category.research', defaultMessage: "Research" },
  "Tax": { id: 'connectors.category.tax', defaultMessage: "Tax" },
  "Voice": { id: 'connectors.category.voice', defaultMessage: "Voice" },
  "Web search": { id: 'connectors.category.web_search', defaultMessage: "Web search" },
})
const rowStatuses = defineMessages({
  "Sign-in needed": { id: 'connectors.rowStatus.sign_in_needed', defaultMessage: "Sign-in needed" },
  "Auth error": { id: 'connectors.rowStatus.auth_error', defaultMessage: "Auth error" },
  "Error": { id: 'connectors.rowStatus.error', defaultMessage: "Error" },
  "Connected": { id: 'connectors.rowStatus.connected', defaultMessage: "Connected" },
  "Not connected": { id: 'connectors.rowStatus.not_connected', defaultMessage: "Not connected" },
  "Disconnected": { id: 'connectors.rowStatus.disconnected', defaultMessage: "Disconnected" },
})
export function useConnectorLabels() {
  const intl = useAppIntl()
  return {
    category: (key: ConnectorCategory) => intl.formatMessage(categories[key]),
    rowStatus: (value: string) => value in rowStatuses ? intl.formatMessage(rowStatuses[value as keyof typeof rowStatuses]) : value,
    family: (key: FamilyKey) => intl.formatMessage(family[key]),
    status: (key: StatusFilter) => intl.formatMessage(status[key]),
    add: (key: FamilyKey) => intl.formatMessage(add[key]),
  }
}

const names = defineMessages({
  email: { id: 'connectors.name.email', defaultMessage: 'Email' },
  voice: { id: 'connectors.name.voice', defaultMessage: 'Voice calls' },
  'mcp-custom': { id: 'connectors.name.customMcp', defaultMessage: 'Custom MCP server' },
})
export function useConnectorName() {
  const intl = useAppIntl()
  return (id: string, fallback: string) => Object.hasOwn(names, id) ? intl.formatMessage(names[id as keyof typeof names]) : fallback
}
