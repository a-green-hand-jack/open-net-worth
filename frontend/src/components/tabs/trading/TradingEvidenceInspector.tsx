import { useTradingErrorText } from './useTradingErrorText'
import { useState } from 'react'
import { tradingApi, tradingRoot } from '../../../api/trading'
import { useQueryCache } from '../../../state/queryCache'
import type { EvidenceSelection } from '../../../types/trading'
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Loading,
  Modal,
  PageTabs,
  Stack,
  Text,
} from '../../ui'
import { CodeBlock } from '../../chat/CodeBlock'
import { EventPayload } from './TradingAgentWork'
import { tradingMoney, tradingTime } from './presentation'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useTradingLabel } from './useTradingLabel'
import { useTradingNotices } from './useTradingNotices'

export function TradingEvidenceInspector({
  runId,
  selection,
  onClose,
  onSelect,
}: {
  runId: string
  selection: EvidenceSelection
  onClose: () => void
  onSelect?: (selection: EvidenceSelection) => void
}) {
  const { formatMessage } = useAppIntl()
  const errorText = useTradingErrorText()
  const label = useTradingLabel()
  const notices = useTradingNotices()
  const [tab, setTab] = useState('evidence-details')
  const query = useQueryCache(
    `${tradingRoot}/runs/${runId}/evidence/${selection.kind}/${selection.id}`,
    () => tradingApi.evidence(runId, selection),
  )
  const evidence = query.data
  return (
    <Modal
      open
      onClose={onClose}
      title={formatMessage({
        id: 'trading.linkedEvidence',
        defaultMessage: 'Linked trading evidence',
      })}
      size="xl"
    >
      <Stack gap="--space-4">
        <Text size="sm" tone="muted">
          {label(selection.kind)} · {selection.id}
        </Text>
        <PageTabs
          ariaLabel={formatMessage({
            id: 'trading.evidenceSections',
            defaultMessage: 'Evidence sections',
          })}
          value={tab}
          onChange={setTab}
          tabs={[
            {
              key: 'evidence-details',
              label: formatMessage({ id: 'trading.details', defaultMessage: 'Details' }),
            },
            {
              key: 'evidence-data',
              label: formatMessage({ id: 'trading.data', defaultMessage: 'Data' }),
            },
            {
              key: 'evidence-work',
              label: formatMessage({ id: 'trading.agentWork', defaultMessage: 'Agent work' }),
            },
            {
              key: 'evidence-files',
              label: formatMessage({ id: 'trading.files', defaultMessage: 'Files' }),
            },
          ]}
        />
        {query.initialLoading && (
          <Loading
            label={formatMessage({
              id: 'trading.loadingEvidence',
              defaultMessage: 'Loading evidence…',
            })}
          />
        )}
        {!!query.error && (
          <ErrorState message={errorText(query.error)} onRetry={() => void query.refresh()} />
        )}
        {evidence && (
          <div role="tabpanel" aria-labelledby={`ui-page-tab-${tab}`}>
            <Stack gap="--space-4">
              {tab === 'evidence-details' && (
                <>
                  {evidence.orders?.map((order) => (
                    <Button
                      key={order.id}
                      variant="ghost"
                      onClick={() => onSelect?.({ kind: 'order', id: order.id })}
                    >
                      {formatMessage(
                        {
                          id: 'trading.inspectOrderSummary',
                          defaultMessage: 'Inspect order {symbol} · {side} {quantity} · {status}',
                        },
                        {
                          symbol: order.instrument.symbol,
                          side: label(order.side),
                          quantity: String(order.quantity),
                          status: label(order.status),
                        },
                      )}
                    </Button>
                  ))}
                  {evidence.order ? (
                    <>
                      <Badge>{label(evidence.order.status)}</Badge>
                      <Text>
                        {label(evidence.order.side)} {String(evidence.order.quantity)}{' '}
                        {evidence.order.instrument.symbol} · {evidence.order.instrument.venue}
                      </Text>
                      <Text>
                        {formatMessage(
                          {
                            id: 'trading.orderBroker',
                            defaultMessage: 'Order {order} · Broker {broker}',
                          },
                          {
                            order: evidence.order.id,
                            broker:
                              evidence.order.broker_order_id ??
                              formatMessage({
                                id: 'trading.notAssigned',
                                defaultMessage: 'Not assigned',
                              }),
                          },
                        )}
                      </Text>
                      <Text>
                        {formatMessage(
                          {
                            id: 'trading.mandateRevision',
                            defaultMessage: 'Effective mandate revision {revision}',
                          },
                          {
                            revision:
                              evidence.order.mandate_revision ??
                              formatMessage({
                                id: 'trading.notRecorded',
                                defaultMessage: 'Not recorded',
                              }),
                          },
                        )}
                      </Text>
                      <CodeBlock className="trading-code">
                        {JSON.stringify(evidence.order, null, 2)}
                      </CodeBlock>
                    </>
                  ) : (
                    <Text tone="muted">
                      {formatMessage({
                        id: 'trading.noLinkedOrder',
                        defaultMessage:
                          'No order linked to this record. A decision may choose not to trade.',
                      })}
                    </Text>
                  )}
                  {evidence.fills.map((fill) => (
                    <Button
                      variant="ghost"
                      key={fill.id}
                      onClick={() => onSelect?.({ kind: 'fill', id: fill.id })}
                    >
                      {formatMessage(
                        {
                          id: 'trading.fillDetails',
                          defaultMessage: '{time} · {quantity} @ {price} · Fees {fees}',
                        },
                        {
                          time: tradingTime(fill.timestamp),
                          quantity: String(fill.quantity),
                          price: tradingMoney(
                            fill.price,
                            evidence.orders?.find((order) => order.id === fill.order_id)?.instrument
                              .currency ??
                              evidence.order?.instrument.currency ??
                              'USD',
                          ),
                          fees: tradingMoney(
                            fill.fees,
                            evidence.orders?.find((order) => order.id === fill.order_id)?.instrument
                              .currency ??
                              evidence.order?.instrument.currency ??
                              'USD',
                          ),
                        },
                      )}
                    </Button>
                  ))}
                  {!!evidence.missing_links.length && (
                    <Text tone="warn">
                      {notices(evidence.missing_link_messages, evidence.missing_links).join(' · ')}
                    </Text>
                  )}
                </>
              )}
              {tab === 'evidence-data' && (
                <>
                  <Text weight={600}>
                    {
                      notices(
                        evidence.data_context.label_message
                          ? [evidence.data_context.label_message]
                          : undefined,
                        [evidence.data_context.label],
                      )[0]
                    }
                  </Text>
                  {evidence.data_context.usage && (
                    <Text size="sm" tone="muted">
                      {
                        notices(
                          evidence.data_context.usage_message
                            ? [evidence.data_context.usage_message]
                            : undefined,
                          [evidence.data_context.usage],
                        )[0]
                      }
                    </Text>
                  )}
                  <Text size="sm" tone="muted">
                    {formatMessage(
                      {
                        id: 'trading.availabilityCutoff',
                        defaultMessage: 'Availability cutoff {cutoff} · Dataset {dataset}',
                      },
                      {
                        cutoff: tradingTime(evidence.data_context.cutoff),
                        dataset: evidence.data_context.data_version,
                      },
                    )}
                  </Text>
                  {evidence.observations.length ? (
                    <CodeBlock className="trading-code">
                      {JSON.stringify(evidence.observations, null, 2)}
                    </CodeBlock>
                  ) : (
                    <EmptyState
                      title={formatMessage({
                        id: 'trading.dataLinkMissing',
                        defaultMessage: 'Data link not recorded',
                      })}
                    />
                  )}
                </>
              )}
              {tab === 'evidence-work' && (
                <>
                  {evidence.decision ? (
                    <>
                      <Text weight={600}>
                        {formatMessage({
                          id: 'trading.recordedDecision',
                          defaultMessage: 'Recorded decision',
                        })}
                      </Text>
                      <EventPayload event={evidence.decision} runId={runId} />
                    </>
                  ) : (
                    <Text tone="muted">
                      {formatMessage({
                        id: 'trading.decisionLinkMissing',
                        defaultMessage: 'Decision link not recorded.',
                      })}
                    </Text>
                  )}
                  {evidence.events.map((event) => (
                    <details key={event.id}>
                      <summary>
                        {label(event.kind)} ·{' '}
                        {tradingTime(event.environment_time ?? event.created_at)}
                      </summary>
                      <EventPayload event={event} runId={runId} />
                    </details>
                  ))}
                  {!evidence.events.length && (
                    <EmptyState
                      title={formatMessage({
                        id: 'trading.noLinkedWork',
                        defaultMessage: 'No linked work records',
                      })}
                      body={formatMessage({
                        id: 'trading.noLinkedWorkBody',
                        defaultMessage:
                          'Unrecorded rationale or provider reasoning is not reconstructed.',
                      })}
                    />
                  )}
                </>
              )}
              {tab === 'evidence-files' &&
                (evidence.files.length ? (
                  evidence.files.map((file, i) => (
                    <CodeBlock className="trading-code" key={i}>
                      {JSON.stringify(file, null, 2)}
                    </CodeBlock>
                  ))
                ) : (
                  <EmptyState
                    title={formatMessage({
                      id: 'trading.noLinkedFiles',
                      defaultMessage: 'No linked files recorded',
                    })}
                  />
                ))}
            </Stack>
          </div>
        )}
      </Stack>
    </Modal>
  )
}
