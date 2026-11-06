import { useTradingErrorText } from './useTradingErrorText'
import { useState, type FormEvent } from 'react'
import { tradingApi } from '../../../api/trading'
import type { TradingWorkspace, WorkspaceOverview } from '../../../types/trading'
import {
  Button,
  Cluster,
  ErrorState,
  FormField,
  Modal,
  NumberField,
  Panel,
  Stack,
  Text,
  TextArea,
} from '../../ui'
import { CodeBlock } from '../../chat/CodeBlock'
import { tradingMoney, tradingTime } from './presentation'
import { useAppIntl } from '../../../i18n/useAppIntl'

export function TradingMandate({
  workspace,
  overview,
}: {
  workspace: TradingWorkspace
  overview?: WorkspaceOverview
}) {
  const { formatMessage } = useAppIntl()
  const errorText = useTradingErrorText()
  const [dialog, setDialog] = useState<'original' | 'history' | 'amend' | null>(null)
  const [instructions, setInstructions] = useState(workspace.instructions)
  const [maxOrder, setMaxOrder] = useState(String(workspace.mandate.max_order_notional ?? ''))
  const [reason, setReason] = useState('')
  const [review, setReview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const original = overview?.original_mandate
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!review) {
      setReview(true)
      return
    }
    setBusy(true)
    setError('')
    try {
      await tradingApi.amend(workspace.id, {
        instructions,
        mandate: { ...workspace.mandate, max_order_notional: maxOrder || null },
        reason,
        expected_revision: workspace.revision,
      })
      setDialog(null)
      setReview(false)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  function openAmend() {
    setInstructions(workspace.instructions)
    setMaxOrder(String(workspace.mandate.max_order_notional ?? ''))
    setReason('')
    setReview(false)
    setError('')
    setDialog('amend')
  }
  return (
    <>
      <Panel
        title={formatMessage({ id: 'trading.mandate', defaultMessage: 'Mandate' })}
        className="trading-mandate-panel"
        actions={
          <Cluster>
            <Button size="sm" onClick={() => setDialog('original')}>
              {formatMessage({ id: 'trading.originalMandate', defaultMessage: 'Original mandate' })}
            </Button>
            <Button size="sm" onClick={() => setDialog('history')}>
              {formatMessage(
                {
                  id: 'trading.amendmentCount',
                  defaultMessage: '{count, plural, one {# amendment} other {# amendments}}',
                },
                { count: overview?.amendments.length ?? 0 },
              )}
            </Button>
            <Button size="sm" onClick={openAmend}>
              {formatMessage({ id: 'trading.amendMandate', defaultMessage: 'Amend mandate' })}
            </Button>
          </Cluster>
        }
      >
        <Stack gap="--space-3">
          <Text className="trading-mandate-text">
            {original?.instructions ?? workspace.instructions}
          </Text>
          <Text size="sm" tone="muted">
            {formatMessage(
              {
                id: 'trading.mandateRevisionSummary',
                defaultMessage: '{status} · Effective revision {revision} · {agent}',
              },
              {
                status: original
                  ? formatMessage({
                      id: 'trading.originalPreserved',
                      defaultMessage: 'Original instruction preserved verbatim',
                    })
                  : overview
                    ? formatMessage({
                        id: 'trading.originalMissing',
                        defaultMessage:
                          'Original instruction was not recorded for this earlier workspace',
                      })
                    : formatMessage({
                        id: 'trading.originalLoading',
                        defaultMessage: 'Original mandate is being loaded',
                      }),
                revision: workspace.revision,
                agent: workspace.agent_label,
              },
            )}
          </Text>
          {original && workspace.instructions !== original.instructions && (
            <Text as="p">
              {formatMessage(
                {
                  id: 'trading.currentInstruction',
                  defaultMessage: 'Current instruction: {instruction}',
                },
                { instruction: workspace.instructions },
              )}
            </Text>
          )}
          <Text size="sm">
            {formatMessage(
              {
                id: 'trading.orderBudgetSummary',
                defaultMessage: 'Maximum order {order} · Agent budget {budget}',
              },
              {
                order:
                  workspace.mandate.max_order_notional == null
                    ? formatMessage({
                        id: 'trading.availableAuthorizedCapital',
                        defaultMessage: 'Available authorized capital',
                      })
                    : String(workspace.mandate.max_order_notional),
                budget: tradingMoney(workspace.mandate.max_model_cost_usd, 'USD'),
              },
            )}
          </Text>
        </Stack>
      </Panel>
      {dialog && (
        <Modal
          open
          onClose={() => setDialog(null)}
          title={
            dialog === 'original'
              ? formatMessage({ id: 'trading.originalMandate', defaultMessage: 'Original mandate' })
              : dialog === 'history'
                ? formatMessage({
                    id: 'trading.mandateAmendments',
                    defaultMessage: 'Mandate amendments',
                  })
                : review
                  ? formatMessage({
                      id: 'trading.reviewMandateAmendment',
                      defaultMessage: 'Review mandate amendment',
                    })
                  : formatMessage({ id: 'trading.amendMandate', defaultMessage: 'Amend mandate' })
          }
          size="lg"
        >
          {dialog === 'original' &&
            (original ? (
              <Stack gap="--space-4">
                <Text className="trading-mandate-text">{original.instructions}</Text>
                <Text size="sm" tone="muted">
                  {formatMessage(
                    {
                      id: 'trading.recordedRevision',
                      defaultMessage: 'Recorded {time} · Revision {revision}',
                    },
                    { time: tradingTime(original.created_at), revision: original.revision },
                  )}
                </Text>
                <CodeBlock className="trading-code">{JSON.stringify(original, null, 2)}</CodeBlock>
              </Stack>
            ) : (
              <Text tone="muted">
                {formatMessage({
                  id: 'trading.originalMissingDetails',
                  defaultMessage:
                    'Original mandate was not recorded for this earlier workspace. Current instructions are shown on the workspace page.',
                })}
              </Text>
            ))}
          {dialog === 'history' && (
            <Stack gap="--space-4">
              {overview?.amendments.length ? (
                overview.amendments.map((item) => (
                  <details key={item.id}>
                    <summary>
                      {formatMessage(
                        {
                          id: 'trading.amendmentSummary',
                          defaultMessage: 'Revision {revision} · {reason} · {time}',
                        },
                        {
                          revision: item.revision,
                          reason: item.reason,
                          time: tradingTime(item.created_at),
                        },
                      )}
                    </summary>
                    <CodeBlock className="trading-code">{JSON.stringify(item, null, 2)}</CodeBlock>
                  </details>
                ))
              ) : (
                <Text tone="muted">
                  {formatMessage({
                    id: 'trading.noAmendments',
                    defaultMessage:
                      'No recorded amendments. Earlier order authority is retained when a mandate changes.',
                  })}
                </Text>
              )}
            </Stack>
          )}
          {dialog === 'amend' && (
            <form onSubmit={save}>
              <Stack gap="--space-4">
                <Text tone="muted">
                  {formatMessage({
                    id: 'trading.amendmentWarning',
                    defaultMessage:
                      'The original instruction and earlier execution records remain unchanged. The amendment applies to subsequent work after it takes effect.',
                  })}
                </Text>
                <FormField
                  label={formatMessage({
                    id: 'trading.effectiveInstruction',
                    defaultMessage: 'Effective instruction',
                  })}
                >
                  <TextArea
                    aria-label={formatMessage({
                      id: 'trading.effectiveInstruction',
                      defaultMessage: 'Effective instruction',
                    })}
                    required
                    maxLength={12000}
                    readOnly={review}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={5}
                  />
                </FormField>
                <FormField
                  label={formatMessage({
                    id: 'trading.maximumOrderValue',
                    defaultMessage: 'Maximum order value',
                  })}
                >
                  <NumberField
                    aria-label={formatMessage({
                      id: 'trading.maximumOrderValue',
                      defaultMessage: 'Maximum order value',
                    })}
                    min={0.01}
                    step="any"
                    readOnly={review}
                    value={maxOrder}
                    onChange={(e) => setMaxOrder(e.target.value)}
                  />
                </FormField>
                <FormField
                  label={formatMessage({
                    id: 'trading.reasonAmendment',
                    defaultMessage: 'Reason for amendment',
                  })}
                >
                  <TextArea
                    aria-label={formatMessage({
                      id: 'trading.reasonAmendment',
                      defaultMessage: 'Reason for amendment',
                    })}
                    required
                    maxLength={4000}
                    readOnly={review}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </FormField>
                {error && <ErrorState message={error} />}
                <Cluster>
                  {review && (
                    <Button disabled={busy} onClick={() => setReview(false)}>
                      {formatMessage({
                        id: 'trading.editAmendment',
                        defaultMessage: 'Edit amendment',
                      })}
                    </Button>
                  )}
                  <Button type="submit" variant="primary" disabled={busy}>
                    {busy
                      ? formatMessage({ id: 'trading.applying', defaultMessage: 'Applying…' })
                      : review
                        ? formatMessage({
                            id: 'trading.applyAmendment',
                            defaultMessage: 'Apply amendment',
                          })
                        : formatMessage({
                            id: 'trading.reviewAmendment',
                            defaultMessage: 'Review amendment',
                          })}
                  </Button>
                </Cluster>
              </Stack>
            </form>
          )}
        </Modal>
      )}
    </>
  )
}
