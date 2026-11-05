// budgetLens/MethodExplainer.tsx — a method's diagram + who it's for / its strength / its honest
// cost, with no card, name or CTA around it. An engine's setup screen teaches the method with it
// (owner, 2026-08-23: "use this placeholder/empty state to also educate the user about this
// budget method"). Moved out of the retired first-run intro (BudgetLensIntro.tsx, replaced by
// FirstRun.tsx on 2026-09-25) — the setup screens still use it.
import type { ReactElement } from 'react'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { Meter } from '../../../ui'

// ── Diagrams — illustrative only, obviously-round numbers ──────────────────────────────

function DiagramRow({
  label,
  value,
  tone,
  ariaLabel,
}: {
  label: string
  value: number
  tone: 'good' | 'bad' | 'warn' | 'neutral'
  ariaLabel: string
}) {
  return (
    <div className="bgl-intro-diagram__row">
      <span className="bgl-intro-diagram__row-label">{label}</span>
      <Meter
        variant="linear"
        size="sm"
        value={value}
        tone={tone}
        ariaLabel={ariaLabel}
        className="bgl-intro-diagram__meter"
      />
    </div>
  )
}

/** One pool (Ready to Assign) drained near-empty, feeding fully-funded categories — the
 *  readable idea is "the pool must reach zero". */
function ZeroBasedDiagram() {
  const { formatMessage } = useAppIntl()
  return (
    <div className="bgl-intro-diagram">
      <DiagramRow
        label={formatMessage({ id: 'plan.toAssignTitle', defaultMessage: 'To Assign' })}
        value={4}
        tone="neutral"
        ariaLabel={formatMessage({
          id: 'plan.poolDrained',
          defaultMessage: 'Ready to Assign pool, drained down to zero',
        })}
      />
      <div className="bgl-intro-diagram__divider" aria-hidden="true" />
      <DiagramRow
        label={formatMessage({ id: 'plan.rent', defaultMessage: 'Rent' })}
        value={100}
        tone="good"
        ariaLabel={formatMessage({
          id: 'plan.rentAssigned',
          defaultMessage: 'Rent category, fully assigned',
        })}
      />
      <DiagramRow
        label={formatMessage({ id: 'plan.food', defaultMessage: 'Food' })}
        value={100}
        tone="good"
        ariaLabel={formatMessage({
          id: 'plan.foodAssigned',
          defaultMessage: 'Food category, fully assigned',
        })}
      />
      <DiagramRow
        label={formatMessage({ id: 'plan.saveShort', defaultMessage: 'Save' })}
        value={90}
        tone="good"
        ariaLabel={formatMessage({
          id: 'plan.saveAssigned',
          defaultMessage: 'Savings category, fully assigned',
        })}
      />
    </div>
  )
}

