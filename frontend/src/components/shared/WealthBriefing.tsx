import { useEffect, useRef, useState } from 'react'
import { useAppIntl } from '../../i18n/useAppIntl'
import { authFetch } from '../../api/client'
import { PROFILE_KEY, fetchJson } from '../../hooks/serverState'
import { fetchCachedQuery } from '../../state/queryCache'
import { fDateTime } from '../../utils/format'
import { briefingError } from './briefingMessages'
import { BRIEFING_REGENERATE_EVENT } from './briefingFocus'
import { Settings, RefreshCw, ChevronDown, ChevronUp } from '../../ui/icons'

interface BriefingData {
  note: string
  actions: string[]
  chat_suggestion: string
  generated_at: string
  is_cached: boolean
  // True when the backend generated a failure placeholder (AI unreachable / unparseable
  // reply). The `note` then carries a user-facing reason; render it as an error, not content.
  error?: boolean
  note_message?: unknown
}

interface BriefingPrefs {
  holdings_news: boolean
  fx: boolean
  spending: boolean
  accounts: boolean
  upcoming_actions: boolean
  custom_focus: string
}

const DEFAULT_PREFS: BriefingPrefs = {
  holdings_news: true,
  fx: true,
  spending: true,
  accounts: true,
  upcoming_actions: true,
  custom_focus: '',
}

interface Props {
  onChatSuggest?: (text: string) => void
  /** Embed inside a shell (Overview's WidgetShell) that already renders this
   * widget's own (possibly renamed) title: suppresses the ENTIRE internal
   * header row (Lucius label, date stamp, settings/refresh/collapse
   * buttons) and the card's own decorative border/background/accent-stripe,
   * so the design shows exactly ONE header + plain flowing content, not two
   * stacked header-looking bars. The settings/refresh controls this removes
   * have no other home yet when embedded — a real, accepted gap, not
   * silently dropped functionality nobody can reach any other way (the
   * underlying data still auto-refreshes on its own schedule). */
  hideTitle?: boolean
}

