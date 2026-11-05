// First run, screen 2 — connect Lucius.
//
// The point of this screen is that it looks BEFORE it asks. `GET /api/model-config/providers`
// already reports `detected_clis` / `detected_cli_paths` (resolved with shutil.which), and the
// backend has first-class claude_cli / codex_cli transports that enrol by DETECTION with no
// credential at all. The outgoing wizard ignored all of that and asked a developer with
// `claude` on their PATH to paste `sk-ant-…`.
//
// The save shape is not obvious and is easy to get wrong — the outgoing wizard got it wrong for
// all three of its options (verified: every one returned 422, so onboarding never actually
// configured AI). `provider` is a TRANSPORT, not a catalogue key, and a `model` is REQUIRED for
// every transport except codex_cli, whose blank model means "use the CLI's own default".

import { useEffect, useRef, useState } from 'react'
import { useAppIntl } from '../../i18n/useAppIntl'
import { authFetch } from '../../api/client'
import { Button, PasswordField, Select, Stack, Text, TextField } from '../ui'
import { PickDialog } from './PickDialog'
import { modelError } from '../tabs/settings/sections/modelError'
import { ReportProblemButton } from '../ReportProblemButton'
import type { SelectOption } from '../ui'
import { ChevronDown } from '../../ui/icons'
import { useCliDetectionPoll } from '../../hooks/useCliDetectionPoll'
import { useDataVersion } from '../../hooks/useDataVersion'
import { CliSubscriptionHelp, type CliHostPlatform } from '../shared/CliSubscriptionHelp'
import { isLocalOnlyProvider } from '../shared/privateCloudCopy'

interface CatalogEntry {
  key: string
  label: string
  transport: string
  base_url: string
  needs_api_key: boolean
  model_hints?: string[]
  editable_base_url?: boolean
  /** The field is offered, but nothing refuses to continue without it. */
  optional_api_key?: boolean
}

// The CLI transports that enrol by detection. Order is the order they are offered.
// Which catalogue entries first run offers when nothing is detected. The full list lives in
// Settings — this is the short path, not the complete one.
// The CLI transports enrol by detection (above); everything else in the catalog enrols with
// a key or a URL. Derived rather than listed, so a provider added to the catalog is offered
// here without anyone remembering to update a second list — first run was showing three of
// the eleven that shipped, and there was no way to reach the rest without finishing setup and
// going to Settings.
const CLI_KEYS = new Set(['claude_cli', 'codex_cli', 'antigravity_cli'])
// Preferred order for the ones people ask for by name; anything else follows, catalog order.
// OpenRouter leads — one key, and it shops the same models plus cheaper capable ones (GLM,
// DeepSeek) instead of defaulting someone onto Anthropic's full-price Sonnet.
const KEYED_ORDER = ['openrouter', 'anthropic', 'openai', 'gemini', 'ollama']

/** The keyed (non-CLI) catalog entry KEYED_ORDER puts first — the default provider. */
function firstKeyedEntry(catalog: CatalogEntry[]): CatalogEntry | null {
  let best: CatalogEntry | null = null
  let bestRank = Infinity
  for (const e of catalog) {
    if (CLI_KEYS.has(e.key)) continue
    const rank = KEYED_ORDER.indexOf(e.key)
    const effectiveRank = rank < 0 ? KEYED_ORDER.length : rank
    if (effectiveRank < bestRank) {
      best = e
      bestRank = effectiveRank
    }
  }
  return best
}

export interface StepLuciusProps {
  onDone: () => void
  /** Which half of this step is showing. Lifted so the topbar's Back can unwind the model
   *  page before leaving the step — otherwise Back skipped the provider page entirely. */
  stage?: 'provider' | 'model'
  onStageChange?: (stage: 'provider' | 'model') => void
  /** Private Cloud: no local models and no CLI subscriptions here — the app runs on a server. */
  gatewayMode?: boolean
}

// Only a genuinely slow probe earns a loading message. A message that appears and vanishes
// inside a few hundred milliseconds reads as a glitch, not as loading — and a PATH lookup
// usually answers well inside that.
const SLOW_PROBE_MS = 1200

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

/** The saved instance default (`GET /api/model-config`), or null when there is none or it
 *  cannot be read — restoring it is a convenience, never a gate on first run. */
