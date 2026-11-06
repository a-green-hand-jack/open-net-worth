import { formatImportCount, formatImportNumberParam } from './labels'
import { getNumberLocale } from '../../../utils/format'
import { ynabMessage } from '../automations/datasync/ynabMessages'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { FormattedMessage } from './FormattedMessage'
import { useState } from 'react'
import { Badge, Button, Cluster, Panel, SegmentedControl, Stack, SummaryBar, Text } from '../../ui'
import { ReviewCard } from './ReviewItem'
import { sendSync, useSyncStatus } from './sync'
import type { AssignedChange, CategoryChange, Note, RunRecord, TxnChange } from './runs'

// The report of a sync run: what went to YNAB, what came in, which Assigned figures moved, what
// was filed for review, deferred or refused. Empty sections are left out; a run that changed
// nothing says so. Long lists show 50 at a time.

const PAGE = 50

const money = (v: number | null | undefined, currency = '') =>
  v == null
    ? ''
    : `${v.toLocaleString(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ''}`

function Paged<T>(props: { items: T[]; render: (page: T[]) => React.ReactNode; hidden?: number }) {
  const intl = useAppIntl()
  const [shown, setShown] = useState(PAGE)
  const more = props.items.length - shown
  return (
    <Stack gap="--space-3">
      {props.render(props.items.slice(0, shown))}
      {more > 0 && (
        <Cluster>
          <Button size="sm" variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
            {intl.formatMessage({ id: 'imports.sync.showMore', defaultMessage: 'Show {count} more' }, { count: formatImportCount(Math.min(more, PAGE)) })}
          </Button>
        </Cluster>
      )}
      {!!props.hidden && (
        <Text size="xs" tone="faint">
          {intl.formatMessage({ id: 'imports.sync.notStored', defaultMessage: '+{count} more not stored' }, { count: formatImportCount(props.hidden) })}
        </Text>
      )}
    </Stack>
  )
}

function ChangeCell({ change }: { change: TxnChange }) {
  const intl = useAppIntl()
  if (change.action === 'created') return <>{<FormattedMessage id="imports.static.7d808e24" defaultMessage={"Created"} />}</>
  if (change.action === 'deleted') return <>{<FormattedMessage id="imports.static.248677af" defaultMessage={"Deleted"} />}</>
  return (
    <Stack gap="--space-1">
      {change.fields.map((f) => (
        <Text key={f.name} size="sm">
          {f.field_id && ['date', 'account', 'payee', 'memo', 'category', 'amount', 'cleared'].includes(f.field_id) ? intl.formatMessage({ id: 'imports.sync.field', defaultMessage: '{field, select, date {Date} account {Account} payee {Payee} memo {Memo} category {Category} amount {Amount} other {Cleared}}' }, { field: f.field_id }) : f.name} {f.field_id === 'cleared' && ['yes', 'no'].includes(f.before) ? intl.formatMessage({ id: 'imports.sync.boolean', defaultMessage: '{value, select, yes {yes} other {no}}' }, { value: f.before }) : f.field_id === 'amount' && f.before ? formatImportNumberParam(f.before) : f.before || '—'} → {f.field_id === 'cleared' && ['yes', 'no'].includes(f.after) ? intl.formatMessage({ id: 'imports.sync.boolean', defaultMessage: '{value, select, yes {yes} other {no}}' }, { value: f.after }) : f.field_id === 'amount' && f.after ? formatImportNumberParam(f.after) : f.after || '—'}
        </Text>
      ))}
    </Stack>
  )
}

