import { useAppIntl } from '../../i18n/useAppIntl'
import { Check, X } from '../../ui/icons'

// Scan progress indicator — distinct from the chat "Ask Lucius" flow. A centered
// bottom pill: a spinner while the scan runs, then a teal-check summary that
// auto-dismisses. State is owned by Intel.tsx (see runScan).
export type ScanState =
  | { phase: 'scanning' }
  | { phase: 'done' | 'error' | 'pending'; msg: string }
  | null

export function ScanToast({ scan, onClose }: { scan: ScanState; onClose: () => void }) {
  const intl = useAppIntl()
  if (!scan) return null
  const scanning = scan.phase === 'scanning'
  const error = scan.phase === 'error'
  return (
    <div
      className="intel-scan-toast mb-anchored"
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
    >
      <div
        className={`intel-scan-pill${error ? ' intel-scan-pill--error' : scan.phase === 'done' ? ' intel-scan-pill--done' : ''}`}
      >
        {scanning ? (
          <span className="intel-scan-spinner" aria-hidden />
        ) : (
          <span className="intel-scan-check" aria-hidden>
            {error ? <X size={13} /> : <Check size={13} />}
          </span>
        )}
        <div className="intel-scan-text">
          <div className="intel-scan-title">
            {scanning ? (
              <>
                {intl.formatMessage({ id: 'intel.analysing', defaultMessage: 'Analysing key developments' })} <span className="intel-scan-spark">✦</span>
              </>
            ) : error ? (
              intl.formatMessage({ id: 'intel.scanFailed', defaultMessage: 'Scan failed' })
            ) : scan.phase === 'pending' ? (
              intl.formatMessage({ id: 'intel.scanProcessing', defaultMessage: 'Scan processing' })
            ) : (
              intl.formatMessage({ id: 'intel.upToDate', defaultMessage: 'Up to date' })
            )}
          </div>
          <div className="intel-scan-sub">
            {scanning ? intl.formatMessage({ id: 'intel.rescanning', defaultMessage: 'Re-scanning your holdings and watchlists…' }) : scan.msg}
          </div>
        </div>
        {!scanning && (
          <button type="button" className="intel-scan-close" onClick={onClose} aria-label={intl.formatMessage({ id: 'intel.dismiss', defaultMessage: 'Dismiss' })}>
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
