import { useTradingErrorText } from './useTradingErrorText'
import { useEffect, useRef, useState } from 'react'
import { tradingApi, tradingRoot } from '../../../api/trading'
import { useQueryCache } from '../../../state/queryCache'
import type { EvidenceSelection, TradingEvent, TradingRun } from '../../../types/trading'
import {
  Badge,
  Button,
  Cluster,
  EmptyState,
  ErrorState,
  Loading,
  PageTabs,
  Panel,
  Stack,
  Text,
} from '../../ui'
import { CodeBlock } from '../../chat/CodeBlock'
import { tradingMoney, tradingTime } from './presentation'
import { RunTools } from './RunTools'
import { TradingFiles } from './TradingFiles'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useTradingLabel } from './useTradingLabel'
import { asTradingNotice, useTradingNotices } from './useTradingNotices'

export function EventPayload({ event, runId }: { event: TradingEvent; runId?: string }) {
  const { formatMessage } = useAppIntl()
  const errorText = useTradingErrorText()
  const [expanded, setExpanded] = useState(false)
  const chunked = event.payload.availability === 'chunked'
  const query = useQueryCache(
    `${tradingRoot}/runs/${runId}/work/${event.id}`,
    () => tradingApi.workRecord(runId!, event.id),
    { enabled: !!runId && chunked && expanded },
  )
  return (
    <Stack gap="--space-3">
      {chunked && runId && (
        <Button size="sm" onClick={() => setExpanded(true)}>
          {formatMessage({
            id: 'trading.loadCompleteRecord',
            defaultMessage: 'Load complete record',
          })}
        </Button>
      )}
      {query.initialLoading && expanded && (
        <Loading
          label={formatMessage({
            id: 'trading.loadingCompleteRecord',
            defaultMessage: 'Loading complete record…',
          })}
        />
      )}
      {!!query.error && (
        <ErrorState message={errorText(query.error)} onRetry={() => void query.refresh()} />
      )}
      <CodeBlock className="trading-code">
        {JSON.stringify(query.data?.payload ?? event.payload, null, 2)}
      </CodeBlock>
    </Stack>
  )
}
const displayText = (event: TradingEvent) => {
  if (event.kind === 'agent_input') return undefined
  const payload = event.payload
  return [
    'summary',
    'content',
    'text',
    'message',
    ...(event.kind === 'book_projection' ? ['reason'] : []),
  ]
    .map((key) => payload[key])
    .find((value): value is string => typeof value === 'string')
}
function eventName(event: TradingEvent, label: (value: string) => string) {
  const name = event.payload.name ?? event.payload.tool_name
  return `${label(event.kind)}${typeof name === 'string' ? ` · ${name}` : ''}`
}

