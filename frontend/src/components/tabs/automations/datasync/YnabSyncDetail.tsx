import { useAppIntl } from '../../../../i18n/useAppIntl'
import { ynabMessage } from './ynabMessages'
import { useState } from 'react'
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Link2,
  Play,
  ShieldCheck,
} from 'lucide-react'
import { authFetch } from '../../../../api/client'
import { invalidateQueryCache } from '../../../../state/queryCache'
import { fDate, fDateTime, fScheduleWhen, timeAgo } from '../../../../utils/format'
import { ActionMenu, Button, ErrorState, SegmentedControl, Switch, TabSkeleton } from '../../../ui'
import { ReviewCard } from '../../imports/ReviewItem'
import { RunReportModal } from '../../imports/RunReport'
import { YnabImport } from '../../imports/YnabImport'
import { KIND_LABEL, detailOf, type RunSummary } from '../../imports/runs'
import { DIRECTION_LABELS, sendSync, type SyncDirection } from '../../imports/sync'
import { AutomationMenu } from '../AutomationMenu'
import { ConnectorPanel } from '../../connectors/ConnectorPanel'
import { useConnectors } from '../../connectors/useConnectors'
import {
  YNAB_SYNC_NAME,
  scheduleLabel,
  syncDirectionLabel,
  useYnabSync,
  type YnabSyncStage,
} from './ynabSync'

// The YNAB data sync's page in Automations. Until it is set up the page is the three setup
// steps (connect, import, turn on); after that it reads like any Automation: on/off and the next
// run on top, what needs you first, then the schedule and the run history.

type HistoryFilter = 'all' | 'attention'

