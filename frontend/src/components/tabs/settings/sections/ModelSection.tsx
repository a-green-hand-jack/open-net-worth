// Settings → AI Model. Ported from
// design_handoffs/settings_handoff/prototype/redesign/settings-model.jsx.
//
// Provider credentials and model routing. Usage telemetry lives in Settings → AI usage;
// chat preferences live in Settings → Chat, memory in Settings → Memory.
//
// The one deliberate departure from the prototype source: vision capability. The handoff's
// `TEXT_ONLY` array is explicitly a stand-in ("capability must come from the provider; an
// unknown model ID is UNKNOWN, not incapable"). The app already has exactly that contract —
// `ModelOption.vision` is backend-derived and `modelRejectsImages` only reports true when the
// provider positively said no — so this uses it instead of a hardcoded list.
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { authFetch } from '../../../../api/client'
import type { ModelOption } from '../../../../api/models'
import {
  MODEL_CONFIG_CHANGED_EVENT,
  modelRejectsImages,
  useModels,
} from '../../../../hooks/useModels'
import { useFlag } from '../../../../hooks/useFlag'
import { getCachedQueryData, useCachedFetchState } from '../../../../state/queryCache'
import { openReportProblem } from '../../../../state/reportProblem'
import { useCliDetectionPoll } from '../../../../hooks/useCliDetectionPoll'
import { CliSubscriptionHelp } from '../../../shared/CliSubscriptionHelp'
import type { CliHostPlatform } from '../../../shared/CliSubscriptionHelp'
import { isLocalOnlyProvider } from '../../../shared/privateCloudCopy'
import { ModelPicker } from '../../../ui'
import { ChevronRight, Eye, EyeOff, TriangleAlert, Plus } from '../../../../ui/icons'
import { Badge, Btn, Empty, Field, Modal, Panel, Select, Toggle, useSectionBusy } from '../ds'
import type { SectionProps } from '../ds'
import { TurnTimeLimitPanel } from './TurnTimeLimitPanel'
import { modelError } from './modelError'

// ── shapes ───────────────────────────────────────────────────────────────────
interface CatalogEntry {
  key: string
  label: string
  transport: string
  base_url: string
  needs_api_key: boolean
  editable_base_url: boolean
  /** Presentation only — the fixed host a pinned provider talks to, when base_url is "". */
  display_base_url?: string
  model_hints: string[]
  cli_binary?: string
}

interface ConfiguredProvider {
  has_api_key: boolean
  base_url: string
  model: string
  enabled?: boolean
  key_status?: 'valid' | 'invalid' | 'unreachable' | 'unchecked'
  checked_at?: string | null
  label?: string
}

// A local CLI enrols by DETECTION, not by stored credentials — it has no api_key or base_url
// to save, so `configured_providers` has no row for it. The Settings list still shows it (it is
// a usable provider, and may be the instance default), which means the row renderer must be
// handed something. This is what "configured" means for a transport that configures itself.
const DETECTED_CLI_CFG: ConfiguredProvider = {
  has_api_key: false,
  base_url: '',
  model: '',
  enabled: true,
}

interface ProvidersResponse {
  catalog: CatalogEntry[]
  configured_providers: Record<string, ConfiguredProvider>
  detected_clis: Record<string, boolean>
  detected_cli_paths: Record<string, string>
  /** What each CLI runs when told nothing — read from the CLI's own config. */
  cli_default_models?: Record<string, string>
  cli_host_platform?: CliHostPlatform
}

const CLI_DEFAULT_NOTE: Record<string, string> = {
  claude_cli: 'Claude Code default',
  codex_cli: 'Default in Codex',
}

/** Tags the row a CLI would run on its own, so picking it is a recognised choice. */
export function cliDefaultNote(
  m: ModelOption,
  cliDefaults: Record<string, string> | undefined,
): string | undefined {
  const key = m.provider_key
  return key && CLI_DEFAULT_NOTE[key] && cliDefaults?.[key] === m.id
    ? CLI_DEFAULT_NOTE[key]
    : undefined
}

interface ModelConfigPublic {
  /** The stored instance default: "<provider_key>:<model_id>". The three below are a
   *  DERIVED view of it, kept for the rows that still show an endpoint/transport. */
  default_model: string
  provider: string
  model: string
  base_url: string
  task_models?: Record<string, string | null>
}

interface PreferredModelsConfig {
  models: string[]
}

// Must stay in step with the backend's routable task list (VALID_TASKS). "Chat" is not a
// task — chat runs on the default provider — and dedup judgments live in Duplicate Detection.
const TASK_GROUPS: [string, [string, string, string, boolean?][]][] = [
  [
    'Assistant',
    [
      ['memory', 'Memory', 'Writes memory when a conversation goes quiet, and tidies it daily'],
      ['suggestions', 'Chat suggestions', 'Generates follow-up suggestions in the chat panel'],
      [
        'title',
        'Conversation titles',
        'Names each new conversation from its first message — a tiny call, so a fast model is best',
      ],
      [
        'chat_vision',
        'Image reading',
        'Reads images you paste into chat — needs a vision model',
        true,
      ],
    ],
  ],
  [
    'Insights',
    [
      ['intel', 'Intel & watchlist', 'Scans market signals and watchlist alerts'],
      ['briefing', 'Daily briefing', 'Composes the morning wealth briefing'],
      [
        'news_screen',
        'News screening',
        'Filters incoming headlines down to what touches your holdings',
      ],
      [
        'analysis',
        'Alert analysis',
        'Writes the why/impact/action behind each pushed Intel alert — the highest-stakes step, so reliability matters more than cost here',
      ],
      [
        'price_monitor',
        'Price alerts',
        'Writes up a price alert whose trigger was already decided by a threshold check',
      ],
    ],
  ],
  [
    'Statement import',
    [
      // ONE row, not five (owner, 2026-08-09: "merge all of these into one settings only").
      // It listed CSV columns / Row extraction / Scanned pages / Statement details / Your
      // instructions separately, on the theory that cheap schema inference and strong vision
      // deserved independent routing. In practice all five were always set to the same model,
      // so the split bought nothing but five chances to leave one behind.
      //
      // Deliberately NOT marked vision-only: a scanned page falls back to the instance
      // default image model when this pin can't see, so pinning a text model here is a
      // legitimate choice rather than a broken one.
      [
        'statement_import',
        'Statement import',
        'Reads statements end to end — columns, rows, details, and your written instructions. Scanned pages fall back to your default image model.',
      ],
    ],
  ],
]
const TASK_ROWS = TASK_GROUPS.flatMap(([, rows]) => rows)

// permissions_v2 only: the Auto judge's own row, the last of the Assistant group.
const TASK_GROUPS_V2: typeof TASK_GROUPS = TASK_GROUPS.map(([group, rows]) =>
  group === 'Assistant'
    ? [
        group,
        [
          ...rows,
          [
            'approval',
            'Auto-approval judge',
            'Decides whether Auto mode must ask before a call. Unset uses the model your conversation is running on — pin a fast, non-reasoning model for snappier Auto. The pending call and your last few messages are sent to it.',
          ],
        ],
      ]
    : [group, rows],
)

