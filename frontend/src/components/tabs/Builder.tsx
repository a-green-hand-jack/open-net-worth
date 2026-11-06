import { useAppIntl } from '../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getBuilderRun,
  getBuilderStatus,
  startBuilderRun,
  stopBuilderRun,
  type BuilderEngineId,
  type BuilderEvent,
  type BuilderMessage,
  type BuilderMode,
  type BuilderRun,
  type BuilderStatus,
} from '../../api/builder'
import { useBrand } from '../../brand-context'
import { FileCode, ShieldCheck, Sparkles, Wrench } from '../../ui/icons'
import {
  Badge,
  Button,
  Cluster,
  Container,
  ErrorState,
  FormField,
  Modal,
  PageHeader,
  Panel,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TabSkeleton,
  TextArea,
} from '../ui'
import './builder.css'

const ACTIVE = new Set(['queued', 'running'])

function mergeEvents(current: BuilderEvent[], incoming: BuilderEvent[]): BuilderEvent[] {
  const bySequence = new Map(current.map((event) => [event.seq, event]))
  for (const event of incoming) bySequence.set(event.seq, event)
  return [...bySequence.values()].sort((a, b) => a.seq - b.seq)
}

function mergeRun(current: BuilderRun | null, incoming: BuilderRun): BuilderRun {
  return {
    ...incoming,
    events: mergeEvents(current?.events ?? [], incoming.events ?? []),
  }
}

