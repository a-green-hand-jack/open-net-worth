import { getNumberLocale } from '../../../utils/format'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
import { FormattedMessage } from './FormattedMessage'
import { Badge, Button, Cluster, Grid, Stack, Text } from '../../ui'
import type { ReviewItem as Item, Version } from './sync'
import { ynabMessage } from '../automations/datasync/ynabMessages'

// One thing the sync would not apply on its own: both versions side by side, and the choice of
// which one wins on BOTH sides.

const money = (v: number | null | undefined) =>
  v == null
    ? ''
    : v.toLocaleString(getNumberLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const FIELDS: { key: keyof Version; label: string }[] = [
  { key: 'amount', label: 'Amount' },
  { key: 'date', label: 'Date' },
  { key: 'account', label: 'Account' },
  { key: 'payee', label: 'Payee' },
  { key: 'category', label: 'Category' },
  { key: 'memo', label: 'Memo' },
  { key: 'cleared', label: 'Cleared' },
]

function shown(key: keyof Version, v: Version | null, intl: IntlShape): string {
  if (v === null) return intl.formatMessage({ id: 'imports.reviewItem.deleted', defaultMessage: 'Deleted' })
  const value = v[key]
  if (value == null || value === '') return '—'
  if (key === 'amount') return money(value as number)
  if (key === 'cleared') return intl.formatMessage({ id: 'imports.reviewItem.cleared', defaultMessage: '{cleared, select, yes {Cleared} other {Uncleared}}' }, { cleared: value ? 'yes' : 'no' })
  return String(value)
}

/** The fields the two sides disagree on, in reading order; a side that is gone differs on all. */
function differences(onw: Version | null, ynab: Version | null) {
  if (onw === null || ynab === null) return [{ key: 'amount' as const, label: 'Transaction' }]
  return FIELDS.filter(
    ({ key }) => onw[key] !== ynab[key] && (onw[key] ?? '') !== (ynab[key] ?? ''),
  )
}

function context(v: Version | null): string {
  if (!v) return ''
  return [v.date, v.account, v.payee, v.amount != null ? money(v.amount) : null]
    .filter(Boolean)
    .join(' · ')
}

function Differences({ onw, ynab }: { onw: Version | null; ynab: Version | null }) {
  const intl = useAppIntl()
  const rows = differences(onw, ynab)
  if (rows.length === 0) return null
  const gone = onw === null || ynab === null
  return (
    <Stack gap="--space-2">
      {rows.map(({ key, label }) => (
        <div key={label}>
          <Text size="xs" weight={600}>
            {intl.formatMessage({ id: 'imports.reviewItem.field', defaultMessage: '{field, select, amount {Amount} date {Date} account {Account} payee {Payee} category {Category} memo {Memo} cleared {Cleared} other {Transaction}}' }, { field: gone ? 'transaction' : key })}
          </Text>
          <Grid min={200} gap="--space-3">
            <Text size="sm">
              <Text size="xs" tone="faint">
                Open Net Worth:{' '}
              </Text>
              {gone ? (onw === null ? intl.formatMessage({ id: 'imports.reviewItem.deleted', defaultMessage: 'Deleted' }) : context(onw)) : shown(key, onw, intl)}
            </Text>
            <Text size="sm">
              <Text size="xs" tone="faint">
                YNAB:{' '}
              </Text>
              {gone ? (ynab === null ? intl.formatMessage({ id: 'imports.reviewItem.deleted', defaultMessage: 'Deleted' }) : context(ynab)) : shown(key, ynab, intl)}
            </Text>
          </Grid>
        </div>
      ))}
    </Stack>
  )
}

const badgeOf = (item: Item, intl: IntlShape) =>
  !['conflict', 'unsupported', 'failed', 'before_start', 'choose'].includes(item.kind) ? item.kind : intl.formatMessage({ id: 'imports.reviewItem.badge', defaultMessage: "{kind, select, differs {Differs} conflict {Changed in both} unsupported {YNAB can't take it} failed {Refused} before_start {Before the Starting Balance} other {Needs your choice}}" }, { kind: item.kind === 'conflict' && item.fresh ? 'differs' : item.kind })

function reviewFieldLabel(id: string | undefined, fallback: string, intl: IntlShape): string {
  return id && ['name', 'hidden', 'group'].includes(id)
    ? intl.formatMessage({ id: 'imports.reviewItem.categoryField', defaultMessage: '{field, select, name {Name} hidden {Visibility} other {Group}}' }, { field: id })
    : fallback
}

type Keep = (keep: 'onw' | 'ynab', choice?: string) => void

// A category or a group: what differs is a few words, and a category YNAB has that could go
// with several things here asks which. Each button says what it does.
function NameCard(props: { item: Item; busy: boolean; onKeep: Keep }) {
  const intl = useAppIntl()
  const { item, busy, onKeep } = props
  const asking = item.kind === 'choose' && item.entity === 'new_category'
  const ours = item.category !== undefined // a category here YNAB would not take
  return (
    <Stack gap="--space-2">
      <Cluster gap="--space-2" align="center">
        <Text size="sm" weight={600}>
          {ynabMessage(intl, item.title_message, item.title)}
        </Text>
        <Badge tone={item.kind === 'failed' ? 'neg' : 'warn'}>{badgeOf(item, intl)}</Badge>
      </Cluster>
      <Text size="sm" tone={item.kind === 'failed' ? 'bad' : 'faint'}>
        {ynabMessage(intl, item.reason_message, item.reason)}
      </Text>
      {(item.fields ?? []).map((f) => (
        <Grid key={f.label} min={200} gap="--space-3">
          <Text size="sm">
            <Text size="xs" tone="faint">
              {intl.formatMessage({ id: 'imports.reviewItem.fieldFor', defaultMessage: 'Open Net Worth {field}:' }, { field: reviewFieldLabel(f.field_id, f.label, intl).toLowerCase() })}{' '}
            </Text>
            {ynabMessage(intl, f.onw_message, f.onw)}
          </Text>
          <Text size="sm">
            <Text size="xs" tone="faint">
              {intl.formatMessage({ id: 'imports.reviewItem.fieldForYnab', defaultMessage: 'YNAB {field}:' }, { field: reviewFieldLabel(f.field_id, f.label, intl).toLowerCase() })}{' '}
            </Text>
            {ynabMessage(intl, f.ynab_message, f.ynab)}
          </Text>
        </Grid>
      ))}
      <Cluster gap="--space-2">
        {asking ? (
          <>
            {(item.options ?? []).map((o) => (
              <Button key={o.ref} size="sm" disabled={busy} onClick={() => onKeep('onw', o.ref)}>
                {intl.formatMessage({ id: 'imports.reviewItem.choice', defaultMessage: '{kind, select, envelope {Add it to {name}} other {Use {name}}}' }, { kind: o.ref.startsWith('env:') ? 'envelope' : 'category', name: o.name })}
              </Button>
            ))}
            <Button size="sm" disabled={busy} onClick={() => onKeep('ynab')}>
              {<FormattedMessage id="imports.static.a91ae05a" defaultMessage={"Add as a new category"} />}
            </Button>
          </>
        ) : item.entity === 'budget' ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => onKeep('ynab')}>
              {<FormattedMessage id="imports.static.b96e8cdf" defaultMessage={"Give it an envelope"} />}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => onKeep('onw')}>
              {<FormattedMessage id="imports.static.a7d89201" defaultMessage={"Leave it without one"} />}
            </Button>
          </>
        ) : item.entity === 'new_category' ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => onKeep(ours ? 'onw' : 'ynab')}>
              {<FormattedMessage id="imports.static.0c1dae16" defaultMessage={"Try again"} />}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => onKeep(ours ? 'ynab' : 'onw')}>
              {intl.formatMessage({ id: 'imports.reviewItem.leaveOut', defaultMessage: '{ours, select, yes {Leave it out of YNAB} other {Leave it out}}' }, { ours: ours ? 'yes' : 'no' })}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" disabled={busy} onClick={() => onKeep('onw')}>
              {<FormattedMessage id="imports.static.d583de1c" defaultMessage={"Keep Open Net Worth's"} />}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => onKeep('ynab')}>
              {<FormattedMessage id="imports.static.5304c796" defaultMessage={"Keep YNAB's"} />}
            </Button>
          </>
        )}
      </Cluster>
    </Stack>
  )
}