// Two states, plainly named: GREEN = you can use it, RED = you cannot. "Unreachable" was
// amber, which read as a caution when it is just as broken as a rejected key — neither one
// can answer a turn. Wording avoids our internal vocabulary ("valid", "detected", "configured"
// say nothing to someone who just wants to know if it works).
const STATUS_BADGE: Record<string, [string, 'good' | 'bad']> = {
  valid: ['Ready', 'good'],
  // Saved but never validated. Still shown as Ready: it is set up and there is nothing for
  // the owner to act on — a failure surfaces the moment a turn actually uses it.
  unchecked: ['Ready', 'good'],
  invalid: ['Key rejected', 'bad'],
  unreachable: ["Can't connect", 'bad'],
}

async function getJson<T>(path: string): Promise<T> {
  const r = await authFetch(path)
  if (!r.ok) throw new Error(String(r.status))
  return r.json() as Promise<T>
}

// ── provider row ─────────────────────────────────────────────────────────────
function ProviderRow({
  entry,
  cfg,
  isDefault,
  detected,
  detectedPath,
  onEdit,
  onToggle,
  toast,
  subscription,
}: {
  entry: CatalogEntry
  cfg: ConfiguredProvider
  isDefault: boolean
  detected: boolean
  detectedPath: string
  onEdit: (k: string) => void
  onToggle: (k: string, v: boolean) => void
  toast: SectionProps['toast']
  subscription?: {
    platform?: CliHostPlatform
    onCheck: () => Promise<unknown>
    terminal?: { onOpen: () => void }
  }
}) {
  const { formatMessage } = useAppIntl()
  const isCli = Boolean(entry.cli_binary)
  const enabled = cfg.enabled !== false

  const badge = () => {
    // No "Disabled" chip: the toggle to its right IS that state, and showing both says the same
    // thing twice while crowding the row. A disabled provider shows no badge at all — the switch
    // carries it. Every other badge reports something the switch cannot: whether a key
    // validated, whether a local CLI is installed.
    //
    // No "Default" chip either. It dates from when the row OWNED the default, and it REPLACED
    // the row's real status — the default CLI read "Default" instead of "Detected", hiding
    // whether its binary was even installed. The Default model row below names its provider,
    // so the chip was saying it twice and costing the useful fact.
    if (!enabled) return null
    // Binary presence does not prove the CLI's saved login can answer a turn.
    if (isCli)
      return (
        <Badge tone={detected ? 'good' : 'bad'}>
          {detected
            ? formatMessage({ id: 'settings.remaining.modelText0', defaultMessage: 'Installed' })
            : formatMessage({
                id: 'settings.remaining.modelText1',
                defaultMessage: 'Not installed',
              })}
        </Badge>
      )
    const [, tone] = STATUS_BADGE[cfg.key_status || 'unchecked'] || STATUS_BADGE.unchecked!
    return (
      <Badge tone={tone}>
        {cfg.key_status === 'invalid'
          ? formatMessage({
              id: 'settings.remaining.modelKeyRejected',
              defaultMessage: 'Key rejected',
            })
          : cfg.key_status === 'unreachable'
            ? formatMessage({
                id: 'settings.remaining.modelCantConnect',
                defaultMessage: "Can't connect",
              })
            : formatMessage({ id: 'settings.remaining.modelReady', defaultMessage: 'Ready' })}
      </Badge>
    )
  }

  return (
    <div className="rd-prov">
      <div className="rd-prov-head">
        <div className="rd-prov-main">
          <div className="rd-prov-name">{cfg.label || entry.label}</div>
          <div className="rd-prov-meta">
            {/* display_base_url covers the pinned-transport case: Anthropic stores base_url:""
                because its transport owns the host, so the row said nothing about where it
                talks to while every other provider showed its endpoint. */}
            {isCli ? (
              /* The resolved binary path, shown exactly where a URL provider shows its
                 endpoint — both answer "where does this actually run from". Falls back to
                 the binary name when it is not on this machine (no path to show). */
              <span className="rd-mono">
                {detectedPath ||
                  entry.cli_binary ||
                  formatMessage({
                    id: 'settings.remaining.modelText2',
                    defaultMessage: 'Local CLI',
                  })}
              </span>
            ) : (
              <span className="rd-mono">
                {cfg.base_url || entry.base_url || entry.display_base_url}
              </span>
            )}
            {/* An explicit separator: the two facts were divided by flex gap alone, which reads
                as one run-on string. Suppressed when there is no endpoint to separate from. */}
            {cfg.model && (isCli || cfg.base_url || entry.base_url || entry.display_base_url) ? (
              <span aria-hidden="true">•</span>
            ) : null}
            {cfg.model ? <span>{cfg.model}</span> : null}
          </div>
          {subscription && (
            <div className="rd-help">
              {formatMessage(
                {
                  id: 'settings.remaining.modelSubscription',
                  defaultMessage: 'Use your {provider} subscription; no API key needed.',
                },
                { provider: entry.key === 'claude_cli' ? 'Claude' : 'ChatGPT' },
              )}
            </div>
          )}
        </div>
        {badge()}
        {(!subscription || detected) && (
          <>
            <Toggle
              on={enabled}
              disabled={enabled && isDefault}
              label={
                enabled
                  ? formatMessage(
                      {
                        id: 'settings.remaining.modelDisableFor',
                        defaultMessage: 'Disable {provider}',
                      },
                      { provider: entry.label },
                    )
                  : formatMessage(
                      {
                        id: 'settings.remaining.modelEnableFor',
                        defaultMessage: 'Enable {provider}',
                      },
                      { provider: entry.label },
                    )
              }
              onChange={(v) => {
                if (enabled && isDefault) {
                  toast(
                    formatMessage({
                      id: 'settings.remaining.modelText3',
                      defaultMessage: 'Choose a default model on another provider first',
                    }),
                  )
                  return
                }
                onToggle(entry.key, v)
              }}
            />
            <Btn size="xs" variant="ghost" onClick={() => onEdit(entry.key)}>
              {formatMessage({ id: 'settings.remaining.modelUi0', defaultMessage: 'Edit' })}
            </Btn>
          </>
        )}
      </div>
      {subscription && (entry.key === 'claude_cli' || entry.key === 'codex_cli') && (
        <CliSubscriptionHelp
          provider={entry.key}
          platform={subscription.platform}
          detected={detected}
          onCheck={subscription.onCheck}
          terminal={subscription.terminal}
        />
      )}
    </div>
  )
}

