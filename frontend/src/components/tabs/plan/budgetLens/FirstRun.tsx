// budgetLens/FirstRun.tsx — a NEW book's Plan › Budget: nothing to lose, so the chooser IS the
// pane. Pick a card, one CTA. Ported from the Budget Onboarding (cards) design
// (budget_onboarding/compare.jsx FirstRun, owner 2026-09-25).
import { useState } from 'react'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import type { CSSProperties } from 'react'
import { Button } from '../../../ui'
import { FitPicker, MethodCard, Spark } from './MethodCard'
import { METHODS, fitColor } from './methodsData'
import type { FitId, MethodId } from './methodsData'
import { Arrow } from '../icons'

export function FirstRun({
  onStart,
  onLucius,
  busy,
}: {
  onStart: (id: MethodId) => void
  onLucius: (prompt: string) => void
  busy?: boolean
}) {
  const { formatMessage } = useAppIntl()
  const [fit, setFit] = useState<FitId | null>(null)
  const [sel, setSel] = useState<MethodId | null>('proportional')
  const [more, setMore] = useState(false)
  const pick = (f: FitId | null) => {
    setFit(f)
    setSel(f ? (METHODS.find((m) => m.fit === f)?.id ?? null) : null)
  }
  const chosen = METHODS.find((m) => m.id === sel)
  return (
    <div className="bo-intro">
      <div className="bo-intro-head">
        <div>
          <h2 className="bo-intro-title">
            {formatMessage({
              id: 'plan.chooseBudget',
              defaultMessage: 'How do you want to budget?',
            })}
          </h2>
          <p className="bo-intro-note">
            {formatMessage({
              id: 'plan.examples',
              defaultMessage: 'The figures below are examples, not your spending.',
            })}
          </p>
        </div>
        <FitPicker value={fit} onChange={pick} />
      </div>
      <div
        className="bo-cards"
        role="radiogroup"
        aria-label={formatMessage({ id: 'plan.budgetMethod', defaultMessage: 'Budgeting method' })}
      >
        {METHODS.map((m) => (
          <div
            key={m.id}
            style={{ display: 'contents', '--fit': fitColor(m.fit) } as CSSProperties}
          >
            <MethodCard
              m={m}
              mode="pick"
              selected={sel === m.id}
              fit={!!fit && m.fit === fit}
              onSelect={() => setSel(m.id)}
              more={more}
              onMore={() => setMore((o) => !o)}
            />
          </div>
        ))}
      </div>
      <div className="bo-intro-foot">
        <span className="bo-prompts">
          <Button
            variant="primary"
            size="sm"
            className="fi-lucius"
            iconLeft={<Spark size={15} />}
            onClick={() => onLucius('Help me choose a budgeting method')}
          >
            {formatMessage({ id: 'plan.helpChoose', defaultMessage: 'Help me choose' })}
          </Button>
        </span>
        <Button
          variant="primary"
          size="sm"
          disabled={!chosen}
          loading={busy}
          onClick={() => chosen && onStart(chosen.id)}
          data-tour="setup-plan"
        >
          {chosen
            ? formatMessage(
                { id: 'plan.startWith', defaultMessage: 'Start with {method}' },
                {
                  method:
                    chosen.id === 'zero_based'
                      ? formatMessage({ id: 'plan.zeroBased', defaultMessage: 'Zero-Based' })
                      : chosen.name,
                },
              )
            : formatMessage({ id: 'plan.start', defaultMessage: 'Start' })}
          <Arrow size={14} />
        </Button>
      </div>
    </div>
  )
}
