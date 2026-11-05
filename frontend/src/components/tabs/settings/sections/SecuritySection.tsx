// Settings → Security. Ported from the SecuritySection in
// design_handoffs/settings_handoff/prototype/redesign/settings.jsx.
import { useState } from 'react'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { authFetch } from '../../../../api/client'
import { useCachedFetchState } from '../../../../state/queryCache'
import { Btn, Field, Panel, Select, Toggle, row, useSectionBusy } from '../ds'
import type { SectionProps } from '../ds'
import { GatewayAccountPanel } from './GatewayAccountPanel'
import { PasswordPanel } from './PasswordPanel'
import type { PasswordState } from './PasswordPanel'

interface AuthSettings {
  session_ttl: number
  trust_loopback: boolean
  auth_disabled: boolean
}

type AuthState = AuthSettings & PasswordState

interface ApiToken {
  token: string
  configured: boolean
}

const TTL_OPTIONS: [string, number][] = [
  ['8 hours', 8 * 3600],
  ['7 days', 7 * 86400],
  ['30 days', 30 * 86400],
]

const MASK = '••••••••••••••••••••'

async function getJson<T>(path: string): Promise<T> {
  const r = await authFetch(path)
  if (!r.ok) throw new Error(String(r.status))
  return r.json() as Promise<T>
}

