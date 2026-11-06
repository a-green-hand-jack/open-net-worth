import { useAppIntl } from '../../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'
import { useEffect, useRef } from 'react'
import type { AutomationRun, AutomationRunStatus } from '../../../api/automations'
import { ChevronRight, Hand } from 'lucide-react'
import { fDateTime } from '../../../utils/format'
import { money } from './AutomationCostPanel'

export function AutomationHistory({
  runs,
  selectedRunId,
  onSelectRun,
  emptyMessage,
}: {
  runs: AutomationRun[]
  selectedRunId: string | null
  onSelectRun: (run: AutomationRun) => void
  emptyMessage?: string
}) {
  // Keep the open run visible inside the scroller — following a deep link, or stepping
  // through runs with the keyboard, otherwise lands on a row nowhere near the viewport.
  const intl = useAppIntl()
  const { formatMessage } = intl
  const selectedRow = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // Optional-called: jsdom has no scrollIntoView, and this is a nicety — never let a
    // missing scroll primitive take the history list down with it.
    selectedRow.current?.scrollIntoView?.({ block: 'nearest' })
  }, [selectedRunId])

  if (runs.length === 0) {
    return (
      <div className="a3-history-empty">
        {emptyMessage ??
          formatMessage({
            id: 'automations.history.empty',
            defaultMessage: 'Hasn’t run yet. Hit Run now to start it.',
          })}
      </div>
    )
  }
  // Nothing open → the list IS the page, so it runs full length. Open a run and it becomes
  // a scroller about five rows tall, so the card below stays on screen — but it still holds
  // EVERY run and scrolls the selected one into view. Hiding the rest behind a "close this
  // to see them" line took the list away to make room for one of its own entries.
  return (
    <div
      className={`a3-hist${selectedRunId ? ' is-windowed' : ''}`}
      role="list"
      aria-label={formatMessage({
        id: 'automations.history.label',
        defaultMessage: 'Automation run history',
      })}
    >
      {runs.map((run) => (
        <button
          key={run.id}
          type="button"
          role="listitem"
          ref={selectedRunId === run.id ? selectedRow : undefined}
          className={`a3-hist-row${selectedRunId === run.id ? ' on' : ''}`}
          onClick={() => onSelectRun(run)}
        >
          <span
            className={`rd-dot ${run.status === 'failed' ? 'bad' : run.status === 'running' ? 'run' : run.status === 'waiting' ? 'warn' : run.status === 'cancelled' ? '' : 'good'}`}
            aria-hidden="true"
          />
          <span className="when">{fDateTime(run.started_at, 'short', 'always')}</span>
          <span className="note">{statusLabel(run.status, intl)}</span>
          {run.status === 'waiting' && (
            <span
              className="a3-hand"
              title={formatMessage({
                id: 'automations.history.waiting',
                defaultMessage: 'Waiting on you',
              })}
            >
              <Hand size={13} aria-hidden="true" />
            </span>
          )}
          {run.status === 'running' && (
            <span
              className="a3-live"
              title={formatMessage({
                id: 'automations.history.runningNow',
                defaultMessage: 'Running now',
              })}
            />
          )}
          <span className="cost">
            {run.status === 'running' || run.cost_usd == null ? '' : money(run.cost_usd)}
          </span>
          <ChevronRight size={13} className="a3-hist-chevron" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

export function statusLabel(status: AutomationRunStatus, intl: IntlShape) {
  switch (status) {
    case 'completed':
      return intl.formatMessage({
        id: 'automations.history.completed',
        defaultMessage: 'Completed',
      })
    case 'running':
      return intl.formatMessage({ id: 'automations.history.running', defaultMessage: 'Running' })
    case 'waiting':
      return intl.formatMessage({ id: 'automations.history.needsYou', defaultMessage: 'Needs you' })
    case 'failed':
      return intl.formatMessage({ id: 'automations.history.failed', defaultMessage: 'Failed' })
    case 'cancelled':
      return intl.formatMessage({ id: 'automations.history.stopped', defaultMessage: 'Stopped' })
  }
}
