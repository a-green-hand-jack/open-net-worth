import { useTradingErrorText } from './useTradingErrorText'
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { tradingApi } from '../../../api/trading'
import type {
  AgentKind,
  DelegationCreate,
  DelegationReview,
  TradingWorkspace,
} from '../../../types/trading'
import {
  Button,
  CheckboxGroup,
  Cluster,
  ErrorState,
  FormField,
  Modal,
  NumberField,
  Panel,
  Select,
  Stack,
  Text,
  TextArea,
  TextField,
} from '../../ui'
import { WorkspaceReview } from './WorkspaceReview'
import { InstrumentFields } from './InstrumentFields'
import { DelegationEnvironment } from './DelegationEnvironment'
import { defaultDelegation } from './delegationDraft'
import { useAppIntl } from '../../../i18n/useAppIntl'

export function WorkspaceForm({
  draft,
  workspace,
  onClose,
  onSaved,
}: {
  draft?: DelegationCreate
  workspace?: TradingWorkspace
  onClose: () => void
  onSaved: (workspace: TradingWorkspace, runId?: string) => void
}) {
  const { formatMessage } = useAppIntl()
  const errorText = useTradingErrorText()
  const [value, setValue] = useState<DelegationCreate>(
    () =>
      draft ?? {
        ...defaultDelegation(
          formatMessage({
            id: 'trading.defaultAllocationName',
            defaultMessage: 'Trading allocation',
          }),
        ),
        ...(workspace
          ? {
              workspace: {
                name: workspace.name,
                instructions: workspace.instructions,
                agent_kind: workspace.agent_kind,
                agent_label: workspace.agent_label,
                mandate: workspace.mandate,
                strategy_source: workspace.strategy_source,
              },
            }
          : {}),
      },
  )
  const [review, setReview] = useState<DelegationReview | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const definition = value.workspace
  const mandate = definition.mandate
  function update(patch: Partial<DelegationCreate['workspace']>) {
    if (!workspace)
      setValue((current) => ({ ...current, workspace: { ...current.workspace, ...patch } }))
  }
  function limit(patch: Partial<typeof mandate>) {
    update({ mandate: { ...mandate, ...patch } })
  }
  useLayoutEffect(() => {
    const active = document.activeElement
    if (
      active === document.body ||
      (active instanceof HTMLButtonElement && active.disabled && formRef.current?.contains(active))
    )
      formRef.current?.focus({ preventScroll: true })
  }, [busy])
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (!review) {
        setReview(await tradingApi.reviewDelegation(value))
        setAuthorized(false)
      } else {
        const payload = {
          workspace: review.workspace,
          environment: {
            ...review.environment,
            live_authorized: review.environment.mode === 'live' && authorized,
          },
          start: true,
        }
        const result = workspace
          ? await tradingApi.activateWorkspace(workspace.id, payload, workspace.revision)
          : await tradingApi.createDelegation(payload)
        onSaved(result.workspace, result.run.id)
      }
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  async function authorizeLive(checked: boolean) {
    setAuthorized(checked)
    if (!review) return
    setBusy(true)
    setError('')
    try {
      setReview(
        await tradingApi.reviewDelegation({
          workspace: review.workspace,
          environment: { ...review.environment, live_authorized: checked },
          start: true,
        }),
      )
    } catch (err) {
      setError(errorText(err))
      setAuthorized(false)
    } finally {
      setBusy(false)
    }
  }
  const isLive = (review?.environment ?? value.environment).mode === 'live'
  return (
    <Modal
      open
      onClose={onClose}
      title={
        review
          ? formatMessage({
              id: 'trading.reviewTradingMandate',
              defaultMessage: 'Review trading mandate',
            })
          : formatMessage({
              id: 'trading.createWorkspace',
              defaultMessage: 'Create trading workspace',
            })
      }
      size="lg"
    >
      <form ref={formRef} tabIndex={-1} onSubmit={submit}>
        <Stack gap="--space-4">
          {review ? (
            <WorkspaceReview
              review={review}
              authorized={authorized}
              busy={busy}
              onAuthorize={authorizeLive}
            />
          ) : (
            <>
              <Text tone="muted">
                {formatMessage({
                  id: 'trading.delegationIntro',
                  defaultMessage:
                    'Define the delegation once. The workspace keeps its mandate, history and working state as the agent researches, trades or waits.',
                })}
              </Text>
              {workspace && (
                <Text size="sm" tone="muted">
                  {formatMessage({
                    id: 'trading.activationFixed',
                    defaultMessage:
                      'This existing mandate is fixed for activation. Use Amend mandate on the workspace to review changes separately.',
                  })}
                </Text>
              )}
              <fieldset className="trading-definition-fields" disabled={!!workspace}>
                <FormField label={formatMessage({ id: 'trading.name', defaultMessage: 'Name' })}>
                  <TextField
                    aria-label={formatMessage({ id: 'trading.name', defaultMessage: 'Name' })}
                    required
                    maxLength={120}
                    value={definition.name}
                    onChange={(e) => update({ name: e.target.value })}
                  />
                </FormField>
                <FormField
                  label={formatMessage({
                    id: 'trading.originalMandate',
                    defaultMessage: 'Original mandate',
                  })}
                >
                  <TextArea
                    aria-label={formatMessage({
                      id: 'trading.originalMandate',
                      defaultMessage: 'Original mandate',
                    })}
                    required
                    rows={4}
                    maxLength={12000}
                    value={definition.instructions}
                    onChange={(e) => update({ instructions: e.target.value })}
                    placeholder={formatMessage({
                      id: 'trading.mandatePlaceholder',
                      defaultMessage:
                        'Manage this allocation for one month. Research opportunities, test strategies and trade within the agreed limits.',
                    })}
                  />
                </FormField>
              </fieldset>
              <Panel
                title={formatMessage({
                  id: 'trading.fundsEnvironment',
                  defaultMessage: 'Funds and environment',
                })}
              >
                <DelegationEnvironment
                  value={value.environment}
                  onChange={(environment) => setValue((current) => ({ ...current, environment }))}
                />
              </Panel>
              <fieldset className="trading-definition-fields" disabled={!!workspace}>
                <Panel
                  title={formatMessage({
                    id: 'trading.delegationLimits',
                    defaultMessage: 'Delegation and limits',
                  })}
                >
                  <Stack gap="--space-4">
                    <FormField
                      label={formatMessage({
                        id: 'trading.executorConnection',
                        defaultMessage: 'Executor connection',
                      })}
                    >
                      <Select
                        aria-label={formatMessage({
                          id: 'trading.executorConnection',
                          defaultMessage: 'Executor connection',
                        })}
                        value={definition.agent_kind}
                        onChange={(e) => {
                          const kind = e.target.value as AgentKind
                          update({
                            agent_kind: kind,
                            agent_label:
                              kind === 'lucius'
                                ? 'Lucius'
                                : kind === 'script'
                                  ? formatMessage({
                                      id: 'trading.scriptExecutor',
                                      defaultMessage: 'Script executor',
                                    })
                                  : formatMessage({
                                      id: 'trading.externalExecutor',
                                      defaultMessage: 'External executor',
                                    }),
                          })
                        }}
                        options={[
                          {
                            value: 'lucius',
                            label: formatMessage({
                              id: 'trading.managedLucius',
                              defaultMessage: 'Lucius (managed)',
                            }),
                          },
                          {
                            value: 'external',
                            label: formatMessage({
                              id: 'trading.externalExecutorOption',
                              defaultMessage: 'External executor (agent, CLI or team)',
                            }),
                          },
                          {
                            value: 'script',
                            label: formatMessage({
                              id: 'trading.scriptExecutor',
                              defaultMessage: 'Script executor',
                            }),
                          },
                        ]}
                      />
                    </FormField>
                    <FormField
                      label={formatMessage({
                        id: 'trading.executorLabel',
                        defaultMessage: 'Executor label',
                      })}
                    >
                      <TextField
                        aria-label={formatMessage({
                          id: 'trading.executorLabel',
                          defaultMessage: 'Executor label',
                        })}
                        required
                        maxLength={120}
                        value={definition.agent_label}
                        onChange={(e) => update({ agent_label: e.target.value })}
                      />
                    </FormField>
                    {definition.agent_kind === 'script' && (
                      <FormField
                        label={formatMessage({
                          id: 'trading.initialStrategySource',
                          defaultMessage: 'Initial strategy source',
                        })}
                        info={formatMessage({
                          id: 'trading.initialStrategyInfo',
                          defaultMessage:
                            'Versioned Python source runs in an isolated container. The executor can continue on scheduled wakes.',
                        })}
                      >
                        <TextArea
                          aria-label={formatMessage({
                            id: 'trading.initialStrategySource',
                            defaultMessage: 'Initial strategy source',
                          })}
                          mono
                          rows={10}
                          required
                          maxLength={64000}
                          value={definition.strategy_source ?? ''}
                          onChange={(e) => update({ strategy_source: e.target.value })}
                        />
                      </FormField>
                    )}
                    <Text size="sm" tone="muted">
                      {formatMessage({
                        id: 'trading.executorDescription',
                        defaultMessage:
                          'One delegated authority may be a single agent or a team. Available controls and visibility depend on its integration. External executors connect through scoped access after creation.',
                      })}
                    </Text>
                    <CheckboxGroup
                      ariaLabel={formatMessage({
                        id: 'trading.permittedMarkets',
                        defaultMessage: 'Permitted markets',
                      })}
                      value={mandate.allowed_asset_classes}
                      onChange={(markets) =>
                        limit({ allowed_asset_classes: markets as ('stock' | 'crypto')[] })
                      }
                      options={[
                        {
                          value: 'stock',
                          label: formatMessage({ id: 'trading.stocks', defaultMessage: 'Stocks' }),
                        },
                        {
                          value: 'crypto',
                          label: formatMessage({ id: 'trading.crypto', defaultMessage: 'Crypto' }),
                        },
                      ]}
                    />
                    <FormField
                      label={formatMessage({
                        id: 'trading.marketData',
                        defaultMessage: 'Market data',
                      })}
                    >
                      <Select
                        aria-label={formatMessage({
                          id: 'trading.marketData',
                          defaultMessage: 'Market data',
                        })}
                        value={mandate.market_data_source ?? 'supplied'}
                        onChange={(e) =>
                          limit({ market_data_source: e.target.value as 'supplied' | 'yahoo' })
                        }
                        options={[
                          {
                            value: 'supplied',
                            label: formatMessage({
                              id: 'trading.suppliedObservations',
                              defaultMessage: 'Supplied observations',
                            }),
                          },
                          {
                            value: 'yahoo',
                            label: formatMessage({
                              id: 'trading.yahooData',
                              defaultMessage: 'Public market data (Yahoo)',
                            }),
                          },
                        ]}
                      />
                    </FormField>
                    <InstrumentFields
                      instruments={mandate.instruments ?? []}
                      onChange={(instruments) => limit({ instruments })}
                    />
                    <FormField
                      label={formatMessage({
                        id: 'trading.maximumOrderValue',
                        defaultMessage: 'Maximum order value',
                      })}
                      info={formatMessage({
                        id: 'trading.maximumOrderInfo',
                        defaultMessage:
                          'In the reporting currency; blank uses available authorized capital.',
                      })}
                    >
                      <NumberField
                        aria-label={formatMessage({
                          id: 'trading.maximumOrderValue',
                          defaultMessage: 'Maximum order value',
                        })}
                        min={0.01}
                        step="any"
                        value={String(mandate.max_order_notional ?? '')}
                        onChange={(e) => limit({ max_order_notional: e.target.value || null })}
                      />
                    </FormField>
                    <FormField
                      label={formatMessage({
                        id: 'trading.agentBudgetUsd',
                        defaultMessage: 'Agent usage budget (USD)',
                      })}
                    >
                      <NumberField
                        aria-label={formatMessage({
                          id: 'trading.agentBudgetUsd',
                          defaultMessage: 'Agent usage budget (USD)',
                        })}
                        required
                        min={0}
                        step="any"
                        value={String(mandate.max_model_cost_usd)}
                        onChange={(e) => limit({ max_model_cost_usd: e.target.value })}
                      />
                    </FormField>
                    <details>
                      <summary>
                        {formatMessage({
                          id: 'trading.executionAssumptions',
                          defaultMessage: 'Execution assumptions',
                        })}
                      </summary>
                      <Stack gap="--space-4">
                        <FormField
                          label={formatMessage({
                            id: 'trading.maximumQuoteAge',
                            defaultMessage: 'Maximum quote age (seconds)',
                          })}
                        >
                          <NumberField
                            aria-label={formatMessage({
                              id: 'trading.maximumQuoteAge',
                              defaultMessage: 'Maximum quote age (seconds)',
                            })}
                            required
                            min={1}
                            max={86400}
                            value={String(mandate.max_quote_age_seconds)}
                            onChange={(e) =>
                              limit({ max_quote_age_seconds: Number(e.target.value) })
                            }
                          />
                        </FormField>
                        <FormField
                          label={formatMessage({
                            id: 'trading.simulationFee',
                            defaultMessage: 'Simulation fee (basis points)',
                          })}
                        >
                          <NumberField
                            aria-label={formatMessage({
                              id: 'trading.simulationFee',
                              defaultMessage: 'Simulation fee (basis points)',
                            })}
                            required
                            min={0}
                            max={1000}
                            step="any"
                            value={String(mandate.fee_bps)}
                            onChange={(e) => limit({ fee_bps: e.target.value })}
                          />
                        </FormField>
                        <FormField
                          label={formatMessage({
                            id: 'trading.simulationSlippage',
                            defaultMessage: 'Simulation slippage (basis points)',
                          })}
                        >
                          <NumberField
                            aria-label={formatMessage({
                              id: 'trading.simulationSlippage',
                              defaultMessage: 'Simulation slippage (basis points)',
                            })}
                            required
                            min={0}
                            max={1000}
                            step="any"
                            value={String(mandate.slippage_bps)}
                            onChange={(e) => limit({ slippage_bps: e.target.value })}
                          />
                        </FormField>
                        <FormField
                          label={formatMessage({
                            id: 'trading.maximumVolumeParticipation',
                            defaultMessage: 'Maximum volume participation',
                          })}
                        >
                          <NumberField
                            aria-label={formatMessage({
                              id: 'trading.maximumVolumeParticipation',
                              defaultMessage: 'Maximum volume participation',
                            })}
                            required
                            min={0.0001}
                            max={1}
                            step="any"
                            value={String(mandate.max_participation)}
                            onChange={(e) => limit({ max_participation: e.target.value })}
                          />
                        </FormField>
                      </Stack>
                    </details>
                  </Stack>
                </Panel>
              </fieldset>
            </>
          )}
          {error && <ErrorState message={error} />}
          <Cluster justify="between">
            {review && (
              <Button
                disabled={busy}
                onClick={() => {
                  setValue({
                    workspace: review.workspace,
                    environment: review.environment,
                    start: true,
                  })
                  setReview(null)
                }}
              >
                {formatMessage({ id: 'trading.editDraft', defaultMessage: 'Edit draft' })}
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={
                busy ||
                !mandate.allowed_asset_classes.length ||
                (!!review && (!review.ready || (isLive && !authorized)))
              }
            >
              {busy
                ? formatMessage({ id: 'trading.checking', defaultMessage: 'Checking…' })
                : review
                  ? isLive
                    ? formatMessage({
                        id: 'trading.createStartLive',
                        defaultMessage: 'Create and start live trading',
                      })
                    : formatMessage({
                        id: 'trading.createStartWorkspace',
                        defaultMessage: 'Create and start workspace',
                      })
                  : formatMessage({
                      id: 'trading.reviewWorkspace',
                      defaultMessage: 'Review workspace',
                    })}
            </Button>
          </Cluster>
        </Stack>
      </form>
    </Modal>
  )
}
