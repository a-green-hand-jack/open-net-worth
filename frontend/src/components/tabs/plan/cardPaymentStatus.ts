// The status line of a card's payment detail reads only the row's server fields.
import type { LocalCat } from './useBudgetModel'

export type Status = {
  kind: 'overpaid' | 'underfunded' | 'nothingOwed' | 'covered' | 'funded'
  tone: 'warn' | 'good' | 'muted'
  /** What assigning would cover the whole balance — 0 when nothing is short. */
  toAssign: number
  /** Exact display-only gap used in the covered status. */
  balanceGap?: number
  /** Paid past what was set aside: the smaller fix that only brings the row back to zero. */
  clearRed?: number
}

export function cardPaymentStatus(c: LocalCat): Status {
  const owed = c.paymentOwed ?? 0
  const avail = c.availableForPayment ?? 0
  const under = c.paymentUnderfunded ?? 0
  const gap = Math.max(0, owed - avail)
  const toAssign = Math.round(gap * 100) / 100
  if (avail < -0.005)
    return { kind: 'overpaid', tone: 'warn', toAssign, clearRed: Math.round(-avail * 100) / 100 }
  if (under > 0.005)
    return { kind: 'underfunded', tone: 'warn', toAssign: Math.round(under * 100) / 100 }
  if (owed <= 0.005) return { kind: 'nothingOwed', tone: 'muted', toAssign: 0 }
  if (gap > 0.005) return { kind: 'covered', tone: 'good', toAssign, balanceGap: gap }
  return { kind: 'funded', tone: 'good', toAssign: 0 }
}
