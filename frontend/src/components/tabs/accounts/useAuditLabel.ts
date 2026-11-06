import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { AuditMessage } from './types'

const labels = defineMessages({
  'audit.actor.you': { id: 'audit.actor.you', defaultMessage: 'You' },
  'audit.actor.lucius': { id: 'audit.actor.lucius', defaultMessage: 'Lucius' },
  'audit.actor.system': { id: 'audit.actor.system', defaultMessage: 'System' },
  'audit.actor.agent': { id: 'audit.actor.agent', defaultMessage: 'Agent' },
  'audit.actor.automation': { id: 'audit.actor.automation', defaultMessage: 'Schedule' },
  'audit.source.manual': { id: 'audit.source.manual', defaultMessage: 'You' },
  'audit.source.bank': { id: 'audit.source.bank', defaultMessage: 'Bank feed' },
  'audit.source.import': { id: 'audit.source.import', defaultMessage: 'File import' },
  'audit.source.ai': { id: 'audit.source.ai', defaultMessage: 'Lucius' },
  'audit.source.agent': { id: 'audit.source.agent', defaultMessage: 'Agent' },
  'audit.source.automation': { id: 'audit.source.automation', defaultMessage: 'Automation' },
  'audit.source.reconcile': { id: 'audit.source.reconcile', defaultMessage: 'System' },
  'audit.source.opening': { id: 'audit.source.opening', defaultMessage: 'Starting Balance' },
  'audit.via.schedule': { id: 'audit.via.schedule', defaultMessage: 'Schedule' },
  'audit.via.statement_import': { id: 'audit.via.statement_import', defaultMessage: 'Statement import' },
})

export function useAuditLabel() {
  const { formatMessage } = useAppIntl()
  return (message: AuditMessage | null | undefined, fallback: string): string => {
    if (message?.id && Object.hasOwn(labels, message.id)) return formatMessage(labels[message.id as keyof typeof labels])
    return fallback
  }
}
