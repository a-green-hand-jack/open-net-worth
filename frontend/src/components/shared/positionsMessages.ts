import type { IntlShape } from 'react-intl'
import { lotsMessage } from './lotsMessages'

export const POSITION_MESSAGE_PARAMS: Record<string, string[]> = {
  'positions.error.costCurrency': [], 'positions.error.unvestedGrant': [],
  'positions.error.quantityNumber': [], 'positions.error.quantityNonnegative': [],
  'positions.error.unknownInstrument': [], 'positions.error.duplicateHolding': ['symbol', 'position', 'quantity'],
  'positions.error.grantManaged': ['grant'], 'positions.error.figuresDerived': [],
  'positions.error.vestingManaged': [], 'positions.error.partlySold': [], 'positions.error.grantLinked': [],
  'positions.error.notFound': [], 'positions.error.unsupportedFields': ['fields', 'supported'],
  'positions.error.accountNotFound': [], 'positions.error.moveDuplicate': ['account', 'position'],
}

export function positionsMessage(body: unknown, fallback: string, intl: IntlShape): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fallback
  const error = body as { detail?: unknown; message_id?: unknown; message_params?: unknown }
  const original = typeof error.detail === 'string' ? error.detail : fallback
  if (typeof error.message_id !== 'string') return original
  if (error.message_id.startsWith('lots.error.')) return lotsMessage(body, fallback, intl)
  if (intl.locale.startsWith('en')) return original
  const expected = POSITION_MESSAGE_PARAMS[error.message_id]
  const params = error.message_params
  if (!expected || !params || typeof params !== 'object' || Array.isArray(params)) return original
  const values = params as Record<string, unknown>
  if (Object.keys(values).length !== expected.length || expected.some((key) => typeof values[key] !== 'string')) return original
  const p = values as Record<string, string>
  switch (error.message_id) {
    case 'positions.error.costCurrency': return intl.formatMessage({ id: 'shared.positionError.costCurrency', defaultMessage: 'Cost currency must be a three-letter currency code.' })
    case 'positions.error.unvestedGrant': return intl.formatMessage({ id: 'shared.positionError.unvestedGrant', defaultMessage: 'Unvested units come from an equity grant; create a grant and its schedule instead.' })
    case 'positions.error.quantityNumber': return intl.formatMessage({ id: 'shared.positionError.quantityNumber', defaultMessage: 'Quantity must be a number.' })
    case 'positions.error.quantityNonnegative': return intl.formatMessage({ id: 'shared.positionError.quantityNonnegative', defaultMessage: 'Quantity must be zero or a positive number of units.' })
    case 'positions.error.unknownInstrument': return intl.formatMessage({ id: 'shared.positionError.unknownInstrument', defaultMessage: 'Unknown instrument; resolve it first.' })
    case 'positions.error.duplicateHolding': return intl.formatMessage({ id: 'shared.positionError.duplicateHolding', defaultMessage: '{symbol} already has an active position in this account (position {position}, quantity {quantity}). Record a buy on the existing position instead of creating a duplicate.' }, p)
    case 'positions.error.grantManaged': return intl.formatMessage({ id: 'shared.positionError.grantManaged', defaultMessage: 'This position is managed by equity grant {grant}; update the grant or its vest records instead.' }, p)
    case 'positions.error.figuresDerived': return intl.formatMessage({ id: 'shared.positionError.figuresDerived', defaultMessage: 'Quantity and cost basis are derived from records and cannot be edited directly. Record a buy or transfer in as a new lot, a sale or transfer out as a disposal, or correct an existing lot.' })
    case 'positions.error.vestingManaged': return intl.formatMessage({ id: 'shared.positionError.vestingManaged', defaultMessage: 'Vesting state is set by the equity grant flow; create or edit the grant instead.' })
    case 'positions.error.partlySold': return intl.formatMessage({ id: 'shared.positionError.partlySold', defaultMessage: 'This position holds units from a partly sold lot. Sell or close the rest before removing it.' })
    case 'positions.error.grantLinked': return intl.formatMessage({ id: 'shared.positionError.grantLinked', defaultMessage: 'This position holds an equity grant’s units. Cancel the grant or move it to another account before removing the position.' })
    case 'positions.error.notFound': return intl.formatMessage({ id: 'shared.positionError.notFound', defaultMessage: 'Position not found.' })
    case 'positions.error.accountNotFound': return intl.formatMessage({ id: 'shared.positionError.accountNotFound', defaultMessage: 'Account not found.' })
    case 'positions.error.unsupportedFields': return intl.formatMessage({ id: 'shared.positionError.unsupportedFields', defaultMessage: 'Unsupported position fields: {fields}. Supported: {supported}.' }, p)
    case 'positions.error.moveDuplicate': return intl.formatMessage({ id: 'shared.positionError.moveDuplicate', defaultMessage: '{account} already holds this instrument (position {position}). Record a non-taxable transfer and a transfer-in lot with the same cost basis instead of moving the position onto another holding.' }, p)
    default: return original
  }
}