// Moving a Starting Balance is never automatic: the card states both outcomes and the button
// names the move it makes.
function StartCard(props: { item: Item; busy: boolean; onKeep: Keep }) {
  const intl = useAppIntl()
  const { item } = props
  const cur = item.currency ? ` ${item.currency}` : ''
  return (
    <Stack gap="--space-2">
      <Cluster gap="--space-2" align="center">
        <Text size="sm" weight={600}>
          {ynabMessage(intl, item.title_message, item.title)}
        </Text>
        <Badge tone="warn">{badgeOf(item, intl)}</Badge>
      </Cluster>
      <Text size="sm" tone="faint">
        {ynabMessage(intl, item.reason_message, item.reason)}
      </Text>
      <Grid min={200} gap="--space-3">
        <Text size="sm">
          <Text size="xs" tone="faint">
            {intl.formatMessage({ id: 'imports.reviewItem.startDate', defaultMessage: 'Starting Balance date:' })}{' '}
          </Text>
          {item.start} → {item.earliest}
        </Text>
        <Text size="sm">
          <Text size="xs" tone="faint">
            {intl.formatMessage({ id: 'imports.reviewItem.balance', defaultMessage: 'Balance:' })}{' '}
          </Text>
          {money(item.balance_now)}
          {cur} → {money(item.balance_counted)}
          {cur}
        </Text>
      </Grid>
      <Cluster gap="--space-2">
        <Button size="sm" disabled={props.busy} onClick={() => props.onKeep('ynab')}>
          {intl.formatMessage({ id: 'imports.reviewItem.moveStart', defaultMessage: 'Move the Starting Balance to {date}' }, { date: item.earliest ?? '' })}
        </Button>
        <Button size="sm" disabled={props.busy} onClick={() => props.onKeep('onw')}>
          {<FormattedMessage id="imports.static.ce030573" defaultMessage={"Keep as history"} />}
        </Button>
      </Cluster>
    </Stack>
  )
}

