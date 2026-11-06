import { fieldLabel } from '../FieldLabels'
import { targetActionLabel } from '../ChangeTitles'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'
import { FormattedMessage } from '../FormattedMessage'
import type { PositionDisplay, ProposedChange } from '../../../../types/chat'
import { fBase, fDate } from '../../../../utils/format'
import {
  ApprovalFact,
  ApprovalFacts,
  ApprovalLead,
  ApprovalMeta,
  ApprovalNote,
} from '../ApprovalCard'
import { fBudgetMonth, fmt, permissionArguments, renderGenericValue } from '../cardTypes'
import { GenericChangePreview } from './GenericBodies'

// The envelope / group ids the planning tools stage, and the names the backend resolves beside
// them for the card (`_budget_confirm.with_names`). A card staged before names existed has ids only.
type Display = PositionDisplay & {
  op_id?: string
  envelope_id?: string
  from_envelope_id?: string
  to_envelope_id?: string
  envelope_name?: string
  from_envelope_name?: string
  to_envelope_name?: string
  group_name?: string
  category_name?: string
  category_names?: string[]
  needs_whole_amount?: boolean | null
}

// A name first; an older card's `category` next; the bare id (or `__rta`, the pool) last.
const envelopeLabel = (name: unknown, id: unknown, intl: IntlShape) =>
  id === '__rta' ? intl.formatMessage({ id: 'chat.budget.ready', defaultMessage: 'Ready to Assign' }) : fmt(name ?? id)

const amountOf = (d: Display) => (d.amount != null ? fBase(Number(d.amount)) : '—')


const TARGET_KINDS: Record<string, string> = { by_date: 'savings' }

const targetKinds = defineMessages({
  monthly: { id: 'chat.budget.monthly', defaultMessage: 'monthly' },
  weekly: { id: 'chat.budget.weekly', defaultMessage: 'weekly' },
  yearly: { id: 'chat.budget.yearly', defaultMessage: 'yearly' },
  by_date: { id: 'chat.budget.savings', defaultMessage: 'savings' },
})

// A snooze is a budget month (YYYY-MM); anything else is a date.
const fSnoozeUntil = (v: string) =>
  /^\d{4}-\d{2}$/.test(v) ? fBudgetMonth(v) : fDate(v, 'short', 'always')

function TargetBody({ d }: { d: Display }) {
  const intl = useAppIntl()
  const cat = envelopeLabel(d.envelope_name ?? d.category_name ?? d.category, d.envelope_id, intl)
  if (!d.target_type) {
    return (
      <>
        <ApprovalLead>
          {intl.formatMessage({ id: 'chat.budget.targetOn', defaultMessage: '{operation} on {category}' }, { operation: targetActionLabel(d.op_id, intl) || fmt(d.op || intl.formatMessage({ id: 'chat.budget.clearTarget', defaultMessage: 'Clear target' })), category: cat })}
        </ApprovalLead>
        <ApprovalMeta items={[d.snooze_until && intl.formatMessage({ id: 'chat.budget.until', defaultMessage: 'until {date}' }, { date: fSnoozeUntil(d.snooze_until) })]} />
      </>
    )
  }
  const kind = TARGET_KINDS[d.target_type] ?? d.target_type
  return (
    <>
      <ApprovalLead figure={amountOf(d)}>
        {intl.formatMessage({ id: 'chat.budget.setTargetOn', defaultMessage: 'Set {kind} target on {category}' }, { kind: Object.hasOwn(targetKinds, d.target_type) ? intl.formatMessage(targetKinds[d.target_type as keyof typeof targetKinds] as MessageDescriptor) : kind, category: cat })}
      </ApprovalLead>
      <ApprovalMeta
        items={[
          d.date && intl.formatMessage({ id: 'chat.budget.byDate', defaultMessage: 'by {date}' }, { date: fDate(d.date, 'short', 'always') }),
          d.snooze_until && intl.formatMessage({ id: 'chat.budget.snoozedUntil', defaultMessage: 'snoozed until {date}' }, { date: fSnoozeUntil(d.snooze_until) }),
        ]}
      />
      {typeof d.needs_whole_amount === 'boolean' && (
        <ApprovalFacts>
          <ApprovalFact label={<FormattedMessage id="chat.approval.field.progress_counts" defaultMessage="Progress counts" />}>
            {d.needs_whole_amount ? intl.formatMessage({ id: 'chat.budget.setAside', defaultMessage: 'Set aside' }) : intl.formatMessage({ id: 'chat.budget.balance', defaultMessage: 'Balance' })}
          </ApprovalFact>
        </ApprovalFacts>
      )}
    </>
  )
}

