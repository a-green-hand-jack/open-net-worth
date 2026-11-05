// Settings → Security → Password: set, change, reset or remove the instance password.
//
// Which form shows is the SERVER's answer for this very request (`/api/auth/settings`), never a
// client guess: `current_password_required` is false only for the desktop app's own session,
// which may set a new password without the old one (a forgotten password is reset from here).
import { useState } from 'react'
import { authFetch } from '../../../../api/client'
import { tooManyAttemptsMessage } from '../../../../api/rateLimit'
import { Btn, Field, Panel } from '../ds'
import { useAppIntl } from '../../../../i18n/useAppIntl'

export interface PasswordState {
  password_set: boolean
  current_password_required: boolean
  trust_loopback: boolean
}

// Matches the first-run step and the server's floor.
const MIN_PASSWORD_LENGTH = 8

export function PasswordPanel({
  state,
  refresh,
  toast,
}: {
  state: PasswordState | undefined
  refresh: () => Promise<unknown> | void
  toast: (message: string) => void
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  // Until settings load, assume the strictest panel (Current + New + Confirm) rather than
  // flashing a no-current-password form that the server may then refuse.
  const isSet = state?.password_set ?? true
  const needsCurrent = state?.current_password_required ?? true
  // Outside the desktop app the server refuses removal while this computer is asked for the
  // password: an unconfigured instance opens loopback, which would override that choice.
  const removalBlocked = needsCurrent && state?.trust_loopback === false
  const verb = !isSet ? 'set' : needsCurrent ? 'change' : 'reset'
  const primaryLabel = !isSet
    ? formatMessage({ id: 'settings.remaining.pwSet', defaultMessage: 'Set password' })
    : needsCurrent
      ? formatMessage({ id: 'settings.remaining.pwChange', defaultMessage: 'Change password' })
      : formatMessage({ id: 'settings.remaining.pwReset', defaultMessage: 'Reset password' })

  function clearFields() {
    setOldPw('')
    setNewPw('')
    setConfirmPw('')
  }

  // Both writes share the same wrong-current-password and transport handling.
  async function submit(path: string, body: Record<string, unknown>, failure: string) {
    setBusy(true)
    try {
      const res = await authFetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_password: needsCurrent ? oldPw || undefined : undefined,
          ...body,
        }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          toast(tooManyAttemptsMessage(res))
          return false
        }
        const problem = await res.json().catch(() => null)
        const detail = problem?.detail
        // 403, not 401: a 401 would be read by authFetch as an expired session (sign-in screen).
        if (
          res.status === 403 &&
          (detail === 'current password incorrect' ||
            (problem?.message_id === 'auth.error.currentPasswordIncorrect' &&
              problem?.message_params &&
              typeof problem.message_params === 'object' &&
              !Array.isArray(problem.message_params) &&
              Object.keys(problem.message_params).length === 0))
        ) {
          toast(
            formatMessage({
              id: 'settings.remaining.pwWrong',
              defaultMessage: 'Current password is wrong',
            }),
          )
          return false
        }
        toast(
          typeof detail === 'string'
            ? detail
            : formatMessage(
                { id: 'settings.remaining.pwHttp', defaultMessage: '{failure} (HTTP {status})' },
                { failure, status: res.status },
              ),
        )
        return false
      }
      clearFields()
      void refresh()
      return true
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.pwNetwork',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  async function savePassword() {
    // Passwords are kept exactly as typed, spaces included — but all spaces is no password.
    if (!newPw.trim()) {
      toast(
        formatMessage({
          id: 'settings.remaining.pwEnterNew',
          defaultMessage: 'Enter a new password',
        }),
      )
      return
    }
    if (newPw.length < MIN_PASSWORD_LENGTH) {
      toast(
        formatMessage(
          {
            id: 'settings.remaining.pwMin',
            defaultMessage: 'New password must be at least {count} characters',
          },
          { count: MIN_PASSWORD_LENGTH },
        ),
      )
      return
    }
    if (newPw !== confirmPw) {
      toast(
        formatMessage({
          id: 'settings.remaining.pwMismatch',
          defaultMessage: "New password and confirmation don't match",
        }),
      )
      return
    }
    const ok = await submit(
      '/api/auth/change-password',
      { new_password: newPw },
      verb === 'set'
        ? formatMessage({
            id: 'settings.remaining.pwSetFailed',
            defaultMessage: 'Could not set the password',
          })
        : verb === 'change'
          ? formatMessage({
              id: 'settings.remaining.pwChangeFailed',
              defaultMessage: 'Could not change the password',
            })
          : formatMessage({
              id: 'settings.remaining.pwResetFailed',
              defaultMessage: 'Could not reset the password',
            }),
    )
    if (ok)
      toast(
        isSet
          ? formatMessage({
              id: 'settings.remaining.pwChanged',
              defaultMessage: 'Password changed',
            })
          : formatMessage({ id: 'settings.remaining.pwSetDone', defaultMessage: 'Password set' }),
      )
  }

  async function removePassword() {
    if (needsCurrent && !oldPw) {
      toast(
        formatMessage({
          id: 'settings.remaining.pwEnterCurrent',
          defaultMessage: 'Enter your current password to remove it',
        }),
      )
      return
    }
    const ok = await submit(
      '/api/auth/remove-password',
      {},
      formatMessage({
        id: 'settings.remaining.pwRemoveFailed',
        defaultMessage: 'Could not remove the password',
      }),
    )
    if (!ok) return
    setConfirmingRemove(false)
    toast(formatMessage({ id: 'settings.remaining.pwRemoved', defaultMessage: 'Password removed' }))
  }

  return (
    <Panel
      title={
        isSet
          ? formatMessage({ id: 'settings.remaining.pwTitle', defaultMessage: 'Password' })
          : formatMessage({ id: 'settings.remaining.pwSetTitle', defaultMessage: 'Set a password' })
      }
      sub={formatMessage({
        id: 'settings.remaining.pwSub',
        defaultMessage:
          'Signs you in to this instance — it is the only account, and it is stored on your own server',
      })}
    >
      <div className="rd-formgrid">
        {needsCurrent && (
          <Field
            label={formatMessage({
              id: 'settings.remaining.pwCurrent',
              defaultMessage: 'Current password',
            })}
          >
            <input
              className="rd-input"
              type="password"
              autoComplete="current-password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
            />
          </Field>
        )}
        {/* Removing needs only the current password (where it is required), never a new one. */}
        {!confirmingRemove && (
          <>
            <Field
              label={formatMessage({
                id: 'settings.remaining.pwNew',
                defaultMessage: 'New password',
              })}
              help={
                <>
                  {formatMessage(
                    {
                      id: 'settings.remaining.pwMinimumHelp',
                      defaultMessage: 'At least {count} characters.',
                    },
                    { count: MIN_PASSWORD_LENGTH },
                  )}
                  {isSet &&
                    !needsCurrent &&
                    formatMessage({
                      id: 'settings.remaining.pwLocalHelp',
                      defaultMessage:
                        " You're on this computer's own book, so the current password isn't needed.",
                    })}
                  {isSet && needsCurrent && (
                    <>
                      {' '}
                      {formatMessage(
                        {
                          id: 'settings.remaining.pwForgot',
                          defaultMessage:
                            'Forgot it? In the desktop app, set a new one here. On a server, run <code>onw reset-password</code> on that machine.',
                        },
                        { code: (chunks) => <code>{chunks}</code> },
                      )}
                    </>
                  )}
                </>
              }
            >
              <input
                className="rd-input"
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </Field>
            <Field
              label={formatMessage({
                id: 'settings.remaining.pwConfirm',
                defaultMessage: 'Confirm password',
              })}
            >
              <input
                className="rd-input"
                type="password"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </Field>
          </>
        )}
      </div>
      {confirmingRemove && (
        <div className="rd-help">
          {removalBlocked ? (
            <>
              {formatMessage({
                id: 'settings.remaining.pwRemoveBlocked',
                defaultMessage:
                  'Turn on "Don\'t ask for the password on this computer" first, or keep a password: removing it would open this book to every local request.',
              })}
            </>
          ) : (
            <>
              {formatMessage({
                id: 'settings.remaining.pwRemoveConfirm',
                defaultMessage:
                  "Remove the password? Other devices will be signed out and can't open this book until you set a password again. This computer will open it without one.",
              })}
            </>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {confirmingRemove ? (
          <>
            <Btn
              variant="danger-solid"
              disabled={busy || removalBlocked}
              onClick={() => void removePassword()}
            >
              {formatMessage({
                id: 'settings.remaining.pwRemove',
                defaultMessage: 'Remove password',
              })}
            </Btn>
            <Btn disabled={busy} onClick={() => setConfirmingRemove(false)}>
              {formatMessage({ id: 'settings.remaining.pwCancel', defaultMessage: 'Cancel' })}
            </Btn>
          </>
        ) : (
          <>
            <Btn variant="primary" disabled={busy} onClick={() => void savePassword()}>
              {primaryLabel}
            </Btn>
            {isSet && (
              <Btn disabled={busy} onClick={() => setConfirmingRemove(true)}>
                {formatMessage({
                  id: 'settings.remaining.pwRemove',
                  defaultMessage: 'Remove password',
                })}
              </Btn>
            )}
          </>
        )}
      </div>
    </Panel>
  )
}
