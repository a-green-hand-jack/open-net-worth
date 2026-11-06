import { useAppIntl } from '../../i18n/useAppIntl'
import { FormattedMessage } from './FormattedMessage'
import type { BriefOpinion } from '../../types/intelDigest'

const LEAN_TONE: Record<NonNullable<BriefOpinion['lean']>, string> = {
  bullish: 'intel-opinion-lean--bull',
  bearish: 'intel-opinion-lean--bear',
  neutral: '',
}

/** Lucius's lean and suggestion, when the user's opinion level (Settings › Intelligence) allows
 *  them — always labelled as Lucius's view, never advice. Renders nothing at the information
 *  level, where neither field is written. */
export function OpinionLine({ opinion }: { opinion: BriefOpinion | null | undefined }) {
  const intl = useAppIntl()
  if (!opinion || (!opinion.lean && !opinion.suggestion)) return null
  return (
    <div className="intel-opinion">
      {opinion.lean && (
        <p className="intel-opinion-row">
          <span className={`intel-opinion-lean ${LEAN_TONE[opinion.lean]}`.trim()}>
            {intl.formatMessage({ id: 'intel.opinion.lean', defaultMessage: 'Leans {lean, select, bullish {bullish} bearish {bearish} other {neutral}}' }, { lean: opinion.lean })}
          </span>
          {opinion.lean_reason && <span>{opinion.lean_reason}</span>}
        </p>
      )}
      {opinion.suggestion && (
        <p className="intel-opinion-row">
          <span className="intel-opinion-label">{<FormattedMessage id="intel.static.lucius_suggests_5a551eda" defaultMessage={"Lucius suggests"} />}</span>
          <span>{opinion.suggestion}</span>
        </p>
      )}
      <p className="intel-opinion-note">{intl.formatMessage({ id: 'intel.settings.notAdvice', defaultMessage: "Lucius's view, not financial advice. The decision is always yours." })}</p>
    </div>
  )
}