export function builderMessage(
  intl: IntlShape,
  message: BuilderMessage | null | undefined,
  fallback: string,
): string {
  if (intl.locale === 'en' || intl.locale.startsWith('en-')) return fallback
  if (
    !message ||
    !message.params ||
    typeof message.params !== 'object' ||
    Array.isArray(message.params)
  )
    return fallback
  const params = message.params
  const keys = Object.keys(params)
  if (keys.length === 0) {
    switch (message.id) {
      case 'builder.guidance.codex':
        return intl.formatMessage({
          id: 'builder.backend.guidanceCodex',
          defaultMessage: 'Install Codex, run `codex login`, then restart Open Net Worth.',
        })
      case 'builder.guidance.claude':
        return intl.formatMessage({
          id: 'builder.backend.guidanceClaude',
          defaultMessage: 'Install Claude Code, run `claude login`, then restart Open Net Worth.',
        })
      case 'builder.error.desktop':
        return intl.formatMessage({
          id: 'builder.backend.desktop',
          defaultMessage:
            'Builder coding engines are unavailable in the desktop app until child-process containment is supported.',
        })
      case 'builder.error.demo':
        return intl.formatMessage({
          id: 'builder.backend.demo',
          defaultMessage: 'Builder coding engines are disabled on the public demo.',
        })
      case 'builder.error.workspace':
        return intl.formatMessage({
          id: 'builder.backend.workspace',
          defaultMessage:
            'Builder workspace is not an Open Net Worth source checkout. Set ONW_BUILDER_ROOT to the folder containing backend/, frontend/, and package.json.',
        })
      case 'builder.error.engineFailed':
        return intl.formatMessage({
          id: 'builder.backend.engineFailed',
          defaultMessage: 'Coding engine failed.',
        })
      case 'builder.error.promptRequired':
        return intl.formatMessage({
          id: 'builder.backend.promptRequired',
          defaultMessage: 'Describe the change you want Open Net Worth to make.',
        })
      case 'builder.error.runNotFound':
        return intl.formatMessage({
          id: 'builder.backend.runNotFound',
          defaultMessage: 'Builder run not found.',
        })
      case 'builder.event.queued':
        return intl.formatMessage({ id: 'builder.backend.queued', defaultMessage: 'Run queued.' })
      case 'builder.event.finished':
        return intl.formatMessage({
          id: 'builder.backend.finished',
          defaultMessage: 'Run finished.',
        })
      case 'builder.event.stopped':
        return intl.formatMessage({ id: 'builder.backend.stopped', defaultMessage: 'Run stopped.' })
      case 'builder.event.codexFailed':
        return intl.formatMessage({
          id: 'builder.backend.codexFailed',
          defaultMessage: 'Codex run failed.',
        })
      case 'builder.event.filesChanged':
        return intl.formatMessage({
          id: 'builder.backend.filesChanged',
          defaultMessage: 'Files changed',
        })
    }
  }
  if (
    keys.length === 1 &&
    message.id === 'builder.event.started' &&
    (params.engine === 'codex' || params.engine === 'claude')
  )
    return intl.formatMessage(
      { id: 'builder.backend.started', defaultMessage: '{engine} started.' },
      { engine: params.engine === 'codex' ? 'Codex' : 'Claude Code' },
    )
  if (
    keys.length === 1 &&
    message.id === 'builder.error.exitStatus' &&
    typeof params.status === 'number' &&
    Number.isInteger(params.status)
  )
    return intl.formatMessage(
      {
        id: 'builder.backend.exitStatus',
        defaultMessage: 'Coding engine exited with status {status}.',
      },
      { status: params.status },
    )
  if (
    keys.length === 1 &&
    message.id === 'builder.error.executableMissing' &&
    typeof params.command === 'string'
  )
    return intl.formatMessage(
      {
        id: 'builder.backend.executableMissing',
        defaultMessage: 'Coding engine executable {command} is no longer available.',
      },
      { command: params.command },
    )
  if (
    keys.length === 1 &&
    message.id === 'builder.error.promptLong' &&
    typeof params.count === 'number' &&
    Number.isInteger(params.count) &&
    params.count >= 0
  )
    return intl.formatMessage(
      {
        id: 'builder.backend.promptLong',
        defaultMessage: 'Keep the request under {count} characters and attach detail in files.',
      },
      { count: params.count },
    )
  if (
    keys.length === 1 &&
    message.id === 'builder.error.active' &&
    typeof params.run_id === 'string'
  )
    return intl.formatMessage(
      {
        id: 'builder.backend.active',
        defaultMessage: 'Builder run {run_id} is still active. Stop it before starting another.',
      },
      { run_id: params.run_id },
    )
  if (
    keys.length === 1 &&
    message.id === 'builder.error.notInstalled' &&
    (params.engine === 'codex' || params.engine === 'claude')
  )
    return intl.formatMessage(
      {
        id: 'builder.backend.notInstalled',
        defaultMessage: '{engine} is not installed or not on the configured PATH.',
      },
      { engine: params.engine === 'codex' ? 'Codex' : 'Claude Code' },
    )
  if (
    keys.length === 1 &&
    message.id === 'builder.error.unknownEngine' &&
    typeof params.engine === 'string'
  )
    return intl.formatMessage(
      { id: 'builder.backend.unknownEngine', defaultMessage: 'Unknown coding engine {engine}.' },
      { engine: params.engine },
    )
  if (
    keys.length === 1 &&
    message.id === 'builder.error.unknownMode' &&
    typeof params.mode === 'string'
  )
    return intl.formatMessage(
      { id: 'builder.backend.unknownMode', defaultMessage: 'Unknown Builder mode {mode}.' },
      { mode: params.mode },
    )
  return fallback
}

function runLabel(status: BuilderRun['status'], intl: IntlShape): string {
  if (status === 'succeeded')
    return intl.formatMessage({ id: 'builder.status.finished', defaultMessage: 'Finished' })
  if (status === 'failed')
    return intl.formatMessage({
      id: 'builder.status.needsAttention',
      defaultMessage: 'Needs attention',
    })
  if (status === 'cancelled')
    return intl.formatMessage({ id: 'builder.status.stopped', defaultMessage: 'Stopped' })
  if (status === 'queued')
    return intl.formatMessage({ id: 'builder.status.queued', defaultMessage: 'Queued' })
  return intl.formatMessage({ id: 'builder.status.working', defaultMessage: 'Working' })
}