// ── one editor for both paths: adding a provider, and editing a configured one ─
function ProviderModal({
  mode,
  editKey,
  cfg,
  catalog,
  models,
  cliPlatform,
  detectedClis,
  onCheckCli,
  terminal,
  taken,
  isDefault,
  onClose,
  onSave,
  onRemove,
  toast,
}: {
  mode: 'add' | 'edit'
  editKey?: string
  cfg?: ConfiguredProvider
  catalog: CatalogEntry[]
  /** Every configured provider's live models — the field below searches this provider's slice. */
  models: ModelOption[]
  cliPlatform?: CliHostPlatform
  detectedClis: Record<string, boolean>
  onCheckCli: () => Promise<unknown>
  terminal?: { onOpen: () => void }
  taken: string[]
  isDefault: boolean
  onClose: () => void
  onSave: (
    key: string,
    patch: { label: string; url: string; model: string; key: string; bin: string },
  ) => void
  onRemove: (key: string) => void
  toast: SectionProps['toast']
}) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const available = catalog.filter((e) => e.key === 'custom' || !taken.includes(e.key))
  const [sel, setSel] = useState(
    mode === 'edit' ? editKey || 'custom' : available[0]?.key || 'custom',
  )
  const entry = catalog.find((e) => e.key === sel) || catalog[0]!
  const [f, setF] = useState(() => ({
    label: cfg?.label || '',
    url: cfg?.base_url || entry.base_url,
    model: cfg?.model || '',
    key: '',
    bin: cfg?.base_url || '',
  }))
  // This provider's own live list (about 470 rows for OpenRouter) when we have it; the catalog's
  // short hint list otherwise — adding a provider, or one that cannot be listed yet.
  const providerModels = useMemo<ModelOption[]>(() => {
    const live = models.filter((m) => m.provider_key === entry.key)
    if (live.length) return live
    return entry.model_hints.map((id) => ({
      id,
      provider_key: entry.key,
      provider_label: entry.label,
    }))
  }, [models, entry])
  const [armed, setArmed] = useState(false)
  const [testing, setTesting] = useState(false)
  // The toast is gone in two seconds; a failed connection test stays up, beside a way to report it.
  const [testFailure, setTestFailure] = useState<string | null>(null)

  const isCli = Boolean(entry.cli_binary)
  const urlMissing = entry.editable_base_url && !isCli && !f.url.trim()
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  // Reveal is a per-click round trip to the human-only endpoint. The key is never held in any
  // list response, so nothing else in the app (caches, screen context sent to Lucius) can see it.
  const [showKey, setShowKey] = useState(false)
  const [revealing, setRevealing] = useState(false)
  async function revealKey() {
    if (revealing) return
    setRevealing(true)
    try {
      const res = await authFetch(
        `/api/model-config/providers/${encodeURIComponent(entry.key)}/reveal-key`,
      )
      if (!res.ok) {
        toast(
          res.status === 404
            ? formatMessage({
                id: 'settings.remaining.modelText4',
                defaultMessage: 'No stored key to show',
              })
            : formatMessage(
                {
                  id: 'settings.remaining.modelKeyHttp',
                  defaultMessage: 'Could not read the key ({status})',
                },
                { status: res.status },
              ),
        )
        return
      }
      const data = (await res.json()) as { api_key?: string }
      if (!data.api_key) {
        toast(
          formatMessage({
            id: 'settings.remaining.modelText4',
            defaultMessage: 'No stored key to show',
          }),
        )
        return
      }
      set('key', data.api_key)
      setShowKey(true)
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.modelText5',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    } finally {
      setRevealing(false)
    }
  }

  function pick(k: string) {
    const e = catalog.find((x) => x.key === k) || catalog[0]!
    setSel(k)
    setF({ label: '', url: e.base_url, model: '', key: '', bin: '' })
  }

  async function testConnection() {
    setTesting(true)
    setTestFailure(null)
    const started = performance.now()
    try {
      const r = await authFetch(`/api/model-config/providers/${encodeURIComponent(sel)}/validate`, {
        method: 'POST',
      })
      const body = (await r.json().catch(() => null)) as {
        key_status?: string
        error?: string
        detail?: string
      } | null
      const ms = Math.round(performance.now() - started)
      if (body?.key_status === 'valid')
        toast(
          formatMessage(
            { id: 'settings.remaining.modelTested', defaultMessage: 'Tested ok — {ms}ms' },
            { ms },
          ),
        )
      // `detail` is what a 4xx carries (e.g. the provider is switched off). Without it this
      // asserted "unreachable" for ANY failure — including our own server erroring — and so
      // blamed the network for problems that had nothing to do with it.
      else {
        const message =
          body?.error ||
          modelError(
            body,
            formatMessage(
              {
                id: 'settings.remaining.modelTestHttp',
                defaultMessage: 'Test failed (HTTP {status})',
              },
              { status: r.status },
            ),
            intl,
          )
        setTestFailure(message)
        toast(message)
      }
    } catch {
      setTestFailure(
        formatMessage({
          id: 'settings.remaining.modelText5',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
      toast(
        formatMessage({
          id: 'settings.remaining.modelText5',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    } finally {
      setTesting(false)
    }
  }

  return (
    <Modal
      title={
        mode === 'edit'
          ? formatMessage({ id: 'settings.remaining.modelText6', defaultMessage: 'Edit provider' })
          : formatMessage({
              id: 'settings.remaining.modelText7',
              defaultMessage: 'Add AI provider',
            })
      }
      onClose={onClose}
      footer={
        <>
          {mode === 'edit' && !isDefault ? (
            <Btn
              variant={armed ? 'danger-solid' : 'danger'}
              style={{ marginRight: 'auto' }}
              onClick={() => {
                if (!armed) {
                  setArmed(true)
                  setTimeout(() => setArmed(false), 4000)
                } else {
                  onRemove(sel)
                  onClose()
                }
              }}
            >
              {armed
                ? formatMessage({
                    id: 'settings.remaining.modelText8',
                    defaultMessage: 'Confirm remove',
                  })
                : formatMessage({ id: 'settings.remaining.modelText9', defaultMessage: 'Remove' })}
            </Btn>
          ) : null}
          <Btn onClick={onClose}>
            {formatMessage({ id: 'settings.remaining.modelUi1', defaultMessage: 'Cancel' })}
          </Btn>
          <Btn
            variant="primary"
            disabled={urlMissing}
            onClick={() => {
              onSave(sel, f)
              onClose()
            }}
          >
            {mode === 'edit'
              ? formatMessage({
                  id: 'settings.remaining.modelText10',
                  defaultMessage: 'Save changes',
                })
              : formatMessage({
                  id: 'settings.remaining.modelText11',
                  defaultMessage: 'Add provider',
                })}
          </Btn>
        </>
      }
    >
      <div className="rd-formgrid">
        {mode === 'add' && (
          <Field
            label={formatMessage({
              id: 'settings.remaining.modelAttr0',
              defaultMessage: 'Provider',
            })}
            span="full"
            help={
              entry.key === 'custom'
                ? formatMessage({
                    id: 'settings.remaining.modelText12',
                    defaultMessage:
                      'Any endpoint that speaks the OpenAI API — a self-hosted gateway, a proxy, anything',
                  })
                : undefined
            }
          >
            <Select value={sel} onChange={(e) => pick(e.target.value)}>
              {available.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {entry.key === 'custom' && (
          <Field
            label={formatMessage({
              id: 'settings.remaining.modelAttr1',
              defaultMessage: 'Display name',
            })}
            span="full"
          >
            <input
              className="rd-input"
              value={f.label}
              placeholder={formatMessage({
                id: 'settings.remaining.modelAttr2',
                defaultMessage: 'e.g. Work gateway',
              })}
              onChange={(e) => set('label', e.target.value)}
            />
          </Field>
        )}
        {entry.editable_base_url && !isCli && (
          <Field
            label={formatMessage({
              id: 'settings.remaining.modelAttr3',
              defaultMessage: 'Base URL',
            })}
            span="full"
            help={
              urlMissing
                ? formatMessage({
                    id: 'settings.remaining.modelText13',
                    defaultMessage: 'Required',
                  })
                : undefined
            }
          >
            <input
              className="rd-input"
              value={f.url}
              placeholder="https://…/v1"
              onChange={(e) => set('url', e.target.value)}
            />
          </Field>
        )}
        {/* A pinned provider still SHOWS where it talks to — it just is not yours to change.
            Anthropic stores base_url:"" (its transport knows its own host), so without the
            display fallback this rendered an empty read-only box that looked like a missing
            setting rather than a fixed one. */}
        {!entry.editable_base_url && !isCli && (entry.base_url || entry.display_base_url) && (
          <Field
            label={formatMessage({
              id: 'settings.remaining.modelAttr4',
              defaultMessage: 'Endpoint',
            })}
            span="full"
            help={formatMessage({
              id: 'settings.remaining.modelAttr5',
              defaultMessage: 'Fixed by this provider',
            })}
          >
            <input
              className="rd-input rd-mono"
              value={entry.base_url || entry.display_base_url}
              readOnly
            />
          </Field>
        )}
        {entry.needs_api_key && (
          <Field
            label={formatMessage({
              id: 'settings.remaining.modelAttr6',
              defaultMessage: 'API key',
            })}
            span="full"
            help={
              cfg?.has_api_key
                ? formatMessage({
                    id: 'settings.remaining.modelText14',
                    defaultMessage: 'A key is saved — leave blank to keep it',
                  })
                : formatMessage({
                    id: 'settings.remaining.modelText15',
                    defaultMessage: 'Stored server-side, never shown again',
                  })
            }
          >
            <div className="rd-keyfield">
              <input
                className="rd-input"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                value={f.key}
                placeholder={
                  cfg?.has_api_key
                    ? formatMessage({
                        id: 'settings.remaining.modelText16',
                        defaultMessage: '•••••••• (saved)',
                      })
                    : formatMessage({
                        id: 'settings.remaining.modelText17',
                        defaultMessage: 'Paste your API key',
                      })
                }
                onChange={(e) => set('key', e.target.value)}
              />
              {/* Reveal fetches on demand from the human-only reveal-key endpoint — the key is
                  NOT part of any list payload, so it never sits in a cache or in screen context.
                  Only offered when a key is actually stored and the box is still empty (an
                  unsaved draft is already plain text). */}
              {cfg?.has_api_key && !f.key ? (
                <button
                  type="button"
                  className="rd-keyeye"
                  onClick={() => void revealKey()}
                  disabled={revealing}
                  aria-label={formatMessage({
                    id: 'settings.remaining.modelAttr7',
                    defaultMessage: 'Show the saved API key',
                  })}
                >
                  <Eye size={17} strokeWidth={1.8} aria-hidden="true" />
                </button>
              ) : null}
              {showKey ? (
                <button
                  type="button"
                  className="rd-keyeye"
                  onClick={() => {
                    setShowKey(false)
                    set('key', '')
                  }}
                  aria-label={formatMessage({
                    id: 'settings.remaining.modelAttr8',
                    defaultMessage: 'Hide the API key',
                  })}
                >
                  <EyeOff size={17} strokeWidth={1.8} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </Field>
        )}
        {isCli ? (
          <Field
            label={formatMessage({
              id: 'settings.remaining.modelAttr9',
              defaultMessage: 'Binary path',
            })}
            span="full"
            help={formatMessage(
              {
                id: 'settings.remaining.modelCliPath',
                defaultMessage: 'Leave blank to use the {binary} found on PATH',
              },
              { binary: entry.cli_binary },
            )}
          >
            <input
              className="rd-input"
              value={f.bin}
              placeholder={entry.cli_binary}
              onChange={(e) => set('bin', e.target.value)}
            />
          </Field>
        ) : (
          <Field
            label={formatMessage({
              id: 'settings.remaining.modelAttr10',
              defaultMessage: 'Default model',
            })}
            span="full"
            help={formatMessage({
              id: 'settings.remaining.modelAttr11',
              defaultMessage: 'Search the list, or type any model ID',
            })}
          >
            <ModelPicker
              label={formatMessage(
                {
                  id: 'settings.remaining.modelDefaultFor',
                  defaultMessage: 'Default model for {provider}',
                },
                { provider: entry.label },
              )}
              models={providerModels}
              value={f.model ? `${entry.key}:${f.model}` : ''}
              placeholder={formatMessage({
                id: 'settings.remaining.modelAttr12',
                defaultMessage: 'Choose a model…',
              })}
              customProviderKey={entry.key}
              onChange={(ref) =>
                set(
                  'model',
                  ref.startsWith(`${entry.key}:`) ? ref.slice(entry.key.length + 1) : ref,
                )
              }
            />
          </Field>
        )}
        {(entry.key === 'claude_cli' || entry.key === 'codex_cli') && (
          <div style={{ gridColumn: '1 / -1' }}>
            <CliSubscriptionHelp
              provider={entry.key}
              platform={cliPlatform}
              detected={Boolean(detectedClis[entry.key])}
              onCheck={onCheckCli}
              terminal={terminal}
            />
          </div>
        )}
      </div>
      {mode === 'edit' ? (
        <Btn size="xs" disabled={testing} onClick={() => void testConnection()}>
          {testing
            ? formatMessage({ id: 'settings.remaining.modelText18', defaultMessage: 'Testing…' })
            : formatMessage({
                id: 'settings.remaining.modelText19',
                defaultMessage: 'Test connection',
              })}
        </Btn>
      ) : null}
      {testFailure ? (
        <Field
          label={formatMessage({
            id: 'settings.remaining.modelAttr13',
            defaultMessage: 'The connection test failed',
          })}
          span="full"
          help={testFailure}
        >
          <Btn size="xs" onClick={() => openReportProblem({ error: testFailure })}>
            {formatMessage({
              id: 'settings.remaining.modelUi2',
              defaultMessage: 'Report this problem',
            })}
          </Btn>
        </Field>
      ) : null}
    </Modal>
  )
}

// ── task models + the vision contract ────────────────────────────────────────
function TaskModels({
  toast,
  defaultModel,
  models,
  taskModels,
  onSave,
}: {
  toast: SectionProps['toast']
  defaultModel: string
  models: ModelOption[]
  taskModels: Record<string, string | null>
  onSave: (next: Record<string, string | null>) => void
}) {
  const { formatMessage } = useAppIntl()
  const localTask = (key: string, original: string, originalHelp: string): [string, string] => {
    switch (key) {
      case 'memory':
        return [
          formatMessage({ id: 'settings.remaining.modelTaskLabel0', defaultMessage: 'Memory' }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp0',
            defaultMessage: 'Writes memory when a conversation goes quiet, and tidies it daily',
          }),
        ]
      case 'suggestions':
        return [
          formatMessage({
            id: 'settings.remaining.modelTaskLabel1',
            defaultMessage: 'Chat suggestions',
          }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp1',
            defaultMessage: 'Generates follow-up suggestions in the chat panel',
          }),
        ]
      case 'title':
        return [
          formatMessage({
            id: 'settings.remaining.modelTaskLabel2',
            defaultMessage: 'Conversation titles',
          }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp2',
            defaultMessage:
              'Names each new conversation from its first message — a tiny call, so a fast model is best',
          }),
        ]
      case 'chat_vision':
        return [
          formatMessage({
            id: 'settings.remaining.modelTaskLabel3',
            defaultMessage: 'Image reading',
          }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp3',
            defaultMessage: 'Reads images you paste into chat — needs a vision model',
          }),
        ]
      case 'intel':
        return [
          formatMessage({
            id: 'settings.remaining.modelTaskLabel4',
            defaultMessage: 'Intel & watchlist',
          }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp4',
            defaultMessage: 'Scans market signals and watchlist alerts',
          }),
        ]
      case 'briefing':
        return [
          formatMessage({
            id: 'settings.remaining.modelTaskLabel5',
            defaultMessage: 'Daily briefing',
          }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp5',
            defaultMessage: 'Composes the morning wealth briefing',
          }),
        ]
      case 'news_screen':
        return [
          formatMessage({
            id: 'settings.remaining.modelTaskLabel6',
            defaultMessage: 'News screening',
          }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp6',
            defaultMessage: 'Filters incoming headlines down to what touches your holdings',
          }),
        ]
      case 'analysis':
        return [
          formatMessage({
            id: 'settings.remaining.modelTaskLabel7',
            defaultMessage: 'Alert analysis',
          }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp7',
            defaultMessage:
              'Writes the why/impact/action behind each pushed Intel alert — the highest-stakes step, so reliability matters more than cost here',
          }),
        ]
      case 'price_monitor':
        return [
          formatMessage({
            id: 'settings.remaining.modelTaskLabel8',
            defaultMessage: 'Price alerts',
          }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp8',
            defaultMessage:
              'Writes up a price alert whose trigger was already decided by a threshold check',
          }),
        ]
      case 'statement_import':
        return [
          formatMessage({
            id: 'settings.remaining.modelTaskLabel9',
            defaultMessage: 'Statement import',
          }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp9',
            defaultMessage:
              'Reads statements end to end — columns, rows, details, and your written instructions. Scanned pages fall back to your default image model.',
          }),
        ]
      case 'approval':
        return [
          formatMessage({
            id: 'settings.remaining.modelTaskLabel10',
            defaultMessage: 'Auto-approval judge',
          }),
          formatMessage({
            id: 'settings.remaining.modelTaskHelp10',
            defaultMessage:
              'Decides whether Auto mode must ask before a call. Unset uses the model your conversation is running on — pin a fast, non-reasoning model for snappier Auto. The pending call and your last few messages are sent to it.',
          }),
        ]
      default:
        return [original, originalHelp]
    }
  }
  const over = taskModels
  // The ONE switch point for permissions_v2 here: the judge picker exists only while it is on
  // (and not before the flag list has loaded).
  const judgePicker = useFlag('permissions_v2') === true
  const taskGroups = (judgePicker ? TASK_GROUPS_V2 : TASK_GROUPS).map(
    ([group, rows]): (typeof TASK_GROUPS)[number] => [
      group,
      rows.map(([key, label, help, vision]) => {
        const [translated, translatedHelp] = localTask(key, label, help)
        return [key, translated, translatedHelp, vision]
      }),
    ],
  )
  const taskRows = taskGroups.flatMap(([, rows]) => rows)
  // A judge model pinned while the flag was on is kept, but it is not a task of this screen while
  // the flag is off: it neither counts nor shows.
  const keys = Object.keys(over).filter((k) => over[k] && (judgePicker || k !== 'approval'))
  const label = (k: string) => (taskRows.find(([kk]) => kk === k) || [, k])[1] as string
  const resolved = (k: string) => over[k] || defaultModel
  // Only a positively-declared text-only model warns. An unknown model id is UNKNOWN, not
  // incapable — the model field takes free text, so warning on anything unrecognised would
  // cry wolf on every custom gateway.
  const blind = taskRows
    .filter(([, , , vision]) => vision)
    .filter(([k]) => modelRejectsImages(resolved(k) || '', models, defaultModel))

  const set = (k: string, v: string) => {
    const next = { ...over }
    if (v) next[k] = v
    else delete next[k]
    onSave(next)
  }

  return (
    <Panel
      title={formatMessage({ id: 'settings.remaining.modelAttr14', defaultMessage: 'Task models' })}
      sub={formatMessage({
        id: 'settings.remaining.modelAttr15',
        defaultMessage:
          'Background chores can run on cheaper models — chat itself always uses your default provider',
      })}
    >
      {blind.length ? (
        <div className="rd-banner">
          <span style={{ color: 'var(--warn)', marginTop: 1 }}>
            <TriangleAlert size={14} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <div style={{ flex: 1 }}>
            <div className="rd-banner-title">
              {blind.length === 1
                ? formatMessage(
                    {
                      id: 'settings.remaining.modelBlindOne',
                      defaultMessage: '{task} can’t read images',
                    },
                    { task: blind[0]![1] },
                  )
                : formatMessage(
                    {
                      id: 'settings.remaining.modelBlindMany',
                      defaultMessage: '{count} image tasks can’t read images',
                    },
                    { count: blind.length },
                  )}
            </div>
            <div className="rd-banner-sub">
              {formatMessage(
                {
                  id: 'settings.remaining.modelBlindDescription',
                  defaultMessage:
                    '{tasks} — text-only. These runs will fail until you route them to a vision model.',
                },
                { tasks: blind.map(([k, l]) => l + ' → ' + resolved(k)).join(' • ') },
              )}
            </div>
          </div>
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>
            {keys.length
              ? formatMessage(
                  {
                    id: 'settings.remaining.modelOverrideCount',
                    defaultMessage: '{count} of {total} tasks overridden',
                  },
                  { count: keys.length, total: taskRows.length },
                )
              : formatMessage({
                  id: 'settings.remaining.modelAllDefault',
                  defaultMessage: 'All tasks use your default model',
                })}
          </div>
          <div className="rd-help" style={{ marginTop: 3, display: 'block', lineHeight: 1.5 }}>
            {keys.length
              ? keys.map(label).join(' • ')
              : formatMessage(
                  {
                    id: 'settings.remaining.modelRoutable',
                    defaultMessage:
                      '{count} routable tasks — override only the ones you care about.',
                  },
                  { count: taskRows.length },
                )}
          </div>
        </div>
        {keys.length ? (
          <Btn
            size="xs"
            variant="ghost"
            onClick={() => {
              onSave({})
              toast(
                formatMessage({
                  id: 'settings.remaining.modelText20',
                  defaultMessage: 'Task overrides cleared',
                }),
              )
            }}
          >
            {formatMessage({ id: 'settings.remaining.modelUi3', defaultMessage: 'Reset' })}
          </Btn>
        ) : null}
      </div>
      {taskGroups.map(([group, rows]) => (
        // A keyed Fragment, NOT a display:contents div. Both keep the wrapper out of the
        // layout, but a real element still sits in the DOM tree — so the panel's
        // `.rd-panel-body > .rd-subhead` rule (its padding and background band) stopped
        // matching, and the group headings rendered flush against the card edge.
        <Fragment key={group}>
          <div className="rd-subhead">
            {group === 'Assistant'
              ? formatMessage({
                  id: 'settings.remaining.modelGroupAssistant',
                  defaultMessage: 'Assistant',
                })
              : group === 'Insights'
                ? formatMessage({
                    id: 'settings.remaining.modelGroupInsights',
                    defaultMessage: 'Insights',
                  })
                : formatMessage({
                    id: 'settings.remaining.modelGroupStatements',
                    defaultMessage: 'Statement import',
                  })}
          </div>
          <div className="rd-formgrid">
            {rows.map(([k, l, help, vision]) => {
              const bad =
                Boolean(vision) && modelRejectsImages(resolved(k) || '', models, defaultModel)
              return (
                <Field key={k} label={l} help={help}>
                  <ModelPicker
                    label={l}
                    models={models}
                    value={over[k] || ''}
                    defaultLabel={
                      k === 'approval'
                        ? formatMessage({
                            id: 'settings.remaining.modelText21',
                            defaultMessage: 'Same as chat model',
                          })
                        : formatMessage({
                            id: 'settings.remaining.modelText22',
                            defaultMessage: 'Default',
                          }) +
                          (vision && modelRejectsImages(defaultModel, models, defaultModel)
                            ? formatMessage({
                                id: 'settings.remaining.modelText23',
                                defaultMessage: ' (no vision)',
                              })
                            : '')
                    }
                    // The judge, unset, follows the CONVERSATION's model, not the instance
                    // default — naming the default here would be wrong whenever they differ.
                    defaultModelId={k === 'approval' ? undefined : defaultModel}
                    annotate={
                      vision
                        ? (m) =>
                            m.vision === false
                              ? formatMessage({
                                  id: 'settings.remaining.modelText24',
                                  defaultMessage: '— no vision',
                                })
                              : undefined
                        : undefined
                    }
                    onChange={(next) => set(k, next)}
                  />
                  {bad ? (
                    <span
                      className="rd-help"
                      style={{
                        color: 'var(--warn)',
                        display: 'block',
                        marginTop: 5,
                        lineHeight: 1.5,
                      }}
                    >
                      {formatMessage(
                        {
                          id: 'settings.remaining.modelBlindWarning',
                          defaultMessage:
                            '{model} is text-only — pick a vision model or this task will fail.',
                        },
                        { model: resolved(k) },
                      )}
                    </span>
                  ) : null}
                </Field>
              )
            })}
          </div>
        </Fragment>
      ))}
    </Panel>
  )
}

// ── preferred models ─────────────────────────────────────────────────────────
// A draft + explicit Save, NOT eager per-click saving: the shortlist is edited a few
// models at a time, and PUTting on every tick would fire a toast per click.
export function PreferredModels({
  models,
  saved,
  onSave,
}: {
  models: ModelOption[]
  saved: string[]
  onSave: (next: string[]) => void
}) {
  const { formatMessage } = useAppIntl()
  const [sel, setSel] = useState<string[]>(saved)
  const dirty = sel.length !== saved.length || saved.some((r) => !sel.includes(r))

  // The saved list arrives async, so seeding useState once would leave the chips empty on a
  // cold load. Re-sync whenever the SAVED list changes identity (a fetch landing, or our own
  // save round-tripping) — never on every keystroke, so an in-progress edit is not clobbered.
  const savedKey = saved.join('\u0000')
  useEffect(() => {
    setSel(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey])

  return (
    <>
      <span className="rd-help">
        {formatMessage({
          id: 'settings.remaining.modelPreferredHelp',
          defaultMessage:
            'Your picks become a “Preferred” group at the top of every model picker. Leave empty to show the full list.',
        })}
      </span>
      <ModelPicker
        multiple
        label={formatMessage({
          id: 'settings.remaining.modelAttr16',
          defaultMessage: 'Preferred models',
        })}
        models={models}
        value={sel}
        emptyHint={
          <span className="rd-help">
            {formatMessage({
              id: 'settings.remaining.modelPreferredEmpty',
              defaultMessage: 'Nothing picked — every available model shows in the picker.',
            })}
          </span>
        }
        onChange={setSel}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Btn size="xs" variant="primary" disabled={!dirty} onClick={() => onSave(sel)}>
          {formatMessage({
            id: 'settings.remaining.modelUi4',
            defaultMessage: 'Save preferred models',
          })}
        </Btn>
        {dirty ? (
          <span className="rd-help">
            {formatMessage({ id: 'settings.remaining.modelUi5', defaultMessage: 'Unsaved' })}
          </span>
        ) : null}
      </div>
    </>
  )
}

// ── the section ──────────────────────────────────────────────────────────────
export function ModelSection({ toast, gatewayMode = false, openSection }: SectionProps) {
  const { formatMessage } = useAppIntl()
  const intl = useAppIntl()
  const [subscriptionKeys, setSubscriptionKeys] = useState<string[]>([])
  const providers = useCachedFetchState<ProvidersResponse>(
    '/api/model-config/providers',
    async () => {
      const data = await getJson<ProvidersResponse>('/api/model-config/providers')
      const missing = data.catalog
        .filter(
          (entry) =>
            (entry.key === 'claude_cli' || entry.key === 'codex_cli') &&
            !data.configured_providers[entry.key] &&
            !data.detected_clis[entry.key],
        )
        .map((entry) => entry.key)
      // Keep the sign-in instructions mounted after the binary is detected.
      setSubscriptionKeys((previous) => {
        const added = missing.filter((key) => !previous.includes(key))
        return added.length ? [...previous, ...added] : previous
      })
      return data
    },
    { staleTime: 0 },
  )
  const modelConfig = useCachedFetchState<ModelConfigPublic>(
    '/api/model-config',
    () => getJson<ModelConfigPublic>('/api/model-config'),
    { staleTime: 0 },
  )
  const preferred = useCachedFetchState<PreferredModelsConfig>(
    '/api/preferred-models',
    () => getJson<PreferredModelsConfig>('/api/preferred-models'),
    { staleTime: 0 },
  )
  const { models } = useModels(true)
  useSectionBusy(
    (providers.initialLoading && !providers.data) ||
      (modelConfig.initialLoading && !modelConfig.data) ||
      (preferred.initialLoading && !preferred.data),
  )

  const [editor, setEditor] = useState<{ mode: 'add' | 'edit'; key?: string } | null>(null)

  const terminal =
    gatewayMode && openSection ? { onOpen: () => openSection('terminal') } : undefined
  const catalog = (providers.data?.catalog ?? []).filter(
    (entry) => !gatewayMode || !isLocalOnlyProvider(entry),
  )
  const configured = providers.data?.configured_providers ?? {}
  const detected = providers.data?.detected_clis ?? {}
  const detectedPaths = providers.data?.detected_cli_paths ?? {}
  const refreshProviders = providers.refresh
  const refreshCliDetection = useCallback(async () => {
    const previous = getCachedQueryData<ProvidersResponse>('/api/model-config/providers')
    const next = await refreshProviders()
    const keys = new Set([
      ...Object.keys(previous?.detected_clis ?? {}),
      ...Object.keys(previous?.detected_cli_paths ?? {}),
      ...Object.keys(next.detected_clis ?? {}),
      ...Object.keys(next.detected_cli_paths ?? {}),
    ])
    if (
      previous &&
      [...keys].some(
        (key) =>
          Boolean(previous.detected_clis?.[key]) !== Boolean(next.detected_clis?.[key]) ||
          (previous.detected_cli_paths?.[key] || '') !== (next.detected_cli_paths?.[key] || ''),
      )
    )
      window.dispatchEvent(new Event(MODEL_CONFIG_CHANGED_EVENT))
    return next
  }, [refreshProviders])
  const { check: checkCliInstallations, error: cliDetectionError } = useCliDetectionPoll(
    refreshCliDetection,
    Boolean(providers.data),
  )
  const subscriptions = catalog.filter(
    (entry) =>
      (entry.key === 'claude_cli' || entry.key === 'codex_cli') &&
      !configured[entry.key] &&
      (subscriptionKeys.includes(entry.key) || !detected[entry.key]),
  )

  // The instance default is stored as a TRANSPORT, so map it back to the catalog key whose
  // transport + base_url match — that is the row whose radio should read as selected.
  // The default is stored as "<provider_key>:<model_id>", so its provider is the prefix.
  // This used to re-derive the key by matching transport + base_url back against the
  // catalogue — a guess that could land on the wrong entry.
  const defaultModelRef = modelConfig.data?.default_model || ''
  const defaultKey = defaultModelRef.split(':')[0] || ''

  // only what's actually set up — the default first.
  // A local CLI enrols by DETECTION, not by stored credentials (it has no api_key or URL to
  // store), so it never appears in `configured`. Filtering on that alone showed "No providers
  // yet" on a machine where the Claude Code CLI was installed, selected as the default model,
  // and already supplying every model picker — see the endpoint's own note about the row
  // "having nothing true to say about itself".
  const rows = catalog
    .filter(
      (e) =>
        (configured[e.key] || detected[e.key]) &&
        !subscriptions.some((subscription) => subscription.key === e.key),
    )
    .sort((a, b) => (a.key === defaultKey ? -1 : b.key === defaultKey ? 1 : 0))
  // Split by the switch. Eleven rows in one run interleaved live providers with switched-off
  // ones, so "what is actually on?" took a scan of every toggle.
  const [showDisabled, setShowDisabled] = useState(false)
  // A detected-only CLI has no stored row, so `configured[key]` is undefined — it is enabled
  // by virtue of being installed. `?.enabled !== false` already reads that correctly.
  const enabledRows = rows.filter((e) => configured[e.key]?.enabled !== false)
  const disabledRows = rows.filter((e) => configured[e.key]?.enabled === false)
  const takenKeys = Object.keys(configured)
  const defaultModel = modelConfig.data?.model || ''

  function announceModelConfigChanged() {
    window.dispatchEvent(new Event(MODEL_CONFIG_CHANGED_EVENT))
  }

  async function putProvider(key: string, body: Record<string, unknown>, message: string) {
    try {
      const r = await authFetch(`/api/model-config/providers/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const b = (await r.json().catch(() => null)) as { detail?: string } | null
        toast(
          modelError(
            b,
            formatMessage(
              {
                id: 'settings.remaining.modelSaveHttp',
                defaultMessage: 'Could not save (HTTP {status})',
              },
              { status: r.status },
            ),
            intl,
          ),
        )
        return
      }
      void providers.refresh()
      announceModelConfigChanged()
      toast(message)
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.modelText5',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  // DELETE /providers/{key}, not the sibling /providers/{key}/key — that one drops only the
  // API key and keeps `enabled: false`, so the provider never left the list however many
  // times you pressed Remove. (Removing only the key is `/key`, which nothing here calls.)
  async function removeProvider(key: string) {
    try {
      const r = await authFetch(`/api/model-config/providers/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      })
      if (!r.ok) {
        const b = (await r.json().catch(() => null)) as { detail?: string } | null
        toast(
          modelError(
            b,
            formatMessage(
              {
                id: 'settings.remaining.modelRemoveHttp',
                defaultMessage: 'Could not remove (HTTP {status})',
              },
              { status: r.status },
            ),
            intl,
          ),
        )
        return
      }
      void providers.refresh()
      announceModelConfigChanged()
      toast(
        formatMessage({ id: 'settings.remaining.modelText25', defaultMessage: 'Provider removed' }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.modelText5',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function putDefaultModel(ref: string) {
    try {
      const r = await authFetch('/api/model-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_model: ref }),
      })
      if (!r.ok) {
        const b = (await r.json().catch(() => null)) as { detail?: string } | null
        toast(
          modelError(
            b,
            formatMessage(
              {
                id: 'settings.remaining.modelDefaultHttp',
                defaultMessage: 'Could not set the default model (HTTP {status})',
              },
              { status: r.status },
            ),
            intl,
          ),
        )
        return
      }
      void modelConfig.refresh()
      announceModelConfigChanged()
      toast(
        formatMessage({
          id: 'settings.remaining.modelText26',
          defaultMessage: 'Default model set',
        }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.modelText5',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function putPreferred(models: string[], message: string) {
    try {
      const r = await authFetch('/api/preferred-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models }),
      })
      if (!r.ok) {
        toast(
          formatMessage(
            {
              id: 'settings.remaining.modelSaveHttp',
              defaultMessage: 'Could not save (HTTP {status})',
            },
            { status: r.status },
          ),
        )
        return
      }
      void preferred.refresh()
      // The shortlist drives the "Preferred" group in EVERY picker, and `preferred` is a
      // flag the backend stamps onto GET /api/models — which useModels caches at module
      // level. Without this the chat panel, the dock, the task-model rows and the
      // Automation editor all kept the old group until a full page reload.
      announceModelConfigChanged()
      toast(message)
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.modelText5',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function putTaskModels(next: Record<string, string | null>) {
    // The endpoint takes the WHOLE map; an omitted task would silently keep its old pin.
    const full: Record<string, string | null> = {}
    for (const [k] of TASK_ROWS) full[k] = next[k] || null
    try {
      const r = await authFetch('/api/model-config/task-models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(full),
      })
      if (!r.ok) {
        const b = (await r.json().catch(() => null)) as { detail?: string } | null
        toast(
          modelError(
            b,
            formatMessage(
              {
                id: 'settings.remaining.modelSaveHttp',
                defaultMessage: 'Could not save (HTTP {status})',
              },
              { status: r.status },
            ),
            intl,
          ),
        )
        return
      }
      void modelConfig.refresh()
      announceModelConfigChanged()
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.modelText5',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  return (
    <>
      <Panel
        title={formatMessage({
          id: 'settings.remaining.modelAttr17',
          defaultMessage: 'AI providers',
        })}
        sub={formatMessage({
          id: 'settings.remaining.modelAttr18',
          defaultMessage: 'Credentials and endpoints, and the model Lucius runs by default',
        })}
        actions={
          <Btn size="xs" onClick={() => setEditor({ mode: 'add' })}>
            <Plus size={12} aria-hidden="true" />{' '}
            {formatMessage({
              id: 'settings.remaining.modelAddButton',
              defaultMessage: 'Add provider',
            })}
          </Btn>
        }
      >
        {rows.length ? (
          <div
            className="rd-provlist"
            role="radiogroup"
            aria-label={formatMessage({
              id: 'settings.remaining.modelAttr19',
              defaultMessage: 'Default provider',
            })}
          >
            {(() => {
              const row = (entry: (typeof rows)[number]) => (
                <ProviderRow
                  key={entry.key}
                  entry={entry}
                  cfg={configured[entry.key] ?? DETECTED_CLI_CFG}
                  isDefault={defaultKey === entry.key}
                  detected={Boolean(detected[entry.key])}
                  detectedPath={detectedPaths[entry.key] || ''}
                  toast={toast}
                  onEdit={(k) => setEditor({ mode: 'edit', key: k })}
                  onToggle={(k, v) =>
                    void putProvider(
                      k,
                      { enabled: v },
                      v
                        ? formatMessage({
                            id: 'settings.remaining.modelText27',
                            defaultMessage: 'Enabled',
                          })
                        : formatMessage({
                            id: 'settings.remaining.modelText28',
                            defaultMessage: 'Disabled',
                          }),
                    )
                  }
                />
              )
              return (
                <>
                  {/* The enabled group carries a heading only when there is a disabled group to
                      distinguish it from — otherwise it labels the entire list and says nothing. */}
                  {enabledRows.length && disabledRows.length ? (
                    <div className="rd-provgroup">
                      {formatMessage({
                        id: 'settings.remaining.modelEnabledGroup',
                        defaultMessage: 'Enabled',
                      })}
                      <span>{enabledRows.length}</span>
                    </div>
                  ) : null}
                  {enabledRows.map(row)}
                  {disabledRows.length ? (
                    <>
                      {/* Collapsed by default: switched-off providers are the part you are NOT
                          working with, and they outnumbered the live ones here. */}
                      <button
                        type="button"
                        className="rd-provgroup rd-provgroup--toggle"
                        aria-expanded={showDisabled}
                        onClick={() => setShowDisabled((v) => !v)}
                      >
                        <ChevronRight
                          size={11}
                          strokeWidth={2.6}
                          aria-hidden="true"
                          style={{
                            transform: showDisabled ? 'rotate(90deg)' : 'none',
                            transition: 'transform .15s ease',
                          }}
                        />
                        {formatMessage({
                          id: 'settings.remaining.modelDisabledGroup',
                          defaultMessage: 'Disabled',
                        })}
                        <span>{disabledRows.length}</span>
                      </button>
                      {showDisabled ? disabledRows.map(row) : null}
                    </>
                  ) : null}
                </>
              )
            })()}
          </div>
        ) : (
          <Empty
            title={formatMessage({
              id: 'settings.remaining.modelAttr20',
              defaultMessage: 'No providers yet',
            })}
            body={formatMessage({
              id: 'settings.remaining.modelAttr21',
              defaultMessage: 'Add one to give Lucius a model to think with.',
            })}
          />
        )}
        {subscriptions.length > 0 && (
          <div
            role="group"
            aria-label={formatMessage({
              id: 'settings.remaining.modelAttr22',
              defaultMessage: 'Connect a subscription',
            })}
          >
            <div className="rd-provgroup">
              {formatMessage({
                id: 'settings.remaining.modelUi6',
                defaultMessage: 'Connect a subscription',
              })}
            </div>
            <div className="rd-provlist">
              {subscriptions.map((entry) => (
                <ProviderRow
                  key={entry.key}
                  entry={entry}
                  cfg={DETECTED_CLI_CFG}
                  isDefault={defaultKey === entry.key}
                  detected={Boolean(detected[entry.key])}
                  detectedPath={detectedPaths[entry.key] || ''}
                  toast={toast}
                  onEdit={(key) => setEditor({ mode: 'edit', key })}
                  onToggle={(key, enabled) =>
                    void putProvider(
                      key,
                      { enabled },
                      enabled
                        ? formatMessage({
                            id: 'settings.remaining.modelText27',
                            defaultMessage: 'Enabled',
                          })
                        : formatMessage({
                            id: 'settings.remaining.modelText28',
                            defaultMessage: 'Disabled',
                          }),
                    )
                  }
                  subscription={{
                    platform: providers.data?.cli_host_platform,
                    onCheck: checkCliInstallations,
                    terminal,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {gatewayMode && (
          <div className="rd-help" role="note">
            {formatMessage({
              id: 'settings.remaining.modelLocalOnly',
              defaultMessage:
                "Local models (Ollama, LM Studio) aren't offered here: this app runs on your Private Cloud server, which can't reach a model running on your own computer.",
            })}
          </div>
        )}
        {cliDetectionError && (
          <div className="rd-help" role="status">
            {formatMessage({
              id: 'settings.remaining.modelCliDetectionError',
              defaultMessage: 'Could not check installations. Check again.',
            })}
          </div>
        )}
        <Field
          label={formatMessage({
            id: 'settings.remaining.modelAttr10',
            defaultMessage: 'Default model',
          })}
          help={formatMessage({
            id: 'settings.remaining.modelAttr23',
            defaultMessage: 'What Lucius runs unless a chat or automation picks something else',
          })}
        >
          <ModelPicker
            label={formatMessage({
              id: 'settings.remaining.modelAttr10',
              defaultMessage: 'Default model',
            })}
            models={models}
            value={defaultModelRef}
            annotate={(m) => {
              const note = cliDefaultNote(m, providers.data?.cli_default_models)
              return !note
                ? undefined
                : m.provider_key === 'claude_cli'
                  ? formatMessage({
                      id: 'settings.remaining.modelClaudeDefault',
                      defaultMessage: 'Claude Code default',
                    })
                  : formatMessage({
                      id: 'settings.remaining.modelCodexDefault',
                      defaultMessage: 'Default in Codex',
                    })
            }}
            onChange={(next) => void putDefaultModel(next)}
          />
        </Field>
      </Panel>

      <Panel
        title={formatMessage({
          id: 'settings.remaining.modelAttr24',
          defaultMessage: 'Preferred models',
        })}
        sub={formatMessage({
          id: 'settings.remaining.modelAttr25',
          defaultMessage:
            'Your shortlist — pinned to the top of every model picker so the ones you actually use are one click away',
        })}
      >
        <PreferredModels
          models={models}
          saved={preferred.data?.models ?? []}
          onSave={(next) =>
            void putPreferred(
              next,
              formatMessage({
                id: 'settings.remaining.modelText29',
                defaultMessage: 'Preferred models saved',
              }),
            )
          }
        />
      </Panel>

      <TaskModels
        toast={toast}
        defaultModel={defaultModel}
        models={models}
        taskModels={modelConfig.data?.task_models ?? {}}
        onSave={(next) => void putTaskModels(next)}
      />

      <TurnTimeLimitPanel toast={toast} />

      {editor && catalog.length > 0 && (
        <ProviderModal
          mode={editor.mode}
          editKey={editor.key}
          cfg={editor.key ? configured[editor.key] : undefined}
          catalog={catalog}
          models={models}
          cliPlatform={providers.data?.cli_host_platform}
          detectedClis={detected}
          onCheckCli={checkCliInstallations}
          terminal={terminal}
          taken={takenKeys}
          isDefault={editor.key === defaultKey}
          toast={toast}
          onClose={() => setEditor(null)}
          onSave={(key, patch) => {
            const entry = catalog.find((e) => e.key === key)
            const body: Record<string, unknown> = { enabled: true }
            if (entry?.cli_binary) body.base_url = patch.bin
            else body.base_url = patch.url
            if (patch.model) body.model = patch.model
            if (patch.key) body.api_key = patch.key
            void putProvider(
              key,
              body,
              configured[key]
                ? formatMessage({
                    id: 'settings.remaining.modelText30',
                    defaultMessage: 'Provider updated',
                  })
                : formatMessage({
                    id: 'settings.remaining.modelText31',
                    defaultMessage: 'Provider added',
                  }),
            )
          }}
          onRemove={(key) => void removeProvider(key)}
        />
      )}
    </>
  )
}