function GroupBody({ change, d }: { change: ProposedChange; d: Display }) {
  const intl = useAppIntl()
  const group = fmt(d.group_name ?? d.group_id)
  if (change.type === 'group_create') {
    return <ApprovalLead>{fmt(d.name)}</ApprovalLead>
  }
  if (change.type === 'group_rename') {
    return (
      <ApprovalLead>
        {group}
        {d.name ? ` → ${d.name}` : ''}
      </ApprovalLead>
    )
  }
  if (change.type === 'group_reorder') {
    const order: string[] = d.order || []
    return (
      <>
        <ApprovalLead>{intl.formatMessage({ id: 'chat.budget.reorderGroups', defaultMessage: 'Reorder {count, plural, one {# group} other {# groups}}' }, { count: order.length })}</ApprovalLead>
        <ApprovalMeta items={[order.join(' → ')]} />
      </>
    )
  }
  return (
    <>
      <ApprovalLead>{group}</ApprovalLead>
      <ApprovalNote>{<FormattedMessage id="chat.approval.field.its_envelopes_move_to_others" defaultMessage="Its envelopes move to Others" />}</ApprovalNote>
    </>
  )
}

/** Shared body for all Planning / YNAB envelope budget ops, each on the approval-card
 * primitives (docs/APPROVAL_CARDS.md): a plain-words lead with the amount as its figure,
 * the month or the new order as the muted line. */
export function BudgetChangePreview({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  const d: Display = change.display || {}
  const month = fBudgetMonth(d.month)

  if (change.type === 'assign') {
    return (
      <>
        <ApprovalLead figure={amountOf(d)}>
          {intl.formatMessage({ id: 'chat.budget.assignTo', defaultMessage: 'Assign to {envelope}' }, { envelope: envelopeLabel(d.envelope_name ?? d.category_name ?? d.category, d.envelope_id, intl) })}
        </ApprovalLead>
        <ApprovalMeta items={[month]} />
      </>
    )
  }

  if (change.type === 'move_money') {
    const from = envelopeLabel(d.from_envelope_name ?? d.from_category, d.from_envelope_id, intl)
    const to = envelopeLabel(d.to_envelope_name ?? d.to_category, d.to_envelope_id, intl)
    return (
      <>
        <ApprovalLead figure={amountOf(d)}>
          {intl.formatMessage({ id: 'chat.budget.moveFrom', defaultMessage: 'Move from {from} → {to}' }, { from, to })}
        </ApprovalLead>
        <ApprovalMeta items={[month]} />
      </>
    )
  }

  if (change.type === 'set_target') return <TargetBody d={d} />

  if (change.type === 'move_category') {
    return (
      <ApprovalLead>
        {intl.formatMessage({ id: 'chat.budget.moveInto', defaultMessage: 'Move {envelope} into {group}' }, { envelope: envelopeLabel(d.envelope_name ?? d.category_name ?? d.category, d.envelope_id, intl), group: fmt(d.group_name ?? d.group_id) })}
      </ApprovalLead>
    )
  }

  if (change.type === 'reorder_categories') {
    const cats: string[] = d.category_names ?? d.categories ?? []
    return (
      <>
        <ApprovalLead>
          {intl.formatMessage({ id: 'chat.budget.reorderCategories', defaultMessage: 'Reorder {count, plural, one {# category} other {# categories}} in {group}' }, { count: cats.length, group: fmt(d.group_name ?? d.group_id) })}
        </ApprovalLead>
        <ApprovalMeta items={[cats.join(' → ')]} />
      </>
    )
  }

  if (change.type.startsWith('group_')) return <GroupBody change={change} d={d} />

  return <GenericChangePreview change={change} />
}

/** The tool-permission body for apply_budget_operation / set_home_budget_engine, read off the
 * SAME `display.arguments` the generic card carries. The header already names the operation
 * and the method, so the body is only what the header can't say: the params, or the one
 * reassurance a lens switch needs. */
export function BudgetOperationChangePreview({ change }: { change: ProposedChange }) {
  const intl = useAppIntl()
  if (change.grant_tool === 'set_home_budget_engine') {
    return <ApprovalNote>{<FormattedMessage id="chat.approval.field.other_methods_stay_untouched_switching_back_loses_nothing" defaultMessage="Other methods stay untouched; switching back loses nothing" />}</ApprovalNote>
  }

  const args = permissionArguments(change)
  const params =
    args.params != null && typeof args.params === 'object' && !Array.isArray(args.params)
      ? (args.params as Record<string, unknown>)
      : {}
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '')
  if (entries.length === 0) return <ApprovalNote>{<FormattedMessage id="chat.approval.field.no_parameters" defaultMessage="No parameters." />}</ApprovalNote>

  return (
    <ApprovalFacts>
      {entries.map(([k, v]) => (
        <ApprovalFact key={k} label={fieldLabel(k, intl)}>
          {renderGenericValue(v)}
        </ApprovalFact>
      ))}
    </ApprovalFacts>
  )
}
