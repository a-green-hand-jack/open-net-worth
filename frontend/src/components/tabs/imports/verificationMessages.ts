import { formatImportNumberParam } from './labels'
import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'
import type { Check, RunMessage } from './runs'

const messages = defineMessages({
  check_account: { id: "imports.verify.check.account", defaultMessage: "{name}: account" },
  check_balance: { id: "imports.verify.check.balance", defaultMessage: "{name}: balance" },
  check_clearedBalance: { id: "imports.verify.check.clearedBalance", defaultMessage: "{name}: cleared balance" },
  check_transactions: { id: "imports.verify.check.transactions", defaultMessage: "{name}: transactions" },
  check_ynabTransactions: { id: "imports.verify.check.ynabTransactions", defaultMessage: "{name}: YNAB transactions" },
  check_envelope: { id: "imports.verify.check.envelope", defaultMessage: "{name}: envelope" },
  check_assigned: { id: "imports.verify.check.assigned", defaultMessage: "{name}: assigned {month}" },
  check_available: { id: "imports.verify.check.available", defaultMessage: "{name}: available {month}" },
  check_ready: { id: "imports.verify.check.ready", defaultMessage: "Ready to Assign {month}" },
  check_firstDiffers: { id: "imports.verify.check.firstDiffers", defaultMessage: "{name}: first differs {month}" },
  check_firstDiffersCard: { id: "imports.verify.check.firstDiffersCard", defaultMessage: "{name} (card payment): first differs {month}" },
  check_readyFirstDiffers: { id: "imports.verify.check.readyFirstDiffers", defaultMessage: "Ready to Assign: first differs {month}" },
  note_transactionSum: { id: "imports.verify.note.transactionSum", defaultMessage: "YNAB's transactions sum to {amount}" },
  note_clearedAdjustment: { id: "imports.verify.note.clearedAdjustment", defaultMessage: "YNAB {cleared} {adjustment}: a transfer is cleared per transaction here" },
  note_ynabRows: { id: "imports.verify.note.ynabRows", defaultMessage: "YNAB has {count}" },
  note_ynabRowsWithOwn: { id: "imports.verify.note.ynabRowsWithOwn", defaultMessage: "YNAB has {count}; {own} more here are this account's own, not in YNAB" },
  note_activityAssigned: { id: "imports.verify.note.activityAssigned", defaultMessage: "YNAB activity {activity}, assigned {assigned}" },
  value_present: { id: "imports.verify.value.present", defaultMessage: "present" },
  value_missing: { id: "imports.verify.value.missing", defaultMessage: "missing" },
  note_readyAccounts: { id: "imports.verify.note.readyAccounts", defaultMessage: "Can differ, as this book also has accounts YNAB doesn't." },
  note_readyUnsynced: { id: "imports.verify.note.readyUnsynced", defaultMessage: "Can differ, as the Assigned of {names}{others, select, yes { and others} other {}} isn't synced." },
  note_readyBoth: { id: "imports.verify.note.readyBoth", defaultMessage: "Can differ, as this book also has accounts YNAB doesn't and the Assigned of {names}{others, select, yes { and others} other {}} isn't synced." },
  note_historyActivity: { id: "imports.verify.note.historyActivity", defaultMessage: "available · activity YNAB {activity} here {here} · only in YNAB: {onlyYnab} · only here: {onlyHere}" },
})
export const required: Record<string, string[]> = {"check.account": ["name"], "check.balance": ["name"], "check.clearedBalance": ["name"], "check.transactions": ["name"], "check.ynabTransactions": ["name"], "check.envelope": ["name"], "check.assigned": ["name", "month"], "check.available": ["name", "month"], "check.ready": ["month"], "check.firstDiffers": ["name", "month"], "check.firstDiffersCard": ["name", "month"], "check.readyFirstDiffers": ["month"], "note.transactionSum": ["amount"], "note.clearedAdjustment": ["cleared", "adjustment"], "note.ynabRows": ["count"], "note.ynabRowsWithOwn": ["count", "own"], "note.activityAssigned": ["activity", "assigned"], "value.present": [], "value.missing": [], "note.readyAccounts": [], "note.readyUnsynced": ["names", "others"], "note.readyBoth": ["names", "others"], "note.historyActivity": ["activity", "here", "onlyYnab", "onlyHere"]}

export function verificationMessage(intl: IntlShape, message: RunMessage | null | undefined, fallback: string, details?: Check['note_details']): string {
  if (!message || typeof message.message_id !== 'string' || !message.message_id.startsWith('ynab.import.') || !message.params || typeof message.params !== 'object' || Array.isArray(message.params)) return fallback
  const key = message.message_id.slice('ynab.import.'.length)
  if (!Object.hasOwn(required, key) || Object.keys(message.params).length !== required[key]!.length || required[key]!.some(name => typeof message.params[name] !== 'string' && typeof message.params[name] !== 'number')) return fallback
  const descriptor = messages[key.replace('.', '_') as keyof typeof messages] as MessageDescriptor | undefined
  if (!descriptor) return fallback
  const numericFields: Record<string, string[]> = {
    'note.transactionSum': ['amount'], 'note.clearedAdjustment': ['cleared', 'adjustment'],
    'note.ynabRows': ['count'], 'note.ynabRowsWithOwn': ['count', 'own'],
    'note.activityAssigned': ['activity', 'assigned'], 'note.historyActivity': ['activity', 'here'],
  }
  const values = { ...message.params }
  for (const name of numericFields[key] ?? []) values[name] = formatImportNumberParam(values[name]!)
  const validItems = (items: unknown): items is { amount: number; ref: string }[] => Array.isArray(items) && items.length <= 6 && items.every(item => item && typeof item.amount === 'number' && Number.isFinite(item.amount) && Math.abs(item.amount) <= Number.MAX_SAFE_INTEGER && typeof item.ref === 'string')
  if (key === 'note.historyActivity' && details && validItems(details.onlyYnab) && validItems(details.onlyHere)) {
    const display = (items: { amount: number; ref: string }[]) => `[${items.map(item => `${formatImportNumberParam(item.amount.toFixed(2))} [${item.ref}]`).join(', ')}]`
    values.onlyYnab = display(details.onlyYnab)
    values.onlyHere = display(details.onlyHere)
  }
  return intl.formatMessage(descriptor, values)
}