function TxnTable({ changes }: { changes: TxnChange[] }) {
  const intl = useAppIntl()
  return (
    <table className="imp-table">
      <thead>
        <tr>
          <th>{<FormattedMessage id="imports.static.0aac9844" defaultMessage={"Date"} />}</th>
          <th>{<FormattedMessage id="imports.static.03d9f15a" defaultMessage={"Payee"} />}</th>
          <th>{<FormattedMessage id="imports.static.b28b6f38" defaultMessage={"Account"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.890d7574" defaultMessage={"Amount"} />}</th>
          <th>{<FormattedMessage id="imports.static.47fbfb16" defaultMessage={"Change"} />}</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((c, i) => (
          <tr key={`${c.txn_id}-${i}`}>
            <td data-label={intl.formatMessage({ id: "imports.field.0aac9844", defaultMessage: "Date" })}>{c.date ?? ''}</td>
            <td data-label={intl.formatMessage({ id: "imports.field.03d9f15a", defaultMessage: "Payee" })} className="imp-table__wrap">
              {c.payee || intl.formatMessage({ id: 'imports.review.noPayee', defaultMessage: '(no payee)' })}
            </td>
            <td data-label={intl.formatMessage({ id: "imports.field.b28b6f38", defaultMessage: "Account" })}>{c.account}</td>
            <td data-label={intl.formatMessage({ id: "imports.field.890d7574", defaultMessage: "Amount" })} className="imp-table__num">
              {money(c.amount, c.currency)}
            </td>
            <td data-label={intl.formatMessage({ id: "imports.field.47fbfb16", defaultMessage: "Change" })} className="imp-table__wrap">
              <ChangeCell change={c} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Transactions({ run }: { run: RunRecord }) {
  const intl = useAppIntl()
  const all = run.txn_changes ?? []
  const sent = all.filter((c) => c.direction === 'sent')
  const pulled = all.filter((c) => c.direction === 'pulled')
  const [tab, setTab] = useState<'sent' | 'pulled'>(
    sent.length || !pulled.length ? 'sent' : 'pulled',
  )
  if (all.length === 0) return null
  const totals = run.totals
  return (
    <Panel title={intl.formatMessage({ id: "imports.field.f299c1b4", defaultMessage: "Transactions" })}>
      <Stack gap="--space-3">
        <SegmentedControl
          ariaLabel={intl.formatMessage({ id: "imports.field.bcbb5310", defaultMessage: "Direction" })}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'sent', label: intl.formatMessage({ id: 'imports.sync.sentCount', defaultMessage: 'Sent ({count})' }, { count: formatImportCount(totals?.sent ?? sent.length) }) },
            { value: 'pulled', label: intl.formatMessage({ id: 'imports.sync.pulledCount', defaultMessage: 'Pulled ({count})' }, { count: formatImportCount(totals?.pulled ?? pulled.length) }) },
          ]}
        />
        <Paged
          key={tab}
          items={tab === 'sent' ? sent : pulled}
          hidden={run.not_stored?.txn_changes}
          render={(page) => <TxnTable changes={page} />}
        />
      </Stack>
    </Panel>
  )
}

function AssignedTable({ changes }: { changes: AssignedChange[] }) {
  const intl = useAppIntl()
  return (
    <table className="imp-table">
      <thead>
        <tr>
          <th>{<FormattedMessage id="imports.static.ff3a7b97" defaultMessage={"Category"} />}</th>
          <th>{<FormattedMessage id="imports.static.4f773f02" defaultMessage={"Month"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.bf275fda" defaultMessage={"Before → After"} />}</th>
          <th>{<FormattedMessage id="imports.static.bcbb5310" defaultMessage={"Direction"} />}</th>
        </tr>
      </thead>
      <tbody>
        {changes.map((c, i) => (
          <tr key={`${c.category}-${c.month}-${i}`}>
            <td data-label={intl.formatMessage({ id: "imports.field.ff3a7b97", defaultMessage: "Category" })} className="imp-table__wrap">
              {c.category}
            </td>
            <td data-label={intl.formatMessage({ id: "imports.field.4f773f02", defaultMessage: "Month" })}>{c.month}</td>
            <td data-label={intl.formatMessage({ id: "imports.field.bf275fda", defaultMessage: "Before → After" })} className="imp-table__num">
              {money(c.before)} → {money(c.after)}
            </td>
            <td data-label={intl.formatMessage({ id: "imports.field.bcbb5310", defaultMessage: "Direction" })}>{intl.formatMessage({ id: 'imports.sync.direction', defaultMessage: '{direction, select, sent {Sent to YNAB} other {Pulled in}}' }, { direction: c.direction })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CategoryLines({ changes }: { changes: CategoryChange[] }) {
  const intl = useAppIntl()
  return (
    <Stack gap="--space-2">
      {changes.map((c, i) => (
        <Text key={`${c.text}-${i}`} size="sm">
          {ynabMessage(intl, c.text_message, c.text)}
        </Text>
      ))}
    </Stack>
  )
}

function Notes({ title, notes, hidden }: { title: string; notes: Note[]; hidden?: number }) {
  const intl = useAppIntl()
  if (notes.length === 0) return null
  return (
    <Panel title={title} badge={notes.length}>
      <Stack gap="--space-3">
        {notes.map((n, i) => (
          <div key={`${ynabMessage(intl, n.item_message, n.item)}-${i}`}>
            <Text size="sm" weight={600}>
              {ynabMessage(intl, n.item_message, n.item)}
            </Text>
            <Text as="div" size="xs" tone="faint">
              {ynabMessage(intl, n.reason_message, n.reason)}
            </Text>
          </div>
        ))}
        {!!hidden && (
          <Text size="xs" tone="faint">
            {intl.formatMessage({ id: 'imports.sync.notStored', defaultMessage: '+{count} more not stored' }, { count: formatImportCount(hidden) })}
          </Text>
        )}
      </Stack>
    </Panel>
  )
}

function Conflicts({ run }: { run: RunRecord }) {
  const intl = useAppIntl()
  const live = useSyncStatus().data
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const filed = run.conflicts ?? []
  if (filed.length === 0) return null
  // An open item is shown as it stands now, so it keeps its own kind and buttons.
  const open = new Map((live?.conflicts ?? []).map((c) => [c.id, c]))

  async function keep(id: string, side: 'onw' | 'ynab', choice?: string) {
    setBusy(id)
    setError(await sendSync(`/conflicts/${id}/resolve`, 'POST', { keep: side, choice }))
    setBusy(null)
  }

  return (
    <Panel title={intl.formatMessage({ id: "imports.field.4646c277", defaultMessage: "Conflicts filed" })} badge={filed.length}>
      <Stack gap="--space-4">
        {error && (
          <Text size="sm" tone="bad">
            {error}
          </Text>
        )}
        {filed.map((c) =>
          open.has(c.id) ? (
            <ReviewCard
              key={c.id}
              item={
                open.get(c.id) ?? {
                  id: c.id,
                  kind: 'conflict',
                  title: c.description,
                  title_message: c.description_message,
                  reason: c.reason,
                  reason_message: c.reason_message,
                  onw: c.onw_value,
                  ynab: c.ynab_value,
                }
              }
              busy={busy === c.id || !!live?.running}
              onKeep={(side, choice) => void keep(c.id, side, choice)}
            />
          ) : (
            <Cluster key={c.id} gap="--space-2">
              <Text size="sm">{ynabMessage(intl, c.description_message, c.description)}</Text>
              <Badge tone="muted">{<FormattedMessage id="imports.static.4ea2b199" defaultMessage={"Resolved"} />}</Badge>
            </Cluster>
          ),
        )}
        {!!run.not_stored?.conflicts && (
          <Text size="xs" tone="faint">
            {intl.formatMessage({ id: 'imports.sync.notStored', defaultMessage: '+{count} more not stored' }, { count: formatImportCount(run.not_stored.conflicts) })}
          </Text>
        )}
      </Stack>
    </Panel>
  )
}

export function SyncSections({ run }: { run: RunRecord }) {
  const intl = useAppIntl()
  const t = run.totals
  const assigned = run.assigned_changes ?? []
  const categories = run.category_changes ?? []
  const quiet = !!t && !Object.values(t).some(Boolean)
  if (!t) return null
  return (
    <>
      {quiet && run.status === 'done' ? (
        <Panel title={intl.formatMessage({ id: "imports.field.14c6c425", defaultMessage: "Result" })}>
          <Text size="sm">{<FormattedMessage id="imports.static.636c5b0e" defaultMessage={"Nothing changed."} />}</Text>
        </Panel>
      ) : (
        <SummaryBar
          cards={[
            { label: intl.formatMessage({ id: "imports.field.1af68597", defaultMessage: "Sent" }), value: formatImportCount(t.sent) },
            { label: intl.formatMessage({ id: "imports.field.ee1686b7", defaultMessage: "Pulled" }), value: formatImportCount(t.pulled) },
            { label: intl.formatMessage({ id: "imports.field.48f7f8f3", defaultMessage: "Assigned changes" }), value: formatImportCount(t.assigned) },
            { label: intl.formatMessage({ id: "imports.field.75ae45b8", defaultMessage: "Categories" }), value: formatImportCount(t.categories ?? 0) },
            {
              label: intl.formatMessage({ id: "imports.field.4646c277", defaultMessage: "Conflicts filed" }),
              value: formatImportCount(t.conflicts),
              tone: t.conflicts ? 'warn' : undefined,
            },
            { label: intl.formatMessage({ id: "imports.field.5a128acc", defaultMessage: "Deferred" }), value: formatImportCount(t.deferred) },
            { label: intl.formatMessage({ id: "imports.field.3bfd562b", defaultMessage: "Errors" }), value: formatImportCount(t.errors), tone: t.errors ? 'neg' : undefined },
          ]}
        />
      )}
      <Transactions run={run} />
      {assigned.length > 0 && (
        <Panel title={intl.formatMessage({ id: "imports.field.f2ecaecc", defaultMessage: "Assigned" })}>
          <Paged
            items={assigned}
            hidden={run.not_stored?.assigned_changes}
            render={(page) => <AssignedTable changes={page} />}
          />
        </Panel>
      )}
      {categories.length > 0 && (
        <Panel title={intl.formatMessage({ id: "imports.field.75ae45b8", defaultMessage: "Categories" })} badge={categories.length}>
          <Paged
            items={categories}
            hidden={run.not_stored?.category_changes}
            render={(page) => <CategoryLines changes={page} />}
          />
        </Panel>
      )}
      <Notes title={intl.formatMessage({ id: "imports.field.5f014719", defaultMessage: "Worth knowing" })} notes={run.notes ?? []} hidden={run.not_stored?.notes} />
      <Conflicts run={run} />
      <Notes title={intl.formatMessage({ id: "imports.field.5a128acc", defaultMessage: "Deferred" })} notes={run.deferred ?? []} hidden={run.not_stored?.deferred} />
      <Notes title={intl.formatMessage({ id: "imports.field.3bfd562b", defaultMessage: "Errors" })} notes={run.errors ?? []} hidden={run.not_stored?.errors} />
    </>
  )
}
