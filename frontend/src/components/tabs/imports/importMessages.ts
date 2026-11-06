import { formatImportCount } from './labels'
import type { IntlShape } from 'react-intl'
import type { RunMessage } from './runs'

export function importHint(intl: IntlShape, message: RunMessage | null | undefined, fallback: string): string {
  if (!message || !message.params || typeof message.params !== 'object' || Array.isArray(message.params) || Object.keys(message.params).length) return fallback
  switch (message.message_id) {
    case 'ynab.import.hint.failed':
      return intl.formatMessage({ id: 'imports.hint.failed', defaultMessage: 'Open Net Worth refused this row. Fix the cause in YNAB, or add the transaction by hand.' })
    case 'ynab.import.hint.refused_duplicate':
      return intl.formatMessage({ id: 'imports.hint.refusedDuplicate', defaultMessage: 'It looks like a transaction already in the book. If it is a separate one, add it by hand.' })
    case 'ynab.import.hint.previously_deleted':
      return intl.formatMessage({ id: 'imports.hint.previouslyDeleted', defaultMessage: 'You deleted this transaction here earlier, so it was not booked again. Restore it from Accounts if you want it back.' })
    case 'ynab.import.hint.assigned':
      return intl.formatMessage({ id: 'imports.hint.assigned', defaultMessage: "Set that month's Assigned by hand in Plan." })
    default: return fallback
  }
}

export function importWarning(intl: IntlShape, message: RunMessage | null | undefined, fallback: string): string {
  if (!message || !message.params || Object.keys(message.params).length !== 1 || typeof message.params.count !== 'string' || !/^\d+$/.test(message.params.count)) return fallback
  const value = Number(message.params.count)
  if (!Number.isSafeInteger(value)) return fallback
  const count = formatImportCount(value)
  switch (message.message_id) {
    case 'ynab.import.warning.subcent':
      return intl.formatMessage({ id: 'imports.warning.subcent', defaultMessage: '{count} amount(s) have sub-cent precision; they are rounded to cents.' }, { count })
    case 'ynab.import.warning.unknownCategory':
      return intl.formatMessage({ id: 'imports.warning.unknownCategory', defaultMessage: '{count} line(s) use a category YNAB no longer lists; they import uncategorized.' }, { count })
    case 'ynab.import.warning.oneSidedTransfer':
      return intl.formatMessage({ id: 'imports.warning.oneSidedTransfer', defaultMessage: '{count} transfer(s) have no matching row in the other account; they import as plain income or expense.' }, { count })
    default: return fallback
  }
}

