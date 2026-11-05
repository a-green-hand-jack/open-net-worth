import { useTradingErrorText } from './useTradingErrorText'
import { useState } from 'react'
import { useQueryCache } from '../../../state/queryCache'
import { tradingApi, tradingRoot } from '../../../api/trading'
import {
  Panel,
  Button,
  Badge,
  EmptyState,
  Loading,
  ErrorState,
  Stack,
  Cluster,
  Text,
  Modal,
} from '../../ui'
import type { TradingEvent } from '../../../types/trading'
import { tradingTime } from './presentation'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useTradingLabel } from './useTradingLabel'

export function TradingActivity({
  runId,
  artifactsOnly = false,
}: {
  runId: string
  artifactsOnly?: boolean
}) {
  const { formatMessage } = useAppIntl()
  const errorText = useTradingErrorText()
  const label = useTradingLabel()
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<TradingEvent | null>(null)
  const query = useQueryCache(`${tradingRoot}/runs/${runId}/events?offset=${offset}&limit=50`, () =>
    tradingApi.events(runId, offset),
  )
  const events = (query.data?.items ?? []).filter(
    (event) =>
      !artifactsOnly ||
      event.kind.includes('script') ||
      (Array.isArray(event.payload.artifacts) && event.payload.artifacts.length > 0),
  )
  return (
    <Panel
      title={
        artifactsOnly
          ? formatMessage({ id: 'trading.artifacts', defaultMessage: 'Artifacts' })
          : formatMessage({ id: 'trading.activity', defaultMessage: 'Activity' })
      }
    >
      <Stack gap="--space-4">
        {query.initialLoading && (
          <Loading
            label={formatMessage({
              id: 'trading.loadingActivity',
              defaultMessage: 'Loading activity…',
            })}
          />
        )}
        {!!query.error && (
          <ErrorState
            message={formatMessage(
              { id: 'trading.updatesInterrupted', defaultMessage: 'Updates interrupted. {error}' },
              { error: errorText(query.error) },
            )}
            onRetry={() => void query.refresh()}
          />
        )}
        {!query.initialLoading && !query.error && !events.length && (
          <EmptyState
            title={
              artifactsOnly
                ? formatMessage({
                    id: 'trading.noArtifacts',
                    defaultMessage: 'No artifacts on this page',
                  })
                : formatMessage({
                    id: 'trading.noAgentActivity',
                    defaultMessage: 'No agent activity yet',
                  })
            }
            body={
              artifactsOnly
                ? formatMessage({
                    id: 'trading.noArtifactsBody',
                    defaultMessage:
                      'Script source, execution results and decision artifacts are retained with their activity.',
                  })
                : formatMessage({
                    id: 'trading.noAgentActivityBody',
                    defaultMessage:
                      'Decisions, orders, failures and lifecycle changes will appear here.',
                  })
            }
          />
        )}
        {events.map((event) => (
          <div key={event.id} className="trading-event">
            <Cluster justify="between">
              <Badge
                tone={
                  event.kind.includes('error') || event.kind.includes('failed') ? 'neg' : 'neutral'
                }
              >
                {label(event.kind)}
              </Badge>
              <Text size="xs" tone="muted">
                {formatMessage(
                  {
                    id: 'trading.activityTimes',
                    defaultMessage: '{environment} · received {received}',
                  },
                  {
                    environment: tradingTime(event.environment_time),
                    received: tradingTime(event.created_at),
                  },
                )}
              </Text>
            </Cluster>
            {typeof event.payload.summary === 'string' && (
              <Text as="p">{event.payload.summary}</Text>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSelected(event)}>
              {artifactsOnly
                ? formatMessage({
                    id: 'trading.viewArtifact',
                    defaultMessage: 'View artifact details',
                  })
                : formatMessage({ id: 'trading.viewEvent', defaultMessage: 'View event details' })}
            </Button>
          </div>
        ))}
        <Cluster justify="between">
          <Button
            disabled={offset === 0}
            onClick={() => setOffset((value) => Math.max(0, value - 50))}
          >
            {formatMessage({ id: 'trading.previousEvents', defaultMessage: 'Previous events' })}
          </Button>
          <Text size="xs" tone="muted">
            {formatMessage(
              {
                id: 'trading.eventCount',
                defaultMessage: '{count, plural, one {# event} other {# events}}',
              },
              { count: query.data?.total ?? 0 },
            )}
          </Text>
          <Button
            disabled={offset + 50 >= (query.data?.total ?? 0)}
            onClick={() => setOffset((value) => value + 50)}
          >
            {formatMessage({ id: 'trading.nextEvents', defaultMessage: 'Next events' })}
          </Button>
        </Cluster>
        {selected && (
          <Modal open onClose={() => setSelected(null)} title={label(selected.kind)} size="lg">
            <pre className="trading-code">{JSON.stringify(selected.payload, null, 2)}</pre>
          </Modal>
        )}
      </Stack>
    </Panel>
  )
}
