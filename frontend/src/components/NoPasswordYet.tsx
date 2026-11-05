import { useState } from 'react'
import { useBrand } from '../brand-context'
import { useAppIntl } from '../i18n/useAppIntl'

// A server with no password yet answers "not required, not signed in" to every other device:
// on purpose it only opens on its own machine, so nobody else can claim it first. A login
// form here would ask for a password that does not exist. Same card as Login, which it stands in for.

interface Status {
  required: boolean
  authenticated: boolean
}

type Outcome = 'idle' | 'checking' | 'still-none' | 'unreachable'

export function NoPasswordYet({ onRetry }: { onRetry: () => Promise<Status | null> }) {
  const brand = useBrand()
  const intl = useAppIntl()
  const [outcome, setOutcome] = useState<Outcome>('idle')

  // Anything but "still no password" re-renders the app away from this card, so only a status
  // that has not moved needs saying here.
  async function retry() {
    setOutcome('checking')
    const status = await onRetry()
    if (!status) setOutcome('unreachable')
    else setOutcome(!status.required && !status.authenticated ? 'still-none' : 'idle')
  }

  return (
    <div className="login-screen" role="alert">
      <div className="login-card">
        <div className="login-brand">{brand.app_name.toUpperCase()}</div>
        <h1 className="no-password-title">
          {intl.formatMessage({
            id: 'setup.passwordFirst',
            defaultMessage: 'Set a password first',
          })}
        </h1>
        <p className="login-sub">
          {intl.formatMessage({
            id: 'setup.passwordExplanation',
            defaultMessage:
              'This server doesn’t have a password yet, so it only opens on the computer it runs on. That way nobody else can claim it first.',
          })}
        </p>
        <ol className="no-password-steps">
          <li>
            {intl.formatMessage(
              { id: 'setup.openApp', defaultMessage: 'On that computer, open {app}.' },
              { app: brand.app_name },
            )}
          </li>
          <li>
            {intl.formatMessage({
              id: 'setup.setPassword',
              defaultMessage: 'Go to Settings → Security and set a password.',
            })}
          </li>
          <li>
            {intl.formatMessage({
              id: 'setup.returnSignIn',
              defaultMessage: 'Come back here and sign in.',
            })}
          </li>
        </ol>
        <button
          type="button"
          className="btn-primary login-submit"
          disabled={outcome === 'checking'}
          onClick={() => void retry()}
        >
          {intl.formatMessage({
            id: 'setup.passwordReady',
            defaultMessage: 'I’ve set it, sign in',
          })}
        </button>
        {outcome === 'still-none' && (
          <p className="login-error" role="status">
            {intl.formatMessage({
              id: 'setup.passwordStillMissing',
              defaultMessage:
                'Still no password on that server. Set one there first, then try again.',
            })}
          </p>
        )}
        {outcome === 'unreachable' && (
          <p className="login-error" role="status">
            {intl.formatMessage({
              id: 'login.unreachable',
              defaultMessage: 'Could not reach the server. Try again.',
            })}
          </p>
        )}
      </div>
    </div>
  )
}
