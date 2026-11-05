import { useState } from 'react'
import {
  Badge,
  Button,
  Cluster,
  Container,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  SegmentedControl,
  Stack,
  Text,
  TabSkeleton,
} from '../ui'
import type { BadgeTone } from '../ui'
import { useInbox, type InboxItem } from '../../hooks/useInbox'
import { DeduplicationSection } from './dedup/DeduplicationSection'
import { useRegisterScreenFacts } from '../../lucius/useScreenContract'
import { entityRefProps } from '../../utils/mentionable'
import { buildCtxFields } from '../../lucius/ctxFields'
import { filterByDescriptor } from '../../lucius/entityRegistry'
import { X } from '../../ui/icons'
import { useAppIntl } from '../../i18n/useAppIntl'
import { defineMessages, type IntlShape } from 'react-intl'
import { inboxMessage } from './inboxMessages'

// ── Display helpers ───────────────────────────────────────────────────────────

function relative(iso: string | null | undefined, intl: IntlShape): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000))
  if (mins < 1) return intl.formatMessage({ id: 'inbox.justNow', defaultMessage: 'just now' })
  if (mins < 60)
    return intl.formatMessage(
      { id: 'inbox.minutesAgo', defaultMessage: '{count}m ago' },
      { count: mins },
    )
  if (mins < 1440)
    return intl.formatMessage(
      { id: 'inbox.hoursAgo', defaultMessage: '{count}h ago' },
      { count: Math.round(mins / 60) },
    )
  return intl.formatMessage(
    { id: 'inbox.daysAgo', defaultMessage: '{count}d ago' },
    { count: Math.round(mins / 1440) },
  )
}

type ExtendedKind = InboxItem['kind'] | 'dedup_review'

// Per-kind visual identity: section title, badge tone, and glyph shown in the header.
const KIND_META: Record<
  ExtendedKind,
  { label: string; sectionTitle: string; tone: BadgeTone; icon: string }
> = {
  dedup_review: {
    label: 'Duplicate review',
    sectionTitle: 'Duplicate review',
    tone: 'warn',
    icon: '⟺',
  },
  intel: { label: 'Intel', sectionTitle: 'Intel', tone: 'warn', icon: '◎' },
  signal: { label: 'Signal', sectionTitle: 'Signals', tone: 'neutral', icon: '⬆' },
}

/** Human label for the destination tab an item opens. */
const TAB_LABEL: Record<string, string> = {
  intel: 'Intel',
}
const sourceLabels = defineMessages({
  intel: { id: 'inbox.source.intel', defaultMessage: 'intel' },
  notification: { id: 'inbox.source.notification', defaultMessage: 'notification' },
  price_alert: { id: 'inbox.source.priceAlert', defaultMessage: 'price_alert' },
  alert: { id: 'inbox.source.alert', defaultMessage: 'alert' },
  news: { id: 'inbox.source.news', defaultMessage: 'news' },
  macro: { id: 'inbox.source.macro', defaultMessage: 'macro' },
  opportunity: { id: 'inbox.source.opportunity', defaultMessage: 'opportunity' },
  review: { id: 'inbox.source.review', defaultMessage: 'review' },
})

/** Kinds rendered in display order — actionable kinds first. */
const KIND_ORDER: ExtendedKind[] = ['dedup_review', 'intel', 'signal']

/** How many rows to show before "Show more" collapses the rest. */
const SECTION_CAP = 5

/** An item is actionable if it sits in the API's top band. */
function isActionable(item: InboxItem): boolean {
  if (item.kind === 'intel' && item.status === 'action_needed') return true
  return false
}

type Filter = 'unread' | 'all' | 'pending_approvals'

/** An item needs approval if it has a proposed_change waiting for a human to apply.
 *  STUB: hard-coded false, so the `pending_approvals` filter matches nothing today. Left as-is
 *  rather than implemented from the docstring — which items qualify is a product call. */
function needsApproval(_item: InboxItem): boolean {
  return false
}

// ── Per-kind section ─────────────────────────────────────────────────────────

/** One grouped section (e.g. "Findings [3]") rendered as a Panel with a count
 * badge and an optional "Show more / Show less" toggle. Items beyond SECTION_CAP
 * are hidden until expanded. Empty sections render nothing (not even a header). */
