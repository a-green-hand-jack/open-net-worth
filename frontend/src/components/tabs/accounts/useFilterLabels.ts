import { defineMessages, type MessageDescriptor } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { FilterToken, SuggestData } from './SearchFilter'
import { fDate, fMonth } from '../../../utils/format'

const labels: Record<string, MessageDescriptor> = defineMessages({
  category: { id: 'accounts.filter.category', defaultMessage: 'Category' },
  payee: { id: 'accounts.filter.payee', defaultMessage: 'Payee' },
  account: { id: 'accounts.filter.account', defaultMessage: 'Account' },
  source: { id: 'accounts.filter.source', defaultMessage: 'Source' },
  type: { id: 'accounts.filter.type', defaultMessage: 'Type' },
  status: { id: 'accounts.filter.status', defaultMessage: 'Status' },
  tag: { id: 'accounts.filter.tag', defaultMessage: 'Tag' },
  amount: { id: 'accounts.filter.amount', defaultMessage: 'Amount' },
  outflow: { id: 'accounts.filter.outflow', defaultMessage: 'Outflow' },
  inflow: { id: 'accounts.filter.inflow', defaultMessage: 'Inflow' },
  date: { id: 'accounts.filter.date', defaultMessage: 'Date' },
  note: { id: 'accounts.filter.note', defaultMessage: 'Note' },
  expense: { id: 'accounts.filter.expense', defaultMessage: 'Expense' },
  income: { id: 'accounts.filter.income', defaultMessage: 'Income' },
  transfer: { id: 'accounts.filter.transfer', defaultMessage: 'Transfer' },
  adjustment: { id: 'accounts.filter.adjustment', defaultMessage: 'Adjustment' },
  investment: { id: 'accounts.filter.investment', defaultMessage: 'Investment' },
  manual: { id: 'accounts.filter.manual', defaultMessage: 'Manual entry' },
  bank: { id: 'accounts.filter.bank', defaultMessage: 'Bank sync' },
  import: { id: 'accounts.filter.import', defaultMessage: 'Imported (file)' },
  ai: { id: 'accounts.filter.ai', defaultMessage: 'Lucius (AI)' },
  agent: { id: 'accounts.filter.agent', defaultMessage: 'Agent' },
  automation: { id: 'accounts.filter.automation', defaultMessage: 'Automation' },
  reconcile: { id: 'accounts.filter.reconcile', defaultMessage: 'Reconcile adjustment' },
})

export function useFilterInputNormalization(categories: SuggestData['categories']) {
  const { formatMessage, locale } = useAppIntl()
  if (locale === 'en') return (input: string) => input
  const scopes = [
    'category',
    'payee',
    'account',
    'source',
    'type',
    'status',
    'tag',
    'amount',
    'date',
    'note',
  ]
  const names = Object.fromEntries(
    scopes.map((key) => [formatMessage(labels[key]!).toLowerCase(), key]),
  )
  const values: Record<string, string> = {
    [formatMessage({ id: 'accounts.uncategorized', defaultMessage: 'Uncategorized' })]:
      'uncategorized',
    [formatMessage({ id: 'accounts.filter.needsReview', defaultMessage: 'Needs review' })]:
      'needs review',
    [formatMessage({ id: 'accounts.cleared', defaultMessage: 'Cleared' })]: 'cleared',
    [formatMessage({ id: 'accounts.uncleared', defaultMessage: 'Uncleared' })]: 'uncleared',
    [formatMessage({ id: 'accounts.filter.hidden', defaultMessage: 'Hidden' })]: 'hidden',
  }
  for (const key of ['expense', 'income', 'transfer', 'adjustment', 'investment'])
    values[formatMessage(labels[key]!)] = key
  for (const key of ['manual', 'bank', 'import', 'ai', 'agent', 'automation', 'reconcile'])
    values[formatMessage(labels[key]!)] = labels[key]!.defaultMessage as string
  return (input: string) => {
    const match = input.match(/^\s*([^:：]+)[:：]\s*(.*)$/)
    if (!match) return input
    const scope = names[match[1]!.trim().toLowerCase()]
    if (!scope) return input
    const raw = match[2]!
    const namedCategory = categories.some(
      (category) => category.label.toLowerCase() === raw.trim().toLowerCase(),
    )
    return `${scope}: ${['status', 'type', 'source'].includes(scope) ? (values[raw.trim()] ?? raw) : scope === 'category' && !namedCategory && raw.trim() === formatMessage({ id: 'accounts.uncategorized', defaultMessage: 'Uncategorized' }) ? 'uncategorized' : raw}`
  }
}

