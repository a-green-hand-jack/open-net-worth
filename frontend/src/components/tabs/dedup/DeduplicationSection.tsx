import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Cluster,
  CollapsibleSection,
  EmptyState,
  ErrorState,
  Loading,
  Panel,
  Stack,
  Text,
} from '../../ui'
import { useMatchReviews } from '../../../hooks/useMatchReviews'
import { listRecentMerges } from '../../../api/matches'
import { DeduplicationPairRow } from './DeduplicationPairRow'
import type { MatchReview, RecentMerge } from '../../../api/matches'
import { fCurrency, fDate } from '../../../utils/format'
import { useAppIntl } from '../../../i18n/useAppIntl'

type InboxFilter = 'unread' | 'all' | 'pending_approvals'

interface DeduplicationSectionProps {
  filter: InboxFilter
}

/** Group reviews by batch_id; ungrouped (null) go under '_ungrouped'. */
function groupByBatch(reviews: MatchReview[]): Record<string, MatchReview[]> {
  const result: Record<string, MatchReview[]> = {}
  for (const r of reviews) {
    const key = r.batch_id ?? '_ungrouped'
    if (!result[key]) result[key] = []
    result[key].push(r)
  }
  return result
}

function formatMergeAmount(merge: RecentMerge): string {
  if (merge.canonical_amount == null) return '—'
  if (!merge.canonical_currency) return String(merge.canonical_amount)
  try {
    return fCurrency(merge.canonical_amount, merge.canonical_currency)
  } catch {
    return `${merge.canonical_amount} ${merge.canonical_currency}`
  }
}

export function DeduplicationSection({ filter }: DeduplicationSectionProps) {
  // Do not render under pending_approvals filter — dedup has its own flow.
  if (filter === 'pending_approvals') return null

  return <DeduplicationSectionInner />
}

function DeduplicationSectionInner() {
  const {
    reviews,
    count,
    supersededCount,
    loading,
    error,
    reload,
    acceptReview,
    dismissReview,
    undoMerge,
    judgeAll,
    accountNames,
  } = useMatchReviews()

  return (
    <DeduplicationSectionContent
      reviews={reviews}
      count={count}
      supersededCount={supersededCount}
      loading={loading}
      error={error ?? null}
      accountNames={accountNames}
      reload={reload}
      acceptReview={acceptReview}
      dismissReview={dismissReview}
      undoMerge={undoMerge}
      judgeAll={judgeAll}
    />
  )
}

interface JudgeResult {
  auto_merged: number
  kept_for_review: number
  cost_capped: boolean
}

interface ContentProps {
  reviews: MatchReview[]
  count: number
  supersededCount: number
  loading: boolean
  error: string | null
  accountNames: Map<string, string>
  reload: () => Promise<void>
  acceptReview: (
    id: string,
  ) => Promise<{ error: string | null; canonicalDescription: string | null }>
  dismissReview: (id: string) => Promise<string | null>
  undoMerge: (absorbed_id: string) => Promise<string | null>
  judgeAll: () => Promise<{
    auto_merged: number
    kept_for_review: number
    judged: number
    cost_capped: boolean
  } | null>
}

// ── UX-1: Judge result notice ─────────────────────────────────────────────────

interface JudgeResultNoticeProps {
  result: JudgeResult
  onDismiss: () => void
}

export function JudgeResultNotice({ result, onDismiss }: JudgeResultNoticeProps) {
  const { formatMessage } = useAppIntl()
  const n = result.auto_merged
  const m = result.kept_for_review
  const mergedText =
    n === 0
      ? formatMessage(
          {
            id: 'dedup.noneMerged',
            defaultMessage:
              'No pairs were auto-merged. {count, plural, one {# match} other {# matches}} kept for your review.',
          },
          { count: m },
        )
      : formatMessage(
          {
            id: 'dedup.merged',
            defaultMessage:
              'Merged {merged, plural, one {# transfer pair} other {# transfer pairs}}. {count, plural, one {# match} other {# matches}} kept for your review.',
          },
          { merged: n, count: m },
        )

  return (
    <Panel className="dedup-judge-notice">
      <Cluster justify="between" align="start">
        <Stack gap="--space-1">
          <Text size="sm">{mergedText}</Text>
          {result.cost_capped && (
            <Text size="xs" tone="warn">
              {formatMessage({
                id: 'dedup.capReached',
                defaultMessage: 'AI cap reached — some pairs need manual review.',
              })}
            </Text>
          )}
        </Stack>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          {formatMessage({ id: 'dedup.dismiss', defaultMessage: 'Dismiss' })}
        </Button>
      </Cluster>
    </Panel>
  )
}

// ── UX-3: Recently auto-merged section ───────────────────────────────────────

interface RecentMergesSectionProps {
  undoMerge: (absorbed_id: string) => Promise<string | null>
  onReload: () => Promise<void>
}