function KindSection({
  kind,
  items,
  onNavigate,
  onDismiss,
}: {
  kind: InboxItem['kind']
  items: InboxItem[]
  onNavigate: (tab: string) => void
  onDismiss: (item: InboxItem) => void
}) {
  const { formatMessage } = useAppIntl()
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null

  const meta = KIND_META[kind]
  const visible = expanded ? items : items.slice(0, SECTION_CAP)
  const overflow = items.length - SECTION_CAP
  const hasMore = overflow > 0

  const sectionBadge = <Badge tone={meta.tone}>{items.length}</Badge>

  return (
    <Panel
      title={
        <span className="inbox-section__title">
          <span className="inbox-section__icon" aria-hidden="true">
            {meta.icon}
          </span>
          {kind === 'signal'
            ? formatMessage({ id: 'inbox.signals', defaultMessage: 'Signals' })
            : formatMessage({ id: 'inbox.intel', defaultMessage: 'Intel' })}
        </span>
      }
      badge={sectionBadge}
      className="inbox-section"
    >
      <Stack gap="--space-3">
        {visible.map((item) => (
          <InboxRow key={item.id} item={item} onNavigate={onNavigate} onDismiss={onDismiss} />
        ))}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((e) => !e)}
            className="inbox-section__show-more"
          >
            {expanded
              ? formatMessage({ id: 'inbox.showLess', defaultMessage: 'Show less' })
              : formatMessage(
                  { id: 'inbox.showMore', defaultMessage: 'Show {count} more' },
                  { count: overflow },
                )}
          </Button>
        )}
      </Stack>
    </Panel>
  )
}

// ── Tab ───────────────────────────────────────────────────────────────────────