async function savedModelConfig(): Promise<{
  default_model?: string
  model?: string
  base_url?: string
} | null> {
  try {
    const res = await authFetch('/api/model-config')
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

export function StepLucius({
  onDone,
  stage: stageProp,
  onStageChange,
  gatewayMode = false,
}: StepLuciusProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const DETECTABLE: { key: string; label: string; blurb: string }[] = [
    {
      key: 'claude_cli',
      label: 'Claude Code',
      blurb: formatMessage({
        id: 'firstrun.lucius.detectable0',
        defaultMessage: 'Uses your existing Claude subscription.',
      }),
    },
    {
      key: 'codex_cli',
      label: 'Codex',
      blurb: formatMessage({
        id: 'firstrun.lucius.detectable1',
        defaultMessage: 'Uses your existing ChatGPT subscription.',
      }),
    },
    {
      key: 'antigravity_cli',
      label: 'Antigravity CLI',
      blurb: formatMessage({
        id: 'firstrun.lucius.detectable2',
        defaultMessage: 'Uses your existing Google Antigravity account.',
      }),
    },
  ]

  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [detected, setDetected] = useState<Record<string, boolean>>({})
  const [paths, setPaths] = useState<Record<string, string>>({})
  // What each CLI runs when told nothing, read from the CLI's own config. The catalogue's
  // `model_hints` are OUR guess and rot (they once led Codex users to a model their own config
  // had moved off), so a CLI's suggestion comes from here and the hints are only a floor.
  // Which providers already hold a stored key — coming back to this page must not demand the
  // key again from someone who entered it a minute ago.
  const [storedKeys, setStoredKeys] = useState<Record<string, boolean>>({})
  // The saved choice is restored ONCE: a retry of the probe must not overwrite a pick made since.
  const restoredSaved = useRef(false)
  const [cliDefaults, setCliDefaults] = useState<Record<string, string>>({})
  const [hostPlatform, setHostPlatform] = useState<CliHostPlatform>()
  // Two stages on ONE page: choose a provider, then configure it. `picked` is the gate —
  // null means "still choosing". Kept inline rather than split into a screen because the
  // decision and its consequences belong together, and going back must cost one click.
  const [picked, setPicked] = useState<string | null>(null)
  // Two pages. Page one settles WHO answers (provider, and whatever that provider needs to be
  // reachable — an endpoint, a key). Page two settles WHAT it runs. They are different
  // questions and the second one only makes sense once the first is answered.
  const [localStage, setLocalStage] = useState<'provider' | 'model'>('provider')
  const stage = stageProp ?? localStage
  const setStage = (next: 'provider' | 'model') => {
    if (stageProp === undefined) setLocalStage(next)
    onStageChange?.(next)
  }
  const [apiKey, setApiKey] = useState('')
  // Model and endpoint are usually decided FOR you (the catalogue's first hint, the entry's
  // own base_url) — but `custom` and `litellm` ship neither, so without these the step saved a
  // blank model on a transport that refuses one, and a custom endpoint with no address.
  const [model, setModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  // The REAL model list, fetched from the provider once its credential is stored. The
  // catalogue's hints are a floor, not an answer: OpenRouter alone serves hundreds and ours
  // listed four, all stale. This is why page one commits the key before page two renders —
  // the provider cannot be asked without it.
  const [liveModels, setLiveModels] = useState<string[] | null>(null)
  // The model list can run to hundreds (OpenRouter), which a dropdown cannot be scrolled
  // through usefully. Same searchable modal the currency row uses.
  const [pickingModel, setPickingModel] = useState(false)
  // WHICH action is running, not merely that one is. A single boolean lit every button on
  // the screen at once — both CLI cards and Continue — so the spinner said "something is
  // happening" rather than "this is what you pressed".
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const busy = busyKey !== null
  const [error, setError] = useState<string | null>(null)
  // The probe is a real round trip (shutil.which over several CLIs). Rendering the
  // nothing-found branch while it runs and swapping when it lands made the step visibly jump
  // on arrival — so nothing is offered until the answer is in.
  const [probing, setProbing] = useState(true)
  // ...but on a warm machine it answers in tens of milliseconds, and a message that appears
  // and vanishes inside 50ms reads as a glitch, not as loading. So the SPACE is reserved
  // immediately (no jump) while the WORDS wait for the probe to be slow enough to deserve
  // explaining. Nothing is announced for a wait nobody noticed.
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const slowTimer = setTimeout(() => setSlow(true), SLOW_PROBE_MS)
    return () => clearTimeout(slowTimer)
  }, [])

  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    void (async () => {
      setProbing(true)
      try {
        const [res, saved] = await Promise.all([
          authFetch('/api/model-config/providers'),
          savedModelConfig(),
        ])
        if (!res.ok) return
        const data = await res.json()
        if (!alive) return
        const entries: CatalogEntry[] = Array.isArray(data?.catalog) ? data.catalog : []
        setCatalog(gatewayMode ? entries.filter((e) => !isLocalOnlyProvider(e)) : entries)
        setStoredKeys(
          Object.fromEntries(
            Object.entries(
              (data?.configured_providers ?? {}) as Record<string, { has_api_key?: boolean }>,
            ).map(([key, creds]) => [key, Boolean(creds?.has_api_key)]),
          ),
        )
        // The provider lives in component state, but it was SAVED server-side: a reload, or
        // Back from the password step, remounts this component empty and used to show the
        // default provider with Continue disabled. Set in the same batch as the catalog, so
        // the seeding rule below sees a provider and leaves it alone.
        const savedKey = String(saved?.default_model ?? '').split(':')[0]
        const savedEntry = entries.find((e) => e.key === savedKey)
        if (savedEntry && !restoredSaved.current) {
          restoredSaved.current = true
          setPicked(savedEntry.key)
          setModel(
            String(saved?.model ?? '') ||
              data?.cli_default_models?.[savedEntry.key] ||
              (savedEntry.model_hints || [])[0] ||
              '',
          )
          setBaseUrl(String(saved?.base_url ?? '') || savedEntry.base_url || '')
        }
        // Seed the model/endpoint for whatever provider is selected on arrival. Without this
        // they stayed empty until you touched the provider dropdown, so a <select> showed its
        // first option while the state behind it said nothing — and save fell back to the
        // catalogue default even after you picked something else.

        setDetected(data?.detected_clis || {})
        setPaths(data?.detected_cli_paths || {})
        setCliDefaults(data?.cli_default_models || {})
        setHostPlatform(data?.cli_host_platform)
      } catch {
        // Detection is an enhancement. Its failure must never block first run — the keyed
        // path below still works.
      } finally {
        if (alive) setProbing(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [attempt])

  const pollingEnabled = !probing && catalog.length > 0 && stage === 'provider' && !busy
  const { check: checkClis, error: cliCheckError } = useCliDetectionPoll(async () => {
    const response = await authFetch('/api/model-config/providers')
    if (!response.ok) throw new Error('Installation check failed')
    const data = await response.json()
    setDetected(data?.detected_clis || {})
    setPaths(data?.detected_cli_paths || {})
    setHostPlatform(data?.cli_host_platform)
  }, pollingEnabled)
  const dataVersion = useDataVersion('*')
  useEffect(() => {
    if (dataVersion && pollingEnabled) void checkClis().catch(() => {})
  }, [dataVersion, pollingEnabled, checkClis])

  // A RULE about the provider page, not a handler on one button: whenever it is showing, the
  // dropdown must describe something it can actually represent. `picked` survives a trip to
  // the model page, so arriving back here after "Use this" on a CLI left a CLI selected — no
  // key or endpoint row, and the select falling back to displaying the first option. Every
  // route back (browser Back, the topbar, Change) lands here, so the rule lives here.
  useEffect(() => {
    if (catalog.length === 0) return
    // The model page needs a provider, and the provider lives in component state while the
    // page lives in the url. Reload on /setup/model-pick and the url said "model" while
    // nothing had been chosen. A url may not outlive the state it depends on.
    if (stage === 'model' && !picked) {
      // Ask the url to come back, and STOP: seeding a provider here would satisfy the
      // model page's own condition and land you on it, which is the page we just decided
      // could not be shown.
      setStage('provider')
      return
    }
    // Seed ONCE so a provider's key/endpoint rows are visible on arrival. Deliberately not
    // re-seeding when `picked` is a CLI: that fired between "Use this" and the stage flip and
    // silently replaced the CLI you had just chosen with Anthropic.
    if (!picked) {
      const first = firstKeyedEntry(catalog)
      if (first) choose(first.key)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, stage, picked])

  function choose(key: string) {
    const entry = catalog.find((e) => e.key === key)
    setPicked(key)
    setApiKey('')
    setError(null)
    setModel(cliDefaults[key] || (entry?.model_hints || [])[0] || '')
    setBaseUrl(entry?.base_url || '')
  }

  function entryFor(key: string): CatalogEntry | undefined {
    return catalog.find((e) => e.key === key)
  }

  /** PAGE ONE's commit: store the credential, then move on to choosing a model.
   *
   *  Split from the model save deliberately. The provider and how to reach it (endpoint, key)
   *  are one decision; which model it runs is another, and it cannot be answered well until
   *  the first is stored — a live model list needs a persisted key to query with.
   */
  async function saveProvider(key: string) {
    const entry = entryFor(key)
    if (!entry) {
      setError(
        formatMessage({
          id: 'firstrun.lucius.providerUnavailable',
          defaultMessage: 'That provider is not available here.',
        }),
      )
      return
    }
    setBusyKey(key)
    setError(null)
    setLiveModels(null)
    try {
      if (entry.needs_api_key && apiKey.trim()) {
        const res = await authFetch(`/api/model-config/providers/${key}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey.trim() }),
        })
        if (!res.ok) {
          const detail = await res.json().catch(() => null)
          setError(
            modelError(
              detail,
              formatMessage({
                id: 'firstrun.lucius.keySaveFailed',
                defaultMessage: 'That key could not be stored. Try again.',
              }),
              intl,
            ),
          )
          return
        }
        setStoredKeys((keys) => ({ ...keys, [key]: true }))
      }

      // Prove the credential BEFORE leaving this page. Storing a key always succeeds — the
      // store does not call the provider — so a rejected key used to advance and complain on
      // the model page, with no field there to correct it in. This same call returns the live
      // model list, so proving the key and learning what it can run is one round trip.
      // Wrapped: an unreachable provider must not abort the advance. The catalogue's hints
      // are a working fallback, and this step has no skip — being stranded here is worse than
      // a slightly stale list.
      let data: { key_status?: string; models?: string[]; error?: string } | null = null
      try {
        const verdict = await authFetch(`/api/model-config/providers/${key}/validate`, {
          method: 'POST',
        })
        data = await verdict.json().catch(() => null)
      } catch {
        data = null
      }
      const live: string[] = Array.isArray(data?.models) ? data.models : []

      // NOTHING passes unproven. A rejected key is final here; anything else that failed to
      // verify stops too, but offers to go on — the difference is whether the provider said
      // "no" or simply did not answer.
      if (data?.key_status === 'invalid') {
        setError(
          data?.error ||
            formatMessage(
              {
                id: 'firstrun.lucius.keyRejected',
                defaultMessage: 'That key was rejected by {provider}.',
              },
              { provider: entry.label },
            ),
        )
        return
      }
      // A provider that cannot be proven to work is not configured. There is no "use anyway":
      // accepting it here only moves the failure to the first message Lucius cannot answer,
      // by which point nobody connects the two.
      if (data?.key_status !== 'valid') {
        setError(
          data?.error ||
            formatMessage(
              {
                id: 'firstrun.lucius.providerUnreachable',
                defaultMessage: 'Could not reach {provider}.',
              },
              { provider: entry.label },
            ),
        )
        return
      }
      const cliDefault = cliDefaults[key]
      if (cliDefault) {
        // The CLI's own default is the suggestion even when its list omits it (a pinned or
        // aliased model the CLI runs but never lists).
        setLiveModels(live.includes(cliDefault) ? live : [cliDefault, ...live])
        setModel(cliDefault)
      } else if (live.length > 0) {
        setLiveModels(live)
        setModel((m) => (m && live.includes(m) ? m : (live[0] ?? '')))
      }
      setStage('model')
    } catch (err) {
      reportFailure(err)
    } finally {
      setBusyKey(null)
    }
  }

  /** PAGE TWO's commit: set the instance default — transport, endpoint and model. */
  async function saveModel(key: string) {
    const entry = entryFor(key)
    if (!entry) {
      setError(
        formatMessage({
          id: 'firstrun.lucius.providerUnavailable',
          defaultMessage: 'That provider is not available here.',
        }),
      )
      return
    }
    setBusyKey(key)
    setError(null)
    try {
      // `provider` is the TRANSPORT; `base_url` disambiguates which catalogue entry that
      // transport means (openai and ollama both speak openai_compatible).
      //
      // ONE rule for the model: what the Model row shows is what gets used. A CLI may show
      // nothing — then it runs whatever it is set to on this machine. This used to be
      // hardcoded to codex_cli, so Claude Code was silently pinned while Codex deferred.
      const chosenModel = model.trim() || cliDefaults[key] || (entry.model_hints || [])[0] || ''
      const res = await authFetch('/api/model-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: entry.transport,
          base_url: (entry.editable_base_url ? baseUrl.trim() : '') || entry.base_url || '',
          model: chosenModel,
        }),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => null)
        setError(
          modelError(
            detail,
            formatMessage({
              id: 'firstrun.lucius.saveFailed',
              defaultMessage: 'Could not save that. Check the details above and try again.',
            }),
            intl,
          ),
        )
        return
      }
      setApiKey('')
      onDone()
    } catch (err) {
      reportFailure(err)
    } finally {
      setBusyKey(null)
    }
  }

  /** Do not report every failure as a network problem: a ReferenceError in here once spent a
   *  debugging session masquerading as "the server is down". */
  function reportFailure(err: unknown) {
    const network = err instanceof TypeError
    if (!network) console.error('model setup failed', err)
    setError(
      network
        ? formatMessage({
            id: 'firstrun.lucius.network',
            defaultMessage: 'Could not reach the server. Check it is running and try again.',
          })
        : formatMessage({
            id: 'firstrun.lucius.saveUnexpected',
            defaultMessage:
              'Something went wrong saving that. The details are in the browser console.',
          }),
    )
  }

  // The probe has answered. There is no artificial hold: a PATH lookup returns in tens of
  // milliseconds, and making someone wait for an answer already in hand is worse than the
  // twitch the hold was meant to smooth — the settle animation covers that.
  const ready = !probing

  // The detected CLIs, given their own treatment above the list: they need nothing else from
  // you, so they are the fastest way out of this step.
  const found = DETECTABLE.filter((d) => detected[d.key])
  const offered = gatewayMode
    ? []
    : DETECTABLE.filter(
        (d) =>
          detected[d.key] ||
          ((d.key === 'claude_cli' || d.key === 'codex_cli') &&
            catalog.some((e) => e.key === d.key)),
      )

  // Everything that enrols with a key or a URL. CLI transports are excluded — their
  // `base_url` is repurposed as a CLI PATH, so rendering them here produced an "Endpoint"
  // row asking a local binary for an OpenAI-compatible URL.
  const keyedOptions: SelectOption[] = catalog
    .filter((e) => !CLI_KEYS.has(e.key))
    .slice()
    .sort((a, b) => {
      const ia = KEYED_ORDER.indexOf(a.key)
      const ib = KEYED_ORDER.indexOf(b.key)
      return (ia < 0 ? KEYED_ORDER.length : ia) - (ib < 0 ? KEYED_ORDER.length : ib)
    })
    .map((e) => ({ value: e.key, label: e.label }))

  const chosen = picked ? entryFor(picked) : null
  // What the PROVIDER DROPDOWN is describing. A CLI reached from a card above leaves `picked`
  // set to a CLI key the dropdown cannot represent, and CLI entries carry
  // `editable_base_url: true` (their base_url is a CLI PATH) — so keying the endpoint and key
  // rows off `chosen` rendered them for a CLI, prefilled with a stale URL.
  // What the PROVIDER DROPDOWN describes. Derived rather than forced into `picked`, so
  // arriving back from a CLI shows a usable page without overwriting anything.
  const keyedChosen = picked && !CLI_KEYS.has(picked) ? chosen : firstKeyedEntry(catalog)
  // Live if we got it, the catalogue's floor otherwise.
  const modelOptions: string[] = liveModels ?? chosen?.model_hints ?? []

  // What is actually DRAWN. The stage prop is controlled by the url, so it cannot change
  // until the router responds — and in that gap a "model" url with no provider chosen drew
  // nothing at all. Rendering never waits on a round trip: no provider means the provider
  // page, and the effect above asks the url to catch up.
  const shownStage = stage === 'model' && picked ? 'model' : 'provider'

  return (
    <Stack gap="--space-6">
      <Text as="p" tone="muted" className="firstrun-lead">
        {gatewayMode
          ? formatMessage({
              id: 'firstrun.lucius.leadCloud',
              defaultMessage:
                'Lucius needs a model to think with — a provider’s API key. To use a Claude Code or Codex subscription instead, finish setup and open Settings → Terminal. Change it any time in Settings.',
            })
          : formatMessage({
              id: 'firstrun.lucius.lead',
              defaultMessage:
                'Lucius needs a model to think with — a subscription you already pay for, a provider’s key, or one running on this machine. Change it any time in Settings.',
            })}
      </Text>
      {gatewayMode && (
        <Text as="p" size="sm" tone="muted">
          {formatMessage({
            id: 'firstrun.lucius.noLocal',
            defaultMessage:
              "Local models (Ollama, LM Studio) aren't offered here: this app runs on your Private Cloud server, which can't reach a model running on your own computer.",
          })}
        </Text>
      )}

      {!ready && (
        <div className="firstrun-probing">
          {slow && (
            <div className="firstrun-progress">
              <span className="firstrun-progress__label">
                {formatMessage({
                  id: 'firstrun.lucius.looking',
                  defaultMessage: 'Looking for a model on this machine',
                })}
              </span>
              <span className="firstrun-progress__track" aria-hidden="true" />
            </div>
          )}
        </div>
      )}

      {/* ── PAGE ONE: who answers ──────────────────────────────────────────────── */}

      {ready && shownStage === 'provider' && (
        <>
          {/* Subscription choices stay visible before installation; polling only updates
              their availability, never the user's provider or credential draft. */}
          {offered.length > 0 && (
            <div className="firstrun-found-group firstrun-settle">
              {offered.map((d) => (
                <div key={d.key} className="firstrun-found">
                  <div className="firstrun-found__eyebrow">
                    <span>
                      {detected[d.key]
                        ? formatMessage(
                            {
                              id: 'firstrun.lucius.found',
                              defaultMessage: 'Found {provider} on this machine',
                            },
                            { provider: d.label },
                          )
                        : formatMessage({
                            id: 'firstrun.lucius.connectSubscription',
                            defaultMessage: 'Connect a subscription',
                          })}
                    </span>
                  </div>
                  <div className="firstrun-found__body">
                    <div className="firstrun-found__info">
                      <div className="firstrun-found__name">{d.label}</div>
                      {paths[d.key] && <div className="firstrun-found__path">{paths[d.key]}</div>}
                      <div className="firstrun-found__desc">
                        {formatMessage(
                          {
                            id: 'firstrun.lucius.subscriptionBlurb',
                            defaultMessage: '{description} No API key needed.',
                          },
                          { description: d.blurb },
                        )}
                      </div>
                    </div>
                    {detected[d.key] && (
                      <Button
                        // Every detected CLI is a subscription the user already pays for —
                        // equal choices, so none is styled as the recommended one.
                        variant="primary"
                        loading={busyKey === d.key}
                        disabled={busy && busyKey !== d.key}
                        onClick={() => {
                          choose(d.key)
                          void saveProvider(d.key)
                        }}
                      >
                        {formatMessage({
                          id: 'firstrun.lucius.useThis',
                          defaultMessage: 'Use this',
                        })}
                      </Button>
                    )}
                  </div>
                  {(d.key === 'claude_cli' || d.key === 'codex_cli') && (
                    <CliSubscriptionHelp
                      provider={d.key}
                      platform={hostPlatform}
                      detected={Boolean(detected[d.key])}
                      onCheck={checkClis}
                    />
                  )}
                </div>
              ))}
              {cliCheckError && (
                <div role="status">
                  <Text size="sm" tone="bad">
                    {formatMessage({
                      id: 'firstrun.lucius.checkError',
                      defaultMessage: 'Could not check installations. Check again.',
                    })}
                  </Text>
                </div>
              )}
            </div>
          )}

          {keyedOptions.length === 0 && found.length === 0 && (
            <div className="firstrun-rows firstrun-settle">
              <div className="firstrun-row">
                <span className="firstrun-row__label">
                  {formatMessage({ id: 'firstrun.lucius.providers', defaultMessage: 'Providers' })}
                </span>
                <span className="firstrun-row__value">
                  <Text as="span" size="sm" tone="bad">
                    {formatMessage({
                      id: 'firstrun.lucius.providersFailed',
                      defaultMessage: 'Could not load the list of model providers.',
                    })}
                  </Text>
                  <Text as="span" size="xs" tone="faint" className="firstrun-row__note">
                    {formatMessage({
                      id: 'firstrun.lucius.backendFailed',
                      defaultMessage:
                        'The app could not reach its own backend. Nothing is wrong with your setup.',
                    })}
                  </Text>
                </span>
                <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
                  {formatMessage({ id: 'firstrun.lucius.retry', defaultMessage: 'Try again' })}
                </Button>
              </div>
            </div>
          )}

          {keyedOptions.length > 0 && (
            <>
              {offered.length > 0 && (
                <div className="firstrun-alt">
                  <span className="firstrun-alt__rule" aria-hidden="true" />
                  <span className="firstrun-alt__label">
                    {formatMessage({
                      id: 'firstrun.lucius.orProvider',
                      defaultMessage: 'or use a provider',
                    })}
                  </span>
                  <span className="firstrun-alt__rule" aria-hidden="true" />
                </div>
              )}
              <div className="firstrun-rows firstrun-settle">
                <div className="firstrun-row">
                  <label className="firstrun-row__label" htmlFor="fr-provider">
                    {formatMessage({ id: 'firstrun.lucius.provider', defaultMessage: 'Provider' })}
                  </label>
                  <span className="firstrun-row__value">
                    <span className="firstrun-select-wrap" style={{ width: '100%' }}>
                      <Select
                        id="fr-provider"
                        options={keyedOptions}
                        value={keyedChosen?.key ?? ''}
                        onChange={(e) => choose(e.target.value)}
                      />
                      <ChevronDown
                        size={16}
                        strokeWidth={1.7}
                        aria-hidden="true"
                        className="firstrun-select-wrap__chevron"
                      />
                    </span>
                    {keyedChosen && keyedChosen.key !== 'openrouter' && (
                      <Text as="span" size="xs" tone="faint" className="firstrun-row__note">
                        {formatMessage({
                          id: 'firstrun.lucius.costWarning',
                          defaultMessage:
                            'Running Lucius can get pricey. Consider a cheaper capable model like GLM or DeepSeek via OpenRouter.',
                        })}{' '}
                        {keyedChosen.key === 'anthropic' &&
                          formatMessage({
                            id: 'firstrun.lucius.claudeCredits',
                            defaultMessage:
                              'Claude Max and Team plans include monthly API credits.',
                          })}
                      </Text>
                    )}
                    {keyedChosen?.key === 'openrouter' && (
                      <Text as="span" size="xs" tone="faint" className="firstrun-row__note">
                        {formatMessage({
                          id: 'firstrun.lucius.modelAdvice',
                          defaultMessage:
                            'Pick a model on par with Claude Sonnet 5.0, such as GLM 5.3 or Kimi. Lucius works in long chains of tool calls, and weaker models slip.',
                        })}
                      </Text>
                    )}
                  </span>
                </div>

                {/* Endpoint and key BELONG to the provider — they are how it is reached, so
                    they live on this page with it, never beside the model. */}
                {keyedChosen?.editable_base_url && (
                  <div className="firstrun-row">
                    <label className="firstrun-row__label" htmlFor="fr-base">
                      {formatMessage({
                        id: 'firstrun.lucius.endpoint',
                        defaultMessage: 'Endpoint',
                      })}
                    </label>
                    <span className="firstrun-row__value">
                      <TextField
                        id="fr-base"
                        value={baseUrl}
                        spellCheck={false}
                        placeholder="http://localhost:11434/v1"
                        onChange={(e) => setBaseUrl(e.target.value)}
                      />
                      <Text as="span" size="xs" tone="faint" className="firstrun-row__note">
                        {formatMessage({
                          id: 'firstrun.lucius.endpointHelp',
                          defaultMessage: 'Anything speaking the OpenAI API works.',
                        })}
                      </Text>
                    </span>
                  </div>
                )}

                {keyedChosen?.needs_api_key && (
                  <div className="firstrun-row">
                    <label className="firstrun-row__label" htmlFor="fr-key">
                      {formatMessage({ id: 'firstrun.lucius.apiKey', defaultMessage: 'API key' })}
                    </label>
                    {/* The hint sits UNDER the field: as a sibling it was flex-shrink:0, took
                        its width first, and truncated the key. And NOT "never returned" — the
                        eye reveals it, and an operator may read one back (ADR 2026-08-14). */}
                    <span className="firstrun-row__value">
                      <PasswordField
                        id="fr-key"
                        autoComplete="off"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={
                          storedKeys[keyedChosen.key]
                            ? formatMessage({
                                id: 'firstrun.lucius.savedKey',
                                defaultMessage: 'Saved — leave blank to keep it',
                              })
                            : picked === 'anthropic'
                              ? 'sk-ant-…'
                              : 'sk-…'
                        }
                      />
                      <Text as="span" size="xs" tone="faint" className="firstrun-row__note">
                        {keyedChosen.optional_api_key
                          ? formatMessage({
                              id: 'firstrun.lucius.optionalKey',
                              defaultMessage:
                                'Optional — only if your proxy was started with one. Kept on this machine.',
                            })
                          : formatMessage({
                              id: 'firstrun.lucius.localKey',
                              defaultMessage: 'Kept on this machine',
                            })}
                      </Text>
                    </span>
                  </div>
                )}
              </div>

              <div className="firstrun-actions">
                {busy ? (
                  <span className="firstrun-actions__status">
                    {keyedChosen?.needs_api_key
                      ? formatMessage(
                          {
                            id: 'firstrun.lucius.checking',
                            defaultMessage: 'Checking your key and fetching models from {provider}',
                          },
                          { provider: keyedChosen.label },
                        )
                      : formatMessage(
                          {
                            id: 'firstrun.lucius.asking',
                            defaultMessage: 'Asking {provider} what it offers',
                          },
                          {
                            provider:
                              keyedChosen?.label ??
                              formatMessage({
                                id: 'firstrun.lucius.providerFallback',
                                defaultMessage: 'the provider',
                              }),
                          },
                        )}
                  </span>
                ) : (
                  error && (
                    <>
                      <span className="firstrun-actions__error">{error}</span>
                      <ReportProblemButton size="sm" error={error} />
                    </>
                  )
                )}
                <Button
                  variant="primary"
                  loading={busyKey === keyedChosen?.key}
                  disabled={
                    (busy && busyKey !== keyedChosen?.key) ||
                    !keyedChosen ||
                    (keyedChosen.needs_api_key &&
                      !keyedChosen.optional_api_key &&
                      !storedKeys[keyedChosen.key] &&
                      !apiKey.trim()) ||
                    (keyedChosen.editable_base_url && !baseUrl.trim())
                  }
                  onClick={() => keyedChosen && void saveProvider(keyedChosen.key)}
                >
                  {formatMessage({ id: 'firstrun.lucius.continue', defaultMessage: 'Continue' })}
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── PAGE TWO: what it runs ─────────────────────────────────────────────── */}

      {ready && shownStage === 'model' && chosen && (
        <>
          <div className="firstrun-rows firstrun-settle">
            <div className="firstrun-row">
              <span className="firstrun-row__label">
                {formatMessage({ id: 'firstrun.lucius.provider', defaultMessage: 'Provider' })}
              </span>
              <span className="firstrun-row__value">
                <span>{chosen.label}</span>
                {picked && paths[picked] && (
                  <Text as="span" size="xs" tone="faint" className="firstrun-row__note">
                    {paths[picked]}
                  </Text>
                )}
              </span>
              <button
                type="button"
                className="firstrun-row__action"
                aria-label={formatMessage({
                  id: 'firstrun.lucius.changeProvider',
                  defaultMessage: 'Change provider',
                })}
                onClick={() => setStage('provider')}
              >
                {formatMessage({ id: 'firstrun.lucius.change', defaultMessage: 'Change' })}
              </button>
            </div>

            <div className="firstrun-row">
              {/* A label only labels a form control. With a list to pick from this row shows a
                  VALUE and a Change action (like the currency row), so the heading is a plain
                  span and the value carries its own accessible name. */}
              {modelOptions.length > 0 ? (
                <span className="firstrun-row__label">
                  {formatMessage({ id: 'firstrun.lucius.model', defaultMessage: 'Model' })}
                </span>
              ) : (
                <label className="firstrun-row__label" htmlFor="fr-model">
                  {formatMessage({ id: 'firstrun.lucius.model', defaultMessage: 'Model' })}
                </label>
              )}
              <span className="firstrun-row__value">
                {modelOptions.length > 0 ? (
                  <span
                    aria-label={formatMessage({
                      id: 'firstrun.lucius.model',
                      defaultMessage: 'Model',
                    })}
                    style={{ fontFamily: MONO }}
                  >
                    {model || formatMessage({ id: 'firstrun.lucius.none', defaultMessage: 'none' })}
                  </span>
                ) : (
                  <TextField
                    id="fr-model"
                    value={model}
                    spellCheck={false}
                    placeholder={formatMessage({
                      id: 'firstrun.lucius.modelPlaceholder',
                      defaultMessage: 'the model name this endpoint serves',
                    })}
                    onChange={(e) => setModel(e.target.value)}
                  />
                )}
                <Text as="span" size="xs" tone="faint" className="firstrun-row__note">
                  {picked && cliDefaults[picked] && model === cliDefaults[picked]
                    ? formatMessage(
                        {
                          id: 'firstrun.lucius.cliDefault',
                          defaultMessage:
                            '{provider}’s own default. Change it any time in Settings.',
                        },
                        { provider: chosen.label },
                      )
                    : liveModels
                      ? formatMessage(
                          {
                            id: 'firstrun.lucius.available',
                            defaultMessage:
                              '{count} models available from {provider}. Change it any time in Settings.',
                          },
                          { count: liveModels.length, provider: chosen.label },
                        )
                      : modelOptions.length > 0
                        ? formatMessage({
                            id: 'firstrun.lucius.modelSuggested',
                            defaultMessage:
                              'A sensible default is chosen for you. Change it any time in Settings.',
                          })
                        : picked && CLI_KEYS.has(picked)
                          ? formatMessage(
                              {
                                id: 'firstrun.lucius.cliBlank',
                                defaultMessage:
                                  'Leave blank to use whatever {provider} is set to on this machine.',
                              },
                              { provider: chosen.label },
                            )
                          : formatMessage({
                              id: 'firstrun.lucius.modelNoDefault',
                              defaultMessage:
                                'This provider ships no default, so name the model yourself.',
                            })}
                </Text>
              </span>
              {modelOptions.length > 0 && (
                <button
                  type="button"
                  className="firstrun-row__action"
                  aria-label={formatMessage({
                    id: 'firstrun.lucius.changeModel',
                    defaultMessage: 'Change model',
                  })}
                  onClick={() => setPickingModel(true)}
                >
                  {formatMessage({ id: 'firstrun.lucius.change', defaultMessage: 'Change' })}
                </button>
              )}
            </div>
          </div>

          {pickingModel && (
            <PickDialog
              title={formatMessage({ id: 'firstrun.lucius.model', defaultMessage: 'Model' })}
              subtitle={
                liveModels
                  ? formatMessage(
                      {
                        id: 'firstrun.lucius.availableShort',
                        defaultMessage: '{count} models available from {provider}.',
                      },
                      { count: liveModels.length, provider: chosen.label },
                    )
                  : formatMessage(
                      {
                        id: 'firstrun.lucius.knownModels',
                        defaultMessage: 'The models {provider} is known to serve.',
                      },
                      { provider: chosen.label },
                    )
              }
              searchPlaceholder={formatMessage({
                id: 'firstrun.lucius.searchModels',
                defaultMessage: 'Search models…',
              })}
              options={modelOptions.map((m) => ({
                value: m,
                code: m,
                name:
                  picked && m === cliDefaults[picked]
                    ? formatMessage(
                        {
                          id: 'firstrun.lucius.defaultIn',
                          defaultMessage: 'Default in {provider}',
                        },
                        { provider: chosen.label },
                      )
                    : undefined,
              }))}
              value={model}
              onPick={(m) => {
                setModel(m)
                setPickingModel(false)
              }}
              onClose={() => setPickingModel(false)}
              emptyLabel={formatMessage(
                { id: 'firstrun.lucius.noMatches', defaultMessage: 'No model matches “{q}”.' },
                { q: '{q}' },
              )}
            />
          )}

          <div className="firstrun-actions">
            {!busy && error && (
              <>
                <span className="firstrun-actions__error">{error}</span>
                <ReportProblemButton size="sm" error={error} />
              </>
            )}
            <Button
              variant="primary"
              loading={busyKey === picked}
              disabled={
                !picked || (!CLI_KEYS.has(picked) && modelOptions.length === 0 && !model.trim())
              }
              onClick={() => picked && void saveModel(picked)}
            >
              {formatMessage({ id: 'firstrun.lucius.continue', defaultMessage: 'Continue' })}
            </Button>
          </div>
        </>
      )}

      {/* NO SKIP. The app is an agent harness — an install with no model is the product with
          its point removed, and "Not now" was the easiest button on the screen to press.
          Every path out of here enrols something: a subscription you already have, a
          provider's key, or a model running locally. */}
    </Stack>
  )
}
