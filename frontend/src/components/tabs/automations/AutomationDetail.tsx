import type { IntlShape } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { templateField } from './templateMessages'
import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Clock3,
  FastForward,
  Hand,
  Pencil,
  Play,
  Square,
  Trash2,
  TriangleAlert,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { Automation, AutomationRun } from '../../../api/automations'
import { Button, Modal, PageTabs, Switch, type PermissionMode } from '../../ui'
import { fDateTime } from '../../../utils/format'
import { AutomationCostPanel } from './AutomationCostPanel'
import { AutomationHistory } from './AutomationHistory'
import { AutomationMenu } from './AutomationMenu'
import { AutomationRunCard } from './AutomationRunCard'
import { automationTriggerLabel, type AutomationOptions } from './AutomationTriggerSummary'

export function AutomationDetail({
  automation,
  runs,
  options,
  selectedRunId,
  busy = false,
  onSelectRun,
  onCloseRun,
  onEdit,
  onDelete,
  onRunNow,
  onStopRun,
  onStatusChange,
  onRevoke,
  onBack,
}: {
  automation: Automation
  runs: AutomationRun[]
  options?: AutomationOptions
  selectedRunId: string | null
  busy?: boolean
  onSelectRun: (run: AutomationRun) => void
  onCloseRun: () => void
  onEdit: () => void
  onDelete: () => void
  onRunNow: () => void
  onStopRun: (run: AutomationRun) => void
  onStatusChange: (status: 'active' | 'paused') => void
  onRevoke: (index: number) => void
  onBack?: () => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const displayName = templateField(intl, 'name', automation.name, automation.template_source?.name)
  const displayInstructions = templateField(
    intl,
    'instructions',
    automation.instructions,
    automation.template_source?.instructions,
  )
  const displayDescription = templateField(
    intl,
    'description',
    automation.description,
    automation.template_source?.description,
  )
  const layoutRef = useRef<HTMLDivElement>(null)
  const [compact, setCompact] = useState(false)
  const [tab, setTab] = useState<'setup' | 'history'>('setup')
  const [showAll, setShowAll] = useState(false)
  const selectedRun = selectedRunId ? (runs.find((run) => run.id === selectedRunId) ?? null) : null
  const runningRun = runs.find((run) => run.status === 'running') ?? null

  useEffect(() => {
    const element = layoutRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setCompact(entry.contentRect.width < 720)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (compact && selectedRunId) setTab('history')
  }, [compact, selectedRunId])

  const paused = automation.status === 'paused'
  const finished = automation.status === 'completed'
  const longInstructions = automation.instructions.length > 260
  const TriggerIcon = automation.trigger.kind === 'event' ? Zap : Clock3
  return (
    <div className="a3-wrap" data-od-id="automation-detail">
      {onBack && (
        <nav
          className="a3-crumb"
          aria-label={formatMessage({
            id: 'automations.detail.breadcrumb',
            defaultMessage: 'Breadcrumb',
          })}
        >
          <button type="button" onClick={onBack}>
            {formatMessage({ id: 'automations.pageTitle', defaultMessage: 'Automations' })}
          </button>
          <span aria-hidden="true">/</span>
          <span className="cur" aria-current="page">
            {displayName}
          </span>
        </nav>
      )}
      <div className={`a3-detail-head${compact ? ' compact' : ''}`}>
        <div className="a3-detail-title">
          <h1>{displayName}</h1>
          <div className="a3-detail-sub">
            {displayDescription || firstSentence(automation.instructions)}
          </div>
        </div>
        <div className="a3-detail-bar">
          <div className="a3-detail-state">
            {finished ? (
              <span className="a3-tag">
                {formatMessage({ id: 'automations.finished', defaultMessage: 'Finished' })}
              </span>
            ) : (
              <Switch
                id={`automation-status-${automation.id}`}
                checked={!paused}
                disabled={busy}
                onChange={() => onStatusChange(paused ? 'active' : 'paused')}
                aria-label={
                  paused
                    ? formatMessage(
                        { id: 'automations.detail.resumeName', defaultMessage: 'Resume {name}' },
                        { name: displayName },
                      )
                    : formatMessage(
                        { id: 'automations.detail.pauseName', defaultMessage: 'Pause {name}' },
                        { name: displayName },
                      )
                }
              />
            )}
            <span>
              {finished
                ? formatMessage({
                    id: 'automations.detail.scheduleEnded',
                    defaultMessage: 'Its schedule has run out. Edit the trigger to run it again.',
                  })
                : paused
                  ? formatMessage({
                      id: 'automations.detail.resumeHelp',
                      defaultMessage: 'Resume it to put it back on watch.',
                    })
                  : automation.next_run_at
                    ? formatMessage(
                        { id: 'automations.detail.nextRun', defaultMessage: 'Next run: {date}' },
                        { date: fDateTime(automation.next_run_at) },
                      )
                    : automation.trigger.kind === 'event'
                      ? formatMessage({
                          id: 'automations.detail.eventHelp',
                          defaultMessage: 'Runs whenever this happens',
                        })
                      : formatMessage({
                          id: 'automations.detail.manualHelp',
                          defaultMessage: 'Runs only when you start it.',
                        })}
            </span>
          </div>
          <div className="a3-detail-actions">
            {runningRun ? (
              <Button
                size="sm"
                variant="secondary"
                iconLeft={<Square size={12} aria-hidden="true" />}
                onClick={() => onStopRun(runningRun)}
              >
                {formatMessage({ id: 'automations.detail.stop', defaultMessage: 'Stop' })}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                loading={busy}
                iconLeft={<Play size={12} aria-hidden="true" />}
                onClick={onRunNow}
              >
                {formatMessage({ id: 'automations.runNow', defaultMessage: 'Run now' })}
              </Button>
            )}
            <AutomationMenu
              label={formatMessage({
                id: 'automations.moreActions',
                defaultMessage: 'More actions',
              })}
              items={[
                {
                  label: formatMessage({
                    id: 'automations.detail.editTitle',
                    defaultMessage: 'Edit automation',
                  }),
                  icon: (
                    <span className="a3-menu-ic">
                      <Pencil size={14} aria-hidden="true" />
                    </span>
                  ),
                  onSelect: onEdit,
                },
                {
                  label: formatMessage({
                    id: 'automations.deleteAutomation',
                    defaultMessage: 'Delete automation',
                  }),
                  danger: true,
                  icon: (
                    <span className="a3-menu-ic">
                      <Trash2 size={14} aria-hidden="true" />
                    </span>
                  ),
                  onSelect: onDelete,
                },
              ]}
            />
          </div>
        </div>
      </div>
      <div
        ref={layoutRef}
        className={`a3-cols${compact ? ' stacked' : ''}`}
        data-tab={compact ? tab : 'both'}
      >
        {compact && (
          <div className="a3-subtabs">
            <PageTabs
              ariaLabel={formatMessage({
                id: 'automations.detail.sections',
                defaultMessage: 'Automation sections',
              })}
              value={tab}
              onChange={setTab}
              tabs={[
                {
                  key: 'setup',
                  label: formatMessage({ id: 'automations.detail.setup', defaultMessage: 'Setup' }),
                },
                {
                  key: 'history',
                  label: formatMessage({
                    id: 'automations.detail.history',
                    defaultMessage: 'History',
                  }),
                  badge: runs.length,
                },
              ]}
            />
          </div>
        )}
        <div className="a3-col-setup">
          <DetailSection
            title={formatMessage({
              id: 'automations.detail.instructions',
              defaultMessage: 'Instructions',
            })}
            odId="instructions"
          >
            <div
              className={`a3-instr${longInstructions ? ' clamped clickable' : ''}`}
              role={longInstructions ? 'button' : undefined}
              tabIndex={longInstructions ? 0 : undefined}
              onClick={() => longInstructions && setShowAll(true)}
              onKeyDown={(event) => {
                if (longInstructions && event.key === 'Enter') setShowAll(true)
              }}
            >
              {displayInstructions}
            </div>
            {longInstructions && (
              <button type="button" className="a3-linkbtn" onClick={() => setShowAll(true)}>
                {formatMessage({ id: 'automations.detail.showAll', defaultMessage: 'Show all' })}
              </button>
            )}
          </DetailSection>
          <DetailSection
            title={formatMessage({ id: 'automations.detail.trigger', defaultMessage: 'Trigger' })}
            odId="trigger"
          >
            <div className="a3-trigger-detail">
              <TriggerIcon size={14} aria-hidden="true" />
              {automationTriggerLabel(automation.trigger, options, intl)}
            </div>
            <div className="a3-block-note">
              {finished
                ? formatMessage({
                    id: 'automations.detail.finishedHelp',
                    defaultMessage: 'Finished — no runs left on this schedule.',
                  })
                : paused
                  ? formatMessage({
                      id: 'automations.detail.pausedHelp',
                      defaultMessage: 'Paused — nothing will fire it.',
                    })
                  : automation.trigger.kind === 'event' && automation.trigger.limit !== 'each'
                    ? formatMessage({
                        id: 'automations.detail.burstHelp',
                        defaultMessage: 'A burst inside the window collapses into one run.',
                      })
                    : null}
            </div>
          </DetailSection>
          <DetailSection
            title={formatMessage({ id: 'automations.detail.model', defaultMessage: 'Model' })}
            odId="model"
          >
            <div className="a3-model-detail">
              <Zap size={14} aria-hidden="true" />
              <b>
                {automation.model ||
                  formatMessage({ id: 'automations.editor.default', defaultMessage: 'Default' })}
              </b>
              <span>•</span>
              <span>
                {formatMessage(
                  { id: 'automations.detail.effort', defaultMessage: '{effort} effort' },
                  { effort: effortLabel(automation.effort, intl) },
                )}
              </span>
            </div>
          </DetailSection>
          <DetailSection
            title={formatMessage({
              id: 'automations.detail.permissions',
              defaultMessage: 'Permission Mode',
            })}
            odId="permission-mode"
          >
            {(() => {
              const mode = permissionModeInfo(automation.permission_mode ?? 'auto', intl)
              const ModeIcon = mode.Icon
              return (
                <div className="a3-model-detail">
                  <ModeIcon size={14} aria-hidden="true" />
                  <b>{mode.short}</b>
                  <span>•</span>
                  <span>{mode.description}</span>
                </div>
              )
            })()}
          </DetailSection>
          <DetailSection
            title={formatMessage({ id: 'automations.detail.cost', defaultMessage: 'Cost & usage' })}
            odId="cost-and-usage"
          >
            <AutomationCostPanel automation={automation} runs={runs} />
          </DetailSection>
          <DetailSection
            title={
              <>
                {formatMessage({
                  id: 'automations.detail.alwaysAllowed',
                  defaultMessage: 'Always allowed',
                })}{' '}
                <Check size={13} aria-hidden="true" />
              </>
            }
            odId="always-allowed"
          >
            {(automation.always_allowed ?? []).length > 0 && (
              <div className="a3-allow">
                {/* ONE ROW PER TOOL. A grant entry can carry many tools, and collapsing them
                    onto its ``desc`` ("Tools available to the '…' Automation") told the owner
                    nothing about what was actually authorised — this list is the only place
                    those names are visible. Revoke still targets the whole entry, so the row
                    says which entry it belongs to. */}
                {(automation.always_allowed ?? []).flatMap((permission, index) =>
                  (permission.tools?.length ? permission.tools : [null]).map((tool) => (
                    <div
                      className={`a3-allow-row${permission.src === 'Open Net Worth' ? ' internal' : ''}`}
                      key={`${permission.src}-${index}-${tool ?? permission.desc}`}
                    >
                      <span className="mark" style={permissionMarkStyle(permission.src)}>
                        {permission.src === 'Open Net Worth' ? 'ONW' : initials(permission.src)}
                      </span>
                      <b>{permission.src}</b>
                      <span className="d">{tool ?? permission.desc}</span>
                      <button
                        type="button"
                        className="a3-iconbtn danger revoke"
                        aria-label={formatMessage(
                          {
                            id: 'automations.detail.revokePermission',
                            defaultMessage: 'Revoke {source}: {permission}',
                          },
                          { source: permission.src, permission: tool ?? permission.desc },
                        )}
                        title={formatMessage({
                          id: 'automations.detail.revoke',
                          defaultMessage: 'Revoke',
                        })}
                        disabled={busy}
                        onClick={() => onRevoke(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )),
                )}
              </div>
            )}
            <div className="a3-block-note">
              {formatMessage({
                id: 'automations.detail.approvalsHelp',
                defaultMessage: 'Approvals you grant during a run appear here.',
              })}
            </div>
          </DetailSection>
        </div>
        <div className="a3-block a3-col-history" data-od-id="run-history">
          <DetailSection
            title={formatMessage({ id: 'automations.detail.history', defaultMessage: 'History' })}
            meta={formatMessage(
              {
                id: 'automations.detail.runCount',
                defaultMessage: '{count, plural, one {# run} other {# runs}}',
              },
              { count: runs.length },
            )}
            bare
          >
            <AutomationHistory
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRun={onSelectRun}
              emptyMessage={emptyHistoryMessage(automation, intl)}
            />
          </DetailSection>
          {selectedRun && <AutomationRunCard run={selectedRun} onClose={onCloseRun} />}
          {runs.length > 0 && (
            <div className="a3-history-note">
              {formatMessage({
                id: 'automations.detail.historyHelp',
                defaultMessage: 'Open any run to read what it did — and keep talking to it.',
              })}
            </div>
          )}
        </div>
      </div>
      <Modal open={showAll} size="xl" title={displayName} onClose={() => setShowAll(false)}>
        <div className="a3-modal-kicker">
          {formatMessage({ id: 'automations.detail.instructions', defaultMessage: 'Instructions' })}
        </div>
        <div className="a3-modal-instructions">{displayInstructions}</div>
      </Modal>
    </div>
  )
}

function DetailSection({
  title,
  meta,
  children,
  odId,
  bare = false,
}: {
  title: React.ReactNode
  meta?: string
  children: React.ReactNode
  odId?: string
  bare?: boolean
}) {
  return (
    <section className={bare ? '' : 'a3-block'} data-od-id={odId}>
      <div className="a3-block-h">
        {title}
        {meta && <span className="count">{meta}</span>}
      </div>
      {children}
    </section>
  )
}

function effortLabel(value: string, intl: IntlShape) {
  if (value === 'low')
    return intl.formatMessage({ id: 'automations.detail.low', defaultMessage: 'Low' })
  if (value === 'high')
    return intl.formatMessage({ id: 'automations.detail.high', defaultMessage: 'High' })
  if (!value || value === 'medium')
    return intl.formatMessage({ id: 'automations.detail.medium', defaultMessage: 'Medium' })
  return value[0]!.toUpperCase() + value.slice(1)
}

// Mirrors PermissionModeControl's own icon-per-mode mapping (ui/) — same three-way choice,
// read-only here since this screen doesn't own editing.
const PERMISSION_MODE_INFO: Record<
  PermissionMode,
  { short: string; description: string; Icon: LucideIcon }
> = {
  manual: {
    short: 'Manual',
    description: 'Lucius pauses so you can approve each action.',
    Icon: Hand,
  },
  auto: {
    short: 'Auto',
    description: 'Lucius runs on its own and pauses to ask if anything looks unsafe.',
    Icon: FastForward,
  },
  skip: {
    short: 'Skip',
    description: 'Lucius never pauses, even for unsafe actions.',
    Icon: TriangleAlert,
  },
}
function permissionModeInfo(mode: PermissionMode, intl: IntlShape) {
  const original = PERMISSION_MODE_INFO[mode]
  if (mode === 'manual')
    return {
      ...original,
      short: intl.formatMessage({ id: 'automations.detail.modeManual', defaultMessage: 'Manual' }),
      description: intl.formatMessage({
        id: 'automations.detail.modeManualHelp',
        defaultMessage: 'Lucius pauses so you can approve each action.',
      }),
    }
  if (mode === 'skip')
    return {
      ...original,
      short: intl.formatMessage({ id: 'automations.detail.modeSkip', defaultMessage: 'Skip' }),
      description: intl.formatMessage({
        id: 'automations.detail.modeSkipHelp',
        defaultMessage: 'Lucius never pauses, even for unsafe actions.',
      }),
    }
  return {
    ...original,
    short: intl.formatMessage({ id: 'automations.detail.modeAuto', defaultMessage: 'Auto' }),
    description: intl.formatMessage({
      id: 'automations.detail.modeAutoHelp',
      defaultMessage: 'Lucius runs on its own and pauses to ask if anything looks unsafe.',
    }),
  }
}
function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
function firstSentence(value: string) {
  return (value.trim().split(/(?<=[.!?])\s|\n/)[0] ?? '').trim()
}
function emptyHistoryMessage(automation: Automation, intl: IntlShape) {
  if (automation.status === 'completed')
    return intl.formatMessage({
      id: 'automations.detail.noneFinished',
      defaultMessage: 'No runs kept. Its schedule has run out — edit the trigger to run it again.',
    })
  if (automation.trigger.kind === 'event')
    return intl.formatMessage({
      id: 'automations.detail.noneEvent',
      defaultMessage: 'Hasn’t fired yet — it runs when the trigger happens, or hit Run now.',
    })
  if (automation.trigger.kind === 'schedule')
    return intl.formatMessage(
      {
        id: 'automations.detail.noneSchedule',
        defaultMessage: 'Hasn’t run yet. It first runs {when} — or hit Run now.',
      },
      {
        when: automation.next_run_at
          ? fDateTime(automation.next_run_at)
          : automationTriggerLabel(automation.trigger, undefined, intl),
      },
    )
  return intl.formatMessage({
    id: 'automations.detail.noneManual',
    defaultMessage: 'Hasn’t run yet. Hit Run now to start it.',
  })
}
function permissionMarkStyle(source: string): React.CSSProperties {
  const color =
    source === 'Open Net Worth'
      ? 'var(--accent)'
      : source.toLowerCase().includes('telegram')
        ? '#2aabee'
        : source.toLowerCase().includes('gmail')
          ? '#ea4335'
          : 'var(--lucius)'
  return {
    color,
    background: `color-mix(in srgb, ${color} 16%, transparent)`,
    borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
  }
}
