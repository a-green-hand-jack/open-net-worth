import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { FormattedMessage } from '../FormattedMessage'
import type { PositionDisplay, ProposedChange } from '../../../../types/chat'
import { fAmountNative, fCurrency, fDate, fQty } from '../../../../utils/format'
import {
  ApprovalChange,
  ApprovalFact,
  ApprovalFacts,
  ApprovalLead,
  ApprovalMeta,
} from '../ApprovalCard'

/** The position / lot / income confirm card bodies, on the approval-card primitives
 * (docs/APPROVAL_CARDS.md). The card header already names the symbol and venue, so a lead
 * says what the write does and a fact never repeats the header. */

// Fields the backend puts on these cards' `display` beyond the shared PositionDisplay type.
type CardDisplay = PositionDisplay & {
  funding_account_id?: string | null
  funding_account_name?: string | null
  remaining_qty?: number | null
  account_from?: string | null
  account_to?: string | null
  account_to_is_new?: boolean
}

const displayOf = (change: ProposedChange) => (change.display || {}) as CardDisplay

/** A currency-less amount (a lot whose basis currency is unknown) still formats, just
 * without a symbol — never the base currency's, which could be a different unit. */
const money = (n: number, ccy?: string | null) => (ccy ? fCurrency(n, ccy) : fAmountNative(n))

const words = (s: string) => s.replace(/_/g, ' ')
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Position fields an update can change, as the user reads them.
const UPDATE_LABELS: Array<[string, string]> = [
  ['quantity', 'Quantity'],
  ['cost_basis', 'Cost basis'],
  ['cost_currency', 'Cost currency'],
  ['vesting_state', 'Vesting'],
  ['note', 'Note'],
]

const positionFields = defineMessages({
  quantity: { id: 'chat.position.quantity', defaultMessage: 'Quantity' },
  cost_basis: { id: 'chat.approval.field.cost_basis', defaultMessage: 'Cost basis' },
  cost_currency: { id: 'chat.position.costCurrency', defaultMessage: 'Cost currency' },
  vesting_state: { id: 'chat.position.vesting', defaultMessage: 'Vesting' },
  note: { id: 'chat.position.note', defaultMessage: 'Note' },
  account: { id: 'chat.approval.field.account', defaultMessage: 'Account' },
})
const acquireKinds = defineMessages({
  buy: { id: 'chat.position.buy', defaultMessage: 'Buy' },
  drp: { id: 'chat.position.reinvest', defaultMessage: 'Reinvest' },
  transfer_in: { id: 'chat.position.transferIn', defaultMessage: 'Transfer in' },
  grant: { id: 'chat.position.grant', defaultMessage: 'Grant' },
  opening: { id: 'chat.position.opening', defaultMessage: 'Opening balance' },
})
const incomeKinds = defineMessages({
  dividend: { id: 'chat.position.dividend', defaultMessage: 'Dividend' },
  interest: { id: 'chat.position.interest', defaultMessage: 'Interest' },
  distribution: { id: 'chat.position.distribution', defaultMessage: 'Distribution' },
})
const assetClasses = defineMessages({
  equity: { id: 'chat.position.assetEquity', defaultMessage: 'equity' },
  crypto: { id: 'chat.position.assetCrypto', defaultMessage: 'crypto' },
  commodity: { id: 'chat.position.assetCommodity', defaultMessage: 'commodity' },
  cash: { id: 'chat.position.assetCash', defaultMessage: 'cash' },
  bond: { id: 'chat.position.assetBond', defaultMessage: 'bond' },
  property: { id: 'chat.position.assetProperty', defaultMessage: 'property' },
  option: { id: 'chat.position.assetOption', defaultMessage: 'option' },
})
function knownLabel(table: Record<string, MessageDescriptor>, key: string, fallback: string, intl: IntlShape): string {
  return Object.hasOwn(table, key) ? intl.formatMessage(table[key]!) : fallback
}

function fieldValue(
  field: string,
  side: Record<string, unknown>,
  other: Record<string, unknown>,
  intl: IntlShape,
): string {
  const v = side[field]
  if (v == null || v === '') return '—'
  if (field === 'quantity') return fQty(v as number)
  if (field === 'vesting_state' && v === 'vested') return intl.formatMessage({ id: 'chat.position.vested', defaultMessage: 'vested' })
  if (field === 'vesting_state' && v === 'unvested') return intl.formatMessage({ id: 'chat.position.unvested', defaultMessage: 'unvested' })
  if (field === 'cost_basis') {
    return money(Number(v), (side.cost_currency ?? other.cost_currency) as string | undefined)
  }
  return words(String(v))
}

