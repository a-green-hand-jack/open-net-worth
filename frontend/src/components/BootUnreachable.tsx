import { useBrand } from '../brand-context'
import { ReportProblemButton } from './ReportProblemButton'
import { useAppIntl } from '../i18n/useAppIntl'

// Shown when a boot-time request (auth or setup status) gets no answer. Without it a hung
// server left the splash or the blank boot ground up forever, with no way to try again.

export function BootUnreachable({ onRetry, busy }: { onRetry: () => void; busy?: boolean }) {
  const brand = useBrand()
  const intl = useAppIntl()
  return (
    <div className="auth-splash" role="alert">
      <div className="auth-splash-brand">{brand.app_name.toUpperCase()}</div>
      <div className="boot-unreachable-text">
        {intl.formatMessage(
          { id: 'boot.unreachable', defaultMessage: 'Can’t reach {app}.' },
          { app: brand.app_name },
        )}
      </div>
      <div className="boot-unreachable-actions">
        <button type="button" className="btn-secondary" disabled={busy} onClick={onRetry}>
          {busy
            ? intl.formatMessage({ id: 'boot.retrying', defaultMessage: 'Retrying…' })
            : intl.formatMessage({ id: 'boot.retry', defaultMessage: 'Retry' })}
        </button>
        <ReportProblemButton error={`Can't reach ${brand.app_name}.`} />
      </div>
    </div>
  )
}
