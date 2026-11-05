// budgetLens/MethodCard.tsx — one budgeting method as a card, shared by the first-run chooser
// (pick mode) and the Compare methods modal (static). Ported from the Budget Onboarding (cards)
// design — budget_onboarding/compare.jsx + diagrams.jsx (owner, 2026-09-25). The diagrams are
// one illustrative month, obviously-round figures, never the book's real data.
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import * as PD from '../planData'
import { FITS } from './methodsData'
import type { FitId, MethodMeta } from './methodsData'
import './methods.css'

const { fSmart } = PD

export const Spark = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M9.94 14.06A2 2 0 0 0 8.5 12.6l-5.4-1.4a.4.4 0 0 1 0-.78l5.4-1.4A2 2 0 0 0 9.94 7.6l1.4-5.4a.4.4 0 0 1 .78 0l1.4 5.4A2 2 0 0 0 14.96 9l5.4 1.4a.4.4 0 0 1 0 .78l-5.4 1.4a2 2 0 0 0-1.44 1.44l-1.4 5.4a.4.4 0 0 1-.78 0z" />
    <path d="M19 4v3M20.5 5.5h-3M18 17v2M19 18h-2" />
  </svg>
)

export const Check = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12l5 5L20 7" />
  </svg>
)

const FIT_ICON: Record<FitId, ReactNode> = {
  every: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M3 10h18M9 10v10" />
    </svg>
  ),
  shape: (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 3a9 9 0 1 0 9 9h-9z" />
      <path d="M12 3v9h9" />
    </svg>
  ),
}

// ── Diagrams ────────────────────────────────────────────────────────────────────────────

function Row({
  n,
  pct,
  v,
  tone,
  stop,
}: {
  n: string
  pct: number
  v: string
  tone?: 'zero' | 'warn' | 'pool'
  stop?: boolean
}) {
  const { formatMessage } = useAppIntl()
  return (
    <div className="bo-dg-row">
      <span className="n">{n}</span>
      {tone === 'zero' ? (
        <span className="bo-dg-done">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {formatMessage({ id: 'plan.everyAssigned', defaultMessage: 'Every dollar assigned' })}
        </span>
      ) : (
        <span className={'bo-track' + (stop ? ' empty' : '')}>
          <span className={'bo-fill ' + (tone || '')} style={{ width: pct + '%' }} />
        </span>
      )}
      <span className={'v bo-fig' + (stop ? ' stop' : '') + (tone === 'zero' ? ' zero' : '')}>
        {v}
      </span>
    </div>
  )
}

/** Zero-Based: one pool drains to zero into envelopes with targets. */
function ZeroDiagram() {
  const { formatMessage } = useAppIntl()
  return (
    <div
      className="bo-dg"
      aria-label={formatMessage({
        id: 'plan.zeroDiagram',
        defaultMessage: 'Zero-based: income pool drained to zero into envelopes',
      })}
    >
      <Row
        n={formatMessage({ id: 'plan.toAssign', defaultMessage: 'To assign' })}
        pct={0}
        v={fSmart(0)}
        tone="zero"
      />
      <div className="bo-dg-rule" />
      <Row
        n={formatMessage({ id: 'plan.home', defaultMessage: 'Home' })}
        pct={100}
        v={fSmart(2800)}
      />
      <Row
        n={formatMessage({ id: 'plan.food', defaultMessage: 'Food' })}
        pct={100}
        v={fSmart(1150)}
      />
      <Row
        n={formatMessage({ id: 'plan.savings', defaultMessage: 'Savings' })}
        pct={100}
        v={fSmart(900)}
      />
    </div>
  )
}