export function useFilterLabels() {
  const { formatMessage, locale } = useAppIntl()
  const word = (key: string, fallback = key) =>
    Object.hasOwn(labels, key) ? formatMessage(labels[key]!) : fallback
  return (token: FilterToken & { pre?: string; disp?: React.ReactNode }) => {
    if (locale === 'en') return token
    const translated = { ...token }
    if (token.pre) translated.pre = word(token.pre.toLowerCase(), token.pre)
    const simple =
      token.field === 'uncategorized'
        ? formatMessage({ id: 'accounts.uncategorized', defaultMessage: 'Uncategorized' })
        : token.field === 'review'
          ? formatMessage({ id: 'accounts.filter.needsReview', defaultMessage: 'Needs review' })
          : token.field === 'cleared'
            ? token.value
              ? formatMessage({ id: 'accounts.cleared', defaultMessage: 'Cleared' })
              : formatMessage({ id: 'accounts.uncleared', defaultMessage: 'Uncleared' })
            : token.field === 'hidden'
              ? formatMessage({ id: 'accounts.filter.hidden', defaultMessage: 'Hidden' })
              : undefined
    if (simple) return { ...translated, label: simple, disp: simple }
    if (token.field === 'type' || token.field === 'source') {
      const val = word(String(token.value), String(token.value))
      return {
        ...translated,
        label: formatMessage(
          { id: 'accounts.filter.labeled', defaultMessage: '{field}: {value}' },
          { field: word(token.field), value: val },
        ),
        disp: val,
      }
    }
    if (['category', 'payee', 'account'].includes(token.field)) {
      const val = token.displayValue ?? token.label.replace(/^[^:：]*[:：]\s*/, '').trim()
      return {
        ...translated,
        label: formatMessage(
          { id: 'accounts.filter.labeled', defaultMessage: '{field}: {value}' },
          { field: word(token.field), value: val },
        ),
        disp: token.disp,
      }
    }
    if (['text', 'textpayee', 'textcategory', 'textnote'].includes(token.field)) {
      const field = token.field.slice(4)
      const disp = field
        ? formatMessage(
            { id: 'accounts.filter.findIn', defaultMessage: 'Find “{query}” in {field}' },
            { query: String(token.value), field: word(field) },
          )
        : formatMessage(
            { id: 'accounts.filter.findAny', defaultMessage: 'Find “{query}” in any field' },
            { query: String(token.value) },
          )
      return {
        ...translated,
        label: field
          ? formatMessage(
              { id: 'accounts.filter.labeled', defaultMessage: '{field}: {value}' },
              { field: word(field), value: `“${token.value}”` },
            )
          : token.label,
        disp,
      }
    }
    if (token.field.startsWith('date_')) {
      const raw = String(token.value)
      const iso = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(raw) ? raw : ''
      if (iso) {
        const parts = iso.split('-')
        const display =
          parts.length === 1
            ? raw
            : parts.length === 2
              ? fMonth(raw, 'short', 'always')
              : fDate(raw, 'short', 'always')
        const str =
          token.field === 'date_after'
            ? formatMessage(
                { id: 'accounts.filter.onOrAfter', defaultMessage: 'On or after {date}' },
                { date: display },
              )
            : token.field === 'date_before'
              ? formatMessage(
                  { id: 'accounts.filter.onOrBefore', defaultMessage: 'On or before {date}' },
                  { date: display },
                )
              : parts.length === 3
                ? formatMessage(
                    { id: 'accounts.filter.onDate', defaultMessage: 'On {date}' },
                    { date: display },
                  )
                : formatMessage(
                    { id: 'accounts.filter.inDate', defaultMessage: 'In {date}' },
                    { date: display },
                  )
        return { ...translated, label: str, disp: str }
      }
    }
    if (token.field === 'amount') {
      const key = token.dir === 'out' ? 'outflow' : token.dir === 'in' ? 'inflow' : 'amount'
      const suffix = token.label.replace(/^(Amount|Outflow|Inflow)/, '')
      return { ...translated, label: word(key) + suffix }
    }
    return translated
  }
}
