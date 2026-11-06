// Overview tab — condensed digests of Schedule / Funding / Actions with "goTo" deep-links into
// the other tabs. Ported from detail3.jsx's `OverviewTab`.
import type { Commitment } from '../../../types/commitments'
import { fBase, fCurrency } from '../../../utils/format'
import { daysUntil, fDual, fmtDate, fmtDay, isTracker } from '../../../utils/commitments'
import { computeCoverage } from './detailFunding'
import { FundingCoverageBar } from './FundingCoverageBar'
import { EntityRow } from '../../../lucius/EntityRow'
import type { EnvelopeAccrual } from '../../../utils/commitments'
import type { PositionMeta } from './fundingValue'
import type { DetailMutations } from './detailTypes'
import { CheckIcon, XIcon } from './icons'
import { ArrowRight } from '../../../ui/icons'
import { useAppIntl } from '../../../i18n/useAppIntl'

const STATUS_LABEL = {
  paid: { id: 'commitment.overview.status.paid', defaultMessage: 'Paid' },
  due: { id: 'commitment.overview.status.due', defaultMessage: 'Due' },
  overdue: { id: 'commitment.overview.status.overdue', defaultMessage: 'Overdue' },
  upcoming: { id: 'commitment.overview.status.upcoming', defaultMessage: 'Upcoming' },
}

function dispStatus(dueDate: string, status: string): keyof typeof STATUS_LABEL {
  if (status === 'paid') return 'paid'
  const d = daysUntil(dueDate)
  if (d < 0) return 'overdue'
  if (status === 'due' || d <= 14) return 'due'
  return 'upcoming'
}

interface OverviewProps {
  commitment: Commitment
  fx: Record<string, number>
  envelope: EnvelopeAccrual | null
  positions: Record<string, PositionMeta>
  goTo: (tab: 'schedule' | 'funding' | 'actions') => void
  m: DetailMutations
}