/** 50/30/20: one bar, three shares, targets as ticks. */
function ProportionDiagram({ needs = 52, wants = 22, tNeeds = 50, tWants = 30 }) {
  const { formatMessage } = useAppIntl()
  const save = Math.max(0, 100 - needs - wants)
  return (
    <div
      aria-label={formatMessage(
        {
          id: 'plan.proportionAria',
          defaultMessage: '50/30/20: {needs}% needs, {wants}% wants, {save}% savings',
        },
        { needs, wants, save },
      )}
    >
      <div className="bo-barwrap">
        <div className="bo-bar">
          <span className="bo-bar-seg needs" style={{ flexBasis: needs + '%' }}>
            {needs}%
          </span>
          <span className="bo-bar-seg wants" style={{ flexBasis: wants + '%' }}>
            {wants}%
          </span>
          <span className="bo-bar-seg save" style={{ flexBasis: save + '%' }}>
            {save}%
          </span>
        </div>
        <span className="bo-tick" style={{ left: tNeeds + '%' }}>
          <span>{tNeeds}</span>
        </span>
        <span className="bo-tick" style={{ left: tNeeds + tWants + '%' }}>
          <span>{tNeeds + tWants}</span>
        </span>
      </div>
      <div className="bo-legend">
        <span>
          <i style={{ background: 'var(--bk-needs)' }} />
          {formatMessage({ id: 'plan.needs', defaultMessage: 'Needs' })}
        </span>
        <span>
          <i style={{ background: 'var(--bk-wants)' }} />
          {formatMessage({ id: 'plan.wants', defaultMessage: 'Wants' })}
        </span>
        <span>
          <i style={{ background: 'var(--bk-save)' }} />
          {formatMessage({ id: 'plan.savings', defaultMessage: 'Savings' })}
        </span>
      </div>
    </div>
  )
}

const DIAGRAM: Record<MethodMeta['id'], () => ReactElement> = {
  zero_based: ZeroDiagram,
  proportional: () => <ProportionDiagram />,
}

// ── Facts ───────────────────────────────────────────────────────────────────────────────

const Dots = ({ n }: { n: number }) => {
  const { formatMessage } = useAppIntl()
  return (
    <span
      className="bo-dots"
      aria-label={formatMessage({ id: 'plan.effortDots', defaultMessage: '{n} of 3' }, { n })}
    >
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? 'on' : ''} />
      ))}
    </span>
  )
}

function Facts({ m }: { m: MethodMeta }) {
  const { formatMessage } = useAppIntl()
  return (
    <dl className="bo-facts">
      <dt>{formatMessage({ id: 'plan.effort', defaultMessage: 'Effort' })}</dt>
      <dd>
        <Dots n={m.effort} />
        <span className="dim">
          {
            [
              '',
              formatMessage({ id: 'plan.low', defaultMessage: 'Low' }),
              formatMessage({ id: 'plan.medium', defaultMessage: 'Medium' }),
              formatMessage({ id: 'plan.high', defaultMessage: 'High' }),
            ][m.effort]
          }
        </span>
      </dd>
      <dt>{formatMessage({ id: 'plan.overspend', defaultMessage: 'If I overspend' })}</dt>
      <dd className={m.stops === 'reports' ? 'dim' : ''}>
        {m.stops === 'must-resolve' ? (
          <>
            <span className="bo-ok">
              <Check size={11} />
            </span>
            {formatMessage({ id: 'plan.cover', defaultMessage: 'You move money to cover it' })}
          </>
        ) : (
          <>
            <span className="bo-no">—</span>
            {formatMessage({ id: 'plan.monthEnd', defaultMessage: 'You see it at month end' })}
          </>
        )}
      </dd>
      <dt>{formatMessage({ id: 'plan.leftover', defaultMessage: 'Leftover money' })}</dt>
      <dd className={m.carry ? '' : 'dim'}>
        {m.carry === true ? (
          <>
            <span className="bo-ok">
              <Check size={11} />
            </span>
            {formatMessage({ id: 'plan.staysEnvelope', defaultMessage: 'Stays in its envelope' })}
          </>
        ) : (
          <>
            <span className="bo-no">—</span>
            {formatMessage({ id: 'plan.notTracked', defaultMessage: 'Not tracked' })}
          </>
        )}
      </dd>
    </dl>
  )
}

// ── The card ────────────────────────────────────────────────────────────────────────────

