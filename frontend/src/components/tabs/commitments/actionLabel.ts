import type { IntlShape } from 'react-intl'
import type { CommitmentAction } from '../../../types/commitments'

export function displayActionLabel(intl: IntlShape, action: Pick<CommitmentAction, 'label' | 'label_source'>): string {
  const source = action.label_source
  if (!source || typeof source !== 'object' || typeof source.label !== 'string' ||
      !['draw_down', 'sell', 'sell_units', 'receive'].includes(source.kind) ||
      (source.kind === 'sell_units' && (typeof source.count !== 'string' || !/^(?:\d+(?:\.\d+)?)(?:e[+-]?\d+)?$/.test(source.count))) ||
      Object.keys(source).length !== (source.kind === 'sell_units' ? 3 : 2)) return action.label
  const expected = source.kind === 'sell_units'
    ? `Sell ${source.count} units — ${source.label}`
    : `${source.kind === 'draw_down' ? 'Draw down' : source.kind === 'sell' ? 'Sell' : 'Receive'} ${source.label}`
  if (expected !== action.label) return action.label
  if (source.kind === 'draw_down') return intl.formatMessage({ id: 'commitments.actions.drawDown', defaultMessage: 'Draw down {label}' }, { label: source.label })
  if (source.kind === 'sell') return intl.formatMessage({ id: 'commitments.actions.sell', defaultMessage: 'Sell {label}' }, { label: source.label })
  if (source.kind === 'sell_units') return intl.formatMessage({ id: 'commitments.actions.sellUnits', defaultMessage: 'Sell {count} units — {label}' }, { count: source.count, label: source.label })
  return intl.formatMessage({ id: 'commitments.actions.receive', defaultMessage: 'Receive {label}' }, { label: source.label })
}
