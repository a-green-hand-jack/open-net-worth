import { useTradingErrorText } from './trading/useTradingErrorText'
import { useState } from 'react'
import { useAppIntl } from '../../i18n/useAppIntl'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useTradingWorkspaces, useTradingOverview } from '../../hooks/useTrading'
import type { DelegationCreate, TradingWorkspace } from '../../types/trading'
import { TRADING_REVIEW_DRAFT_SPEC } from '../../lucius/screenCommands'
import { useRegisterScreenCommands } from '../../lucius/useScreenContract'
import {
  Badge,
  Button,
  Cluster,
  Container,
  EmptyState,
  ErrorState,
  Loading,
  PageHeader,
  PageTabs,
  Panel,
  Stack,
  Text,
  TextField,
} from '../ui'
import { LuciusCta } from '../intro/LuciusCta'
import { WorkspaceForm } from './trading/WorkspaceForm'
import { WorkspaceDetail } from './trading/WorkspaceDetail'
import { TradingComparisons } from './trading/TradingComparisons'
import { statusTone, tradingMoney, tradingTime } from './trading/presentation'
import { useTradingLabel } from './trading/useTradingLabel'

export function Trading({ onAskLucius }: { onAskLucius?: (text: string) => void }) {
  const { formatMessage } = useAppIntl()
  const errorText = useTradingErrorText()
  const search = useSearch({ from: '/trading' })
  const navigate = useNavigate()
  const workspaces = useTradingWorkspaces()
  const [form, setForm] = useState<{ draft?: DelegationCreate } | null>(null)
  const [draftError, setDraftError] = useState('')
  const [filter, setFilter] = useState('')
  const selected = workspaces.data?.items.find((workspace) => workspace.id === search.workspace)
  const view = search.view ?? 'workspaces'
  function route(patch: Partial<typeof search>) {
    void navigate({ to: '/trading', search: { ...search, ...patch } })
  }
  useRegisterScreenCommands([
    {
      spec: TRADING_REVIEW_DRAFT_SPEC,
      handler: (args) => {
        const value = args.delegation
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          !('workspace' in value) ||
          !('environment' in value)
        ) {
          setDraftError(
            formatMessage({
              id: 'trading.draftIncomplete',
              defaultMessage:
                'The delegation draft is incomplete. Ask Lucius to preview the workspace again.',
            }),
          )
          return
        }
        setDraftError('')
        setForm({ draft: value as DelegationCreate })
      },
    },
  ])
  const items = (workspaces.data?.items ?? []).filter((item) =>
    `${item.name} ${item.agent_label} ${item.instructions}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  )
  return (
    <Container size="wide" className="trading-page">
      <Stack gap="--space-6">
        <PageHeader
          title={formatMessage({ id: 'trading.title', defaultMessage: 'Trading' })}
          subtitle={formatMessage({
            id: 'trading.subtitle',
            defaultMessage:
              'Delegate a trading mandate and follow the markets, portfolio and agent’s work.',
          })}
          actions={
            <Cluster>
              <LuciusCta
                label={formatMessage({
                  id: 'trading.createWithLucius',
                  defaultMessage: 'Create with Lucius',
                })}
                size="md"
                message={formatMessage({ id: 'visible2.tradingPrompt', defaultMessage: 'Help me create a persistent autonomous trading workspace. Discuss my mandate, funding, period, executor, environment and limits. Use preview_trading_workspace to validate an unsaved draft, then open trading.review_draft so I can review it. Do not create or authorize live trading without my review.' })}
                onAskLucius={onAskLucius}
              />
              <Button variant="secondary" onClick={() => setForm({})}>
                {formatMessage({ id: 'trading.expertSetup', defaultMessage: 'Expert setup' })}
              </Button>
            </Cluster>
          }
        />
        <PageTabs
          ariaLabel={formatMessage({ id: 'trading.views', defaultMessage: 'Trading views' })}
          value={view}
          onChange={(value) => route({ view: value })}
          tabs={[
            {
              key: 'workspaces',
              label: formatMessage({ id: 'trading.workspaces', defaultMessage: 'Workspaces' }),
            },
            {
              key: 'compare',
              label: formatMessage({ id: 'trading.compare', defaultMessage: 'Compare' }),
            },
          ]}
        />
        {draftError && <ErrorState message={draftError} />}
        <div role="tabpanel" aria-labelledby={`ui-page-tab-${view}`}>
          {view === 'compare' ? (
            <TradingComparisons
              comparisonId={search.comparison ?? ''}
              onSelect={(id) => route({ comparison: id })}
              onRun={(run, workspace) => route({ view: 'workspaces', workspace, run })}
            />
          ) : (
            <>
              {workspaces.initialLoading && (
                <Loading
                  label={formatMessage({
                    id: 'trading.loadingWorkspaces',
                    defaultMessage: 'Loading trading workspaces…',
                  })}
                />
              )}
              {!!workspaces.error && (
                <ErrorState
                  message={errorText(workspaces.error)}
                  onRetry={() => void workspaces.refresh()}
                />
              )}
              {selected ? (
                <WorkspaceDetail
                  key={selected.id}
                  workspace={selected}
                  runId={search.run ?? ''}
                  onRun={(id) => route({ run: id })}
                  onBack={() => route({ workspace: undefined, run: undefined, section: undefined })}
                />
              ) : search.workspace && !workspaces.initialLoading && !workspaces.error ? (
                <ErrorState
                  message={formatMessage({
                    id: 'trading.workspaceNotFound',
                    defaultMessage: 'This workspace was not found.',
                  })}
                  onRetry={() => route({ workspace: undefined, run: undefined })}
                />
              ) : (
                <Stack gap="--space-4">
                  {!workspaces.initialLoading &&
                  !workspaces.error &&
                  !workspaces.data?.items.length ? (
                    <EmptyState
                      title={formatMessage({
                        id: 'trading.emptyTitle',
                        defaultMessage: 'Give an agent a trading mandate',
                      })}
                      body={formatMessage({
                        id: 'trading.emptyBody',
                        defaultMessage:
                          'Describe what you want to delegate to Lucius, or use expert setup. A workspace retains its mandate, account activity and the agent’s work over time.',
                      })}
                      action={
                        <Button onClick={() => setForm({})}>
                          {formatMessage({
                            id: 'trading.expertSetup',
                            defaultMessage: 'Expert setup',
                          })}
                        </Button>
                      }
                    />
                  ) : (
                    <>
                      <TextField
                        aria-label={formatMessage({
                          id: 'trading.searchWorkspaces',
                          defaultMessage: 'Search workspaces',
                        })}
                        placeholder={formatMessage({
                          id: 'trading.searchPlaceholder',
                          defaultMessage: 'Search mandates, workspaces or executors',
                        })}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      />
                      {items.map((workspace) => (
                        <WorkspaceCard
                          key={workspace.id}
                          workspace={workspace}
                          onOpen={() => route({ workspace: workspace.id, run: undefined })}
                        />
                      ))}
                      {!!workspaces.data?.items.length && !items.length && (
                        <EmptyState
                          title={formatMessage({
                            id: 'trading.noMatches',
                            defaultMessage: 'No matching workspaces',
                          })}
                        />
                      )}
                    </>
                  )}
                </Stack>
              )}
            </>
          )}
        </div>
        {form && (
          <WorkspaceForm
            draft={form.draft}
            onClose={() => setForm(null)}
            onSaved={(workspace, runId) => {
              setForm(null)
              route({ view: 'workspaces', workspace: workspace.id, run: runId })
            }}
          />
        )}
      </Stack>
    </Container>
  )
}

function WorkspaceCard({ workspace, onOpen }: { workspace: TradingWorkspace; onOpen: () => void }) {
  const { formatMessage } = useAppIntl()
  const label = useTradingLabel()
  const overview = useTradingOverview(workspace.id)
  const current = overview.data?.current_run
  const work = overview.data?.current_work
  return (
    <Panel
      title={workspace.name}
      className="trading-workspace-card"
      actions={
        <Button onClick={onOpen}>
          {formatMessage({ id: 'trading.openWorkspace', defaultMessage: 'Open workspace' })}
        </Button>
      }
    >
      <Stack gap="--space-3">
        <Text className="trading-mandate-excerpt">
          {overview.data?.original_mandate?.instructions ?? workspace.instructions}
        </Text>
        <Cluster>
          <Badge tone={statusTone(current?.state ?? '')}>
            {current
              ? label(current.state)
              : overview.initialLoading
                ? formatMessage({ id: 'trading.loadingStatus', defaultMessage: 'Loading status…' })
                : overview.error
                  ? formatMessage({
                      id: 'trading.statusUnavailable',
                      defaultMessage: 'Status unavailable',
                    })
                  : formatMessage({ id: 'trading.notActivated', defaultMessage: 'Not activated' })}
          </Badge>
          <Text size="sm">
            {workspace.agent_label}
            {current
              ? ` · ${label(current.mode)} · ${Object.entries(current.initial_capital)
                  .map(([currency, capital]) => tradingMoney(capital, currency))
                  .join(' / ')}`
              : ''}
          </Text>
        </Cluster>
        <Text size="sm" tone="muted">
          {formatMessage(
            { id: 'trading.workUpdated', defaultMessage: '{summary} · Updated {time}' },
            {
              summary:
                work?.summary ??
                formatMessage({ id: 'trading.noWork', defaultMessage: 'No work reported yet.' }),
              time: tradingTime(work?.last_activity_at ?? workspace.updated_at),
            },
          )}
        </Text>
      </Stack>
    </Panel>
  )
}