function runTone(status: BuilderRun['status']): 'pos' | 'neg' | 'warn' | 'neutral' {
  if (status === 'succeeded') return 'pos'
  if (status === 'failed') return 'neg'
  if (status === 'cancelled') return 'warn'
  return 'neutral'
}

function eventGlyph(kind: BuilderEvent['kind']): string {
  if (kind === 'assistant') return '✦'
  if (kind === 'tool') return '›'
  if (kind === 'output') return '•'
  if (kind === 'error') return '!'
  return '○'
}

function reviewTitle(run: BuilderRun, intl: IntlShape): string {
  if (run.status === 'succeeded') {
    return run.mode === 'plan'
      ? intl.formatMessage({
          id: 'builder.review.planReady',
          defaultMessage: 'Plan ready to review',
        })
      : intl.formatMessage({
          id: 'builder.review.changeReady',
          defaultMessage: 'Change ready to review',
        })
  }
  if (run.status === 'failed')
    return intl.formatMessage({
      id: 'builder.review.needsAttention',
      defaultMessage: 'Run needs attention',
    })
  if (run.status === 'cancelled')
    return intl.formatMessage({ id: 'builder.review.stopped', defaultMessage: 'Run stopped' })
  return intl.formatMessage({ id: 'builder.review.inProgress', defaultMessage: 'Work in progress' })
}

function reviewSummary(run: BuilderRun, intl: IntlShape): string {
  if (run.error) return builderMessage(intl, run.error_message, run.error)
  const assistantResult = [...run.events].reverse().find((event) => event.kind === 'assistant')
  if (assistantResult) return assistantResult.text
  if (run.status === 'cancelled')
    return intl.formatMessage({
      id: 'builder.summary.stopped',
      defaultMessage: 'The coding engine stopped before finishing.',
    })
  return run.mode === 'plan'
    ? intl.formatMessage({
        id: 'builder.summary.plan',
        defaultMessage: 'Review the plan and technical activity below.',
      })
    : intl.formatMessage({
        id: 'builder.summary.build',
        defaultMessage: 'Review the outcome and current workspace changes below.',
      })
}