export function importLog(intl: IntlShape, message: RunMessage | null | undefined, fallback: string): string {
  if (!message || !message.params || typeof message.params !== 'object' || Array.isArray(message.params)) return fallback
  const p = message.params
  const valid = (keys: string[]) => Object.keys(p).length === keys.length && keys.every(key => typeof p[key] === 'string')
  const count = (key: string) => typeof p[key] === 'string' && /^\d+$/.test(p[key] as string) && Number.isSafeInteger(Number(p[key])) ? formatImportCount(Number(p[key])) : null
  switch (message.message_id) {
    case 'ynab.import.log.baseCurrency':
      return valid(['old', 'new']) ? intl.formatMessage({ id: 'imports.log.baseCurrency', defaultMessage: 'Base currency set from {old} to {new}.' }, { old: p.old, new: p.new }) : fallback
    case 'ynab.import.log.sharedEnvelope':
      return valid(['name']) ? intl.formatMessage({ id: 'imports.log.sharedEnvelope', defaultMessage: "{name} holds several categories, so its Assigned isn't synced with YNAB." }, { name: p.name }) : fallback
    case 'ynab.import.log.syncFailed':
      return valid(['reason']) ? intl.formatMessage({ id: 'imports.log.syncFailed', defaultMessage: 'The sync was not turned on: {reason}. Turn it on from Data sync.' }, { reason: p.reason }) : fallback
    case 'ynab.import.log.syncOn':
      return valid(['direction']) && ['both', 'from_ynab', 'to_ynab'].includes(p.direction as string) ? intl.formatMessage({ id: 'imports.log.syncOn', defaultMessage: 'Sync turned on: {direction, select, both {both ways} from_ynab {from YNAB} other {to YNAB}}.' }, { direction: p.direction }) : fallback
    case 'ynab.import.log.backup':
      return valid(['backup']) ? intl.formatMessage({ id: 'imports.log.backup', defaultMessage: 'Backup taken: {backup}. Restore it from Settings → Data → Backup & restore.' }, { backup: p.backup }) : fallback
    case 'ynab.import.log.accounts': {
      const created = count('created'), joined = count('joined'), existing = count('existing')
      return valid(['created', 'joined', 'existing']) && created !== null && joined !== null && existing !== null ? intl.formatMessage({ id: 'imports.log.accounts', defaultMessage: 'Accounts: {created} created, {joined} linked to accounts already here, {existing} already there.' }, { created, joined, existing }) : fallback
    }
    case 'ynab.import.log.linkedMatches': {
      const matched = count('matched'), possible = count('possible')
      return valid(['matched', 'possible']) && matched !== null && possible !== null ? intl.formatMessage({ id: 'imports.log.linkedMatches', defaultMessage: 'Linked accounts: {matched} YNAB transaction(s) matched to ones already here; {possible} possible match(es) were added as new.' }, { matched, possible }) : fallback
    }
    case 'ynab.import.log.cleared':
    case 'ynab.import.log.archived':
    case 'ynab.import.log.assignments': {
      const n = count('count')
      if (!valid(['count']) || n === null) return fallback
      if (message.message_id === 'ynab.import.log.cleared') return intl.formatMessage({ id: 'imports.log.cleared', defaultMessage: 'Cleared set on {count} transaction(s).' }, { count: n })
      if (message.message_id === 'ynab.import.log.archived') return intl.formatMessage({ id: 'imports.log.archived', defaultMessage: 'Archived {count} closed account(s).' }, { count: n })
      return intl.formatMessage({ id: 'imports.log.assignments', defaultMessage: 'Budget: {count} monthly assignment(s) written.' }, { count: n })
    }
    case 'ynab.import.log.transactions': {
      const names = ['created', 'existing', 'refused', 'failed'] as const
      if (!valid([...names]) || names.some(name => count(name) === null)) return fallback
      const n = Object.fromEntries(names.map(name => [name, Number(p[name])])) as Record<typeof names[number], number>
      const parts = [intl.formatMessage({ id: 'imports.log.transactionsAdded', defaultMessage: '{count, plural, one {{display} transaction} other {{display} transactions}} added' }, { count: n.created, display: count('created')! })]
      if (n.existing) parts.push(intl.formatMessage({ id: 'imports.log.transactionsExisting', defaultMessage: '{display} {count, plural, one {was} other {were}} already here' }, { count: n.existing, display: count('existing')! }))
      if (n.refused) parts.push(intl.formatMessage({ id: 'imports.log.transactionsRefused', defaultMessage: '{display} {count, plural, one {was} other {were}} left out (see the problems)' }, { count: n.refused, display: count('refused')! }))
      if (n.failed) parts.push(intl.formatMessage({ id: 'imports.log.transactionsFailed', defaultMessage: '{count, plural, one {{display} transaction} other {{display} transactions}} could not be added' }, { count: n.failed, display: count('failed')! }))
      return parts.join('; ') + '.'
    }
    case 'ynab.import.log.categories':
    case 'ynab.import.log.starters': {
      const names = ['categories', 'envelopes', 'groups'] as const
      if (!valid([...names]) || names.some(name => count(name) === null)) return fallback
      const parts: string[] = []
      for (const name of names) {
        const n = Number(p[name])
        if (!n) continue
        parts.push(intl.formatMessage({ id: 'imports.log.categoryCount', defaultMessage: '{kind, select, categories {{count, plural, one {{display} category} other {{display} categories}}} envelopes {{count, plural, one {{display} envelope} other {{display} envelopes}}} other {{count, plural, one {{display} group} other {{display} groups}}}}' }, { kind: name, count: n, display: count(name)! }))
      }
      if (message.message_id === 'ynab.import.log.categories') return parts.length ? intl.formatMessage({ id: 'imports.log.categoriesAdded', defaultMessage: 'Added {items}; the rest were already here.' }, { items: new Intl.ListFormat(intl.locale, { type: 'conjunction' }).format(parts) }) : intl.formatMessage({ id: 'imports.log.categoriesExisting', defaultMessage: 'All the categories and envelopes were already here.' })
      return parts.length ? intl.formatMessage({ id: 'imports.log.startersRemoved', defaultMessage: 'Removed unused starter items: {items}.' }, { items: new Intl.ListFormat(intl.locale, { type: 'conjunction' }).format(parts) }) : intl.formatMessage({ id: 'imports.log.startersNone', defaultMessage: 'No unused starter items to remove.' })
    }
    case 'ynab.import.log.zeroBased':
      return valid([]) ? intl.formatMessage({ id: 'imports.log.zeroBased', defaultMessage: 'Budget method set to zero-based, as in YNAB.' }) : fallback
    default: return fallback
  }
}

