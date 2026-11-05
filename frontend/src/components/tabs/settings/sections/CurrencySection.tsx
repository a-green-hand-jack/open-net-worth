// Settings → Currency & format. Ported from the CurrencySection in
// design_handoffs/settings_handoff/prototype/redesign/settings.jsx.
//
// Base currency is the ONE select in Settings that does not commit on change: balances and
// transactions carry a native currency and convert correctly, but amounts typed in by hand do
// not — the same numbers are simply re-read as the new currency. The confirm modal names
// exactly which ones and where each lives.
import { useState } from 'react'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { authFetch } from '../../../../api/client'
import { PROFILE_KEY, fetchJson } from '../../../../hooks/serverState'
import {
  invalidateQueryCache,
  setCachedQueryData,
  useCachedFetchState,
} from '../../../../state/queryCache'
import { browserTimeZone } from '../../../../hooks/useTimezoneCapture'
import { fBase, setBaseCurrency, setDisplayFormats } from '../../../../utils/format'
import { Btn, Field, Modal, Panel, Select, useSectionBusy } from '../ds'
import type { SectionProps } from '../ds'
// One currency list for the whole app — this section and first run read the same module, so
// they cannot drift. The 14-code array that used to live here could not serve CHF/KRW/BRL/AED.
import { CURRENCY_OPTIONS } from '../../../firstrun/currencies'

interface ProfileShape {
  base_currency?: string
  date_format?: string | null
  number_format?: string | null
  timezone?: string | null
  timezone_source?: 'auto' | 'user' | null
  [k: string]: unknown
}

interface PreviewField {
  label: string
  value: number
}

// Where each hand-typed amount is edited, so the modal can say where to go and fix it.
// The labels are the backend's (services/profile.currency_sensitive_fields).
function whereItLives(label: string): 'profile' | 'plan' {
  return label.startsWith('FIRE annual') ? 'plan' : 'profile'
}

// Every zone the browser knows; older engines lack `supportedValuesOf`, so fall back to the two
// we can always name.
function timeZoneOptions(extra: Array<string | null | undefined>): string[] {
  let zones: string[]
  try {
    zones = Intl.supportedValuesOf('timeZone')
  } catch {
    zones = ['UTC']
  }
  const all = new Set(zones)
  for (const z of extra) if (z) all.add(z)
  return [...all].sort()
}