export function SecuritySection({ toast, gatewayMode = false }: SectionProps) {
  const { formatMessage } = useAppIntl()
  const {
    data: settings,
    initialLoading: loadingSettings,
    refresh: refreshSettings,
  } = useCachedFetchState<AuthState>(
    '/api/auth/settings',
    () => getJson<AuthState>('/api/auth/settings'),
    { staleTime: 0 },
  )
  useSectionBusy(loadingSettings && !settings)
  const { data: tokenData, refresh: refreshToken } = useCachedFetchState<ApiToken>(
    '/api/auth/api-token',
    () => getJson<ApiToken>('/api/auth/api-token'),
    { staleTime: 0 },
  )

  const [reveal, setReveal] = useState(false)
  // Blocks a second toggle while the first PUT is in flight, so two rapid clicks cannot race.
  const [busy, setBusy] = useState(false)

  // Send ONLY what changed. Spreading the cached `settings` re-asserts every other field
  // from a closure that may already be stale: toggle "Trust loopback", then toggle "Disable
  // auth" before the first PUT's refresh lands, and the second request quietly reverts the
  // first — with a success toast. The endpoint merges partials (exclude_none), so the spread
  // bought nothing and cost that.
  async function patchAuth(patch: Partial<AuthSettings>, message: string) {
    setBusy(true)
    try {
      const res = await authFetch('/api/auth/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        toast(
          formatMessage(
            {
              id: 'settings.remaining.securitySaveHttp',
              defaultMessage: 'Could not save (HTTP {status})',
            },
            { status: res.status },
          ),
        )
        void refreshSettings()
        return
      }
      void refreshSettings()
      toast(message)
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.securityNetwork',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
      void refreshSettings()
    } finally {
      setBusy(false)
    }
  }

  async function rotate() {
    try {
      const res = await authFetch('/api/auth/api-token/rotate', { method: 'POST' })
      if (!res.ok) {
        toast(
          formatMessage(
            {
              id: 'settings.remaining.securityRotateHttp',
              defaultMessage: 'Could not rotate (HTTP {status})',
            },
            { status: res.status },
          ),
        )
        return
      }
      void refreshToken()
      toast(
        formatMessage({
          id: 'settings.remaining.securityRotated',
          defaultMessage: 'Token rotated — old token is now invalid',
        }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.securityNetwork',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function copyToken() {
    const t = tokenData?.token
    if (!t) return
    try {
      await navigator.clipboard.writeText(t)
      toast(formatMessage({ id: 'settings.remaining.securityCopied', defaultMessage: 'Copied' }))
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.securityCopyFailed',
          defaultMessage: 'Could not copy — reveal it and copy manually',
        }),
      )
    }
  }

  // The server stores seconds; snap an unrecognised value onto the nearest offered option
  // rather than rendering a blank select.
  const ttl = settings?.session_ttl ?? 30 * 86400
  const ttlValue = TTL_OPTIONS.some(([, v]) => v === ttl) ? ttl : TTL_OPTIONS[2]![1]

  return (
    <>
      {gatewayMode && <GatewayAccountPanel />}
      {!gatewayMode && <PasswordPanel state={settings} refresh={refreshSettings} toast={toast} />}

      <Panel
        title={formatMessage({
          id: 'settings.remaining.securityToken',
          defaultMessage: 'API token',
        })}
        sub={formatMessage({
          id: 'settings.remaining.securityTokenHelp',
          defaultMessage: 'Authenticates external clients (Claude Desktop, CLIs) against this app',
        })}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="rd-input"
            readOnly
            value={reveal ? tokenData?.token || '' : MASK}
            // Fills the row rather than stopping at a fixed 320px: a real token is ~40
            // characters and the panel is full width, so the cap only wasted space and
            // truncated the thing the field exists to show.
            style={{ flex: 1, minWidth: 0, fontFamily: 'ui-monospace, monospace' }}
            aria-label={formatMessage({
              id: 'settings.remaining.securityToken',
              defaultMessage: 'API token',
            })}
          />
          {/* Sized for the LONGER label so swapping Reveal/Hide doesn't reflow Copy and
              Rotate out from under the pointer mid-click. */}
          <Btn size="xs" style={{ minWidth: 62 }} onClick={() => setReveal(!reveal)}>
            {reveal
              ? formatMessage({ id: 'settings.remaining.securityHide', defaultMessage: 'Hide' })
              : formatMessage({
                  id: 'settings.remaining.securityReveal',
                  defaultMessage: 'Reveal',
                })}
          </Btn>
          <Btn size="xs" onClick={() => void copyToken()}>
            {formatMessage({ id: 'settings.remaining.securityCopy', defaultMessage: 'Copy' })}
          </Btn>
          <Btn size="xs" variant="danger" onClick={() => void rotate()}>
            {formatMessage({ id: 'settings.remaining.securityRotate', defaultMessage: 'Rotate' })}
          </Btn>
        </div>
      </Panel>

      {!gatewayMode && (
        <Panel
          title={formatMessage({
            id: 'settings.remaining.securityAuthBehaviour',
            defaultMessage: 'Auth behaviour',
          })}
        >
          <div className="rd-formgrid">
            <Field
              label={formatMessage({
                id: 'settings.remaining.securityStay',
                defaultMessage: 'Stay signed in for',
              })}
              help={formatMessage({
                id: 'settings.remaining.securityStayHelp',
                defaultMessage:
                  "How long before you're asked for your password again. Shorter is safer on a shared machine.",
              })}
            >
              <Select
                value={ttlValue}
                disabled={!settings || busy}
                onChange={(e) =>
                  void patchAuth(
                    { session_ttl: Number(e.target.value) },
                    formatMessage({
                      id: 'settings.remaining.securityTtlUpdated',
                      defaultMessage: 'Session length updated',
                    }),
                  )
                }
              >
                {TTL_OPTIONS.map(([, value]) => (
                  <option key={value} value={value}>
                    {value === 8 * 3600
                      ? formatMessage({
                          id: 'settings.remaining.security8h',
                          defaultMessage: '8 hours',
                        })
                      : value === 7 * 86400
                        ? formatMessage({
                            id: 'settings.remaining.security7d',
                            defaultMessage: '7 days',
                          })
                        : formatMessage({
                            id: 'settings.remaining.security30d',
                            defaultMessage: '30 days',
                          })}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {row(
            formatMessage({
              id: 'settings.remaining.securityTrust',
              defaultMessage: "Don't ask for the password on this computer",
            }),
            formatMessage({
              id: 'settings.remaining.securityTrustHelp',
              defaultMessage:
                'Requests from the computer running Open Net Worth skip the password. Turn off on a shared computer.',
            }),
            <Toggle
              on={settings?.trust_loopback ?? false}
              disabled={!settings || busy}
              onChange={(v) =>
                void patchAuth(
                  { trust_loopback: v },
                  v
                    ? formatMessage({
                        id: 'settings.remaining.securityTrustOn',
                        defaultMessage: 'This computer skips the password',
                      })
                    : formatMessage({
                        id: 'settings.remaining.securityTrustOff',
                        defaultMessage: 'This computer now asks for the password',
                      }),
                )
              }
              label={formatMessage({
                id: 'settings.remaining.securityTrust',
                defaultMessage: "Don't ask for the password on this computer",
              })}
            />,
          )}
          {row(
            <span style={{ color: 'var(--bad)' }}>
              {formatMessage({
                id: 'settings.remaining.securityDisableAll',
                defaultMessage: 'Disable auth entirely',
              })}
            </span>,
            formatMessage({
              id: 'settings.remaining.securityDisableHelp',
              defaultMessage:
                'All requests accepted without credentials. Only behind a VPN you trust.',
            }),
            <Toggle
              on={settings?.auth_disabled ?? false}
              disabled={!settings || busy}
              onChange={(v) =>
                void patchAuth(
                  { auth_disabled: v },
                  v
                    ? formatMessage({
                        id: 'settings.remaining.securityAuthOff',
                        defaultMessage: 'Careful — auth is now off',
                      })
                    : formatMessage({
                        id: 'settings.remaining.securityAuthOn',
                        defaultMessage: 'Auth is back on',
                      }),
                )
              }
              label={formatMessage({
                id: 'settings.remaining.securityDisable',
                defaultMessage: 'Disable auth',
              })}
            />,
          )}
        </Panel>
      )}
    </>
  )
}