export function Inbox({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { formatMessage } = useAppIntl()
  const [filter, setFilter] = useState<Filter>('unread')
  const { items, loading, error, reload, dismiss, dismissAll, markAllRead } = useInbox(
    filter === 'all',
  )

  useRegisterScreenFacts(() => [
    ['Inbox items', String(allItems.length)],
    ['Unread', String(unreadCount)],
  ])

  if (loading)
    return (
      <Container size="wide">
        <TabSkeleton
          variant="inbox"
          label={formatMessage({ id: 'inbox.loading', defaultMessage: 'Loading inbox…' })}
        />
      </Container>
    )
  if (error)
    return (
      <Container size="wide">
        <ErrorState message={error} onRetry={reload} />
      </Container>
    )

  const allItems = items ?? []
  const list = filter === 'pending_approvals' ? allItems.filter(needsApproval) : allItems
  const dismissableCount = list.length
  const unreadCount = allItems.filter((it) => !it.read).length

  // Group items by kind, preserving server order within each group.
  const byKind: Record<ExtendedKind, InboxItem[]> = {
    dedup_review: [],
    intel: [],
    signal: [],
  }
  for (const item of list) {
    byKind[item.kind].push(item)
  }

  // dedup_review is always rendered (manages its own data); count it when not suppressed
  const dedupVisible = filter !== 'pending_approvals'
  const totalSections =
    (dedupVisible ? 1 : 0) +
    KIND_ORDER.filter((k) => k !== 'dedup_review' && byKind[k].length > 0).length

  return (
    <Container size="wide" data-ctx-region="content" data-ctx-title="Inbox">
      <Stack gap="--space-6">
        <PageHeader
          title={formatMessage({ id: 'inbox.title', defaultMessage: 'Inbox' })}
          subtitle={formatMessage({
            id: 'inbox.subtitle',
            defaultMessage: 'Everything that needs your attention, in one place',
          })}
          actions={
            <Cluster gap="--space-3" align="center">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void markAllRead()}
                  title={formatMessage({
                    id: 'inbox.markReadTitle',
                    defaultMessage: 'Mark all unread items as read',
                  })}
                >
                  {formatMessage({ id: 'inbox.markRead', defaultMessage: 'Mark all read' })}
                </Button>
              )}
              {dismissableCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (
                      confirm(
                        formatMessage(
                          {
                            id: 'inbox.dismissAllConfirm',
                            defaultMessage:
                              'Dismiss all {count, plural, one {# item} other {# items}}? This removes intel alerts and notifications — not your transactions or portfolio data.',
                          },
                          { count: dismissableCount },
                        ),
                      )
                    )
                      void dismissAll()
                  }}
                >
                  {formatMessage(
                    { id: 'inbox.dismissAll', defaultMessage: 'Dismiss all ({count})' },
                    { count: dismissableCount },
                  )}
                </Button>
              )}
              <SegmentedControl<Filter>
                options={[
                  {
                    value: 'unread',
                    label: formatMessage({ id: 'inbox.unread', defaultMessage: 'Unread' }),
                  },
                  {
                    value: 'all',
                    label: formatMessage({ id: 'inbox.all', defaultMessage: 'All' }),
                  },
                  {
                    value: 'pending_approvals',
                    label: formatMessage({
                      id: 'inbox.pending',
                      defaultMessage: 'Pending Approvals',
                    }),
                  },
                ]}
                value={filter}
                onChange={setFilter}
                ariaLabel={formatMessage({
                  id: 'inbox.filter',
                  defaultMessage: 'Filter inbox items',
                })}
              />
            </Cluster>
          }
        />

        {/* totalSections === 0 implies !dedupVisible (the dedup section counts as 1 when
            visible), so this empty state only ever renders under the pending-approvals
            filter — the unread/all filters always render the dedup section instead. */}
        {totalSections === 0 && !dedupVisible ? (
          <EmptyState
            title={formatMessage({ id: 'inbox.noPending', defaultMessage: 'No pending approvals' })}
            body={formatMessage({
              id: 'inbox.noPendingBody',
              defaultMessage: 'Nothing is waiting for your approval right now.',
            })}
          />
        ) : (
          <Stack gap="--space-5">
            {KIND_ORDER.map((kind) => {
              if (kind === 'dedup_review') {
                return <DeduplicationSection key="dedup_review" filter={filter} />
              }
              return (
                <KindSection
                  key={kind}
                  kind={kind as InboxItem['kind']}
                  items={byKind[kind]}
                  onNavigate={onNavigate}
                  onDismiss={dismiss}
                />
              )
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  )
}

// ── Item row ────────────────────────────────────────────────────────────────

function InboxRow({
  item,
  onNavigate,
  onDismiss,
}: {
  item: InboxItem
  onNavigate: (tab: string) => void
  onDismiss: (item: InboxItem) => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const displayTitle = inboxMessage(intl, item.title_message, item.title)
  const displaySummary = inboxMessage(intl, item.summary_message, item.summary)
  const source = Object.hasOwn(sourceLabels, item.source)
    ? formatMessage(sourceLabels[item.source as keyof typeof sourceLabels])
    : item.source
  const meta = KIND_META[item.kind]
  const actionable = isActionable(item)
  const destTab = item.ref.tab
  const destLabel =
    destTab === 'intel'
      ? formatMessage({ id: 'inbox.intel', defaultMessage: 'Intel' })
      : (TAB_LABEL[destTab] ?? destTab)
  const dismissTitle =
    item.kind === 'signal'
      ? formatMessage({ id: 'inbox.dismissNotification', defaultMessage: 'Dismiss notification' })
      : formatMessage({
          id: 'inbox.removeAlert',
          defaultMessage: 'Remove this alert from the inbox',
        })

  // Every row is clearable from the inbox (signal → read, intel → delete;
  // see useInbox.dismissRequest). A row with a source tab also gets an
  // "Open in …" link to act there; the × just clears it from this list.
  const hasDest = Boolean(destTab)
  const when = relative(item.created_at, intl)

  // Only `signal` rows are a registered mention type: they come from NotificationLogStore
  // (GET /api/inbox folds several sources; the dismiss route for this kind is
  // /api/inbox/signals/{id}) which is exactly what the `notification` descriptor reads
  // (descriptors/new_types.py, order=17). `intel` rows have no registered type, so they
  // stay unwired rather than emitting an unresolvable ref.
  const notificationProps =
    item.kind === 'signal'
      ? {
          ...entityRefProps(
            'notification',
            item.id,
            item.title,
            `${item.title} ${item.summary ?? ''}`,
            meta.label,
          ),
          'data-ctx': '',
          'data-ctx-type': 'notification',
          'data-ctx-fields': buildCtxFields(
            filterByDescriptor('notification', {
              title: item.title,
              summary: item.summary,
              created_at: item.created_at,
            }),
          ),
          draggable: true,
        }
      : {}

  return (
    <Panel
      className={`inbox-item${actionable ? ' inbox-item--actionable' : ''}`}
      {...notificationProps}
    >
      <Stack gap="--space-3">
        <Cluster justify="between" align="start" gap="--space-3">
          <Stack gap="--space-2">
            <Cluster gap="--space-2" align="center">
              <Badge tone={meta.tone}>
                {item.kind === 'signal'
                  ? formatMessage({ id: 'inbox.signal', defaultMessage: 'Signal' })
                  : formatMessage({ id: 'inbox.intel', defaultMessage: 'Intel' })}
              </Badge>
              {actionable && (
                <Badge tone="neg">
                  {formatMessage({ id: 'inbox.needsAttention', defaultMessage: 'Needs attention' })}
                </Badge>
              )}
            </Cluster>
            <Text as="h3" size="md" weight={600} className="inbox-item__title">
              {displayTitle}
            </Text>
          </Stack>
          <Cluster gap="--space-2" align="center">
            {hasDest && (
              <Button variant="secondary" size="sm" onClick={() => onNavigate(destTab)}>
                {formatMessage(
                  { id: 'inbox.openIn', defaultMessage: 'Open in {destination}' },
                  { destination: destLabel },
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(item)}
              aria-label={dismissTitle}
              title={dismissTitle}
            >
              <X size={14} aria-hidden="true" />
            </Button>
          </Cluster>
        </Cluster>

        {displaySummary && (
          <Text tone="muted" size="sm" className="inbox-item__summary">
            {displaySummary}
          </Text>
        )}

        <Cluster gap="--space-2" align="center">
          {item.source && (
            <Text tone="faint" size="xs">
              {source}
            </Text>
          )}
          {item.source && when && (
            <Text tone="faint" size="xs">
              •
            </Text>
          )}
          {when && (
            <Text tone="faint" size="xs">
              {when}
            </Text>
          )}
        </Cluster>
      </Stack>
    </Panel>
  )
}
