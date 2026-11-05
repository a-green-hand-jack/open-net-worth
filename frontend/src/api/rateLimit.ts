// The one wording for the server's brute-force guard (429 + Retry-After), shared by every screen
// that can trip it: the login form and the password panel draw on the same attempt counter.
import type { IntlShape } from 'react-intl'

/** Retry-After is seconds; the server's window is 15 minutes, which is the fallback. */
export function tooManyAttemptsMessage(res: Pick<Response, 'headers'>, intl: IntlShape): string {
  const seconds = Number(res.headers?.get('Retry-After'))
  const minutes = seconds > 0 ? Math.ceil(seconds / 60) : 15
  return intl.formatMessage(
    {
      id: 'auth.rateLimit',
      defaultMessage:
        'Too many attempts. Try again in {minutes, plural, one {# minute} other {# minutes}}.',
    },
    { minutes },
  )
}
