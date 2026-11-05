import { openReportProblem } from '../state/reportProblem'
import { Button, type ButtonSize } from './ui/Button'
import { useAppIntl } from '../i18n/useAppIntl'

/** "Report this problem" beside an error: opens the report prefilled with that error. A secondary
 *  button — the surface's own recovery action (Retry, Reload) stays the primary one. */
export function ReportProblemButton({ error, size = 'md' }: { error?: string; size?: ButtonSize }) {
  const intl = useAppIntl()
  return (
    <Button size={size} onClick={() => openReportProblem({ error })}>
      {intl.formatMessage({ id: 'common.reportProblem', defaultMessage: 'Report this problem' })}
    </Button>
  )
}