export function OverviewTab({ commitment: c, fx, envelope, positions, goTo, m }: OverviewProps) {
  const { formatMessage: t } = useAppIntl()
  const tracker = isTracker(c)
  const unpaid = [...c.installments]
    .filter((i) => i.status !== 'paid')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 3)
  const { remaining, gap, scaleMax, segs } = computeCoverage(c, fx, envelope)
  const acts = [...(c.actions || [])]
    .filter((a) => a.status === 'pending')
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
    .slice(0, 3)

  return (
    <>
      <div className="c2-exp-sec">
        <div className="c2-exp-sec-h">
          <span className="c2-exp-sec-t">
            {tracker
              ? t({
                  id: 'commitment.overview.nextContributions',
                  defaultMessage: 'Next contributions',
                })
              : t({ id: 'commitment.overview.nextPayments', defaultMessage: 'Next payments' })}
          </span>
          <span className="c2-exp-sec-note">
            <button className="c2-link" onClick={() => goTo('schedule')}>
              {tracker
                ? t({
                    id: 'commitment.overview.fullContributions',
                    defaultMessage: 'Full contributions',
                  })
                : t({
                    id: 'commitment.overview.fullSchedule',
                    defaultMessage: 'Full schedule',
                  })}{' '}
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </span>
        </div>
        {unpaid.length === 0 && (
          <div className="c2-fund-empty">
            {tracker
              ? t({
                  id: 'commitment.overview.allContributions',
                  defaultMessage: 'All contributions made.',
                })
              : t({ id: 'commitment.overview.allPayments', defaultMessage: 'All payments made.' })}
          </div>
        )}
        {unpaid.map((i) => {
          const s = dispStatus(i.due_date, i.status)
          return (
            <EntityRow
              as="div"
              className="c3-ov-row"
              key={i.id}
              type="installment"
              id={i.id}
              label={i.label || `${c.name} instalment`}
              item={i}
              toFields={(it) => ({
                label: it.label,
                commitment_name: c.name,
                due_date: it.due_date,
                amount: it.amount,
                currency: c.currency,
                status: it.status,
              })}
              sublabel={`${c.name} • ${i.due_date}`}
            >
              <span className="c3-ov-date">{fmtDate(i.due_date)}</span>
              <span className="c3-ov-label">
                {i.label}
                {i.description ? <span className="c3-ov-desc"> • {i.description}</span> : null}
              </span>
              <span className={'c2-si-badge ' + s}>{t(STATUS_LABEL[s])}</span>
              <span className="c3-ov-amt money">{fDual(i.amount, c.currency, fx)}</span>
            </EntityRow>
          )
        })}
      </div>

      <div className="c2-exp-sec">
        <div className="c2-exp-sec-h">
          <span className="c2-exp-sec-t">
            {t({ id: 'commitment.overview.funding', defaultMessage: 'Funding' })}
          </span>
          <span className="c2-exp-sec-note">
            {!tracker &&
              (gap > 0 ? (
                <span className="c2-exp-sec-note bad" style={{ marginRight: 10 }}>
                  {t(
                    {
                      id: 'commitment.overview.unfunded',
                      defaultMessage: '<money>{amount}</money> unfunded',
                    },
                    {
                      amount: fBase(gap),
                      money: (chunks) => <span className="money">{chunks}</span>,
                    },
                  )}
                </span>
              ) : (
                <span className="c2-exp-sec-note good" style={{ marginRight: 10 }}>
                  {t({ id: 'commitment.overview.fullyFunded', defaultMessage: 'Fully funded' })}
                </span>
              ))}
            <button className="c2-link" onClick={() => goTo('funding')}>
              {t(
                {
                  id: 'commitment.overview.sources',
                  defaultMessage: '{count, plural, one {# source} other {# sources}}',
                },
                { count: (c.funding_plan || []).length },
              )}{' '}
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </span>
        </div>
        {(c.funding_plan || []).length === 0 ? (
          <div className="c2-fund-empty">
            {tracker
              ? t({
                  id: 'commitment.overview.noContributionFunding',
                  defaultMessage:
                    "No funding sources yet — ask Lucius how you'll cover these contributions.",
                })
              : t({
                  id: 'commitment.overview.noPaymentFunding',
                  defaultMessage:
                    "No funding sources yet — ask Lucius how you'll cover these installments.",
                })}
          </div>
        ) : !tracker ? (
          <FundingCoverageBar
            segs={segs}
            gap={gap}
            scaleMax={scaleMax}
            remaining={remaining}
            fundingPlan={c.funding_plan || []}
            positions={positions}
          />
        ) : (
          <div className="c2-fund-empty">
            {(c.funding_plan || []).map((f) => f.label).join(' • ')}
          </div>
        )}
      </div>

      <div className="c2-exp-sec">
        <div className="c2-exp-sec-h">
          <span className="c2-exp-sec-t">
            {t({ id: 'commitment.overview.comingUp', defaultMessage: 'Coming up' })}
          </span>
          <span className="c2-exp-sec-note">
            <button className="c2-link" onClick={() => goTo('actions')}>
              {t({ id: 'commitment.overview.allActions', defaultMessage: 'All actions' })}{' '}
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </span>
        </div>
        {acts.length === 0 && (
          <div className="c2-fund-empty">
            {t({ id: 'commitment.overview.noActions', defaultMessage: 'No pending actions.' })}
          </div>
        )}
        {acts.map((a) => {
          const od = !!a.due_date && daysUntil(a.due_date) < 0
          return (
            <EntityRow
              as="div"
              className="c3-ov-row"
              key={a.id}
              type="commitment_action"
              id={a.id}
              label={a.label}
              item={a}
              toFields={(it) => ({
                label: it.label,
                commitment_name: c.name,
                due_date: it.due_date,
                amount: it.amount,
                currency: it.currency || c.currency,
                status: it.status,
              })}
              sublabel={`${c.name} • ${a.due_date}`}
            >
              <span className={'c3-ov-date' + (od ? ' od' : '')}>
                {od
                  ? `${t({ id: 'commitment.overview.status.overdue', defaultMessage: 'Overdue' })} • `
                  : ''}
                {a.due_date ? fmtDay(a.due_date) : '—'}
              </span>
              <span className="c3-ov-label">{a.label}</span>
              <span className="c2-act-cat">{a.category}</span>
              {a.amount != null && (
                <span className="c3-ov-amt money">
                  {fCurrency(a.amount, a.currency || c.currency)}
                </span>
              )}
              <span className="c3-ov-acts">
                <button
                  className="c2-need-icon-btn pay"
                  aria-label={t({
                    id: 'commitment.overview.markDone',
                    defaultMessage: 'Mark done',
                  })}
                  title={t({ id: 'commitment.overview.markDone', defaultMessage: 'Mark done' })}
                  onClick={() => void m.updateAction(a.id, { status: 'done' })}
                >
                  <CheckIcon />
                </button>
                <button
                  className="c2-need-icon-btn miss"
                  aria-label={t({
                    id: 'commitment.overview.notHappening',
                    defaultMessage: 'Not happening',
                  })}
                  title={t({
                    id: 'commitment.overview.notHappening',
                    defaultMessage: 'Not happening',
                  })}
                  onClick={() => void m.setActionMissed(a.id, a.funding_id, true)}
                >
                  <XIcon />
                </button>
              </span>
            </EntityRow>
          )
        })}
      </div>
    </>
  )
}
