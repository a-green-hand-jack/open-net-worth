import { useState } from 'react'
import { authFetch } from '../api/client'
import { tooManyAttemptsMessage } from '../api/rateLimit'
import { useBrand } from '../brand-context'
import { PasswordField } from './ui'
import { useAppIntl } from '../i18n/useAppIntl'

// Full-screen pre-app gate (P3-AUTH S3). Rendered by App.tsx INSTEAD of the
// tabs/sidebar/chat when auth is required and this request isn't authenticated.
// On success the server sets the HttpOnly `onw_session` cookie; we call back to
// App.tsx to re-check GET /api/auth/status and render the app.

export function Login({ onAuthenticated }: { onAuthenticated: () => void }) {
  const intl = useAppIntl()
  const brand = useBrand()
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !password) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.status === 401) {
        setError(
          intl.formatMessage({ id: 'login.incorrect', defaultMessage: 'Incorrect password' }),
        )
        setSubmitting(false)
        return
      }
      if (res.status === 429) {
        setError(tooManyAttemptsMessage(res, intl))
        setSubmitting(false)
        return
      }
      if (!res.ok) {
        setError(
          intl.formatMessage(
            { id: 'login.failed', defaultMessage: 'Login failed (HTTP {status})' },
            { status: res.status },
          ),
        )
        setSubmitting(false)
        return
      }
      // Cookie is set; let App re-check status and render the app.
      setPassword('')
      onAuthenticated()
    } catch {
      setError(
        intl.formatMessage({
          id: 'login.unreachable',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">{brand.app_name.toUpperCase()}</div>
        <p className="login-sub">
          {intl.formatMessage({
            id: 'login.description',
            defaultMessage: 'Enter your password to access this instance.',
          })}
        </p>
        <label className="form-label" htmlFor="login-password">
          {intl.formatMessage({ id: 'login.password', defaultMessage: 'Password' })}
        </label>
        <PasswordField
          id="login-password"
          value={password}
          autoFocus
          autoComplete="current-password"
          placeholder={intl.formatMessage({ id: 'login.password', defaultMessage: 'Password' })}
          onChange={(e) => {
            setPassword(e.target.value)
            if (error) setError(null)
          }}
        />
        {error && <div className="login-error">{error}</div>}
        <button
          className="btn-primary login-submit"
          type="submit"
          disabled={submitting || !password}
        >
          {submitting
            ? intl.formatMessage({ id: 'login.signingIn', defaultMessage: 'Signing in…' })
            : intl.formatMessage({ id: 'login.signIn', defaultMessage: 'Sign in' })}
        </button>
        <p className="login-help">
          {intl.formatMessage(
            {
              id: 'login.lostPassword',
              defaultMessage:
                'Lost your password? In the desktop app, set a new one in Settings → Security. On a server, run <code>onw reset-password</code> on that machine.',
            },
            { code: (chunks) => <code>{chunks}</code> },
          )}{' '}
          <a
            href="https://docs.opennetworth.ai/troubleshooting/lost-password/"
            target="_blank"
            rel="noreferrer"
          >
            {intl.formatMessage({ id: 'login.moreOptions', defaultMessage: 'More options' })}
          </a>
        </p>
      </form>
    </div>
  )
}
