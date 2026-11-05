import { useAppIntl } from '../../../../i18n/useAppIntl'
// Settings → Terminal. A shell on the machine this app runs on. In Private Cloud that is your
// own server; a self-hosted app offers it only when its owner has switched it on.
import { lazy, Suspense, useEffect, useState } from 'react'
import { authFetch } from '../../../../api/client'
import { useGatewayIdentity } from '../../../../hooks/useGatewayIdentity'
import {
  desktopFreshSignIn,
  freshSignInUrl,
  reauthUrlFrom,
  startGatewayReauth,
} from '../../../../utils/gatewayReauth'
import { TERMINAL_NOTICE } from '../../../shared/privateCloudCopy'
import { Btn, Panel } from '../ds'
import type { SectionProps } from '../ds'

const TerminalView = lazy(() => import('./TerminalView').then((m) => ({ default: m.TerminalView })))

type Status =
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'sign-in-again'; reauth?: string }

/** The terminal's availability for this browser; null when the answer is not one to show. */
async function loadStatus(gatewayMode: boolean): Promise<Status | null> {
  try {
    const res = await authFetch('/api/terminal/status')
    if (res.status === 401) {
      const body = (await res
        .clone()
        .json()
        .catch(() => null)) as { code?: string } | null
      return body?.code === 'fresh_session_required'
        ? {
            kind: 'sign-in-again',
            reauth: (await reauthUrlFrom(res)) ?? (gatewayMode ? freshSignInUrl() : undefined),
          }
        : null
    }
    const body = (await res.json()) as { available: boolean; reason: string | null }
    return body.available
      ? { kind: 'ready' }
      : { kind: 'unavailable', reason: body.reason ?? 'unknown' }
  } catch {
    return { kind: 'unavailable', reason: 'network' }
  }
}

export function TerminalSection({ gatewayMode = false }: SectionProps) {
  const { formatMessage } = useAppIntl()
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [session, setSession] = useState(0) // bumps to open a fresh terminal
  const [open, setOpen] = useState(false)
  const [signInError, setSignInError] = useState('')
  const identity = useGatewayIdentity(gatewayMode)

  useEffect(() => {
    let cancelled = false
    void loadStatus(gatewayMode).then((next) => {
      if (!cancelled && next) setStatus(next)
    })
    return () => {
      cancelled = true
    }
  }, [gatewayMode])

  const signInAgain = (reauth?: string) => {
    const desktop = desktopFreshSignIn()
    if (!desktop) {
      startGatewayReauth(reauth, undefined, undefined, true)
      return
    }
    setSignInError('')
    desktop.catch(() =>
      setSignInError(
        formatMessage({
          id: 'settings.remaining.signInError',
          defaultMessage: 'Could not start the sign-in. Try again.',
        }),
      ),
    )
  }

  const recheck = () => void loadStatus(gatewayMode).then((next) => next && setStatus(next))

  return (
    <Panel
      title={formatMessage({ id: 'settings.remaining.terminal', defaultMessage: 'Terminal' })}
      sub={formatMessage({
        id: 'settings.remaining.terminalNotice',
        defaultMessage: TERMINAL_NOTICE,
      })}
    >
      {status.kind === 'loading' && (
        <div className="rd-help">
          {formatMessage({ id: 'settings.remaining.checking', defaultMessage: 'Checking…' })}
        </div>
      )}
      {status.kind === 'unavailable' && (
        <div className="rd-help">
          {status.reason === 'disabled'
            ? formatMessage({
                id: 'settings.remaining.terminalDisabled',
                defaultMessage: 'The terminal is switched off on this server.',
              })
            : status.reason === 'unsupported_platform'
              ? formatMessage({
                  id: 'settings.remaining.terminalUnsupported',
                  defaultMessage: 'The terminal is not available on this operating system.',
                })
              : status.reason === 'not_signed_in'
                ? formatMessage({
                    id: 'settings.remaining.terminalSignIn',
                    defaultMessage: 'Sign in to use the terminal.',
                  })
                : status.reason === 'network'
                  ? formatMessage({
                      id: 'settings.remaining.terminalNetwork',
                      defaultMessage: 'Could not reach the server. Try again.',
                    })
                  : formatMessage({
                      id: 'settings.remaining.terminalUnavailable',
                      defaultMessage: 'Not available.',
                    })}
        </div>
      )}
      {status.kind === 'sign-in-again' && (
        <div className="rd-term-note">
          <div className="rd-help">
            {formatMessage({
              id: 'settings.remaining.terminalRecent',
              defaultMessage:
                'For your security the terminal asks for a recent sign-in. Sign in again to continue.',
            })}
          </div>
          {status.reauth || !identity?.portal_url ? (
            <Btn variant="primary" onClick={() => signInAgain(status.reauth)}>
              {formatMessage({
                id: 'settings.remaining.signInAgain',
                defaultMessage: 'Sign in again',
              })}
            </Btn>
          ) : (
            <a href={identity.portal_url} target="_blank" rel="noopener noreferrer">
              {formatMessage({
                id: 'settings.remaining.portalSignIn',
                defaultMessage: 'Open the Private Cloud portal to sign in again',
              })}
            </a>
          )}
          {signInError && <div className="rd-help">{signInError}</div>}
        </div>
      )}
      {status.kind === 'ready' && !open && (
        <div>
          <Btn
            variant="primary"
            onClick={() => {
              setSession((n) => n + 1)
              setOpen(true)
            }}
          >
            {formatMessage({
              id: 'settings.remaining.openTerminal',
              defaultMessage: 'Open terminal',
            })}
          </Btn>
        </div>
      )}
      {status.kind === 'ready' && open && (
        <Suspense
          fallback={
            <div className="rd-help">
              {formatMessage({ id: 'settings.remaining.loading', defaultMessage: 'Loading…' })}
            </div>
          }
        >
          <TerminalView
            key={session}
            onEnded={(reason) => {
              setOpen(false)
              if (reason === 'sign-in-again') recheck()
            }}
          />
        </Suspense>
      )}
    </Panel>
  )
}