export function WealthBriefing({ onChatSuggest, hideTitle }: Props) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const SECTION_TOGGLES: { key: keyof BriefingPrefs; label: string; hint: string }[] = [
    {
      key: 'holdings_news',
      label: formatMessage({ id: 'shared.briefing.toggle0', defaultMessage: 'Holdings & news' }),
      hint: formatMessage({
        id: 'shared.briefing.toggle1',
        defaultMessage: 'News affecting the stocks/assets you hold',
      }),
    },
    {
      key: 'spending',
      label: formatMessage({ id: 'shared.briefing.toggle2', defaultMessage: 'Spending pulse' }),
      hint: formatMessage({
        id: 'shared.briefing.toggle3',
        defaultMessage: 'Over-budget, large charges, recently logged',
      }),
    },
    {
      key: 'accounts',
      label: formatMessage({ id: 'shared.briefing.toggle4', defaultMessage: 'Cash & debt' }),
      hint: formatMessage({
        id: 'shared.briefing.toggle5',
        defaultMessage: 'Account balances, card utilisation',
      }),
    },
    {
      key: 'fx',
      label: formatMessage({ id: 'shared.briefing.toggle6', defaultMessage: 'FX moves' }),
      hint: formatMessage({
        id: 'shared.briefing.toggle7',
        defaultMessage: 'Currency rates for your foreign holdings',
      }),
    },
    {
      key: 'upcoming_actions',
      label: formatMessage({ id: 'shared.briefing.toggle8', defaultMessage: 'Upcoming actions' }),
      hint: formatMessage({
        id: 'shared.briefing.toggle9',
        defaultMessage: 'Items due in the next two weeks',
      }),
    },
  ]

  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<unknown>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [prefs, setPrefs] = useState<BriefingPrefs>(DEFAULT_PREFS)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  const fetchBriefing = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    setErrorMessage(null)
    try {
      const res = await authFetch(forceRefresh ? '/api/briefing?refresh=true' : '/api/briefing')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: BriefingData = await res.json()
      // A generated failure (AI unreachable / unparseable reply) comes back 200 with
      // error:true and a reason in `note` — surface it via the error state (with retry)
      // rather than rendering it as briefing content.
      if (json.error) {
        setErrorMessage(json.note_message)
        setError(
          json.note ||
            formatMessage({
              id: 'shared.briefing.generateFailed',
              defaultMessage: 'Could not generate your briefing.',
            }),
        )
        setData(null)
      } else {
        setData(json)
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : formatMessage({ id: 'shared.briefing.loadFailed', defaultMessage: 'Failed to load' }),
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchPrefs = async () => {
    try {
      const p = await fetchCachedQuery<Record<string, unknown>>(PROFILE_KEY, () =>
        fetchJson<Record<string, unknown>>(PROFILE_KEY),
      ).catch(() => null)
      if (!p) return
      if (p.briefing_preferences) setPrefs({ ...DEFAULT_PREFS, ...p.briefing_preferences })
    } catch {
      /* keep defaults */
    }
  }

  useEffect(() => {
    fetchBriefing()
    fetchPrefs()
    // The widget editor saved a new standing instruction: rewrite the note with it.
    const regenerate = () => {
      void fetchBriefing(true)
      void fetchPrefs()
    }
    window.addEventListener(BRIEFING_REGENERATE_EVENT, regenerate)
    return () => window.removeEventListener(BRIEFING_REGENERATE_EVENT, regenerate)
  }, [])

  // Close the settings popover on outside click
  useEffect(() => {
    if (!settingsOpen) return
    const onClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [settingsOpen])

  const savePrefs = async (next: BriefingPrefs) => {
    setPrefs(next) // optimistic
    setSaving(true)
    try {
      await authFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ briefing_preferences: next }),
      })
      // Preferences changed → regenerate the note so it reflects the new sections
      await fetchBriefing(true)
    } catch {
      setErrorMessage(null)
      setError(
        formatMessage({
          id: 'shared.briefing.saveFailed',
          defaultMessage: 'Failed to save preferences',
        }),
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (key: keyof BriefingPrefs) => savePrefs({ ...prefs, [key]: !prefs[key] })

  const paragraphs = data?.note
    ? data.note
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : []

  return (
    <div className={`briefing-card${hideTitle ? ' briefing-card--embedded' : ''}`}>
      {!hideTitle && (
        <div className="briefing-header">
          <div className="briefing-header-left" onClick={() => setCollapsed((c) => !c)}>
            <span className="briefing-label">Lucius</span>
            {data && <span className="briefing-date">{fDateTime(data.generated_at)}</span>}
          </div>
          <div className="briefing-header-right">
            <div className="briefing-settings-wrap" ref={settingsRef}>
              <button
                className={`briefing-settings-btn${settingsOpen ? ' active' : ''}`}
                onClick={() => setSettingsOpen((o) => !o)}
                title={formatMessage({
                  id: 'shared.briefing.customise',
                  defaultMessage: 'Customise this briefing',
                })}
                aria-label={formatMessage({
                  id: 'shared.briefing.customise',
                  defaultMessage: 'Customise this briefing',
                })}
              >
                <Settings size={14} aria-hidden="true" />
              </button>
              {settingsOpen && (
                <div className="briefing-settings-pop">
                  <div className="briefing-settings-title">
                    {formatMessage({
                      id: 'shared.briefing.covers',
                      defaultMessage: 'What Lucius covers',
                    })}
                  </div>
                  <div className="briefing-settings-list">
                    {SECTION_TOGGLES.map(({ key, label, hint }) => (
                      <label className="briefing-toggle" key={key}>
                        <input
                          type="checkbox"
                          checked={Boolean(prefs[key])}
                          onChange={() => toggleSection(key)}
                          disabled={saving}
                        />
                        <span className="briefing-toggle-text">
                          <span className="briefing-toggle-label">{label}</span>
                          <span className="briefing-toggle-hint">{hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="briefing-settings-title">
                    {formatMessage({
                      id: 'shared.briefing.focus',
                      defaultMessage: 'Tell Lucius what to focus on',
                    })}
                  </div>
                  <textarea
                    className="briefing-focus-input"
                    placeholder={formatMessage({
                      id: 'shared.briefing.focusPlaceholder',
                      defaultMessage: 'e.g. Watch my ONWAI Inc exit timing; flag any big spending.',
                    })}
                    value={prefs.custom_focus}
                    onChange={(e) => setPrefs({ ...prefs, custom_focus: e.target.value })}
                    onBlur={() => savePrefs(prefs)}
                    rows={3}
                  />
                  <div className="briefing-settings-foot">
                    {saving
                      ? formatMessage({
                          id: 'shared.briefing.saving',
                          defaultMessage: 'Saving & regenerating…',
                        })
                      : formatMessage({
                          id: 'shared.briefing.saveHelp',
                          defaultMessage: 'Changes regenerate the note',
                        })}
                  </div>
                </div>
              )}
            </div>
            <button
              className="briefing-refresh-btn"
              onClick={() => fetchBriefing(true)}
              disabled={refreshing || loading}
              aria-label={
                refreshing
                  ? undefined
                  : formatMessage({
                      id: 'shared.briefing.refresh',
                      defaultMessage: 'Refresh briefing',
                    })
              }
            >
              {refreshing ? (
                formatMessage({ id: 'shared.briefing.generating', defaultMessage: 'Generating…' })
              ) : (
                <RefreshCw size={14} aria-hidden="true" />
              )}
            </button>
            <button
              className="briefing-collapse-btn"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={
                collapsed
                  ? formatMessage({
                      id: 'shared.briefing.expand',
                      defaultMessage: 'Expand briefing',
                    })
                  : formatMessage({
                      id: 'shared.briefing.collapse',
                      defaultMessage: 'Collapse briefing',
                    })
              }
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <ChevronDown size={14} aria-hidden="true" />
              ) : (
                <ChevronUp size={14} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="briefing-body">
          {loading && (
            <div className="briefing-loading">
              <div className="briefing-skeleton" style={{ width: '95%' }} />
              <div className="briefing-skeleton" style={{ width: '88%' }} />
              <div className="briefing-skeleton" style={{ width: '92%' }} />
              <div className="briefing-skeleton" style={{ width: '76%' }} />
              <p className="briefing-loading-label">
                {formatMessage({
                  id: 'shared.briefing.loading',
                  defaultMessage: 'Searching news and generating note…',
                })}
              </p>
            </div>
          )}

          {error && !loading && (
            <p className="briefing-error">
              {briefingError(error, errorMessage, intl)} •{' '}
              <button onClick={() => fetchBriefing()}>
                {formatMessage({ id: 'shared.briefing.retry', defaultMessage: 'retry' })}
              </button>
            </p>
          )}

          {data && !loading && (
            <>
              <div className="briefing-note">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {((data.actions?.length ?? 0) > 0 || data.chat_suggestion) && (
                <div className="briefing-chips">
                  {data.actions?.map((a, i) => (
                    <button
                      key={`a${i}`}
                      className="briefing-chip"
                      onClick={() =>
                        onChatSuggest?.(
                          `${data.note}\n\n${formatMessage({ id: 'shared.briefing.askPrompt', defaultMessage: 'Help me with this: {action}' }, { action: a })}`,
                        )
                      }
                      title={formatMessage({
                        id: 'shared.briefing.askHelp',
                        defaultMessage: 'Ask Lucius to help with this',
                      })}
                    >
                      {a}
                    </button>
                  ))}
                  {data.chat_suggestion && (
                    <button
                      className="briefing-chip"
                      onClick={() => onChatSuggest?.(`${data.note}\n\n${data.chat_suggestion}`)}
                    >
                      {data.chat_suggestion}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