export function TradingAgentWork({
  run,
  selection,
  highlightedEvent,
  onSelect,
}: {
  run: TradingRun
  selection: EvidenceSelection | null
  highlightedEvent?: TradingEvent | null
  onSelect: (selection: EvidenceSelection) => void
}) {
  const { formatMessage } = useAppIntl()
  const errorText = useTradingErrorText()
  const label = useTradingLabel()
  const notices = useTradingNotices()
  const [tab, setTab] = useState('work-timeline')
  const [manualOffset, setOffset] = useState(0)
  const [follow, setFollow] = useState(true)
  const [ignoredSelection, setIgnoredSelection] = useState<string | null>(null)
  const head = useQueryCache(`${tradingRoot}/runs/${run.id}/events?offset=0&limit=50`, () =>
    tradingApi.events(run.id, 0),
  )
  const total = head.data?.total ?? 0
  const selectedPage =
    highlightedEvent?.sequence && highlightedEvent.id !== ignoredSelection
      ? Math.floor((highlightedEvent.sequence - 1) / 50) * 50
      : null
  const offset =
    selectedPage ?? (follow ? Math.floor(Math.max(0, total - 1) / 50) * 50 : manualOffset)
  const query = useQueryCache(
    `${tradingRoot}/runs/${run.id}/events?offset=${offset}&limit=50`,
    () => tradingApi.events(run.id, offset),
  )
  const events = (query.data?.items ?? []).filter((event) => event.kind !== 'agent_record_part')
  const files = events.filter(
    (event) =>
      event.kind.includes('script') ||
      event.kind.includes('file') ||
      event.kind.includes('artifact') ||
      Array.isArray(event.payload.artifacts),
  )
  const execution = events.filter(
    (event) =>
      event.kind.includes('agent_') ||
      event.kind.includes('script') ||
      event.kind.includes('executor') ||
      event.kind.includes('wake'),
  )
  const visible = tab === 'work-files' ? files : tab === 'work-execution' ? execution : events
  const hasReasoning = events.some((event) => event.kind === 'agent_reasoning')
  const stream = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (selectedPage != null)
      stream.current
        ?.querySelector<HTMLElement>('[data-trading-event-selected="true"]')
        ?.scrollIntoView?.({ block: 'nearest' })
    else if (follow && stream.current) stream.current.scrollTop = stream.current.scrollHeight
  }, [follow, events.length, offset, selectedPage])
  return (
    <Panel
      title={formatMessage({ id: 'trading.agentWork', defaultMessage: 'Agent work' })}
      className="trading-observation-panel"
    >
      <Stack gap="--space-4">
        <Cluster justify="between">
          <Text weight={600}>{run.workspace_snapshot.agent_label}</Text>
          <Badge>{label(run.agent_state)}</Badge>
        </Cluster>
        <Text size="sm" tone="muted">
          {formatMessage(
            {
              id: 'trading.agentCostSummary',
              defaultMessage: 'Agent cost {amount} · Separate from trading P&L',
            },
            { amount: tradingMoney(run.model_cost_usd, 'USD') },
          )}
        </Text>
        <PageTabs
          ariaLabel={formatMessage({
            id: 'trading.agentWorkSections',
            defaultMessage: 'Agent work sections',
          })}
          value={tab}
          onChange={setTab}
          tabs={[
            {
              key: 'work-timeline',
              label: formatMessage({ id: 'trading.timeline', defaultMessage: 'Timeline' }),
            },
            {
              key: 'work-files',
              label: formatMessage({ id: 'trading.files', defaultMessage: 'Files' }),
            },
            {
              key: 'work-execution',
              label: formatMessage({ id: 'trading.execution', defaultMessage: 'Execution' }),
            },
          ]}
        />
        <div role="tabpanel" aria-labelledby={`ui-page-tab-${tab}`}>
          <Stack gap="--space-4">
            {query.initialLoading && (
              <Loading
                label={formatMessage({
                  id: 'trading.loadingAgentWork',
                  defaultMessage: 'Loading agent work…',
                })}
              />
            )}
            {!!query.error && (
              <ErrorState
                message={formatMessage(
                  {
                    id: 'trading.updatesInterrupted',
                    defaultMessage: 'Updates interrupted. {error}',
                  },
                  { error: errorText(query.error) },
                )}
                onRetry={() => void query.refresh()}
              />
            )}
            {!query.initialLoading && !query.error && !visible.length && (
              <EmptyState
                title={
                  tab === 'work-files'
                    ? formatMessage({
                        id: 'trading.noFilesOnPage',
                        defaultMessage: 'No recorded files on this page',
                      })
                    : formatMessage({
                        id: 'trading.noWorkOnPage',
                        defaultMessage: 'No reported work on this page',
                      })
                }
                body={formatMessage({
                  id: 'trading.noReportedDetails',
                  defaultMessage:
                    'The workspace shows actual emitted records. This executor has not reported matching details here.',
                })}
              />
            )}
            {tab === 'work-timeline' && !hasReasoning && (
              <Text size="sm" tone="muted">
                {formatMessage({
                  id: 'trading.noProviderReasoning',
                  defaultMessage:
                    'Provider reasoning was not supplied on this page. Recorded analysis and outputs appear below when available.',
                })}
              </Text>
            )}
            {tab === 'work-execution' && (
              <Text size="sm" tone="muted">
                {formatMessage({
                  id: 'trading.reportedActorsOnly',
                  defaultMessage:
                    'Only reported actor and execution records appear here. A child-agent hierarchy is unavailable unless the executor reports it.',
                })}
              </Text>
            )}
            {tab === 'work-files' && <TradingFiles runId={run.id} onSelect={onSelect} />}
            <div
              ref={stream}
              className="trading-work-stream"
              aria-label={formatMessage({
                id: 'trading.recordedAgentWork',
                defaultMessage: 'Recorded agent work',
              })}
              onScroll={(event) => {
                const element = event.currentTarget
                if (
                  element.scrollHeight - element.scrollTop - element.clientHeight > 80 &&
                  follow
                ) {
                  setOffset(offset)
                  setIgnoredSelection(highlightedEvent?.id ?? null)
                  setFollow(false)
                  setIgnoredSelection(highlightedEvent?.id ?? null)
                }
              }}
            >
              {visible.map((event) => (
                <article
                  key={event.id}
                  data-trading-event-selected={
                    selection?.kind === 'event' && selection.id === event.id ? 'true' : undefined
                  }
                  className={`trading-event${selection?.kind === 'event' && selection.id === event.id ? ' trading-event-selected' : ''}`}
                >
                  <Cluster justify="between">
                    <Text size="sm" weight={600}>
                      {eventName(event, label)}
                    </Text>
                    <Text size="xs" tone="muted">
                      {tradingTime(event.environment_time ?? event.created_at)}
                    </Text>
                  </Cluster>
                  {displayText(event) && (
                    <Text as="p" className="trading-mandate-text">
                      {(event.kind === 'environment_update_failed' ||
                        event.kind === 'agent_recovery') &&
                      typeof event.payload.message === 'string'
                        ? notices(
                            asTradingNotice(event.payload.message_localized)
                              ? [asTradingNotice(event.payload.message_localized)!]
                              : undefined,
                            [event.payload.message],
                          )[0]
                        : event.kind === 'book_projection' &&
                            typeof event.payload.reason === 'string'
                          ? notices(
                              asTradingNotice(event.payload.reason_message)
                                ? [asTradingNotice(event.payload.reason_message)!]
                                : undefined,
                              [event.payload.reason],
                            )[0]
                          : displayText(event)}
                    </Text>
                  )}
                  {event.kind === 'agent_input' && (
                    <Text size="sm" tone="muted">
                      {formatMessage({
                        id: 'trading.recordedInput',
                        defaultMessage:
                          'Recorded input. Expand the record to inspect the exact instructions and environment supplied to the executor.',
                      })}
                    </Text>
                  )}
                  {event.kind === 'agent_reasoning' && (
                    <Text size="xs" tone="muted">
                      {formatMessage(
                        {
                          id: 'trading.reasoningSource',
                          defaultMessage: 'Provider-reported reasoning or summary · {source}',
                        },
                        {
                          source: String(
                            event.payload.source ??
                              formatMessage({ id: 'trading.executor', defaultMessage: 'executor' }),
                          ),
                        },
                      )}
                    </Text>
                  )}
                  <details>
                    <summary>
                      {formatMessage({
                        id: 'trading.inputsOutputs',
                        defaultMessage: 'Inputs, outputs and recorded details',
                      })}
                    </summary>
                    <EventPayload event={event} runId={run.id} />
                  </details>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelect({ kind: 'event', id: event.id })}
                  >
                    {formatMessage({
                      id: 'trading.inspectLinkedEvidence',
                      defaultMessage: 'Inspect linked evidence',
                    })}
                  </Button>
                </article>
              ))}
            </div>
          </Stack>
        </div>
        <Cluster justify="between">
          <Button
            size="sm"
            disabled={offset === 0}
            onClick={() => {
              setFollow(false)
              setIgnoredSelection(highlightedEvent?.id ?? null)
              setOffset(Math.max(0, offset - 50))
            }}
          >
            {formatMessage({ id: 'trading.earlierWork', defaultMessage: 'Earlier work' })}
          </Button>
          <Text size="xs" tone="muted">
            {total
              ? formatMessage(
                  { id: 'trading.recordRange', defaultMessage: '{start}–{end} of {total}' },
                  { start: offset + 1, end: Math.min(offset + 50, total), total },
                )
              : formatMessage({ id: 'trading.noRecords', defaultMessage: '0 records' })}
          </Text>
          <Button
            size="sm"
            disabled={offset + 50 >= total}
            onClick={() => {
              setFollow(false)
              setIgnoredSelection(highlightedEvent?.id ?? null)
              setOffset(offset + 50)
            }}
          >
            {formatMessage({ id: 'trading.laterWork', defaultMessage: 'Later work' })}
          </Button>
          {(!follow || selectedPage != null) && (
            <Button
              size="sm"
              onClick={() => {
                setFollow(true)
                setIgnoredSelection(highlightedEvent?.id ?? null)
              }}
            >
              {formatMessage({ id: 'trading.followLatest', defaultMessage: 'Follow latest' })}
            </Button>
          )}
        </Cluster>
        <details>
          <summary>
            {formatMessage({
              id: 'trading.executorDiagnostics',
              defaultMessage: 'Executor connection and manual diagnostics',
            })}
          </summary>
          <RunTools run={run} />
        </details>
      </Stack>
    </Panel>
  )
}