export function PositionUpdateBody({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d = displayOf(change)
  const before = (d.before || {}) as Record<string, unknown>
  const after = (d.after || {}) as Record<string, unknown>
  const edits = UPDATE_LABELS.filter(([f]) => String(before[f] ?? '') !== String(after[f] ?? ''))
  const moves = d.account_to && d.account_to !== d.account_from
  if (edits.length === 0 && !moves)
    return <ApprovalLead tone="muted">{<FormattedMessage id="chat.approval.field.no_fields_change" defaultMessage="No fields change" />}</ApprovalLead>
  const names = [...(moves ? [knownLabel(positionFields, 'account', 'Account', intl).toLowerCase()] : []), ...edits.map(([field, label]) => knownLabel(positionFields, field, label, intl).toLowerCase())]
  return (
    <>
      <ApprovalLead>{intl.formatMessage({ id: 'chat.position.change', defaultMessage: 'Change {fields}' }, { fields: names.join(', ') })}</ApprovalLead>
      <ApprovalFacts>
        {moves && (
          <ApprovalChange
            label={<FormattedMessage id="chat.approval.field.account" defaultMessage="Account" />}
            before={d.account_from || '—'}
            after={d.account_to_is_new ? intl.formatMessage({ id: 'chat.position.newAccount', defaultMessage: '{account} (new account)' }, { account: d.account_to }) : d.account_to}
          />
        )}
        {edits.map(([field, label]) => (
          <ApprovalChange
            key={field}
            label={knownLabel(positionFields, field, label, intl)}
            before={fieldValue(field, before, after, intl)}
            after={fieldValue(field, after, before, intl)}
          />
        ))}
      </ApprovalFacts>
    </>
  )
}

export function PositionAddBody({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d = displayOf(change)
  const ccy = d.cost_currency || d.currency
  const hasBasis = d.cost_basis != null && d.cost_basis !== ''
  const fees = Number(d.fees) || 0
  return (
    <>
      <ApprovalLead>
        {intl.formatMessage({ id: 'chat.position.add', defaultMessage: 'Add {quantity} {name}' }, { quantity: fQty(d.quantity), name: d.symbol || d.name })}
      </ApprovalLead>
      <ApprovalMeta
        items={[
          d.symbol && d.name,
          d.asset_class && knownLabel(assetClasses, d.asset_class, d.asset_class, intl),
          d.acquired_at && fDate(d.acquired_at, 'short', 'always'),
          fees > 0 && intl.formatMessage({ id: 'chat.approval.fees', defaultMessage: '{amount} fees' }, { amount: money(fees, ccy) }),
        ]}
      />
      <ApprovalFacts>
        <ApprovalFact
          label={<FormattedMessage id="chat.approval.field.cost_basis" defaultMessage="Cost basis" />}
          tone={hasBasis ? undefined : 'muted'}
          title={hasBasis ? undefined : intl.formatMessage({ id: 'chat.position.unknownBasisHint', defaultMessage: 'A later sale of this position reports no gain.' })}
        >
          {hasBasis ? money(Number(d.cost_basis), ccy) : intl.formatMessage({ id: 'chat.approval.unknown', defaultMessage: 'unknown' })}
        </ApprovalFact>
      </ApprovalFacts>
    </>
  )
}

export function PositionRemoveBody({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d = displayOf(change)
  return (
    <ApprovalLead figure={d.quantity != null ? intl.formatMessage({ id: 'chat.position.units', defaultMessage: '{quantity} units' }, { quantity: fQty(d.quantity) }) : undefined}>
      {intl.formatMessage({ id: 'chat.position.remove', defaultMessage: 'Remove {name}' }, { name: d.name || d.symbol })}
    </ApprovalLead>
  )
}

const ACQUIRE_VERB: Record<string, string> = {
  buy: 'Buy',
  drp: 'Reinvest',
  transfer_in: 'Transfer in',
  grant: 'Grant',
  opening: 'Opening balance',
}

export function LotAcquireBody({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d = displayOf(change)
  const kind = d.kind || 'buy'
  const qty = Number(d.quantity)
  const costKnown = d.unit_cost != null
  const fees = Number(d.fees) || 0
  const funded = Boolean(d.funding_account_id)
  return (
    <>
      <ApprovalLead
        figure={costKnown ? money(qty * Number(d.unit_cost), d.cost_currency) : undefined}
      >
        {knownLabel(acquireKinds, kind, ACQUIRE_VERB[kind] || words(kind), intl)} {fQty(d.quantity)} {d.symbol || d.name}
        {costKnown && ` @ ${money(Number(d.unit_cost), d.cost_currency)}`}
      </ApprovalLead>
      <ApprovalMeta
        items={[
          d.acquired_at && fDate(d.acquired_at, 'short', 'always'),
          fees > 0 && intl.formatMessage({ id: 'chat.approval.fees', defaultMessage: '{amount} fees' }, { amount: money(fees, d.cost_currency) }),
        ]}
      />
      {(!costKnown || kind === 'buy') && (
        <ApprovalFacts>
          {!costKnown && (
            <ApprovalFact
              label={<FormattedMessage id="chat.approval.field.cost_basis" defaultMessage="Cost basis" />}
              tone="muted"
              title={intl.formatMessage({ id: 'chat.approval.unknownBasisHint', defaultMessage: 'Every later sale of this lot reports no gain.' })}
            >
              {intl.formatMessage({ id: 'chat.approval.unknown', defaultMessage: 'unknown' })}
            </ApprovalFact>
          )}
          {kind === 'buy' && (
            <ApprovalFact
              label={<FormattedMessage id="chat.approval.field.cash" defaultMessage="Cash" />}
              tone={funded && costKnown ? undefined : 'warn'}
              title={
                funded && costKnown
                  ? undefined
                  : intl.formatMessage({ id: 'chat.approval.noCashOutHint', defaultMessage: 'No cash is taken out. Fine if the money already left an account; otherwise net worth rises by the shares with nothing deducted.' })
              }
            >
              {funded
                ? costKnown
                  ? intl.formatMessage({ id: 'chat.approval.debitedFrom', defaultMessage: 'debited from {account}' }, { account: d.funding_account_name || intl.formatMessage({ id: 'chat.approval.fundingAccount', defaultMessage: 'the funding account' }) })
                  : intl.formatMessage({ id: 'chat.approval.notDebited', defaultMessage: 'not debited' })
                : intl.formatMessage({ id: 'chat.approval.notBooked', defaultMessage: 'not booked' })}
            </ApprovalFact>
          )}
        </ApprovalFacts>
      )}
    </>
  )
}

export function LotDeleteBody({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d = displayOf(change)
  const costKnown = d.unit_cost != null
  const qty = Number(d.remaining_qty)
  // The lot's own currency when the card carries it; an older card without one stays a bare
  // number rather than borrowing the base currency's symbol.
  const money = (n: number) => (d.cost_currency ? fCurrency(n, d.cost_currency) : fAmountNative(n))
  return (
    <>
      <ApprovalLead figure={costKnown ? money(qty * Number(d.unit_cost)) : undefined}>
        {intl.formatMessage({ id: 'chat.position.deleteLot', defaultMessage: 'Delete lot of {quantity} {name}' }, { quantity: fQty(d.remaining_qty), name: d.symbol || d.name })}
      </ApprovalLead>
      <ApprovalMeta
        items={[
          d.acquired_at && intl.formatMessage({ id: 'chat.position.acquiredAt', defaultMessage: 'Acquired {date}' }, { date: fDate(d.acquired_at, 'short', 'always') }),
          d.kind && knownLabel(acquireKinds, d.kind, words(d.kind), intl).toLowerCase(),
          costKnown && intl.formatMessage({ id: 'chat.position.perUnit', defaultMessage: '{amount} per unit' }, { amount: money(Number(d.unit_cost)) }),
        ]}
      />
      {!costKnown && (
        <ApprovalFacts>
          <ApprovalFact label={<FormattedMessage id="chat.approval.field.cost_basis" defaultMessage="Cost basis" />} tone="muted">
            {intl.formatMessage({ id: 'chat.approval.unknown', defaultMessage: 'unknown' })}
          </ApprovalFact>
        </ApprovalFacts>
      )}
    </>
  )
}

export function IncomeBody({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d = displayOf(change)
  const ccy = d.currency || undefined
  const tax = Number(d.tax_withheld) || 0
  const showBase =
    d.base_amount != null && d.base_currency && d.base_currency !== (ccy || d.base_currency)
  const incomeKind = d.income_kind || 'dividend'
  const kind = knownLabel(incomeKinds, incomeKind, sentence(words(incomeKind)), intl)
  return (
    <>
      <ApprovalLead figure={money(Number(d.net_amount ?? 0), ccy)}>
        {d.is_drp ? intl.formatMessage({ id: 'chat.position.reinvested', defaultMessage: '{kind} reinvested, no cash' }, { kind }) : intl.formatMessage({ id: 'chat.position.received', defaultMessage: '{kind} received' }, { kind })}
      </ApprovalLead>
      <ApprovalMeta items={[d.paid_at && fDate(d.paid_at, 'short', 'always')]} />
      {(tax > 0 || showBase) && (
        <ApprovalFacts>
          {tax > 0 && (
            <ApprovalFact label={<FormattedMessage id="chat.approval.field.gross" defaultMessage="Gross" />}>{money(Number(d.gross_amount ?? 0), ccy)}</ApprovalFact>
          )}
          {tax > 0 && <ApprovalFact label={<FormattedMessage id="chat.approval.field.tax_withheld" defaultMessage="Tax withheld" />}>{money(tax, ccy)}</ApprovalFact>}
          {showBase && (
            <ApprovalFact label={intl.formatMessage({ id: 'chat.position.inCurrency', defaultMessage: 'In {currency}' }, { currency: d.base_currency })}>
              {money(Number(d.base_amount), d.base_currency)}
            </ApprovalFact>
          )}
        </ApprovalFacts>
      )}
    </>
  )
}
