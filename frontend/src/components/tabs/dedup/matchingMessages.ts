import type { IntlShape } from 'react-intl'

interface MatchingMessage {
  id: string
  params: Record<string, unknown>
}

export function matchingMessage(intl: IntlShape, msg: MatchingMessage, fallback: string): string {
  if (!msg || typeof msg !== 'object' || typeof msg.id !== 'string') return fallback
  const p = msg.params ?? {}
  switch (msg.id) {
    case 'matching.ref_in_ledger':
      return typeof p.source === 'string' && typeof p.reference === 'string'
        ? intl.formatMessage(
            {
              id: 'matching.ref_in_ledger',
              defaultMessage: 'exact external ref already in the ledger ({source}:{reference})',
            },
            { source: p.source, reference: p.reference },
          )
        : fallback
    case 'matching.ref_in_batch':
      return typeof p.row === 'number' &&
        typeof p.source === 'string' &&
        typeof p.reference === 'string'
        ? intl.formatMessage(
            {
              id: 'matching.ref_in_batch',
              defaultMessage:
                'exact external ref repeated by row {row} of this batch ({source}:{reference})',
            },
            { row: p.row, source: p.source, reference: p.reference },
          )
        : fallback
    case 'matching.same_transfer':
      return intl.formatMessage({
        id: 'matching.same_transfer',
        defaultMessage: 'same transfer route, same amount, near date',
      })
    case 'matching.similar_description':
      return intl.formatMessage({
        id: 'matching.similar_description',
        defaultMessage: 'same amount, similar description, near date, different source',
      })
    case 'matching.books_close':
      return intl.formatMessage({
        id: 'matching.books_close',
        defaultMessage: 'unique pairing in a complete statement window (books-close)',
      })
    case 'matching.transfer_pair':
      return ['yes', 'no'].includes(String(p.route)) &&
        ['yes', 'no'].includes(String(p.fee)) &&
        ['yes', 'no'].includes(String(p.categorized))
        ? intl.formatMessage(
            {
              id: 'matching.transfer_pair',
              defaultMessage:
                'opposite-direction legs across two accounts, same base amount & near date{route, select, yes { (unconfirmed route — review)} other {}}{fee, select, yes { (fee-bearing transfer — review)} other {}}{categorized, select, yes { (categorized leg — review)} other {}}',
            },
            { route: String(p.route), fee: String(p.fee), categorized: String(p.categorized) },
          )
        : fallback
    case 'matching.transfer_echo':
      return p.side === 'debit' || p.side === 'credit'
        ? intl.formatMessage(
            {
              id: 'matching.transfer_echo',
              defaultMessage:
                'This {side, select, debit {debit} credit {credit} other {}} entry matches one leg of an existing transfer.',
            },
            { side: p.side },
          )
        : fallback
    case 'matching.shared_reference':
      return typeof p.token === 'string'
        ? intl.formatMessage(
            { id: 'matching.shared_reference', defaultMessage: 'shared reference {token}' },
            { token: p.token },
          )
        : fallback
    case 'matching.foreign_wordless':
      return typeof p.days === 'number'
        ? intl.formatMessage(
            {
              id: 'matching.foreign_wordless',
              defaultMessage:
                'same account, exact original foreign amount, {days, plural, =0 {same day} other {#-day gap}} (review)',
            },
            { days: p.days },
          )
        : fallback
    case 'matching.wordless':
      return typeof p.days === 'number'
        ? intl.formatMessage(
            {
              id: 'matching.wordless',
              defaultMessage:
                'same account, same amount, {days, plural, =0 {same day} other {#-day gap}} — wording differs (review)',
            },
            { days: p.days },
          )
        : fallback
    case 'matching.settled_drift':
      return typeof p.percent === 'string' &&
        typeof p.days === 'number' &&
        typeof p.words === 'string'
        ? intl.formatMessage(
            {
              id: 'matching.settled_drift',
              defaultMessage:
                'same account, settled {percent}% off, {days, plural, =0 {same day} other {#-day gap}} — wording overlaps ({words})',
            },
            { percent: p.percent, days: p.days, words: p.words },
          )
        : fallback
    default:
      return fallback
  }
}