export function CurrencySection({ toast }: SectionProps) {
  const intl = useAppIntl()
  const {
    data: profile,
    initialLoading,
    refresh,
  } = useCachedFetchState<ProfileShape>(PROFILE_KEY, () => fetchJson<ProfileShape>(PROFILE_KEY), {
    staleTime: 0,
  })
  useSectionBusy(initialLoading && !profile)
  const [pending, setPending] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewField[] | null>(null)

  const ccy = (profile?.base_currency || 'SGD').toUpperCase()
  const browserZone = browserTimeZone()
  const zone = profile?.timezone || browserZone || 'UTC'

  async function saveTimezone(zone: string) {
    try {
      const res = await authFetch(`${PROFILE_KEY}/timezone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: zone }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null
        toast(
          body?.detail ||
            intl.formatMessage(
              { id: 'settings.saveFailed', defaultMessage: 'Could not save (HTTP {status})' },
              { status: res.status },
            ),
        )
        return
      }
      const state = (await res.json()) as Pick<ProfileShape, 'timezone' | 'timezone_source'>
      setCachedQueryData<ProfileShape>(PROFILE_KEY, (prev) => ({ ...(prev ?? {}), ...state }))
      toast(
        intl.formatMessage({ id: 'currency.timezoneSaved', defaultMessage: 'Time zone updated' }),
      )
    } catch {
      toast(
        intl.formatMessage({
          id: 'currency.unreachable',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
      void refresh()
    }
  }

  async function save(patch: Partial<ProfileShape>, message: string) {
    try {
      const res = await authFetch(PROFILE_KEY, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: string } | null
        toast(
          body?.detail ||
            intl.formatMessage(
              { id: 'settings.saveFailed', defaultMessage: 'Could not save (HTTP {status})' },
              { status: res.status },
            ),
        )
        return
      }
      // PUT /api/profile answers with an envelope, not the bare profile.
      const { profile: saved } = (await res.json()) as { profile: ProfileShape }
      setCachedQueryData(PROFILE_KEY, saved)
      if (patch.base_currency) setBaseCurrency(saved.base_currency || 'SGD')
      setDisplayFormats(saved)
      invalidateQueryCache('/api/fire')
      toast(message)
    } catch {
      toast(
        intl.formatMessage({
          id: 'currency.unreachable',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
      void refresh()
    }
  }

  // Ask the server which manual amounts would NOT convert — the same computation it stamps
  // after the change, so the warning can never drift from the consequence.
  async function openConfirm(next: string) {
    setPending(next)
    setPreview(null)
    try {
      const r = await authFetch('/api/profile/base-currency-preview')
      if (!r.ok) return
      const body = (await r.json()) as { fields: PreviewField[] }
      setPreview(body.fields || [])
    } catch {
      /* the modal still explains the consequence, just without the itemised list */
    }
  }

  return (
    <>
      <Panel
        title={intl.formatMessage({ id: 'currency.base', defaultMessage: 'Base currency' })}
        sub={intl.formatMessage({
          id: 'currency.baseHelp',
          defaultMessage: 'Every balance and total is converted to this and displayed in it',
        })}
      >
        <div className="rd-formgrid">
          <Field
            label={intl.formatMessage({ id: 'currency.base', defaultMessage: 'Base currency' })}
            help={intl.formatMessage({
              id: 'currency.nativeHelp',
              defaultMessage:
                'Accounts keep their own native currency — this is the display and reporting unit',
            })}
          >
            <Select
              value={ccy}
              onChange={(e) => {
                if (e.target.value !== ccy) void openConfirm(e.target.value)
              }}
            >
              {(CURRENCY_OPTIONS.some((o) => o.value === ccy)
                ? CURRENCY_OPTIONS
                : [{ value: ccy, label: ccy }, ...CURRENCY_OPTIONS]
              ).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value} — {new Intl.DisplayNames([intl.locale], { type: 'currency' }).of(o.value) || o.value}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel
        title={intl.formatMessage({
          id: 'currency.formats',
          defaultMessage: 'Number & date format',
        })}
        sub={intl.formatMessage({
          id: 'currency.formatsHelp',
          defaultMessage: 'How amounts and dates are written throughout the app',
        })}
      >
        <div className="rd-formgrid">
          <Field
            label={intl.formatMessage({ id: 'currency.dateFormat', defaultMessage: 'Date format' })}
          >
            <Select
              value={(profile?.date_format as string) || ''}
              onChange={(e) =>
                void save(
                  { date_format: e.target.value },
                  intl.formatMessage({
                    id: 'currency.dateSaved',
                    defaultMessage: 'Date format updated',
                  }),
                )
              }
            >
              <option value="">
                {intl.formatMessage({
                  id: 'currency.browserDefault',
                  defaultMessage: 'Browser default',
                })}
              </option>
              <option value="dmy">31/12/2026</option>
              <option value="mdy">12/31/2026</option>
              <option value="iso">2026-12-31</option>
            </Select>
          </Field>
          <Field
            label={intl.formatMessage({
              id: 'currency.numberFormat',
              defaultMessage: 'Number format',
            })}
          >
            <Select
              value={(profile?.number_format as string) || ''}
              onChange={(e) =>
                void save(
                  { number_format: e.target.value },
                  intl.formatMessage({
                    id: 'currency.numberSaved',
                    defaultMessage: 'Number format updated',
                  }),
                )
              }
            >
              <option value="">
                {intl.formatMessage({
                  id: 'currency.browserDefault',
                  defaultMessage: 'Browser default',
                })}
              </option>
              <option value="comma">1,234,567.89</option>
              <option value="space">1 234 567,89</option>
              <option value="dot">1.234.567,89</option>
            </Select>
          </Field>
        </div>
      </Panel>

      <Panel
        title={intl.formatMessage({ id: 'currency.timezone', defaultMessage: 'Time zone' })}
        sub={intl.formatMessage({
          id: 'currency.timezoneHelp',
          defaultMessage:
            "Decides what 'today' is and what time Lucius thinks it is — and when daily digests arrive",
        })}
      >
        <div className="rd-formgrid">
          <Field
            label={intl.formatMessage({ id: 'currency.timezone', defaultMessage: 'Time zone' })}
            help={
              <>
                <span>
                  {profile?.timezone_source === 'user'
                    ? intl.formatMessage({
                        id: 'currency.timezoneUser',
                        defaultMessage: 'Set by you',
                      })
                    : profile?.timezone
                      ? intl.formatMessage({
                          id: 'currency.timezoneDetected',
                          defaultMessage: 'Detected from this browser — change it if that is wrong',
                        })
                      : intl.formatMessage({
                          id: 'currency.timezoneUnset',
                          defaultMessage:
                            'Not set yet — the server clock is used until one is saved',
                        })}
                </span>
                {browserZone && profile?.timezone && profile.timezone !== browserZone && (
                  <span className="rd-help-action">
                    <Btn size="xs" onClick={() => void saveTimezone(browserZone)}>
                      {intl.formatMessage(
                        {
                          id: 'currency.useBrowserZone',
                          defaultMessage: "Use this browser's ({zone})",
                        },
                        { zone: browserZone },
                      )}
                    </Btn>
                  </span>
                )}
              </>
            }
          >
            <Select value={zone} onChange={(e) => void saveTimezone(e.target.value)}>
              {timeZoneOptions([zone]).map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Panel>

      {pending && (
        <Modal
          title={intl.formatMessage(
            { id: 'currency.switchTitle', defaultMessage: 'Switch base currency to {currency}?' },
            { currency: pending },
          )}
          onClose={() => setPending(null)}
          footer={
            <>
              <Btn onClick={() => setPending(null)}>
                {intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  const next = pending
                  setPending(null)
                  void save(
                    { base_currency: next },
                    intl.formatMessage(
                      {
                        id: 'currency.switched',
                        defaultMessage:
                          'Base currency is now {currency} — re-check your manual amounts',
                      },
                      { currency: next },
                    ),
                  )
                }}
              >
                {intl.formatMessage(
                  { id: 'currency.switchTo', defaultMessage: 'Switch to {currency}' },
                  { currency: pending },
                )}
              </Btn>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            {intl.formatMessage(
              {
                id: 'currency.switchWarning',
                defaultMessage:
                  'Account balances and transactions <b>do</b> convert — they carry a native currency. Amounts you typed in by hand will <b>not</b>: the same numbers will simply be read as {currency}. You’ll want to re-enter these afterwards.',
              },
              { currency: pending, b: (chunks) => <b>{chunks}</b> },
            )}
          </p>
          {preview === null ? (
            <span className="rd-help">
              {intl.formatMessage({
                id: 'currency.checkingAmounts',
                defaultMessage: 'Checking which amounts are affected…',
              })}
            </span>
          ) : preview.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {preview.map((f) => (
                <div
                  key={f.label}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}
                >
                  <span>{f.label}</span>
                  <b className="rd-mono" style={{ color: 'var(--ink)' }}>
                    {fBase(f.value)}
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <span className="rd-help">
              {intl.formatMessage({
                id: 'currency.noManualAmounts',
                defaultMessage: 'You have no hand-typed amounts, so nothing needs re-entering.',
              })}
            </span>
          )}
          {preview?.some((f) => whereItLives(f.label) === 'profile') ||
          preview?.some((f) => whereItLives(f.label) === 'plan') ? (
            <span className="rd-help">
              {intl.formatMessage(
                {
                  id: 'currency.amountLocations',
                  defaultMessage:
                    'Income, expenses and the low-balance threshold live on <b>Profile</b>; retirement spend lives in <b>Plan → FIRE Settings</b>.',
                },
                { b: (chunks) => <b>{chunks}</b> },
              )}
            </span>
          ) : null}
        </Modal>
      )}
    </>
  )
}