export function YnabSyncDetail({
  reportId,
  onBack,
  onOpenReport,
}: {
  reportId: string | null
  onBack: () => void
  onOpenReport: (runId: string | null) => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const sync = useYnabSync()
  useConnectors() // warm the connector list, so the YNAB panel opens at once
  const [connectOpen, setConnectOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const status = sync.status

  async function send(label: string, path: string, method: string, body?: unknown) {
    setBusy(label)
    setError(await sendSync(path, method, body))
    sync.refresh()
    setBusy(null)
  }

  async function recheck() {
    if (!sync.planId) return
    setBusy('verify')
    setError(null)
    try {
      const r = await authFetch('/api/ynab/migration/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: sync.planId, confirm_nonempty: false }),
      })
      if (!r.ok)
        setError(
          await detailOf(
            r,
            formatMessage({
              id: 'automations.sync.recheckError',
              defaultMessage: 'Could not start the re-check.',
            }),
          ),
        )
      invalidateQueryCache('/api/imports/runs')
      sync.refresh()
    } catch {
      setError(
        formatMessage({
          id: 'automations.sync.serverError',
          defaultMessage: 'Could not reach the server.',
        }),
      )
    } finally {
      setBusy(null)
    }
  }

  // The YNAB connector's own panel opens here, over the page, rather than on Connectors:
  // setting up or changing the token should not cost the user the step they are on.
  const openConnector = () => setConnectOpen(true)

  const crumb = (
    <nav
      className="a3-crumb"
      aria-label={formatMessage({
        id: 'automations.sync.breadcrumb',
        defaultMessage: 'Breadcrumb',
      })}
    >
      <button type="button" onClick={onBack}>
        {formatMessage({ id: 'automations.pageTitle', defaultMessage: 'Automations' })}
      </button>
      <span aria-hidden="true">/</span>
      <span className="cur" aria-current="page">
        {YNAB_SYNC_NAME}
      </span>
    </nav>
  )

  if (sync.loading) {
    return (
      <div className="a3-wrap">
        <TabSkeleton
          variant="automations"
          label={formatMessage({
            id: 'automations.sync.loadingYnab',
            defaultMessage: 'Loading the YNAB sync…',
          })}
          header={false}
        />
      </div>
    )
  }
  if (sync.error || !status) {
    return (
      <div className="a3-wrap">
        {crumb}
        <ErrorState
          title={formatMessage({
            id: 'automations.sync.loadYnab',
            defaultMessage: 'The YNAB sync couldn’t load',
          })}
          message={
            sync.error instanceof Error
              ? sync.error.message
              : formatMessage({
                  id: 'automations.sync.retry',
                  defaultMessage: 'Try again in a moment.',
                })
          }
          onRetry={sync.refresh}
        />
      </div>
    )
  }

  const setUp = sync.stage === 'on' || sync.stage === 'off'
  const on = sync.stage === 'on'
  const next = !on
    ? formatMessage({ id: 'automations.sync.off', defaultMessage: 'Off' })
    : status.running
      ? formatMessage({ id: 'automations.sync.syncing', defaultMessage: 'Syncing now…' })
      : status.interval === 'manual'
        ? formatMessage({
            id: 'automations.sync.onlyManual',
            defaultMessage: 'Runs only when you start it.',
          })
        : status.next_run_at
          ? formatMessage(
              { id: 'automations.sync.next', defaultMessage: 'Next sync: {when}' },
              { when: fScheduleWhen(status.next_run_at, intl) },
            )
          : formatMessage({
              id: 'automations.sync.nextMinute',
              defaultMessage: 'Next sync: within a minute',
            }) // due: the scheduler checks every 60 seconds

  return (
    <div className="a3-wrap" data-od-id="ynab-sync-detail">
      {crumb}
      {reportId && <RunReportModal runId={reportId} onClose={() => onOpenReport(null)} />}
      {connectOpen && (
        <ConnectorPanel
          connectorId="ynab"
          configureOnOpen
          onClose={() => {
            setConnectOpen(false)
            sync.refresh()
          }}
        />
      )}
      <div className="a3-detail-head">
        <div className="a3-detail-title">
          <h1>{YNAB_SYNC_NAME}</h1>
          <div className="a3-detail-sub">
            {formatMessage({
              id: 'automations.sync.blurb',
              defaultMessage:
                'Transactions and each month’s Assigned, in step with your YNAB plan.',
            })}
          </div>
        </div>
        {setUp && (
          <div className="a3-detail-bar">
            <div className="a3-detail-state">
              <Switch
                id="ynab-sync-enabled"
                checked={on}
                disabled={!!busy || status.running || !sync.planId}
                onChange={() =>
                  void send('settings', '/settings', 'PUT', { enabled: !on, plan_id: sync.planId })
                }
                aria-label={
                  on
                    ? formatMessage({
                        id: 'automations.sync.turnSyncOff',
                        defaultMessage: 'Turn the YNAB sync off',
                      })
                    : formatMessage({
                        id: 'automations.sync.turnSyncOn',
                        defaultMessage: 'Turn the YNAB sync on',
                      })
                }
              />
              <span>{next}</span>
            </div>
            <div className="a3-detail-actions">
              <Button
                size="sm"
                variant="primary"
                disabled={!on || status.running}
                loading={status.running || busy === 'run'}
                iconLeft={<Play size={12} aria-hidden="true" />}
                onClick={() => void send('run', '/run', 'POST')}
              >
                {formatMessage({ id: 'automations.sync.run', defaultMessage: 'Sync now' })}
              </Button>
              <AutomationMenu
                label={formatMessage({
                  id: 'automations.moreActions',
                  defaultMessage: 'More actions',
                })}
                items={[
                  {
                    label: formatMessage({
                      id: 'automations.sync.recheck',
                      defaultMessage: 'Re-check against YNAB',
                    }),
                    disabled: !!busy || sync.running,
                    icon: (
                      <span className="a3-menu-ic">
                        <ShieldCheck size={14} aria-hidden="true" />
                      </span>
                    ),
                    onSelect: () => void recheck(),
                  },
                  {
                    label: formatMessage({
                      id: 'automations.sync.connection',
                      defaultMessage: 'YNAB connection…',
                    }),
                    icon: (
                      <span className="a3-menu-ic">
                        <Link2 size={14} aria-hidden="true" />
                      </span>
                    ),
                    onSelect: openConnector,
                  },
                ]}
              />
            </div>
          </div>
        )}
      </div>
      {error && (
        <div className="a3-action-error" role="alert">
          {error}
        </div>
      )}

      {setUp ? (
        <div className="a3-cols">
          <div className="a3-col-setup">
            {status.conflicts.length > 0 && (
              <section className="a3-block a3-attention" data-od-id="ynab-sync-review">
                <div className="a3-block-h">
                  {formatMessage({
                    id: 'automations.sync.needsReview',
                    defaultMessage: 'Needs your review',
                  })}
                  <span className="count">{status.conflicts.length}</span>
                </div>
                <div className="a3-block-note">
                  {formatMessage({
                    id: 'automations.sync.reviewHelp',
                    defaultMessage:
                      'The sync left these alone for you to decide. Each one says what its choice changes, here and in YNAB.',
                  })}
                </div>
                {status.conflicts.map((item) => (
                  <ReviewCard
                    key={item.id}
                    item={item}
                    busy={busy === item.id || status.running}
                    onKeep={(keep, choice) =>
                      void send(item.id, `/conflicts/${item.id}/resolve`, 'POST', {
                        keep,
                        ...(choice && { choice }),
                      })
                    }
                  />
                ))}
              </section>
            )}
            <section className="a3-block" data-od-id="ynab-sync-direction">
              <div className="a3-block-h">
                {formatMessage({ id: 'automations.sync.direction', defaultMessage: 'Direction' })}
              </div>
              <SettingMenu
                label={formatMessage({
                  id: 'automations.sync.directionLabel',
                  defaultMessage: 'Sync direction',
                })}
                icon={<ArrowLeftRight size={14} aria-hidden="true" />}
                value={status.direction}
                options={(Object.keys(DIRECTION_LABELS) as SyncDirection[]).map((d) => ({
                  value: d,
                  label: syncDirectionLabel(intl, d),
                }))}
                disabled={!!busy || status.running}
                onPick={(direction) => void send('settings', '/settings', 'PUT', { direction })}
              />
            </section>
            <section className="a3-block" data-od-id="ynab-sync-schedule">
              <div className="a3-block-h">
                {formatMessage({ id: 'automations.sync.schedule', defaultMessage: 'Schedule' })}
              </div>
              <SettingMenu
                label={formatMessage({
                  id: 'automations.sync.howOften',
                  defaultMessage: 'How often to sync',
                })}
                icon={<Clock3 size={14} aria-hidden="true" />}
                value={status.interval}
                options={status.intervals.map((i) => ({
                  value: i,
                  label: scheduleLabel({ ...status, enabled: true, interval: i }, intl),
                }))}
                disabled={!!busy || status.running}
                onPick={(interval) => void send('settings', '/settings', 'PUT', { interval })}
              />
              {status.last_run && (
                <div className={`a3-last-sync${status.last_run.ok ? '' : ' bad'}`}>
                  {formatMessage(
                    { id: 'automations.sync.lastSync', defaultMessage: 'Last sync {when}:' },
                    { when: timeAgo(status.last_run.finished_at) },
                  )}{' '}
                  {status.last_run.ok
                    ? ynabMessage(intl, status.last_run.summary_message, status.last_run.summary)
                    : formatMessage(
                        { id: 'automations.sync.failedDetail', defaultMessage: 'failed. {error}' },
                        { error: status.last_run.error ?? '' },
                      )}
                  {status.last_run.run_id && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="a3-linkbtn"
                        onClick={() => onOpenReport(status.last_run?.run_id ?? null)}
                      >
                        {formatMessage({
                          id: 'automations.sync.openReport',
                          defaultMessage: 'Open report',
                        })}
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>
            <section className="a3-block" data-od-id="ynab-sync-plan">
              <div className="a3-block-h">
                {formatMessage({ id: 'automations.sync.plan', defaultMessage: 'YNAB plan' })}
              </div>
              <div className="a3-model-detail">
                <Link2 size={14} aria-hidden="true" />
                <b>
                  {sync.planName ??
                    formatMessage({
                      id: 'automations.sync.notChosen',
                      defaultMessage: 'Not chosen',
                    })}
                </b>
                {sync.lastImport && (
                  <>
                    <span>•</span>
                    <span>
                      {formatMessage(
                        { id: 'automations.sync.importedDate', defaultMessage: 'Imported {date}' },
                        { date: fDate(sync.lastImport.started_at, 'short', 'always') },
                      )}
                    </span>
                  </>
                )}
              </div>
            </section>
            <section className="a3-block" data-od-id="ynab-sync-rules">
              <div className="a3-block-h">
                {formatMessage({ id: 'automations.sync.rules', defaultMessage: 'How it decides' })}
              </div>
              <ul className="a3-rules">
                <li>
                  {status.direction === 'both'
                    ? formatMessage({
                        id: 'automations.sync.flowBoth',
                        defaultMessage:
                          'Transactions, categories and Assigned changed on either side are copied to the other.',
                      })
                    : status.direction === 'from_ynab'
                      ? formatMessage({
                          id: 'automations.sync.flowFrom',
                          defaultMessage:
                            'YNAB’s transactions, categories and Assigned come here. Nothing is written to YNAB.',
                        })
                      : formatMessage({
                          id: 'automations.sync.flowTo',
                          defaultMessage:
                            'This book’s transactions, categories and Assigned go to YNAB. Nothing comes back.',
                        })}
                </li>
                <li>
                  {formatMessage({
                    id: 'automations.sync.bothChanged',
                    defaultMessage: 'A change on both sides waits for you.',
                  })}
                </li>
                {status.direction !== 'from_ynab' && (
                  <li>
                    {formatMessage({
                      id: 'automations.sync.redFlag',
                      defaultMessage:
                        "What it adds or changes in YNAB gets YNAB's red flag, so you can spot it there.",
                    })}
                  </li>
                )}
              </ul>
            </section>
          </div>
          <SyncHistory runs={sync.runs ?? []} onOpen={(id) => onOpenReport(id)} />
        </div>
      ) : (
        <SetupSteps
          stage={sync.stage}
          runs={sync.runs}
          busy={busy}
          planId={sync.planId}
          direction={status.direction}
          onDirection={(direction) => void send('settings', '/settings', 'PUT', { direction })}
          onConnect={openConnector}
          onOpenReport={(id) => onOpenReport(id)}
          onImported={sync.refresh}
          onTurnOn={() =>
            void send('settings', '/settings', 'PUT', { enabled: true, plan_id: sync.planId })
          }
        />
      )}
    </div>
  )
}

/** Which way changes flow. A change on both sides is asked about in every direction. */
/** One setting read as a Lucius automation's Trigger reads — an icon and its value — that opens
 *  the choices when clicked, the current one ticked. */
function SettingMenu<T extends string>({
  label,
  icon,
  value,
  options,
  disabled,
  onPick,
}: {
  label: string
  icon: React.ReactNode
  value: T
  options: { value: T; label: string }[]
  disabled: boolean
  onPick: (value: T) => void
}) {
  const current = options.find((o) => o.value === value)?.label ?? value
  return (
    <ActionMenu
      label={label}
      className="a3-setting"
      trigger={
        <span className="a3-trigger-detail">
          {icon}
          {current}
          <ChevronDown size={13} aria-hidden="true" className="a3-setting-caret" />
        </span>
      }
      items={options.map((o) => ({
        label: o.label,
        disabled,
        icon:
          o.value === value ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <span className="a3-setting-blank" aria-hidden="true" />
          ),
        onSelect: () => {
          if (o.value !== value) onPick(o.value)
        },
      }))}
    />
  )
}

function DirectionPicker({
  value,
  disabled,
  onChange,
}: {
  value: SyncDirection
  disabled: boolean
  onChange: (direction: SyncDirection) => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  return (
    <SegmentedControl
      ariaLabel={formatMessage({
        id: 'automations.sync.directionLabel',
        defaultMessage: 'Sync direction',
      })}
      options={(Object.keys(DIRECTION_LABELS) as SyncDirection[]).map((d) => ({
        value: d,
        label: syncDirectionLabel(intl, d),
      }))}
      value={value}
      onChange={(d) => {
        if (!disabled && d !== value) onChange(d)
      }}
    />
  )
}

function SetupSteps({
  stage,
  runs,
  busy,
  planId,
  direction,
  onDirection,
  onConnect,
  onOpenReport,
  onImported,
  onTurnOn,
}: {
  stage: YnabSyncStage
  runs: RunSummary[] | undefined
  busy: string | null
  planId: string | null
  direction: SyncDirection
  onDirection: (direction: SyncDirection) => void
  onConnect: () => void
  onOpenReport: (id: string) => void
  onImported: () => void
  onTurnOn: () => void
}) {
  // Two steps: the import is reviewed, then booked with the sync turned on, in one window. An
  // import that left the sync off (chosen, or it could not turn on) offers it here.
  const { formatMessage } = useAppIntl()
  const reached = { connect: 1, import: 2, enable: 2, off: 3, on: 3 }[stage]
  return (
    <ol className="a3-steps" data-od-id="ynab-sync-setup">
      <Step
        n={1}
        reached={reached}
        title={formatMessage({
          id: 'automations.sync.connectTitle',
          defaultMessage: 'Connect YNAB',
        })}
      >
        {reached === 1 ? (
          <>
            <p>
              {formatMessage({
                id: 'automations.sync.addToken',
                defaultMessage: 'Add your YNAB personal access token.',
              })}
            </p>
            <div>
              <Button size="sm" variant="primary" onClick={onConnect}>
                {formatMessage({ id: 'automations.sync.connect', defaultMessage: 'Connect YNAB…' })}
              </Button>
            </div>
          </>
        ) : (
          // A wrong or revoked token shows up as an error in step 2; fix it from here.
          <p>
            {formatMessage({ id: 'automations.sync.tokenSaved', defaultMessage: 'Token saved ·' })}{' '}
            <button type="button" className="a3-linkbtn" onClick={onConnect}>
              {formatMessage({ id: 'automations.sync.change', defaultMessage: 'Change' })}
            </button>
          </p>
        )}
      </Step>
      <Step
        n={2}
        reached={reached}
        title={formatMessage({
          id: 'automations.sync.importTitle',
          defaultMessage: 'Bring your plan in and keep it in sync',
        })}
      >
        {stage === 'import' ? (
          <>
            <p>
              {formatMessage({
                id: 'automations.sync.importHelp',
                defaultMessage: 'Review what your plan holds, then import it. Safe to run again.',
              })}
            </p>
            <YnabImport runs={runs} onStarted={onImported} onOpen={onOpenReport} />
          </>
        ) : stage === 'enable' ? (
          <>
            <p>
              {formatMessage({
                id: 'automations.sync.enableHelp',
                defaultMessage: 'Imported. Turn on the sync to keep the two in step.',
              })}
            </p>
            <DirectionPicker value={direction} disabled={!!busy} onChange={onDirection} />
            <div>
              <Button
                size="sm"
                variant="primary"
                loading={busy === 'settings'}
                disabled={!planId}
                onClick={onTurnOn}
              >
                {formatMessage({ id: 'automations.sync.turnOn', defaultMessage: 'Turn on' })}
              </Button>
            </div>
          </>
        ) : reached > 2 ? (
          <p>
            {formatMessage({
              id: 'automations.sync.importedSyncing',
              defaultMessage: 'Imported and syncing.',
            })}
          </p>
        ) : (
          <p>
            {formatMessage({
              id: 'automations.sync.afterConnect',
              defaultMessage: 'After you connect YNAB.',
            })}
          </p>
        )}
      </Step>
    </ol>
  )
}

function Step({
  n,
  reached,
  title,
  children,
}: {
  n: number
  reached: number
  title: string
  children: React.ReactNode
}) {
  const state = n < reached ? 'done' : n === reached ? 'current' : 'later'
  return (
    <li className={`a3-step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
      <span className="a3-step-n" aria-hidden="true">
        {state === 'done' ? <Check size={13} /> : n}
      </span>
      <div className="a3-step-body">
        <div className="a3-step-title">{title}</div>
        {children}
      </div>
    </li>
  )
}

function SyncHistory({ runs, onOpen }: { runs: RunSummary[]; onOpen: (id: string) => void }) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const needsAttention = (r: RunSummary) => r.status === 'failed' || r.status === 'interrupted'
  const shown = filter === 'all' ? runs : runs.filter(needsAttention)
  return (
    <div className="a3-block a3-col-history" data-od-id="ynab-sync-history">
      <div className="a3-block-h">
        {formatMessage({ id: 'automations.detail.history', defaultMessage: 'History' })}
        <span className="count">
          {formatMessage(
            {
              id: 'automations.detail.runCount',
              defaultMessage: '{count, plural, one {# run} other {# runs}}',
            },
            { count: runs.length },
          )}
        </span>
      </div>
      <SegmentedControl
        ariaLabel={formatMessage({
          id: 'automations.sync.filter',
          defaultMessage: 'Filter the history',
        })}
        options={[
          {
            value: 'all',
            label: formatMessage({ id: 'automations.sync.all', defaultMessage: 'All' }),
          },
          {
            value: 'attention',
            label: formatMessage({
              id: 'automations.sync.needsAttention',
              defaultMessage: 'Needs attention',
            }),
          },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {shown.length === 0 ? (
        <div className="a3-history-empty">
          {filter === 'all'
            ? formatMessage({ id: 'automations.sync.noRuns', defaultMessage: 'No runs yet.' })
            : formatMessage({
                id: 'automations.sync.noneFailed',
                defaultMessage: 'Nothing failed.',
              })}
        </div>
      ) : (
        <div
          className="a3-hist"
          role="list"
          aria-label={formatMessage({
            id: 'automations.sync.historyLabel',
            defaultMessage: 'YNAB sync history',
          })}
        >
          {shown.map((run) => (
            <button
              key={run.id}
              type="button"
              role="listitem"
              className="a3-hist-row"
              onClick={() => onOpen(run.id)}
            >
              <span
                className={`rd-dot ${needsAttention(run) ? 'bad' : run.status === 'running' ? 'run' : 'good'}`}
                aria-hidden="true"
              />
              <span className="when">{fDateTime(run.started_at, 'short', 'always')}</span>
              <span className="note">
                {run.kind === 'import'
                  ? formatMessage({ id: 'automations.sync.kindImport', defaultMessage: 'Import' })
                  : run.kind === 'verify'
                    ? formatMessage({ id: 'automations.sync.kindVerify', defaultMessage: 'Verify' })
                    : run.kind === 'preview'
                      ? formatMessage({
                          id: 'automations.sync.kindPreview',
                          defaultMessage: 'Preview',
                        })
                      : run.kind === 'sync'
                        ? formatMessage({ id: 'automations.sync.kindSync', defaultMessage: 'Sync' })
                        : KIND_LABEL[run.kind]}
                {run.trigger === 'scheduled'
                  ? ''
                  : formatMessage({ id: 'automations.sync.byYou', defaultMessage: ' · by you' })}
                {' — '}
                {run.status === 'running'
                  ? ynabMessage(intl, run.phase_message, run.phase)
                  : run.outcome
                    ? ynabMessage(intl, run.outcome_message, run.outcome)
                    : run.error || ''}
              </span>
              {run.status === 'running' && (
                <span
                  className="a3-live"
                  title={formatMessage({
                    id: 'automations.sync.runningNow',
                    defaultMessage: 'Running now',
                  })}
                />
              )}
              <ChevronRight size={13} className="a3-hist-chevron" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <div className="a3-history-note">
        {formatMessage({
          id: 'automations.sync.historyNote',
          defaultMessage: 'A scheduled sync that changes nothing is not added here.',
        })}
      </div>
    </div>
  )
}
