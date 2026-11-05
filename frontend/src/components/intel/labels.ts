import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'

const queues = defineMessages({
  action_needed: { id: 'intel.queue.attention', defaultMessage: 'Needs attention' },
  needs_recheck: { id: 'intel.queue.recheck', defaultMessage: 'Needs recheck' },
  active: { id: 'intel.queue.active', defaultMessage: 'Active' },
  monitoring: { id: 'intel.queue.monitoring', defaultMessage: 'Monitoring' },
})
const filters = defineMessages({
  all: { id: 'intel.filter.all', defaultMessage: 'All' },
  risk: { id: 'intel.filter.risk', defaultMessage: 'Risk' },
  price_alert: { id: 'intel.filter.alerts', defaultMessage: 'Alerts' },
  opportunity: { id: 'intel.filter.opportunities', defaultMessage: 'Opportunities' },
  macro: { id: 'intel.filter.macro', defaultMessage: 'Macro' },
  topic: { id: 'intel.filter.topics', defaultMessage: 'Topics' },
  asset: { id: 'intel.filter.updates', defaultMessage: 'Updates' },
})
export function queueLabel(key: string, intl: IntlShape, fallback: string): string {
  return Object.hasOwn(queues, key) ? intl.formatMessage(queues[key as keyof typeof queues] as MessageDescriptor) : fallback
}
export function filterLabel(key: string, intl: IntlShape, fallback: string): string {
  return Object.hasOwn(filters, key) ? intl.formatMessage(filters[key as keyof typeof filters] as MessageDescriptor) : fallback
}

const signalTypes = defineMessages({
  risk: { id: 'intel.signal.risk', defaultMessage: 'Risk' },
  opportunity: { id: 'intel.signal.opportunity', defaultMessage: 'Opportunity' },
  price_alert: { id: 'intel.signal.priceAlert', defaultMessage: 'Price alert' },
  macro: { id: 'intel.signal.macro', defaultMessage: 'Macro' },
  topic: { id: 'intel.signal.topic', defaultMessage: 'Topic' },
  asset: { id: 'intel.signal.update', defaultMessage: 'Update' },
})
export function signalLabel(key: string, intl: IntlShape, fallback: string): string {
  return Object.hasOwn(signalTypes, key) ? intl.formatMessage(signalTypes[key as keyof typeof signalTypes] as MessageDescriptor) : fallback
}
