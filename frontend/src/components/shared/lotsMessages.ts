import type { IntlShape } from 'react-intl'

export const LOTS_MESSAGE_PARAMS: Record<string, string[]> = {
  'lots.error.identicalOpen': [],
  'lots.error.notFound': [],
  'lots.error.soldCannotDelete': [],
  'lots.error.disposalNotFound': [],
  'lots.error.undoMissingLots': ['lots'],
  'lots.error.futureAcquisition': ['date'],
  'lots.error.positionNotFound': [],
  'lots.error.quantityAcquire': [],
  'lots.error.quantityPositive': [],
  'lots.error.amendMissingLots': ['lots'],
  'lots.error.duplicateDisposal': ['quantity', 'date', 'price', 'currency', 'event'],
  'lots.error.quantityBelowSold': ['sold'],
  'lots.error.unknownChange': ['type'],
  'lots.error.disposalQuantity': [],
  'lots.error.insufficientLots': [],
  'lots.error.selectionQuantity': [],
  'lots.error.selectionNotFound': [],
  'lots.error.selectionExceeds': [],
  'lots.error.taxableProceeds': [],
  'lots.error.transferConditions': [],
  'lots.error.selectionRequired': [],
  'lots.error.selectionSum': [],
  'lots.error.selectionMethod': [],
}

export function lotsMessage(body: unknown, fallback: string, intl: IntlShape): string {
  if (!body || typeof body !== 'object') return fallback
  const error = body as {
    detail?: unknown
    error?: unknown
    message_id?: unknown
    message_params?: unknown
  }
  const original =
    typeof error.detail === 'string'
      ? error.detail
      : typeof error.error === 'string'
        ? error.error
        : fallback
  if (intl.locale === 'en' || typeof error.message_id !== 'string') return original
  const expected = LOTS_MESSAGE_PARAMS[error.message_id]
  const params = error.message_params
  if (!expected || !params || typeof params !== 'object' || Array.isArray(params)) return original
  const values = params as Record<string, unknown>
  if (
    Object.keys(values).length !== expected.length ||
    expected.some((key) => typeof values[key] !== 'string')
  )
    return original
  const { formatMessage } = intl
  const p = values as Record<string, string>
  switch (error.message_id) {
    // The detail includes extra lot identity not present in metadata. Preserve it.
    case 'lots.error.identicalOpen':
      return original
    case 'lots.error.notFound':
      return formatMessage({ id: 'shared.lotError.notFound', defaultMessage: 'Lot not found.' })
    case 'lots.error.soldCannotDelete':
      return formatMessage({
        id: 'shared.lotError.soldCannotDelete',
        defaultMessage:
          "Shares from this lot have been sold, so it can't be removed — undo that sale first (or correct the lot's date, quantity or cost instead).",
      })
    case 'lots.error.disposalNotFound':
      return formatMessage({
        id: 'shared.lotError.disposalNotFound',
        defaultMessage: 'Disposal event not found.',
      })
    case 'lots.error.undoMissingLots':
      return formatMessage(
        {
          id: 'shared.lotError.undoMissingLots',
          defaultMessage:
            "Cannot undo — consumed lots no longer exist ({lots}); the shares can't be restored automatically.",
        },
        p,
      )
    case 'lots.error.amendMissingLots':
      return formatMessage(
        {
          id: 'shared.lotError.amendMissingLots',
          defaultMessage:
            "Cannot amend — consumed lots no longer exist ({lots}); the shares can't be restored automatically.",
        },
        p,
      )
    case 'lots.error.futureAcquisition':
      return formatMessage(
        {
          id: 'shared.lotError.futureAcquisition',
          defaultMessage:
            'The acquisition date {date} is in the future — a lot records units already held; record it on or after the purchase date.',
        },
        p,
      )
    case 'lots.error.positionNotFound':
      return formatMessage({
        id: 'shared.lotError.positionNotFound',
        defaultMessage: 'Position not found.',
      })
    case 'lots.error.quantityAcquire':
      return formatMessage({
        id: 'shared.lotError.quantityAcquire',
        defaultMessage:
          'Quantity must be positive: an acquisition needs the actual quantity bought; a missing, zero or negative quantity would book a zero-unit lot.',
      })
    case 'lots.error.quantityPositive':
      return formatMessage({
        id: 'shared.lotError.quantityPositive',
        defaultMessage: 'Quantity must be a positive number.',
      })
    case 'lots.error.quantityBelowSold':
      return formatMessage(
        {
          id: 'shared.lotError.quantityBelowSold',
          defaultMessage:
            '{sold} units of this lot have already been sold, so it cannot hold fewer than {sold}. Edit or undo the sale first to sell fewer.',
        },
        p,
      )
    case 'lots.error.unknownChange':
      return formatMessage(
        { id: 'shared.lotError.unknownChange', defaultMessage: 'Unknown change type: {type}' },
        p,
      )
    case 'lots.error.disposalQuantity':
      return formatMessage({
        id: 'shared.lotError.disposalQuantity',
        defaultMessage: 'Disposal quantity must be positive.',
      })
    case 'lots.error.insufficientLots':
      return formatMessage({
        id: 'shared.lotError.insufficientLots',
        defaultMessage: 'Not enough open lot quantity to cover the disposal.',
      })
    case 'lots.error.selectionQuantity':
      return formatMessage({
        id: 'shared.lotError.selectionQuantity',
        defaultMessage: 'Lot selection quantity must be positive.',
      })
    case 'lots.error.selectionNotFound':
      return formatMessage({
        id: 'shared.lotError.selectionNotFound',
        defaultMessage: "Lot not found among the position's open lots.",
      })
    case 'lots.error.selectionExceeds':
      return formatMessage({
        id: 'shared.lotError.selectionExceeds',
        defaultMessage: "Requested quantity exceeds the lot's remaining quantity.",
      })
    case 'lots.error.taxableProceeds':
      return formatMessage({
        id: 'shared.lotError.taxableProceeds',
        defaultMessage:
          'A taxable sale needs positive proceeds per unit. A zero-value sale would book the full cost basis as a loss. For a write-off or transfer with no value received, mark it as a transfer-out (is_taxable=false).',
      })
    case 'lots.error.transferConditions':
      return formatMessage({
        id: 'shared.lotError.transferConditions',
        defaultMessage:
          'A transfer moves shares, not money. A destination requires is_taxable=false, proceeds_per_unit=0 and no proceeds_account_id.',
      })
    case 'lots.error.selectionRequired':
      return formatMessage({
        id: 'shared.lotError.selectionRequired',
        defaultMessage: 'A specific-ID disposal requires a lot selection.',
      })
    case 'lots.error.selectionSum':
      return formatMessage({
        id: 'shared.lotError.selectionSum',
        defaultMessage: 'Selected lot quantities must sum to the disposal quantity.',
      })
    case 'lots.error.selectionMethod':
      return formatMessage({
        id: 'shared.lotError.selectionMethod',
        defaultMessage: 'Unknown lot-selection method.',
      })
    case 'lots.error.duplicateDisposal':
      return formatMessage(
        {
          id: 'shared.lotError.duplicateDisposal',
          defaultMessage:
            'A disposal of {quantity} units on {date} at {price} {currency} is already recorded for this position (event {event}). Do not book it again. Only if these are genuinely separate fills, re-apply with allow_duplicate=true.',
        },
        p,
      )
    default:
      return original
  }
}