function RecentMergesSection({ undoMerge, onReload }: RecentMergesSectionProps) {
  const { formatMessage } = useAppIntl()
  const [merges, setMerges] = useState<RecentMerge[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void listRecentMerges()
      .then((data) => {
        setMerges(data.merges)
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
      })
  }, [])

  if (!loaded || merges.length === 0) return null

  return (
    <CollapsibleSection
      title={formatMessage({
        id: 'dedup.recent',
        defaultMessage: 'Recently auto-merged (last 7 days)',
      })}
      defaultOpen={false}
    >
      <Stack gap="--space-2">
        {merges.map((merge) => (
          <RecentMergeRow
            key={merge.absorbed_id}
            merge={merge}
            undoMerge={undoMerge}
            onSuccess={() => {
              setMerges((prev) => prev.filter((m) => m.absorbed_id !== merge.absorbed_id))
              void onReload()
            }}
          />
        ))}
      </Stack>
    </CollapsibleSection>
  )
}

interface RecentMergeRowProps {
  merge: RecentMerge
  undoMerge: (absorbed_id: string) => Promise<string | null>
  onSuccess: () => void
}

function RecentMergeRow({ merge, undoMerge, onSuccess }: RecentMergeRowProps) {
  const { formatMessage } = useAppIntl()
  const [undoing, setUndoing] = useState(false)
  const [undoError, setUndoError] = useState<string | null>(null)

  async function handleUndo() {
    setUndoing(true)
    setUndoError(null)
    const err = await undoMerge(merge.absorbed_id)
    setUndoing(false)
    if (err) {
      setUndoError(err)
    } else {
      onSuccess()
    }
  }

  return (
    <Stack gap="--space-1">
      <Panel className="dedup-recent-merge-row">
        <Cluster justify="between" align="center" gap="--space-3">
          <Stack gap="--space-1">
            <Text
              size="sm"
              truncate
              title={`${merge.absorbed_description} → ${merge.canonical_description}`}
            >
              {merge.absorbed_description} → {merge.canonical_description}
            </Text>
            <Cluster gap="--space-2" align="center">
              <Text size="xs" tone="faint">
                {fDate(merge.merged_at, 'short', 'always')} • {formatMergeAmount(merge)}
              </Text>
              <Badge tone="muted">
                {merge.source === 'user'
                  ? formatMessage({ id: 'dedup.you', defaultMessage: 'You' })
                  : merge.source === 'ai'
                    ? formatMessage({ id: 'dedup.ai', defaultMessage: 'AI' })
                    : formatMessage({ id: 'dedup.rule', defaultMessage: 'Rule' })}
              </Badge>
            </Cluster>
          </Stack>
          <Button variant="ghost" size="sm" loading={undoing} onClick={() => void handleUndo()}>
            {formatMessage({ id: 'dedup.undo', defaultMessage: 'Undo' })}
          </Button>
        </Cluster>
      </Panel>
      {undoError && (
        <Text tone="bad" size="xs">
          {undoError}
        </Text>
      )}
    </Stack>
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

function DeduplicationSectionContent({
  reviews,
  count,
  supersededCount,
  loading,
  error,
  accountNames,
  reload,
  acceptReview,
  dismissReview,
  undoMerge,
  judgeAll,
}: ContentProps) {
  const { formatMessage } = useAppIntl()
  const [judging, setJudging] = useState(false)
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null)

  async function handleJudgeAll() {
    setJudging(true)
    const result = await judgeAll()
    setJudging(false)
    if (result) {
      setJudgeResult({
        auto_merged: result.auto_merged,
        kept_for_review: result.kept_for_review,
        cost_capped: result.cost_capped,
      })
    }
  }

  async function handleAcceptAllTransferPairs() {
    const pairs = reviews.filter((r) => r.klass === 'transfer_pair')
    await Promise.allSettled(pairs.map((r) => acceptReview(r.id)))
  }

  async function handleAcceptAllMerges() {
    const merges = reviews.filter((r) => r.klass === 'near_duplicate')
    await Promise.allSettled(merges.map((r) => acceptReview(r.id)))
  }

  async function handleKeepAll() {
    await Promise.allSettled(reviews.map((r) => dismissReview(r.id)))
  }

  const sectionBadge = <Badge tone="warn">{count}</Badge>

  const bulkActions = (
    <Cluster gap="--space-2" align="center">
      <Button variant="primary" size="sm" loading={judging} onClick={() => void handleJudgeAll()}>
        {formatMessage({ id: 'dedup.autoResolve', defaultMessage: 'Auto-resolve' })}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => void handleAcceptAllTransferPairs()}>
        {formatMessage({
          id: 'dedup.acceptTransfers',
          defaultMessage: 'Accept all transfer pairs',
        })}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => void handleAcceptAllMerges()}>
        {formatMessage({ id: 'dedup.acceptMerges', defaultMessage: 'Accept all merges' })}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => void handleKeepAll()}>
        {formatMessage({ id: 'dedup.keepAll', defaultMessage: 'Keep all' })}
      </Button>
    </Cluster>
  )

  const batched = groupByBatch(reviews)
  const batchKeys = Object.keys(batched)

  return (
    <Panel
      title={formatMessage({ id: 'dedup.title', defaultMessage: 'Duplicate review' })}
      badge={sectionBadge}
      actions={bulkActions}
    >
      {loading ? (
        <Loading
          label={formatMessage({
            id: 'dedup.checking',
            defaultMessage: 'Checking for duplicates…',
          })}
        />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Stack gap="--space-4">
          {judgeResult && (
            <JudgeResultNotice result={judgeResult} onDismiss={() => setJudgeResult(null)} />
          )}
          {reviews.length === 0 ? (
            <EmptyState
              title={
                judgeResult
                  ? formatMessage({ id: 'dedup.cleared', defaultMessage: 'Queue cleared' })
                  : formatMessage({ id: 'dedup.empty', defaultMessage: 'No duplicates to review' })
              }
              body={
                judgeResult
                  ? formatMessage({
                      id: 'dedup.clearedBody',
                      defaultMessage:
                        'The auto-resolve pass processed all pending pairs. New duplicates will appear here when detected.',
                    })
                  : formatMessage({
                      id: 'dedup.emptyBody',
                      defaultMessage:
                        'All imports are clean. Reviews appear here automatically when the engine detects a possible duplicate or transfer pair.',
                    })
              }
            />
          ) : (
            <>
              {supersededCount > 0 && (
                <Text as="p" size="xs" tone="faint">
                  {formatMessage(
                    {
                      id: 'dedup.superseded',
                      defaultMessage:
                        '{count, plural, one {# review was resolved — the underlying transaction no longer exists.} other {# reviews were resolved — the underlying transactions no longer exist.}}',
                    },
                    { count: supersededCount },
                  )}
                </Text>
              )}
              {batchKeys.map((batchKey) => {
                const batchReviews = batched[batchKey]
                if (!batchReviews || batchReviews.length === 0) return null
                return (
                  <DeduplicationBatchGroup
                    key={batchKey}
                    batchKey={batchKey}
                    reviews={batchReviews}
                    accountNames={accountNames}
                    onAccept={acceptReview}
                    onDismiss={dismissReview}
                    onUndo={undoMerge}
                    onReload={reload}
                    onAcceptAll={async () => {
                      await Promise.allSettled(batchReviews.map((r) => acceptReview(r.id)))
                    }}
                  />
                )
              })}
            </>
          )}
          {/* Renders in BOTH queue states — self-suppresses when there are no recent merges.
              An auto-resolve that empties the queue must still show what it merged. */}
          <RecentMergesSection undoMerge={undoMerge} onReload={reload} />
        </Stack>
      )}
    </Panel>
  )
}

