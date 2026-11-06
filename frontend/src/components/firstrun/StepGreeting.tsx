// First run, screen 00 — the greeting. Shown before anything is asked: what this is, what it
// costs (nothing — no account, no upload, no telemetry), and the two ways in. It is NOT a
// numbered step (design spec: three setup screens stay 1–3) — its only job is to route to
// "Set up" (the existing step 0), so it owns no state itself.
//
// Restoring a backup lives on the folder step (StepWelcome), after you have chosen where the
// book lives — owner decision 2026-10-03; a restore needs that folder first.

import { Button } from '../ui'
import { FirstRunMark } from './Mark'
import { useAppIntl } from '../../i18n/useAppIntl'

export interface StepGreetingProps {
  onSetup: () => void
  /** Behind an authenticating proxy: no local password, and the host owns where files live. */
  gatewayMode?: boolean
}

export function StepGreeting({ onSetup, gatewayMode = false }: StepGreetingProps) {
  const intl = useAppIntl()
  const localizedSteps = [
    {
      title: intl.formatMessage({
        id: 'greeting.currency',
        defaultMessage: 'The currency you think in',
      }),
      body: intl.formatMessage({
        id: 'greeting.files',
        defaultMessage: 'Plus where your files live on this machine.',
      }),
    },
    {
      title: intl.formatMessage({ id: 'greeting.model', defaultMessage: 'Bring your own model' }),
      body: intl.formatMessage({
        id: 'greeting.modelBody',
        defaultMessage: 'Claude Code, Codex, an API key, or Ollama running locally.',
      }),
    },
    {
      title: intl.formatMessage({
        id: 'greeting.password',
        defaultMessage: 'A password, if you want one',
      }),
      body: intl.formatMessage({
        id: 'greeting.passwordBody',
        defaultMessage: 'Only matters if you will open this from another device.',
      }),
    },
  ]
  const nextSteps = gatewayMode
    ? [
        {
          ...localizedSteps[0]!,
          body: intl.formatMessage({
            id: 'greeting.currencyGateway',
            defaultMessage: 'The one your totals are shown in.',
          }),
        },
        {
          ...localizedSteps[1]!,
          body: intl.formatMessage({
            id: 'greeting.modelGateway',
            defaultMessage: 'Claude Code, Codex, or an API key.',
          }),
        },
      ]
    : localizedSteps
  return (
    <div className="firstrun-greeting">
      <div className="firstrun-greeting__col firstrun-greeting__col--left">
        <FirstRunMark size="lg" />
        {/* No "Welcome" eyebrow here: it sets up "...to what?" and the headline answers a
            different question, so it reads as a fragment — and the mark above already
            names the app. Warmth belongs in the sentence below, not in a label. */}
        <h1 className="firstrun-headline" style={{ marginTop: 'var(--space-8)' }}>
          {intl.formatMessage({
            id: 'greeting.headline',
            defaultMessage: 'An open-source agent harness for personal finance.',
          })}
        </h1>
        <p className="firstrun-lead" style={{ maxWidth: 428 }}>
          {intl.formatMessage({
            id: 'greeting.lead',
            defaultMessage:
              'Not a chatbot: it works your real ledger. Banks and brokerages that sync themselves, automations that run while you sleep, skills you write — and every write permissioned, audited and reversible.',
          })}
        </p>

        <div className="firstrun-greeting__actions">
          <Button variant="primary" onClick={onSetup}>
            {intl.formatMessage({ id: 'greeting.getStarted', defaultMessage: 'Get started' })}
          </Button>
        </div>
      </div>

      <div className="firstrun-greeting__col firstrun-greeting__col--right">
        <div className="firstrun-eyebrow firstrun-eyebrow--muted">
          {intl.formatMessage({ id: 'greeting.whatNext', defaultMessage: 'What happens next' })}
        </div>
        <div className="firstrun-next">
          {nextSteps.map((s, i) => (
            <div className="firstrun-next__item" key={s.title}>
              <span className="firstrun-next__num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <div className="firstrun-next__title">{s.title}</div>
                <div className="firstrun-next__body">{s.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="firstrun-foot">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>
            {gatewayMode
              ? intl.formatMessage({
                  id: 'greeting.privateServer',
                  defaultMessage: 'No telemetry. Your data stays on your own server.',
                })
              : intl.formatMessage({
                  id: 'greeting.privateLocal',
                  defaultMessage: 'No account, no upload, no telemetry. Your data stays yours.',
                })}
          </span>
        </div>
      </div>
    </div>
  )
}