export function importPhase(intl: IntlShape, message: RunMessage | null | undefined, fallback: string): string {
  if (!message || !message.params || typeof message.params !== "object" || Array.isArray(message.params) || Object.keys(message.params).length) return fallback
  switch (message.message_id) {
    case 'ynab.import.phase.reading': return intl.formatMessage({ id: 'imports.phase.reading', defaultMessage: 'reading YNAB' })
    case 'ynab.import.phase.mapping': return intl.formatMessage({ id: 'imports.phase.mapping', defaultMessage: 'mapping' })
    case 'ynab.import.phase.verifying': return intl.formatMessage({ id: 'imports.phase.verifying', defaultMessage: 'verifying' })
    case 'ynab.import.phase.backup': return intl.formatMessage({ id: 'imports.phase.backup', defaultMessage: 'backing up' })
    case 'ynab.import.phase.accounts': return intl.formatMessage({ id: 'imports.phase.accounts', defaultMessage: 'creating accounts' })
    case 'ynab.import.phase.matching': return intl.formatMessage({ id: 'imports.phase.matching', defaultMessage: 'matching transactions in linked accounts' })
    case 'ynab.import.phase.categories': return intl.formatMessage({ id: 'imports.phase.categories', defaultMessage: 'creating categories and envelopes' })
    case 'ynab.import.phase.transactions': return intl.formatMessage({ id: 'imports.phase.transactions', defaultMessage: 'booking transactions' })
    case 'ynab.import.phase.cleared': return intl.formatMessage({ id: 'imports.phase.cleared', defaultMessage: 'marking cleared' })
    case 'ynab.import.phase.assignments': return intl.formatMessage({ id: 'imports.phase.assignments', defaultMessage: 'setting monthly assignments' })
    case 'ynab.import.phase.done': return intl.formatMessage({ id: 'imports.phase.done', defaultMessage: 'done' })
    default: return fallback
  }
}

export function importOutcome(intl: IntlShape, message: RunMessage | null | undefined, fallback: string): string {
  if (!message || !message.params || typeof message.params !== 'object' || Array.isArray(message.params)) return fallback
  const p = message.params
  const counts = (keys: string[]) => Object.keys(p).length === keys.length && keys.every(key => typeof p[key] === 'string' && /^\d+$/.test(p[key] as string) && Number.isSafeInteger(Number(p[key])))
  const n = (key: string) => formatImportCount(Number(p[key]))
  switch (message.message_id) {
    case 'ynab.import.outcome.failed': return counts([]) ? intl.formatMessage({ id: 'imports.outcome.failed', defaultMessage: 'Import failed.' }) : fallback
    case 'ynab.import.outcome.verify': return counts(['matching', 'total']) ? intl.formatMessage({ id: 'imports.outcome.verify', defaultMessage: '{matching} of {total} checks match' }, { matching: n('matching'), total: n('total') }) : fallback
    case 'ynab.import.outcome.preview': return counts(['accounts', 'transactions']) ? intl.formatMessage({ id: 'imports.outcome.preview', defaultMessage: 'Would bring across {accounts} accounts and {transactions} transactions' }, { accounts: n('accounts'), transactions: n('transactions') }) : fallback
    case 'ynab.import.outcome.createdVerified': return counts(['accounts', 'transactions', 'matching', 'total']) ? intl.formatMessage({ id: 'imports.outcome.createdVerified', defaultMessage: 'Created {accounts} accounts, {transactions} transactions; {matching} of {total} checks match' }, { accounts: n('accounts'), transactions: n('transactions'), matching: n('matching'), total: n('total') }) : fallback
    case 'ynab.import.outcome.created': return counts(['accounts', 'transactions']) ? intl.formatMessage({ id: 'imports.outcome.created', defaultMessage: 'Created {accounts} accounts, {transactions} transactions' }, { accounts: n('accounts'), transactions: n('transactions') }) : fallback
    default: return fallback
  }
}
