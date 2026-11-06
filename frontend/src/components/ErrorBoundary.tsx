import { Component, type ErrorInfo, type ReactNode } from 'react'
import { openReportProblem } from '../state/reportProblem'
import { useAppIntl } from '../i18n/useAppIntl'

// A render error in any single tab/component used to unmount the ENTIRE React
// tree to a blank white screen (React's default with no boundary). This catches
// it and shows an inline "this section failed" panel instead, so one bad data
// record or component bug degrades to a recoverable error — not a dead app.
//
// Wrap it with a `key` that changes on navigation (e.g. the active tab) so
// moving to another tab re-mounts the boundary and clears a prior error.

interface Props {
  children: ReactNode
  /** Shown in the fallback to orient the user, e.g. the section/tab name. */
  label?: string
  /** Overrides the default full-panel fallback with a smaller, caller-supplied
   * one — e.g. a dashboard widget card that wants its own title/Remove chrome
   * to stay put and just the broken content area to show a compact message. */
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface in the console for debugging; never rethrow (that would re-blank).
    console.error('ErrorBoundary caught an error', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return <ErrorFallback error={error} label={this.props.label} reset={this.reset} />
  }
}

function ErrorFallback({
  error,
  label,
  reset,
}: {
  error: Error
  label?: string
  reset: () => void
}) {
  const intl = useAppIntl()
  return (
    <div className="error-boundary" role="alert">
      <div className="error-boundary-title">
        {label
          ? intl.formatMessage(
              {
                id: 'errorBoundary.inSection',
                defaultMessage: 'Something went wrong in {section}.',
              },
              { section: label },
            )
          : intl.formatMessage({
              id: 'errorBoundary.generic',
              defaultMessage: 'Something went wrong.',
            })}
      </div>
      <div className="error-boundary-detail">{error.message}</div>
      <div className="error-boundary-actions">
        <button className="btn-secondary" onClick={reset}>
          {intl.formatMessage({ id: 'errorBoundary.retry', defaultMessage: 'Try again' })}
        </button>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          {intl.formatMessage({ id: 'errorBoundary.reload', defaultMessage: 'Reload app' })}
        </button>
        <button
          className="btn-secondary"
          onClick={() => openReportProblem({ error: error.message })}
        >
          {intl.formatMessage({
            id: 'errorBoundary.report',
            defaultMessage: 'Report this problem',
          })}
        </button>
      </div>
    </div>
  )
}