export function Builder({ pollIntervalMs = 1000 }: { pollIntervalMs?: number }) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const starters = [
    {
      label: formatMessage({ id: 'builder.starter.add', defaultMessage: 'Add something new' }),
      prompt: formatMessage({
        id: 'builder.starter.addPrompt',
        defaultMessage:
          'Add a new dashboard card that helps me understand my monthly cash flow at a glance.',
      }),
    },
    {
      label: formatMessage({ id: 'builder.starter.style', defaultMessage: 'Change how it looks' }),
      prompt: formatMessage({
        id: 'builder.starter.stylePrompt',
        defaultMessage:
          'Refresh the visual style of this screen while keeping it consistent with the rest of Open Net Worth.',
      }),
    },
    {
      label: formatMessage({
        id: 'builder.starter.workflow',
        defaultMessage: 'Improve a workflow',
      }),
      prompt: formatMessage({
        id: 'builder.starter.workflowPrompt',
        defaultMessage:
          'Make the transaction review flow faster and easier for someone who is not technical.',
      }),
    },
  ]
  const modeOptions = [
    {
      value: 'plan' as const,
      label: formatMessage({ id: 'builder.mode.plan', defaultMessage: 'Plan' }),
    },
    {
      value: 'build' as const,
      label: formatMessage({ id: 'builder.mode.build', defaultMessage: 'Build' }),
    },
  ]
  const brand = useBrand()
  const [status, setStatus] = useState<BuilderStatus | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [engine, setEngine] = useState<BuilderEngineId>('codex')
  const [mode, setMode] = useState<BuilderMode>('plan')
  const [prompt, setPrompt] = useState('')
  const [run, setRun] = useState<BuilderRun | null>(null)
  const [actionError, setActionError] = useState<{
    error: unknown
    kind: 'refresh' | 'start' | 'stop'
  } | null>(null)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [confirmingBuild, setConfirmingBuild] = useState(false)
  const pollAbort = useRef<AbortController | null>(null)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const next = await getBuilderStatus()
      setStatus(next)
      const firstAvailable = next.engines.find((item) => item.installed)
      if (firstAvailable) setEngine(firstAvailable.id)
      if (next.active_run_id) {
        try {
          setRun(await getBuilderRun(next.active_run_id))
        } catch {
          // A process-local run can disappear after a server restart; readiness still works.
        }
      }
    } catch {
      setLoadError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const lastSequence = run?.events.at(-1)?.seq ?? 0
  useEffect(() => {
    if (!run || !ACTIVE.has(run.status)) return
    let disposed = false
    const controller = new AbortController()
    pollAbort.current = controller
    const timer = window.setTimeout(async () => {
      try {
        const next = await getBuilderRun(run.id, lastSequence, controller.signal)
        if (!disposed) setRun((current) => mergeRun(current, next))
      } catch (error) {
        if (!disposed && !controller.signal.aborted) {
          setActionError({ error, kind: 'refresh' })
        }
      }
    }, pollIntervalMs)
    return () => {
      disposed = true
      window.clearTimeout(timer)
      controller.abort()
      if (pollAbort.current === controller) pollAbort.current = null
    }
  }, [lastSequence, pollIntervalMs, run])

  const selectedEngine = useMemo(
    () => status?.engines.find((item) => item.id === engine) ?? null,
    [engine, status],
  )
  const hasInstalledEngine = status?.engines.some((item) => item.installed) ?? false
  const active = !!run && ACTIVE.has(run.status)
  const canStart =
    !!prompt.trim() && !!selectedEngine?.installed && !!status?.workspace_valid && !active

  async function start() {
    if (!canStart) return
    setConfirmingBuild(false)
    setStarting(true)
    setActionError(null)
    try {
      const created = await startBuilderRun({ engine, mode, prompt: prompt.trim() })
      setRun(created)
    } catch (error) {
      setActionError({ error, kind: 'start' })
    } finally {
      setStarting(false)
    }
  }

  function requestStart() {
    if (mode === 'build') {
      setConfirmingBuild(true)
      return
    }
    void start()
  }

  async function stop() {
    if (!run) return
    pollAbort.current?.abort()
    setStopping(true)
    setActionError(null)
    try {
      const stopped = await stopBuilderRun(run.id)
      setRun((current) => mergeRun(current, stopped))
    } catch (error) {
      setActionError({ error, kind: 'stop' })
    } finally {
      setStopping(false)
    }
  }

  if (loadError) {
    return (
      <Container size="default" className="builder-page">
        <ErrorState
          message={formatMessage({
            id: 'builder.checkError',
            defaultMessage: 'Could not check coding engines.',
          })}
          onRetry={() => void load()}
        />
      </Container>
    )
  }
  if (!status)
    return (
      <Container size="wide" className="builder-page">
        <Stack gap="--space-6">
          <TabSkeleton
            variant="builder"
            label={formatMessage({
              id: 'builder.checking',
              defaultMessage: 'Checking local coding engines…',
            })}
          />
        </Stack>
      </Container>
    )

  const appName = brand.app_name || 'Open Net Worth'
  const progressEvents =
    run?.events.filter((event) => event.kind !== 'tool' && event.kind !== 'output') ?? []
  const technicalEvents =
    run?.events.filter((event) => event.kind === 'tool' || event.kind === 'output') ?? []

  return (
    <Container size="wide" className="builder-page">
      <Stack gap="--space-6">
        <PageHeader
          title={formatMessage(
            { id: 'builder.pageTitle', defaultMessage: 'Build {appName}' },
            { appName },
          )}
          subtitle={formatMessage({
            id: 'builder.subtitle',
            defaultMessage:
              'Describe the outcome. Your local coding engine can plan it—or make it real in this checkout.',
          })}
          actions={
            <Badge tone={status.workspace_valid ? 'pos' : 'neg'}>
              {status.workspace_valid
                ? formatMessage({ id: 'builder.workspaceReady', defaultMessage: 'Workspace ready' })
                : formatMessage({
                    id: 'builder.workspaceUnavailable',
                    defaultMessage: 'Workspace unavailable',
                  })}
            </Badge>
          }
        />

        <div className="builder-thesis">
          <div className="builder-thesis__mark" aria-hidden="true">
            <Sparkles size={20} strokeWidth={1.5} />
          </div>
          <div className="builder-thesis__copy">
            <Text as="h2" size="2xl" weight={600}>
              {formatMessage({ id: 'builder.makeYours', defaultMessage: 'Make it yours.' })}
            </Text>
            <Text as="p" size="sm" tone="muted">
              {formatMessage({
                id: 'builder.intro',
                defaultMessage:
                  'Start in plain language. Open the activity trail when you want the technical detail.',
              })}
            </Text>
          </div>
          <div
            className={`builder-rail${active ? ' builder-rail--live' : ''}`}
            aria-label={formatMessage({ id: 'builder.sequence', defaultMessage: 'Build sequence' })}
          >
            <span>
              <b>1</b> {formatMessage({ id: 'builder.engine', defaultMessage: 'Engine' })}
            </span>
            <i aria-hidden="true" />
            <span>
              <b>2</b> {formatMessage({ id: 'builder.railAuthority', defaultMessage: 'Authority' })}
            </span>
            <i aria-hidden="true" />
            <span>
              <b>3</b> {formatMessage({ id: 'builder.run', defaultMessage: 'Run' })}
            </span>
          </div>
        </div>

        <div className="builder-layout">
          <Stack gap="--space-5" className="builder-main">
            {!hasInstalledEngine ? (
              <Panel>
                <Stack gap="--space-5">
                  <div>
                    <Text as="h2" size="lg" weight={600}>
                      {formatMessage({
                        id: 'builder.setup',
                        defaultMessage: 'Set up a coding engine',
                      })}
                    </Text>
                    <Text as="p" size="sm" tone="muted">
                      {formatMessage({
                        id: 'builder.setupHelp',
                        defaultMessage:
                          "Install one engine, sign in locally, then come back here. Open Net Worth uses that engine's existing login.",
                      })}
                    </Text>
                  </div>
                  <div className="builder-setup__engines">
                    {status.engines.map((item) => (
                      <div key={item.id} className="builder-engine">
                        <div className="builder-engine__icon" aria-hidden="true">
                          <FileCode size={18} strokeWidth={1.5} />
                        </div>
                        <div className="builder-engine__body">
                          <Text weight={600}>
                            {formatMessage(
                              { id: 'builder.install', defaultMessage: 'Install {engine}' },
                              { engine: item.label },
                            )}
                          </Text>
                          <Text as="p" size="sm" tone="muted">
                            {builderMessage(intl, item.guidance_message, item.guidance)}
                          </Text>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Cluster justify="between" align="center" className="builder-submit">
                    <Text size="xs" tone="faint">
                      {formatMessage({
                        id: 'builder.credentials',
                        defaultMessage: 'Open Net Worth never receives your engine credentials.',
                      })}
                    </Text>
                    <Button variant="primary" onClick={() => void load()}>
                      {formatMessage({ id: 'builder.checkAgain', defaultMessage: 'Check again' })}
                    </Button>
                  </Cluster>
                </Stack>
              </Panel>
            ) : (
              <Panel className="builder-compose">
                <Stack gap="--space-5">
                  <div>
                    <Text as="h2" size="lg" weight={600}>
                      {formatMessage({
                        id: 'builder.whatChange',
                        defaultMessage: 'What should change?',
                      })}
                    </Text>
                    <Text as="p" size="sm" tone="muted">
                      {formatMessage({
                        id: 'builder.startingPoint',
                        defaultMessage: 'Pick a starting point, or describe your own outcome.',
                      })}
                    </Text>
                  </div>
                  <Cluster gap="--space-2" className="builder-starters">
                    {starters.map((starter) => (
                      <Button
                        key={starter.label}
                        size="sm"
                        variant="ghost"
                        onClick={() => setPrompt(starter.prompt)}
                        disabled={active}
                      >
                        {starter.label}
                      </Button>
                    ))}
                  </Cluster>
                  <FormField
                    label={formatMessage(
                      {
                        id: 'builder.promptLabel',
                        defaultMessage: 'What should {appName} change?',
                      },
                      { appName },
                    )}
                    htmlFor="builder-prompt"
                  >
                    <TextArea
                      id="builder-prompt"
                      rows={7}
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder={formatMessage({
                        id: 'builder.placeholder',
                        defaultMessage:
                          'For example: Add a simple way to compare this month with last month…',
                      })}
                      disabled={active}
                    />
                  </FormField>

                  <div className="builder-authority">
                    <div className="builder-authority__control">
                      <Text as="div" size="xs" tone="faint" weight={600}>
                        {formatMessage({
                          id: 'builder.authority',
                          defaultMessage: 'How far should it go?',
                        })}
                      </Text>
                      <SegmentedControl
                        options={modeOptions}
                        value={mode}
                        onChange={setMode}
                        ariaLabel={formatMessage({
                          id: 'builder.authorityLabel',
                          defaultMessage: 'Builder authority',
                        })}
                      />
                    </div>
                    <div
                      className={`builder-authority__explain builder-authority__explain--${mode}`}
                    >
                      {mode === 'plan' ? (
                        <ShieldCheck size={18} strokeWidth={1.5} aria-hidden="true" />
                      ) : (
                        <Wrench size={18} strokeWidth={1.5} aria-hidden="true" />
                      )}
                      <Text size="sm">
                        {mode === 'plan'
                          ? formatMessage({
                              id: 'builder.planHelp',
                              defaultMessage:
                                'Plan reads the app and recommends an approach. It cannot change files.',
                            })
                          : formatMessage({
                              id: 'builder.buildHelp',
                              defaultMessage:
                                "Build can edit files and run local commands in this app's fixed workspace.",
                            })}
                      </Text>
                    </div>
                  </div>

                  {actionError && (
                    <Text as="p" size="sm" tone="bad">
                      {actionError.error instanceof Error
                        ? builderMessage(
                            intl,
                            (actionError.error as Error & { messageInfo?: BuilderMessage })
                              .messageInfo,
                            actionError.error.message,
                          )
                        : actionError.kind === 'refresh'
                          ? formatMessage({
                              id: 'builder.error.refreshRun',
                              defaultMessage: 'Could not refresh this run.',
                            })
                          : actionError.kind === 'start'
                            ? formatMessage({
                                id: 'builder.error.startEngine',
                                defaultMessage: 'Could not start the coding engine.',
                              })
                            : formatMessage({
                                id: 'builder.error.stopRun',
                                defaultMessage: 'Could not stop this run.',
                              })}
                    </Text>
                  )}
                  <Cluster justify="between" align="center" className="builder-submit">
                    <Text size="xs" tone="faint">
                      {formatMessage({
                        id: 'builder.noRelease',
                        defaultMessage: 'No release actions are provided in Builder.',
                      })}
                    </Text>
                    {active ? (
                      <Button variant="danger" onClick={() => void stop()} loading={stopping}>
                        {formatMessage({ id: 'builder.stop', defaultMessage: 'Stop run' })}
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={requestStart}
                        loading={starting}
                        disabled={!canStart}
                      >
                        {mode === 'plan'
                          ? formatMessage({
                              id: 'builder.planChange',
                              defaultMessage: 'Plan this change',
                            })
                          : formatMessage({
                              id: 'builder.buildChange',
                              defaultMessage: 'Build this change',
                            })}
                      </Button>
                    )}
                  </Cluster>
                </Stack>
              </Panel>
            )}

            {run && (
              <Panel
                title={formatMessage({ id: 'builder.activity', defaultMessage: 'Activity' })}
                badge={<Badge tone={runTone(run.status)}>{runLabel(run.status, intl)}</Badge>}
              >
                {!active && (
                  <div
                    className={`builder-result builder-result--${runTone(run.status)}`}
                    role="status"
                  >
                    <Text as="h2" size="lg" weight={600}>
                      {reviewTitle(run, intl)}
                    </Text>
                    <Text as="p" size="sm" tone="muted">
                      {reviewSummary(run, intl)}
                    </Text>
                  </div>
                )}
                {run.events.length === 0 ? (
                  <Text size="sm" tone="muted">
                    {formatMessage({
                      id: 'builder.waiting',
                      defaultMessage: 'Waiting for the coding engine…',
                    })}
                  </Text>
                ) : (
                  <>
                    {progressEvents.length > 0 && (
                      <ol className="builder-events" aria-live="polite">
                        {progressEvents.map((event) => (
                          <li
                            key={event.seq}
                            className={`builder-event builder-event--${event.kind}`}
                          >
                            <span className="builder-event__glyph" aria-hidden="true">
                              {eventGlyph(event.kind)}
                            </span>
                            <Text as="div" size="sm" className="builder-event__text">
                              {builderMessage(intl, event.text_message, event.text)}
                            </Text>
                          </li>
                        ))}
                      </ol>
                    )}
                    {technicalEvents.length > 0 && (
                      <details className="builder-technical">
                        <summary>
                          {formatMessage(
                            {
                              id: 'builder.technical',
                              defaultMessage: 'Show technical activity ({count})',
                            },
                            { count: technicalEvents.length },
                          )}
                        </summary>
                        <ol className="builder-events">
                          {technicalEvents.map((event) => (
                            <li
                              key={event.seq}
                              className={`builder-event builder-event--${event.kind}`}
                            >
                              <span className="builder-event__glyph" aria-hidden="true">
                                {eventGlyph(event.kind)}
                              </span>
                              <Text as="div" size="sm" className="builder-event__text">
                                {builderMessage(intl, event.text_message, event.text)}
                              </Text>
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                  </>
                )}
              </Panel>
            )}
          </Stack>

          <Stack gap="--space-5" className="builder-side">
            {hasInstalledEngine && (
              <Panel
                title={formatMessage({
                  id: 'builder.enginePanel',
                  defaultMessage: 'Coding engine',
                })}
                subtitle={formatMessage({
                  id: 'builder.engineSubtitle',
                  defaultMessage: 'Uses your local subscription login.',
                })}
              >
                <Stack gap="--space-4">
                  <FormField
                    label={formatMessage({ id: 'builder.engine', defaultMessage: 'Engine' })}
                    htmlFor="builder-engine"
                  >
                    <Select
                      id="builder-engine"
                      value={engine}
                      onChange={(event) => setEngine(event.target.value as BuilderEngineId)}
                      disabled={active}
                      options={status.engines.map((item) => ({
                        value: item.id,
                        label: item.installed
                          ? item.label
                          : formatMessage(
                              {
                                id: 'builder.engineNotInstalled',
                                defaultMessage: '{engine} — not installed',
                              },
                              { engine: item.label },
                            ),
                        disabled: !item.installed,
                      }))}
                    />
                  </FormField>
                  <Stack gap="--space-3">
                    {status.engines.map((item) => (
                      <div
                        key={item.id}
                        className={`builder-engine${item.id === engine ? ' builder-engine--selected' : ''}`}
                      >
                        <div className="builder-engine__icon" aria-hidden="true">
                          <FileCode size={18} strokeWidth={1.5} />
                        </div>
                        <div className="builder-engine__body">
                          <Cluster justify="between" align="center">
                            <Text weight={600}>{item.label}</Text>
                            <Badge tone={item.installed ? 'pos' : 'muted'}>
                              {item.installed
                                ? formatMessage({ id: 'builder.ready', defaultMessage: 'Ready' })
                                : formatMessage({
                                    id: 'builder.notInstalled',
                                    defaultMessage: 'Not installed',
                                  })}
                            </Badge>
                          </Cluster>
                          {item.installed ? (
                            <Text as="div" size="xs" tone="faint" className="builder-mono">
                              {item.version || item.command}
                            </Text>
                          ) : (
                            <Text as="p" size="xs" tone="muted">
                              {builderMessage(intl, item.guidance_message, item.guidance)}
                            </Text>
                          )}
                          {item.installed && (
                            <Text as="div" size="xs" tone="faint">
                              {item.build_is_sandboxed
                                ? formatMessage({
                                    id: 'builder.sandboxAvailable',
                                    defaultMessage: 'Workspace sandbox available',
                                  })
                                : formatMessage({
                                    id: 'builder.claudePermissions',
                                    defaultMessage: 'Uses Claude Code edit permissions',
                                  })}
                            </Text>
                          )}
                        </div>
                      </div>
                    ))}
                  </Stack>
                </Stack>
              </Panel>
            )}

            <Panel
              title={formatMessage({ id: 'builder.workspace', defaultMessage: 'Workspace' })}
              subtitle={formatMessage({
                id: 'builder.workspaceSubtitle',
                defaultMessage: 'Fixed by the server; the browser cannot change it.',
              })}
            >
              <div className="builder-workspace">
                <span className="builder-workspace__dot" aria-hidden="true" />
                <Text size="sm" className="builder-mono">
                  {status.workspace}
                </Text>
              </div>
              {status.error && (
                <Text as="p" size="sm" tone="bad">
                  {builderMessage(intl, status.error_message, status.error)}
                </Text>
              )}
            </Panel>

            {run && run.workspace_changes.length > 0 && (
              <Panel
                title={formatMessage({
                  id: 'builder.changes',
                  defaultMessage: 'Workspace changes',
                })}
                subtitle={formatMessage({
                  id: 'builder.changesSubtitle',
                  defaultMessage: 'Current Git status; it may include work from before this run.',
                })}
              >
                <ul className="builder-changes">
                  {run.workspace_changes.map((change) => (
                    <li key={change}>
                      <Text size="xs" className="builder-mono">
                        {change}
                      </Text>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </Stack>
        </div>

        <Modal
          open={confirmingBuild}
          onClose={() => setConfirmingBuild(false)}
          size="sm"
          title={formatMessage(
            { id: 'builder.confirmTitle', defaultMessage: 'Let {engine} edit {appName}?' },
            {
              engine:
                selectedEngine?.label ??
                formatMessage({ id: 'builder.thisEngine', defaultMessage: 'this engine' }),
              appName,
            },
          )}
          footer={
            <Cluster justify="end" gap="--space-2">
              <Button variant="ghost" onClick={() => setConfirmingBuild(false)}>
                {formatMessage({ id: 'builder.goBack', defaultMessage: 'Go back' })}
              </Button>
              <Button variant="primary" onClick={() => void start()} loading={starting}>
                {formatMessage({ id: 'builder.startBuilding', defaultMessage: 'Start building' })}
              </Button>
            </Cluster>
          }
        >
          <Stack gap="--space-4">
            <Text as="p" size="sm" tone="muted">
              {formatMessage({
                id: 'builder.confirmHelp',
                defaultMessage:
                  'Build can edit files and run local commands inside the fixed Open Net Worth workspace.',
              })}
            </Text>
            <div className="builder-confirm-boundary">
              <Text as="div" size="xs" tone="faint" weight={600}>
                {formatMessage({ id: 'builder.fixedWorkspace', defaultMessage: 'FIXED WORKSPACE' })}
              </Text>
              <Text as="div" size="sm" className="builder-mono">
                {status.workspace}
              </Text>
              <Text as="p" size="sm">
                {formatMessage({
                  id: 'builder.confirmBoundary',
                  defaultMessage:
                    'The engine is instructed not to commit, push, open a pull request, or deploy. Builder does not provide those release actions.',
                })}
              </Text>
            </div>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  )
}
