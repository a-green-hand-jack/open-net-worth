import { fFixed } from '../../../../utils/format'
import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'
import { fieldLabel } from '../FieldLabels'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { FormattedMessage } from '../FormattedMessage'
import type { ReactNode } from 'react'
import type { ProposedChange } from '../../../../types/chat'
import { fAmountNative, fCurrency, fDate } from '../../../../utils/format'
import { renderGenericValue } from '../cardTypes'
import {
  ApprovalChange,
  ApprovalDetails,
  ApprovalFact,
  ApprovalFacts,
  ApprovalLead,
  ApprovalMeta,
  ApprovalNote,
  ApprovalTable,
} from '../ApprovalCard'

type TxnCategory = NonNullable<ProposedChange['category']>
type TxnLeg = NonNullable<ProposedChange['from']>
type BulkRow = NonNullable<ProposedChange['rows']>[number]


const kindMessages = defineMessages({
  expense: { id: 'chat.txn.expense', defaultMessage: 'Expense' },
  income: { id: 'chat.txn.income', defaultMessage: 'Income' },
  transfer: { id: 'chat.txn.transfer', defaultMessage: 'Transfer' },
  investment: { id: 'chat.txn.investment', defaultMessage: 'Investment' },
  adjustment: { id: 'chat.txn.adjustment', defaultMessage: 'Adjustment' },
})
const warningMessages = defineMessages({
  'ledger.warning.beforeTrackingStart': { id: 'ledger.warning.beforeTrackingStart', defaultMessage: "Dated before {account}'s tracking start ({date}) — summarized into its opening, not counted." },
  'ledger.warning.straddle': { id: 'ledger.warning.straddle', defaultMessage: "This transfer won't balance — one leg is before its account's tracking start." },
})
// The update diff's account-shaped fields — when any of them is in the diff, the account
// is already on a change row and the resulting-account fact would say it twice.
// An edit that MOVES the money names the accounts in its diff; an amount edit does not, so the
// accounts stay as facts.
const ACCOUNT_FIELDS = ['from_account_id', 'to_account_id']

// Which tier of the create-time resolution decided the category — the incident this card
// exists to fix, so it is always said in words, never left for the user to infer.
function categorySource(
  category: TxnCategory,
  rule: ProposedChange['rule'],
  payee: ProposedChange['payee'],
  intl: IntlShape,
): string {
  switch (category.source) {
    case 'rule':
      return intl.formatMessage({ id: 'chat.txn.byRule', defaultMessage: 'set by rule: {rule}' }, { rule: rule?.name ?? intl.formatMessage({ id: 'chat.txn.aRule', defaultMessage: 'a rule' }) })
    case 'payee_default':
      return intl.formatMessage({ id: 'chat.txn.payeeDefault', defaultMessage: "{payee}'s default" }, { payee: payee?.name ?? intl.formatMessage({ id: 'chat.txn.thePayee', defaultMessage: 'the payee' }) })
    case 'explicit':
      return intl.formatMessage({ id: 'chat.txn.specified', defaultMessage: 'as specified' })
    default:
      return intl.formatMessage({ id: 'chat.txn.uncategorized', defaultMessage: 'Uncategorized' })
  }
}

// A txn_bulk sample row only carries the bare source string (no rule/payee name — the
// sample is a display cap, not the full resolution detail).
function bulkSource(source: string, intl: IntlShape): string {
  switch (source) {
    case 'rule':
      return intl.formatMessage({ id: 'chat.txn.rule', defaultMessage: 'rule' })
    case 'payee_default':
      return intl.formatMessage({ id: 'chat.txn.payeeDefaultShort', defaultMessage: 'payee default' })
    case 'explicit':
      return intl.formatMessage({ id: 'chat.txn.specified', defaultMessage: 'as specified' })
    case 'split':
      return intl.formatMessage({ id: 'chat.txn.split', defaultMessage: 'split' })
    default:
      return intl.formatMessage({ id: 'chat.txn.uncategorized', defaultMessage: 'Uncategorized' })
  }
}

const legCurrencyOf = (change: ProposedChange) =>
  change.from?.currency ?? change.to?.currency ?? change.base?.currency ?? null

// The leg that carries the amount the user is approving: the money going out, else the
// money coming in.
const primaryLeg = (change: ProposedChange): TxnLeg | null =>
  change.from?.amount != null ? change.from : change.to?.amount != null ? change.to : null