export function MethodCard({
  m,
  mode,
  selected,
  fit,
  current,
  more,
  onSelect,
  onMore,
}: {
  m: MethodMeta
  /** `pick` — a radio in the first-run chooser; `static` — a read-only card in Compare. */
  mode: 'pick' | 'static'
  selected?: boolean
  /** The fit the user picked points at this method. */
  fit?: boolean
  /** This is the book's current method (Compare only). */
  current?: boolean
  more: boolean
  onSelect?: () => void
  onMore: () => void
}) {
  const { formatMessage } = useAppIntl()
  const pick = mode === 'pick'
  const Diagram = DIAGRAM[m.id]
  return (
    <div
      className={'bo-card' + (selected ? ' on' : '') + (pick ? '' : ' static')}
      onClick={pick ? onSelect : undefined}
      role={pick ? 'radio' : undefined}
      aria-checked={pick ? !!selected : undefined}
      tabIndex={pick ? 0 : undefined}
      onKeyDown={
        pick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect?.()
              }
            }
          : undefined
      }
    >
      <div className="bo-card-head">
        <span className="bo-card-name">
          {m.id === 'zero_based'
            ? formatMessage({ id: 'plan.zeroBased', defaultMessage: 'Zero-Based' })
            : m.name}
        </span>
        {current && (
          <span className="bo-tag bo-tag--cur">
            {formatMessage({ id: 'plan.current', defaultMessage: 'Current' })}
          </span>
        )}
        {fit && !current && (
          <span className="bo-tag bo-tag--fit">
            {formatMessage({ id: 'plan.fitsYou', defaultMessage: 'Fits you' })}
          </span>
        )}
        {!fit && !current && m.id === 'proportional' && pick && (
          <span className="bo-tag bo-tag--fit">
            {formatMessage({ id: 'plan.easyStart', defaultMessage: 'Easiest start' })}
          </span>
        )}
        {pick && <span className="bo-radio" aria-hidden="true" />}
      </div>
      <p className="bo-card-hook">
        {m.id === 'proportional'
          ? formatMessage(
              {
                id: 'plan.proportionalHook',
                defaultMessage: 'Income split into <b>Needs, Wants, Savings</b>.',
              },
              { b: (chunks) => <b>{chunks}</b> },
            )
          : formatMessage(
              {
                id: 'plan.zeroHook',
                defaultMessage: 'Every dollar gets a job. <b>Assign to zero.</b>',
              },
              { b: (chunks) => <b>{chunks}</b> },
            )}
      </p>
      <div className="bo-card-diagram">
        <Diagram />
      </div>
      <Facts m={m} />
      <div>
        <button
          type="button"
          className="bo-card-more"
          onClick={(e) => {
            e.stopPropagation()
            onMore()
          }}
        >
          {more
            ? formatMessage({ id: 'plan.less', defaultMessage: 'Less' })
            : formatMessage({ id: 'plan.forMe', defaultMessage: 'Is this for me?' })}
        </button>
        {more && (
          <dl className="bo-card-detail">
            <dt>{formatMessage({ id: 'plan.bestIf', defaultMessage: 'Best if' })}</dt>
            <dd>
              {m.id === 'proportional'
                ? formatMessage({
                    id: 'plan.proportionalFit',
                    defaultMessage: 'You want a quick health check without managing categories.',
                  })
                : formatMessage({
                    id: 'plan.zeroFit',
                    defaultMessage: 'You want every dollar accounted for and will keep it up.',
                  })}
            </dd>
            <dt>{formatMessage({ id: 'plan.effort', defaultMessage: 'Effort' })}</dt>
            <dd>
              {m.id === 'proportional'
                ? formatMessage({
                    id: 'plan.proportionalCost',
                    defaultMessage: 'Glance at the split once a month. Nothing to maintain.',
                  })
                : formatMessage({
                    id: 'plan.zeroCost',
                    defaultMessage:
                      'Assign each paycheck, then check in weekly and move money when a category runs over.',
                  })}
            </dd>
          </dl>
        )}
      </div>
    </div>
  )
}

/** "What do you want from a budget?" — picking one points at the method that fits it. */
export function FitPicker({
  value,
  onChange,
}: {
  value: FitId | null
  onChange: (f: FitId | null) => void
}) {
  const { formatMessage } = useAppIntl()
  return (
    <div
      className="bo-fit"
      role="group"
      aria-label={formatMessage({
        id: 'plan.budgetGoal',
        defaultMessage: 'What do you want from a budget?',
      })}
    >
      {FITS.map((f) => (
        <button
          key={f.id}
          type="button"
          className={value === f.id ? 'on' : ''}
          style={{ '--fit': f.color } as CSSProperties}
          onClick={() => onChange(value === f.id ? null : f.id)}
        >
          <span className="bo-fit-ic">{FIT_ICON[f.id]}</span>
          {f.id === 'shape'
            ? formatMessage({ id: 'plan.fitShape', defaultMessage: 'Just check my shape' })
            : formatMessage({ id: 'plan.fitEvery', defaultMessage: 'Account for every dollar' })}
        </button>
      ))}
    </div>
  )
}
