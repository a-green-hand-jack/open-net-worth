import type { IntlShape } from 'react-intl'
import { fDate, fMonth, getDateFormat, getNumberLocale } from '../../../../utils/format'

type Message = { message_id: string; params: Record<string, unknown> }

/** Only server-marked messages are localized; older data and external errors stay intact. */
export function ynabMessage(
  intl: IntlShape,
  message: Message | null | undefined,
  fallback: string,
): string {
  if (
    (intl.locale.startsWith('en') && message?.message_id !== 'ynab.summary.complete' && message?.message_id !== 'ynab.sync.reason.beforeStart') ||
    !message ||
    !message.params ||
    typeof message.params !== 'object' ||
    Array.isArray(message.params)
  )
    return fallback
  const params = message.params
  const keys = Object.keys(params)
  if (message.message_id === 'ynab.sync.reason.beforeStart') {
    const textKeys = ['count', 'account', 'start', 'now', 'earliest', 'counted', 'difference', 'currency']
    const numberKeys = ['nowValue', 'countedValue', 'differenceValue']
    if (keys.length !== textKeys.length + numberKeys.length || !textKeys.every((key) => typeof params[key] === 'string') || !numberKeys.every((key) => typeof params[key] === 'number' && Number.isFinite(params[key])) || !/^\d+$/.test(params.count as string) || !Number.isSafeInteger(Number(params.count))) return fallback
    const money = (value: number) => `${new Intl.NumberFormat(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} ${params.currency}`.trim()
    const start = getDateFormat() ? fDate(params.start as string, 'numeric') : params.start as string
    const earliest = getDateFormat() ? fDate(params.earliest as string, 'numeric') : params.earliest as string
    if (intl.locale.startsWith('en')) {
      const count = Number(params.count)
      const formattedCount = new Intl.NumberFormat(getNumberLocale()).format(count)
      const plural = count !== 1
      return `${formattedCount} synced transaction${plural ? 's are' : ' is'} dated before ${params.account}'s Starting Balance (${start}). Open Net Worth treats ${plural ? 'them' : 'it'} as history already inside the Starting Balance, so the balance stays ${money(params.nowValue as number)}. YNAB adds ${plural ? 'them' : 'it'} to the balance. Move the Starting Balance to ${earliest}: its amount stays the same, ${plural ? 'they count' : 'it counts'}, and the balance becomes ${money(params.countedValue as number)}, as in YNAB. Keep as history: nothing changes here, and ${params.account} stays ${money(params.differenceValue as number)} apart from YNAB.`
    }
    return intl.formatMessage({ id: 'automations.ynab.beforeStart', defaultMessage: '{count} synced transactions are dated before {account}’s Starting Balance ({start}). Open Net Worth treats them as history inside that balance, which stays {now}. YNAB adds them. Moving the Starting Balance to {earliest} keeps its amount and changes the balance to {counted}, as in YNAB. Keeping them as history leaves the balance unchanged and {difference} apart from YNAB.' }, { ...params, start, earliest, count: new Intl.NumberFormat(getNumberLocale()).format(Number(params.count)), now: money(params.nowValue as number), counted: money(params.countedValue as number), difference: money(params.differenceValue as number) } as Record<string, string>)
  }
  if (!keys.length) {
    switch (message.message_id) {
      case 'ynab.phase.reading':
        return intl.formatMessage({
          id: 'automations.ynab.phaseReading',
          defaultMessage: 'reading YNAB',
        })
      case 'ynab.phase.categories':
        return intl.formatMessage({
          id: 'automations.ynab.phaseCategories',
          defaultMessage: 'reconciling categories',
        })
      case 'ynab.phase.transactions':
        return intl.formatMessage({
          id: 'automations.ynab.phaseTransactions',
          defaultMessage: 'reconciling transactions',
        })
      case 'ynab.phase.assigned':
        return intl.formatMessage({
          id: 'automations.ynab.phaseAssigned',
          defaultMessage: 'reconciling Assigned',
        })
      case 'ynab.phase.done':
        return intl.formatMessage({ id: 'automations.ynab.phaseDone', defaultMessage: 'done' })
      case 'ynab.summary.failed':
        return intl.formatMessage({ id: 'automations.ynab.failed', defaultMessage: 'Failed' })
      case 'ynab.sync.value.hidden':
        return intl.formatMessage({ id: 'automations.ynab.valueHidden', defaultMessage: 'Hidden' })
      case 'ynab.sync.value.shown':
        return intl.formatMessage({ id: 'automations.ynab.valueShown', defaultMessage: 'Shown' })
      case 'ynab.sync.title.noPayee':
        return intl.formatMessage({ id: 'automations.ynab.noPayee', defaultMessage: '(no payee)' })
      case 'ynab.sync.reason.changedDuringSync':
        return intl.formatMessage({ id: 'automations.ynab.changedDuringSync', defaultMessage: 'Changed here while the sync was running.' })
      case 'ynab.sync.reason.bothChanged':
        return intl.formatMessage({ id: 'automations.ynab.bothChanged', defaultMessage: 'Changed in both Open Net Worth and YNAB since the last sync.' })
      case 'ynab.sync.deferred.rateLimit':
        return intl.formatMessage({ id: 'automations.ynab.deferredRateLimit', defaultMessage: 'Waiting for the next run (YNAB request limit).' })
      case 'ynab.sync.deferred.categoryLimit':
        return intl.formatMessage({ id: 'automations.ynab.deferredCategoryLimit', defaultMessage: 'Some category changes wait for the next run (YNAB request limit).' })
      case 'ynab.sync.item.categories':
        return intl.formatMessage({ id: 'automations.ynab.categoriesItem', defaultMessage: 'Categories' })
    }
  }
  if (message.message_id === 'ynab.sync.item.genericCategoryMonth' && keys.length === 1 && typeof params.month === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(params.month)) return intl.formatMessage({ id: 'automations.ynab.genericCategoryMonth', defaultMessage: 'Category · {month}' }, { month: fMonth(params.month, 'short', 'always') })
  if (message.message_id === 'ynab.sync.item.categoryMonth' && keys.length === 2 && typeof params.name === 'string' && typeof params.month === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(params.month)) return intl.formatMessage({ id: 'automations.ynab.categoryMonth', defaultMessage: '{name} · {month}' }, { name: params.name, month: fMonth(params.month, 'short', 'always') })
  if (keys.length === 1 && typeof params.reason === 'string') {
    if (message.message_id === 'ynab.sync.reason.ledgerRefused') return intl.formatMessage({ id: 'automations.ynab.ledgerRefused', defaultMessage: "The ledger refused YNAB's version: {reason}" }, { reason: params.reason })
    if (message.message_id === 'ynab.sync.reason.ynabRefused') return intl.formatMessage({ id: 'automations.ynab.ynabRefused', defaultMessage: 'YNAB did not accept it: {reason}' }, { reason: params.reason })
    if (message.message_id === 'ynab.sync.reason.linkFailed') return intl.formatMessage({ id: 'automations.ynab.linkFailed', defaultMessage: 'Sent to YNAB, but linking it here failed: {reason}' }, { reason: params.reason })
  }
  if (keys.length === 1 && typeof params.name === 'string') {
    if (message.message_id === 'ynab.sync.reason.categoryAmbiguous') return intl.formatMessage({ id: 'automations.ynab.categoryAmbiguous', defaultMessage: "YNAB's {name} matches more than one of your categories. Pick one." }, { name: params.name })
    if (message.message_id === 'ynab.sync.reason.categoryNeedsEnvelope') return intl.formatMessage({ id: 'automations.ynab.categoryNeedsEnvelope', defaultMessage: 'YNAB has money assigned to {name}, which has no envelope here. Give it one?' }, { name: params.name })
    if (message.message_id === 'ynab.sync.change.groupAdded') return intl.formatMessage({ id: 'automations.ynab.groupAdded', defaultMessage: 'Added the group {name} to YNAB.' }, { name: params.name })
    if (message.message_id === 'ynab.sync.change.categoryAdded') return intl.formatMessage({ id: 'automations.ynab.categoryAdded', defaultMessage: 'Added {name} to YNAB.' }, { name: params.name })
    if (message.message_id === 'ynab.sync.change.categoryAddedHere') return intl.formatMessage({ id: 'automations.ynab.categoryAddedHere', defaultMessage: 'Added {name} here, as it is new in YNAB.' }, { name: params.name })
    if (message.message_id === 'ynab.sync.change.envelopeAdded') return intl.formatMessage({ id: 'automations.ynab.envelopeAdded', defaultMessage: 'Added an envelope for {name}, as YNAB has money assigned to it.' }, { name: params.name })
    if (message.message_id === 'ynab.sync.change.hiddenHere') return intl.formatMessage({ id: 'automations.ynab.hiddenHere', defaultMessage: 'Hid {name} here, as in YNAB.' }, { name: params.name })
    if (message.message_id === 'ynab.sync.change.shownHere') return intl.formatMessage({ id: 'automations.ynab.shownHere', defaultMessage: 'Showed {name} here, as in YNAB.' }, { name: params.name })
    if (message.message_id === 'ynab.sync.note.sharedEnvelope') return intl.formatMessage({ id: 'automations.ynab.sharedEnvelope', defaultMessage: "{name} holds several categories, so its Assigned isn't synced with YNAB." }, { name: params.name })
    if (message.message_id === 'ynab.sync.note.noEnvelope') return intl.formatMessage({ id: 'automations.ynab.noEnvelope', defaultMessage: "{name} is no longer in an envelope, so its Assigned isn't synced with YNAB." }, { name: params.name })
    if (message.message_id === 'ynab.sync.note.uncategorized') return intl.formatMessage({ id: 'automations.ynab.uncategorized', defaultMessage: "Transactions in {name} go to YNAB uncategorized, as {name} isn't in YNAB." }, { name: params.name })
  }
  if (keys.length === 2 && typeof params.old === 'string' && typeof params.new === 'string') {
    if (message.message_id === 'ynab.sync.change.groupRenamedHere') return intl.formatMessage({ id: 'automations.ynab.groupRenamedHere', defaultMessage: 'Renamed the group {old} to {new} here, as in YNAB.' }, { old: params.old, new: params.new })
    if (message.message_id === 'ynab.sync.change.groupRenamedYnab') return intl.formatMessage({ id: 'automations.ynab.groupRenamedYnab', defaultMessage: 'Renamed the group {old} to {new} in YNAB.' }, { old: params.old, new: params.new })
    if (message.message_id === 'ynab.sync.change.renamedHere') return intl.formatMessage({ id: 'automations.ynab.renamedHere', defaultMessage: 'Renamed {old} to {new} here, as in YNAB.' }, { old: params.old, new: params.new })
    if (message.message_id === 'ynab.sync.change.renamedYnab') return intl.formatMessage({ id: 'automations.ynab.renamedYnab', defaultMessage: 'Renamed {old} to {new} in YNAB.' }, { old: params.old, new: params.new })
  }
  if (message.message_id === 'ynab.sync.change.movedHere' && keys.length === 2 && typeof params.name === 'string' && typeof params.group === 'string') return intl.formatMessage({ id: 'automations.ynab.movedHere', defaultMessage: 'Moved {name} to {group} here, as in YNAB.' }, { name: params.name, group: params.group })
  if (message.message_id === 'ynab.sync.change.categoryMatched' && keys.length === 2 && typeof params.ynab === 'string' && typeof params.name === 'string') return intl.formatMessage({ id: 'automations.ynab.categoryMatched', defaultMessage: "Matched YNAB's {ynab} with your {name}." }, { ynab: params.ynab, name: params.name })
  if (message.message_id === 'ynab.sync.reason.categoryOffer' && keys.length === 2 && typeof params.name === 'string' && typeof params.envelope === 'string') return intl.formatMessage({ id: 'automations.ynab.categoryOffer', defaultMessage: "YNAB's {name} matches your envelope {envelope}, which already holds other categories. Add it there, or as a new category." }, { name: params.name, envelope: params.envelope })
  if (message.message_id === 'ynab.sync.reason.manyDeleted' && keys.length === 2 && typeof params.count === 'string' && /^\d+$/.test(params.count) && typeof params.total === 'string' && /^\d+$/.test(params.total)) return intl.formatMessage({ id: 'automations.ynab.manyDeleted', defaultMessage: '{count} of {total} synced transactions were deleted in YNAB at once; confirm each deletion here.' }, { count: params.count, total: params.total })
  if (message.message_id === 'ynab.sync.reason.manyDeletesToYnab' && keys.length === 1 && typeof params.count === 'string' && /^\d+$/.test(params.count)) return intl.formatMessage({ id: 'automations.ynab.manyDeletesToYnab', defaultMessage: '{count} deletions would be sent to YNAB at once; confirm each one.' }, { count: params.count })
  const names = ['sent', 'pulled', 'categories', 'review', 'deferred'] as const
  if (
    message.message_id !== 'ynab.summary.complete' ||
    keys.length !== names.length ||
    !names.every((name) => {
      const value = params[name]
      return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    })
  )
    return fallback
  const parts: string[] = []
  const formatted = (value: number) => new Intl.NumberFormat(getNumberLocale()).format(value)
  if (params.sent)
    parts.push(
      intl.formatMessage(
        { id: 'automations.ynab.sent', defaultMessage: '{count} sent to YNAB' },
        { count: formatted(params.sent as number) },
      ),
    )
  if (params.pulled)
    parts.push(
      intl.formatMessage(
        { id: 'automations.ynab.pulled', defaultMessage: '{count} pulled' },
        { count: formatted(params.pulled as number) },
      ),
    )
  if (params.categories)
    parts.push(
      intl.formatMessage(
        {
          id: 'automations.ynab.categories',
          defaultMessage: '{count, plural, one {{formatted} category change} other {{formatted} category changes}}',
        },
        { count: params.categories as number, formatted: formatted(params.categories as number) },
      ),
    )
  if (params.review)
    parts.push(
      intl.formatMessage(
        {
          id: 'automations.ynab.review',
          defaultMessage: '{count, plural, one {{formatted} needs review} other {{formatted} need review}}',
        },
        { count: params.review as number, formatted: formatted(params.review as number) },
      ),
    )
  if (params.deferred)
    parts.push(
      intl.formatMessage(
        {
          id: 'automations.ynab.deferred',
          defaultMessage: '{count} waiting for the next run (request limit)',
        },
        { count: formatted(params.deferred as number) },
      ),
    )
  return parts.length
    ? intl.locale.startsWith('en') ? parts.join(', ') : new Intl.ListFormat(intl.locale, { type: 'conjunction' }).format(parts)
    : intl.formatMessage({ id: 'automations.ynab.noChanges', defaultMessage: 'Nothing changed' })
}