export function ReviewCard(props: { item: Item; busy: boolean; onKeep: Keep }) {
  const intl = useAppIntl()
  const { item } = props
  if (item.entity === 'start') return <StartCard {...props} />
  if (['category', 'group', 'new_category', 'budget'].includes(item.entity ?? ''))
    return <NameCard {...props} />
  return (
    <Stack gap="--space-2">
      <Cluster gap="--space-2" align="center">
        <Text size="sm" weight={600}>
          {ynabMessage(intl, item.title_message, item.title)}
        </Text>
        <Badge tone={item.kind === 'conflict' ? 'warn' : 'neg'}>{badgeOf(item, intl)}</Badge>
      </Cluster>
      <Text
        size="sm"
        weight={item.kind === 'conflict' ? undefined : 600}
        tone={item.kind === 'conflict' ? 'faint' : item.kind === 'failed' ? 'bad' : 'warn'}
      >
        {ynabMessage(intl, item.reason_message, item.reason)}
      </Text>
      <Differences onw={item.onw} ynab={item.ynab} />
      <Text size="xs" tone="faint">
        {context(item.onw ?? item.ynab)}
      </Text>
      <Cluster gap="--space-2">
        {(item.kind !== 'unsupported' || item.ynab === null) && (
          <Button size="sm" disabled={props.busy} onClick={() => props.onKeep('onw')}>
            {<FormattedMessage id="imports.static.d583de1c" defaultMessage={"Keep Open Net Worth's"} />}
          </Button>
        )}
        <Button size="sm" disabled={props.busy} onClick={() => props.onKeep('ynab')}>
          {<FormattedMessage id="imports.static.5304c796" defaultMessage={"Keep YNAB's"} />}
        </Button>
      </Cluster>
    </Stack>
  )
}