/** One bar split by proportion — the idea is "one income, three shares". */
function ProportionalDiagram() {
  const { formatMessage } = useAppIntl()
  return (
    <div className="bgl-intro-diagram bgl-intro-diagram--proportional">
      <Meter
        variant="linear"
        size="sm"
        segments={[
          {
            id: 'needs',
            pct: 50,
            className: 'bgl-seg-needs',
            ariaLabel: formatMessage({
              id: 'plan.needs50',
              defaultMessage: 'Needs, 50% of income',
            }),
          },
          {
            id: 'wants',
            pct: 30,
            className: 'bgl-seg-wants',
            ariaLabel: formatMessage({
              id: 'plan.wants30',
              defaultMessage: 'Wants, 30% of income',
            }),
          },
          {
            id: 'savings',
            pct: 20,
            className: 'bgl-seg-savings-pos',
            ariaLabel: formatMessage({
              id: 'plan.savings20',
              defaultMessage: 'Savings, 20% of income',
            }),
          },
        ]}
        ariaLabel={formatMessage({
          id: 'plan.splitAria',
          defaultMessage: 'One income, split 50% needs, 30% wants, 20% savings',
        })}
        valueText={formatMessage({
          id: 'plan.splitText',
          defaultMessage: '50% needs, 30% wants, 20% savings',
        })}
      />
      <div className="bgl-hero__legend bgl-intro-diagram__legend">
        {[
          {
            id: 'needs',
            label: formatMessage({ id: 'plan.needs', defaultMessage: 'Needs' }),
            dotClass: 'bgl-seg-needs',
          },
          {
            id: 'wants',
            label: formatMessage({ id: 'plan.wants', defaultMessage: 'Wants' }),
            dotClass: 'bgl-seg-wants',
          },
          {
            id: 'savings',
            label: formatMessage({ id: 'plan.savings', defaultMessage: 'Savings' }),
            dotClass: 'bgl-seg-savings-pos',
          },
        ].map((l) => (
          <div key={l.id} className="bgl-hero__legend-item">
            <span className={`bgl-hero__dot ${l.dotClass}`} aria-hidden="true" />
            <span className="bgl-hero__legend-label">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const DIAGRAM_BY_ID: Record<string, () => ReactElement> = {
  zero_based: ZeroBasedDiagram,
  proportional: ProportionalDiagram,
}

const GUIDANCE_IDS = new Set(['zero_based', 'proportional'])

/** The method's diagram + its for/strength/cost, with NO card, name or CTA around it — the
 *  explanatory half of an option card, on its own.
 *
 *  Exported so an engine's empty/setup state can teach the method instead of just naming it
 *  (owner, 2026-08-23: "use this placeholder/empty state to also educate the user about this
 *  budget method"). That screen is the single best teaching moment in the whole feature — the
 *  user has chosen to look at a method and there is nothing else on the page competing for
 *  attention — and reusing this means the setup screen can never drift from the comparison. */
export function MethodExplainer({ engineId }: { engineId: string }) {
  const { formatMessage } = useAppIntl()
  const Diagram = DIAGRAM_BY_ID[engineId]
  const hasGuidance = GUIDANCE_IDS.has(engineId)
  const guidance = !hasGuidance
    ? undefined
    : engineId === 'zero_based'
      ? {
          forWhom: formatMessage({
            id: 'plan.explainZeroFor',
            defaultMessage: 'You want every dollar accounted for and will maintain it.',
          }),
          strength: formatMessage({
            id: 'plan.explainZeroStrength',
            defaultMessage:
              'Nothing is unplanned — overspending is visible immediately and must be resolved.',
          }),
          cost: formatMessage({
            id: 'plan.explainZeroCost',
            defaultMessage:
              'Highest upkeep; an overspend forces you to move money from somewhere else.',
          }),
        }
      : {
          forWhom: formatMessage({
            id: 'plan.explainProportionalFor',
            defaultMessage:
              'You want to know if your spending shape is healthy without managing categories.',
          }),
          strength: formatMessage({
            id: 'plan.explainProportionalStrength',
            defaultMessage: 'Almost no upkeep; tells you immediately if proportions have drifted.',
          }),
          cost: formatMessage({
            id: 'plan.explainProportionalCost',
            defaultMessage:
              'No per-category control — it will not stop you overspending, only report it afterwards.',
          }),
        }
  if (!Diagram && !guidance) return null
  // Its OWN fixed-label guidance grid, never a `subgrid`: out here there is no ancestor grid to
  // inherit row tracks from, and a subgrid with nothing to inherit lays itself out arbitrarily —
  // which is exactly what went ragged.
  return (
    <div className="bgl-explainer">
      {Diagram && (
        <div className="bgl-explainer__diagram">
          <Diagram />
        </div>
      )}
      {guidance && (
        <dl className="bgl-explainer__guidance">
          <div className="bgl-explainer__row">
            <dt>{formatMessage({ id: 'plan.for', defaultMessage: 'For' })}</dt>
            <dd>{guidance.forWhom}</dd>
          </div>
          <div className="bgl-explainer__row">
            <dt>{formatMessage({ id: 'plan.strength', defaultMessage: 'Strength' })}</dt>
            <dd>{guidance.strength}</dd>
          </div>
          <div className="bgl-explainer__row">
            <dt>{formatMessage({ id: 'plan.honestCost', defaultMessage: 'Honest cost' })}</dt>
            <dd>{guidance.cost}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}