function TxnLead({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const leg = primaryLeg(change)
  const key = change.txn_kind ?? ''
  const kind = Object.hasOwn(kindMessages, key) ? intl.formatMessage(kindMessages[key as keyof typeof kindMessages] as MessageDescriptor) : intl.formatMessage({ id: 'chat.txn.transaction', defaultMessage: 'Transaction' })
  const subject = change.description || change.payee?.name
  return (
    <ApprovalLead figure={leg && fCurrency(leg.amount!, leg.currency || '')}>
      {subject ? `${kind} · ${subject}` : kind}
    </ApprovalLead>
  )
}

function TxnMeta({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  return (
    <ApprovalMeta
      items={[
        change.date && fDate(change.date, 'short', 'always'),
        change.memo && intl.formatMessage({ id: 'chat.txn.memo', defaultMessage: 'Memo: {memo}' }, { memo: change.memo }),
        change.tags && change.tags.length > 0 && intl.formatMessage({ id: 'chat.txn.tags', defaultMessage: 'Tags: {tags}' }, { tags: change.tags.join(', ') }),
      ]}
    />
  )
}

// The resolved category + its tier. Uncategorized is warn-toned: a user who wanted a
// category needs to SEE that none was applied. A split defers to SplitsDetails instead.
function categoryText(change: ProposedChange, intl: IntlShape): string | null {
  const { category } = change
  if (!category || category.source === 'split') return null
  if (category.source === 'none') return intl.formatMessage({ id: 'chat.txn.uncategorized', defaultMessage: 'Uncategorized' })
  return `${category.label} · ${categorySource(category, change.automation ?? change.rule, change.payee, intl)}`
}

function CategoryFact({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const text = categoryText(change, intl)
  if (text == null) return null
  const none = change.category?.source === 'none'
  return (
    <ApprovalFact
      label={<FormattedMessage id="chat.approval.field.category" defaultMessage="Category" />}
      tone={none ? 'warn' : undefined}
      title={
        none
          ? intl.formatMessage({ id: 'chat.approval.uncategorizedHint', defaultMessage: 'No rule, payee default or category given, so it is stored Uncategorized.' })
          : undefined
      }
    >
      {text}
    </ApprovalFact>
  )
}

// Only worth a row when the payee is new (the write will mint it) or differs from the
// description the lead already shows.
function PayeeFact({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const { payee } = change
  if (!payee || (!payee.is_new && payee.name === change.description)) return null
  return (
    <ApprovalFact label={<FormattedMessage id="chat.approval.field.payee" defaultMessage="Payee" />}>
      {payee.name}
      {payee.is_new && intl.formatMessage({ id: 'chat.txn.payeeCreated', defaultMessage: ' · will be created' })}
    </ApprovalFact>
  )
}

// The resolved accounts BY NAME (never id). A transfer reads "From → To"; the receiving
// amount is its own row only when it differs from the sent figure the lead shows.
function AccountFacts({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const { from, to } = change
  if (from && to) {
    const received =
      from.amount != null &&
      to.amount != null &&
      (to.currency !== from.currency || to.amount !== from.amount)
    return (
      <>
        <ApprovalFact label={<FormattedMessage id="chat.approval.field.transfer" defaultMessage="Transfer" />}>{`${from.account_name} → ${to.account_name}`}</ApprovalFact>
        {received && (
          <ApprovalFact label={<FormattedMessage id="chat.approval.field.received" defaultMessage="Received" />}>{fCurrency(to.amount!, to.currency || '')}</ApprovalFact>
        )}
      </>
    )
  }
  const leg = from ?? to
  if (!leg) return null
  // An expense or income says its own direction; an investment or adjustment leg does not —
  // a buy and a sell, or +500 and −500, would read the same as a bare "Account".
  const directional = change.txn_kind === 'investment' || change.txn_kind === 'adjustment'
  const label = !directional ? intl.formatMessage({ id: 'chat.approval.field.account', defaultMessage: 'Account' }) : from ? intl.formatMessage({ id: 'chat.duplicates.from', defaultMessage: 'From' }) : intl.formatMessage({ id: 'chat.duplicates.to', defaultMessage: 'To' })
  return <ApprovalFact label={label}>{leg.account_name}</ApprovalFact>
}

// The historical-rate stamp (ADR 2026-07-09): the base amount and its fx rate, only when
// the leg currency actually differs from base — nothing to add for a same-currency txn.
function BaseFact({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const { base } = change
  if (!base || base.amount == null || base.currency === legCurrencyOf(change)) return null
  return (
    <ApprovalFact label={intl.formatMessage({ id: 'chat.position.inCurrency', defaultMessage: 'In {currency}' }, { currency: base.currency || intl.formatMessage({ id: 'chat.txn.base', defaultMessage: 'base' }) })}>
      {fCurrency(base.amount, base.currency || '')}
      {base.fx_rate != null && intl.formatMessage({ id: 'chat.txn.rate', defaultMessage: ' · rate {rate}' }, { rate: fFixed(base.fx_rate, 4) })}
    </ApprovalFact>
  )
}

// Split-category breakdown (a split txn has no single category) behind a disclosure whose
// summary names the categories.
function SplitsDetails({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const splits = change.splits
  if (!splits || splits.length === 0) return null
  const labels = splits.map((s) => s.category_label || intl.formatMessage({ id: 'chat.txn.uncategorized', defaultMessage: 'Uncategorized' }))
  return (
    <ApprovalDetails
      summary={intl.formatMessage({ id: 'chat.txn.splitAcross', defaultMessage: 'Split across {count, plural, one {# category} other {# categories}}: {labels}' }, { count: splits.length, labels: labels.join(', ') })}
    >
      <ApprovalTable
        head={[intl.formatMessage({ id: 'chat.approval.field.category', defaultMessage: 'Category' }), intl.formatMessage({ id: 'chat.duplicates.amount', defaultMessage: 'Amount' })]}
        numeric={[1]}
        rows={splits.map((s, i) => ({
          key: i,
          cells: [labels[i], fAmountNative(s.amount, legCurrencyOf(change) || undefined)],
        }))}
      />
    </ApprovalDetails>
  )
}

function WarningNotes({ warnings }: { warnings: ProposedChange['warnings'] }) {
  const intl = useAppIntl()
  return (
    <>
      {(warnings || []).map((w, i) => (
        <ApprovalNote key={i} tone="warn">
          {typeof w === 'string' ? w : w.message_id && Object.hasOwn(warningMessages, w.message_id) ? intl.formatMessage(warningMessages[w.message_id as keyof typeof warningMessages] as MessageDescriptor, w.message_params) : w.message}
        </ApprovalNote>
      ))}
    </>
  )
}

// txn_create — a new transaction about to be booked: what it is and its amount, then the
// fields silent resolution decides (category + tier, payee, accounts, base amount).
export function TxnCreateBody({ change }: { change: ProposedChange }) {
  return (
    <>
      <TxnLead change={change} />
      <TxnMeta change={change} />
      <ApprovalFacts>
        <CategoryFact change={change} />
        <PayeeFact change={change} />
        <AccountFacts change={change} />
        <BaseFact change={change} />
      </ApprovalFacts>
      <SplitsDetails change={change} />
      <WarningNotes warnings={change.warnings} />
    </>
  )
}

const diffValue = (v: unknown) => (v == null || v === '' ? '—' : renderGenericValue(v) || '—')

// txn_update — the before → after rows are the primary content; the resolved facts the
// diff does not already cover follow, since that is the state the user is confirming. A
// category change reads its AFTER from the resolution (with its tier), not the raw field.
export function TxnUpdateBody({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const fields = change.fields || []
  const changed = new Set(fields.map((f) => f.field))
  const showAccounts = !ACCOUNT_FIELDS.some((f) => changed.has(f))
  return (
    <>
      <TxnLead change={change} />
      <TxnMeta change={change} />
      <ApprovalFacts>
        {fields.map((f) => (
          <ApprovalChange
            key={f.field}
            label={fieldLabel(f.field, intl, f.label, change.grant_tool, change.enum_schema_version, `updates.*.${f.field}`)}
            before={diffValue(f.before)}
            after={
              f.field === 'category'
                ? (categoryText(change, intl) ?? diffValue(f.after))
                : diffValue(f.after)
            }
          />
        ))}
        {!changed.has('category') && <CategoryFact change={change} />}
        {!changed.has('payee_id') && <PayeeFact change={change} />}
        {showAccounts && <AccountFacts change={change} />}
        {!changed.has('base_amount') && <BaseFact change={change} />}
      </ApprovalFacts>
      {fields.length === 0 && <ApprovalNote>{<FormattedMessage id="chat.approval.field.no_field_changes" defaultMessage="No field changes" />}</ApprovalNote>}
      <SplitsDetails change={change} />
      <WarningNotes warnings={change.warnings} />
    </>
  )
}

// Three columns so the amount is never cut off on a phone: the category (and, on a
// multi-account import, the account) sit under the description as muted lines.
function bulkCells(row: BulkRow, withAccount: boolean, intl: IntlShape): ReactNode[] {
  const uncategorized = row.category_source === 'none'
  return [
    fDate(row.date, 'short'),
    <>
      {row.description || '—'}
      <div className={uncategorized ? 'ac-tone-warn' : 'ac-tone-muted'}>
        {uncategorized
          ? intl.formatMessage({ id: 'chat.txn.uncategorized', defaultMessage: 'Uncategorized' })
          : `${row.category_label} (${bulkSource(row.category_source, intl)})`}
      </div>
      {withAccount && <div className="ac-tone-muted">{row.account_name}</div>}
    </>,
    row.amount != null ? fCurrency(row.amount, row.currency || '') : '—',
  ]
}

// txn_bulk — ONE card for the whole batch (never one card per row): totals and the rules
// that fired up top, then the capped sample, with the rows it does not show counted.
export function TxnBulkBody({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const rows = change.rows || []
  const count = change.count ?? rows.length
  const more = count - rows.length
  const totals = change.totals
  const rulesApplied = change.automations_applied ?? change.rules_applied ?? []
  const uncategorized = rows.filter((r) => r.category_source === 'none').length
  // A statement import is usually one account: say it once as a fact, not on every row.
  // `account_names` covers the whole batch; a card staged before it existed can only trust
  // the sample when every row is shown.
  const sampleAccounts = [...new Set(rows.map((r) => r.account_name))]
  const accounts = change.account_names ?? (more <= 0 ? sampleAccounts : [])
  const oneAccount = accounts.length === 1 ? accounts[0] : null
  return (
    <>
      <ApprovalLead>
        {intl.formatMessage({ id: 'chat.txn.count', defaultMessage: '{count, plural, one {# transaction} other {# transactions}}' }, { count })}
      </ApprovalLead>
      <ApprovalMeta items={[change.import_description, more > 0 && intl.formatMessage({ id: 'chat.txn.more', defaultMessage: '+{count} more not shown' }, { count: more })]} />
      <ApprovalFacts>
        {totals && totals.inflow_base > 0 && (
          <ApprovalFact label={<FormattedMessage id="chat.approval.field.money_in" defaultMessage="Money in" />} tone="good">
            {fCurrency(totals.inflow_base, totals.base_currency)}
          </ApprovalFact>
        )}
        {totals && totals.outflow_base > 0 && (
          <ApprovalFact label={<FormattedMessage id="chat.approval.field.money_out" defaultMessage="Money out" />}>
            {fCurrency(totals.outflow_base, totals.base_currency)}
          </ApprovalFact>
        )}
        {oneAccount && <ApprovalFact label={<FormattedMessage id="chat.approval.field.account" defaultMessage="Account" />}>{oneAccount}</ApprovalFact>}
        {rulesApplied.length > 0 && (
          <ApprovalFact label={<FormattedMessage id="chat.approval.field.rules_applied" defaultMessage="Rules applied" />}>
            {rulesApplied.map((r) => `${r.name} (${r.count})`).join(', ')}
          </ApprovalFact>
        )}
      </ApprovalFacts>
      {uncategorized > 0 && (
        <ApprovalNote tone="warn">
          {intl.formatMessage({ id: 'chat.txn.uncategorizedRows', defaultMessage: '{count} of the {total} rows shown are Uncategorized' }, { count: uncategorized, total: rows.length })}
        </ApprovalNote>
      )}
      <WarningNotes warnings={change.warnings} />
      <ApprovalTable
        head={[intl.formatMessage({ id: 'chat.duplicates.date', defaultMessage: 'Date' }), intl.formatMessage({ id: 'chat.txn.transaction', defaultMessage: 'Transaction' }), intl.formatMessage({ id: 'chat.duplicates.amount', defaultMessage: 'Amount' })]}
        numeric={[2]}
        rows={rows.map((r, i) => ({ key: i, cells: bulkCells(r, !oneAccount, intl) }))}
      />
    </>
  )
}
