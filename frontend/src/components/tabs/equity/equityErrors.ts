import { lotsMessage } from '../../shared/lotsMessages'
import type { IntlShape } from 'react-intl'

export function equityError(intl: IntlShape, data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback
  const value = data as { message_id?: unknown; message_params?: unknown }
  if (!value.message_params || typeof value.message_params !== 'object' || Array.isArray(value.message_params)) return fallback
  const params = value.message_params as Record<string, unknown>
  if (value.message_id === 'equity.error.createLockedPosition' || value.message_id === 'equity.error.createVestLot') {
    if (Object.keys(params).length !== 1 || typeof params.reason !== 'string') return fallback
    if (intl.locale.startsWith('en')) return fallback
    return value.message_id === 'equity.error.createLockedPosition'
      ? intl.formatMessage({ id: 'equity.error.createLockedPosition', defaultMessage: 'Failed to create locked position: {reason}' }, { reason: params.reason })
      : intl.formatMessage({ id: 'equity.error.createVestLot', defaultMessage: 'Failed to create vest lot: {reason}' }, { reason: params.reason })
  }
  if (value.message_id === 'equity.error.createPosition') {
    if (Object.keys(params).length !== 2 || typeof params.role !== 'string' || typeof params.reason !== 'string') return fallback
    if (intl.locale.startsWith('en')) return fallback
    return intl.formatMessage({ id: 'equity.error.createPosition', defaultMessage: 'Failed to create {role, select, liquid {liquid} pending {pending} locked {locked} other {{role}}} position: {reason}' }, { role: params.role, reason: params.reason })
  }
  if (value.message_id === 'equity.error.grantInactive') {
    if (Object.keys(params).length !== 1 || typeof params.status !== 'string') return fallback
    if (intl.locale.startsWith('en')) return fallback
    return intl.formatMessage({ id: 'equity.error.grantInactive', defaultMessage: 'Grant is not active (status={status, select, active {active} fully_vested {fully vested} cancelled {cancelled} forfeited {forfeited} other {{status}}})' }, { status: params.status })
  }
  if (value.message_id === 'equity.error.undoLotFailed') {
    if (Object.keys(params).length !== 2 || typeof params.reason !== 'string' || typeof params.reason_id !== 'string') return fallback
    if (intl.locale.startsWith('en')) return fallback
    const reason = lotsMessage({ message_id: params.reason_id, message_params: {} }, params.reason, intl)
    return intl.formatMessage({ id: 'equity.error.undoLotFailed', defaultMessage: 'Cannot undo: {reason} — dispose/adjust manually' }, { reason })
  }
  if (Object.keys(params).length) return fallback
  if (intl.locale.startsWith('en')) return fallback
  switch (value.message_id) {
    case 'equity.error.instrumentNotFound': return intl.formatMessage({ id: 'equity.error.instrumentNotFound', defaultMessage: "Instrument not found" })
    case 'equity.error.taxEvent': return intl.formatMessage({ id: 'equity.error.taxEvent', defaultMessage: "Invalid tax event" })
    case 'equity.error.trancheSum': return intl.formatMessage({ id: 'equity.error.trancheSum', defaultMessage: "Tranche units must equal total units (\u00b10.01)" })
    case 'equity.error.grantNotFound': return intl.formatMessage({ id: 'equity.error.grantNotFound', defaultMessage: "Grant not found" })
    case 'equity.error.trancheNotFound': return intl.formatMessage({ id: 'equity.error.trancheNotFound', defaultMessage: "Tranche not found" })
    case 'equity.error.trancheVested': return intl.formatMessage({ id: 'equity.error.trancheVested', defaultMessage: "Tranche already vested" })
    case 'equity.error.unitsPositive': return intl.formatMessage({ id: 'equity.error.unitsPositive', defaultMessage: "Units must be positive" })
    case 'equity.error.unitsExceed': return intl.formatMessage({ id: 'equity.error.unitsExceed', defaultMessage: "Cannot vest more units than the tranche" })
    case 'equity.error.fmvRequired': return intl.formatMessage({ id: 'equity.error.fmvRequired', defaultMessage: "FMV per unit is required" })
    case 'equity.error.fmvInvalid': return intl.formatMessage({ id: 'equity.error.fmvInvalid', defaultMessage: "FMV per unit must be a finite number \u2265 0" })
    case 'equity.error.pricePaidInvalid': return intl.formatMessage({ id: 'equity.error.pricePaidInvalid', defaultMessage: "Price paid per unit must be a finite number \u2265 0" })
    case 'equity.error.currencyRequired': return intl.formatMessage({ id: 'equity.error.currencyRequired', defaultMessage: "FMV currency is required" })
    case 'equity.error.accountRequired': return intl.formatMessage({ id: 'equity.error.accountRequired', defaultMessage: "Cannot determine the vest account; set an account on the grant" })
    case 'equity.error.grantPriceInvalid': return intl.formatMessage({ id: 'equity.error.grantPriceInvalid', defaultMessage: "Grant price per unit must be a finite number \u2265 0" })
    case 'equity.error.vestNotFound': return intl.formatMessage({ id: 'equity.error.vestNotFound', defaultMessage: "Vest event not found" })
    case 'equity.error.vestLotExists': return intl.formatMessage({ id: 'equity.error.vestLotExists', defaultMessage: "A vest lot already exists for this tranche" })
    case 'equity.error.releaseBeforeVest': return intl.formatMessage({ id: 'equity.error.releaseBeforeVest', defaultMessage: "Release date cannot be before the vest date" })
    case 'equity.error.alreadyReleased': return intl.formatMessage({ id: 'equity.error.alreadyReleased', defaultMessage: "This vest was already released" })
    case 'equity.error.notAwaitingRelease': return intl.formatMessage({ id: 'equity.error.notAwaitingRelease', defaultMessage: "This vest is not awaiting release \u2014 its shares were delivered at vest" })
    case 'equity.error.vestedUnitsEdit': return intl.formatMessage({ id: 'equity.error.vestedUnitsEdit', defaultMessage: "This tranche has already vested \u2014 undo its vest before changing its units" })
    case 'equity.error.vestedTrancheRemove': return intl.formatMessage({ id: 'equity.error.vestedTrancheRemove', defaultMessage: "A vested tranche cannot be removed from the schedule \u2014 undo its vest first" })
    case 'equity.error.grantAccountRequired': return intl.formatMessage({ id: 'equity.error.grantAccountRequired', defaultMessage: "An account is required \u2014 which custodian holds this grant?" })
    case 'equity.error.lockedPositionNotFound': return intl.formatMessage({ id: 'equity.error.lockedPositionNotFound', defaultMessage: "Locked position not found" })
    case 'equity.error.positionNotAdoptable': return intl.formatMessage({ id: 'equity.error.positionNotAdoptable', defaultMessage: "Only an unvested position with no lots and no grant can be adopted; omit the locked position and the grant creates its own." })
    case 'equity.error.deliveryAccountRequired': return intl.formatMessage({ id: 'equity.error.deliveryAccountRequired', defaultMessage: "Cannot determine the delivery account for this release" })
    default: return fallback
  }
}