interface BatchGroupProps {
  batchKey: string
  reviews: MatchReview[]
  accountNames: Map<string, string>
  onAccept: (id: string) => Promise<{ error: string | null; canonicalDescription: string | null }>
  onDismiss: (id: string) => Promise<string | null>
  onUndo: (absorbed_id: string) => Promise<string | null>
  onReload: () => Promise<void>
  onAcceptAll: () => Promise<void>
}

function DeduplicationBatchGroup({
  batchKey,
  reviews,
  accountNames,
  onAccept,
  onDismiss,
  onUndo,
  onReload,
  onAcceptAll,
}: BatchGroupProps) {
  const { formatMessage } = useAppIntl()
  const firstReview = reviews[0]
  const description = firstReview?.batch_description
    ? firstReview.batch_description
    : firstReview?.batch_created_at
      ? formatMessage(
          { id: 'dedup.importOn', defaultMessage: 'Import on {date}' },
          { date: fDate(firstReview.batch_created_at, 'short', 'always') },
        )
      : batchKey === '_ungrouped'
        ? formatMessage({ id: 'dedup.ungrouped', defaultMessage: 'Ungrouped' })
        : batchKey
  const headerText = formatMessage(
    {
      id: 'dedup.batch',
      defaultMessage: '{description} — {count, plural, one {# pair} other {# pairs}}',
    },
    { description, count: reviews.length },
  )

  return (
    <Stack gap="--space-3">
      <Cluster justify="between" align="center" gap="--space-3">
        <Text size="sm" weight={600}>
          {headerText}
        </Text>
        <Button variant="ghost" size="sm" onClick={() => void onAcceptAll()}>
          {formatMessage({ id: 'dedup.acceptBatch', defaultMessage: 'Accept all in batch' })}
        </Button>
      </Cluster>
      <Stack gap="--space-3">
        {reviews.map((review) => (
          <DeduplicationPairRow
            key={review.id}
            review={review}
            accountNames={accountNames}
            onAccept={onAccept}
            onDismiss={onDismiss}
            onUndo={onUndo}
            onReload={onReload}
          />
        ))}
      </Stack>
    </Stack>
  )
}
