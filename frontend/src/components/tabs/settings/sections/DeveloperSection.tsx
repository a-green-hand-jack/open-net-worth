// Settings → Developer. Ported from the DeveloperSection in
// design_handoffs/settings_handoff/prototype/redesign/settings.jsx. Connecting other AI apps
// (Settings → MCP) and iPhone Shortcuts are everyday features with their own sections.
// Experimental (feature flags) is generated from the backend registry — ExperimentalPanel.
import { useState } from 'react'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { authFetch } from '../../../../api/client'
import { useCachedFetchState } from '../../../../state/queryCache'
import { Zap } from '../../../../ui/icons'
import { ExperimentalPanel } from '../ExperimentalPanel'
import { SqlAccessPanel } from '../SqlAccessPanel'
import { Btn, Panel, Select, Toggle, row, useSectionBusy } from '../ds'
import type { SectionProps } from '../ds'

interface ExtensionRow {
  id: string
  name: string
  version: string
  type: string
  source: string
  domain?: string | null
  description?: string | null
  enabled: boolean
}

async function getJson<T>(path: string): Promise<T> {
  const r = await authFetch(path)
  if (!r.ok) throw new Error(String(r.status))
  return r.json() as Promise<T>
}

export function LogViewer({ toast }: SectionProps) {
  const { formatMessage } = useAppIntl()
  const [level, setLevel] = useState('INFO')
  const [q, setQ] = useState('')
  const key = `/api/logs?lines=500&level=${level}&q=${encodeURIComponent(q)}`
  const { data, refresh } = useCachedFetchState<{ lines: string[] }>(
    key,
    () => getJson<{ lines: string[] }>(key),
    { staleTime: 5_000 },
  )

  return (
    <Panel
      title={formatMessage({
        id: 'settings.remaining.devLogs',
        defaultMessage: 'Application logs',
      })}
      sub={formatMessage({
        id: 'settings.remaining.devLogsHelp',
        defaultMessage: 'Tail of the server log — filter and search live',
      })}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <Select
          value={level}
          style={{ width: 110 }}
          aria-label={formatMessage({
            id: 'settings.remaining.devLogLevel',
            defaultMessage: 'Log level',
          })}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="DEBUG">
            {formatMessage({ id: 'settings.remaining.devLogDebug', defaultMessage: 'debug' })}
          </option>
          <option value="INFO">
            {formatMessage({ id: 'settings.remaining.devLogInfo', defaultMessage: 'info' })}
          </option>
          <option value="WARNING">
            {formatMessage({ id: 'settings.remaining.devLogWarning', defaultMessage: 'warn' })}
          </option>
          <option value="ERROR">
            {formatMessage({ id: 'settings.remaining.devLogError', defaultMessage: 'error' })}
          </option>
        </Select>
        <input
          className="rd-input"
          placeholder={formatMessage({
            id: 'settings.remaining.devLogSearchPlaceholder',
            defaultMessage: 'Search log lines…',
          })}
          style={{ maxWidth: 240 }}
          aria-label={formatMessage({
            id: 'settings.remaining.devLogSearch',
            defaultMessage: 'Search logs',
          })}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Btn
          size="xs"
          onClick={() => {
            void refresh()
            toast(
              formatMessage({
                id: 'settings.remaining.devLogRefreshed',
                defaultMessage: 'Refreshed',
              }),
            )
          }}
        >
          {formatMessage({ id: 'settings.remaining.devRefresh', defaultMessage: 'Refresh' })}
        </Btn>
      </div>
      {/* Server logs carry email addresses, account names and other PII (see
          backend/api/logs.py) — never into the screen snapshot. */}
      <div className="rd-code" style={{ height: 340, overflowY: 'auto' }} data-ctx-secret="">
        {(data?.lines ?? []).join('\n') ||
          formatMessage({
            id: 'settings.remaining.devNoLogs',
            defaultMessage: 'No matching log lines.',
          })}
      </div>
    </Panel>
  )
}

function CodeExecution({ toast }: SectionProps) {
  const { formatMessage } = useAppIntl()
  const { data, initialLoading, refresh } = useCachedFetchState<{
    enabled: boolean
    auto_run: boolean
  }>(
    '/api/config/code-execution',
    () => getJson<{ enabled: boolean; auto_run: boolean }>('/api/config/code-execution'),
    { staleTime: 0 },
  )
  useSectionBusy(initialLoading && !data)
  const codeExec = data?.enabled ?? false
  const autoRun = data?.auto_run ?? false

  async function patch(next: { enabled?: boolean; auto_run?: boolean }, message: string) {
    try {
      const r = await authFetch('/api/config/code-execution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // Only what changed — see SecuritySection for why the spread was a race. The one
        // case that genuinely needs both fields is the force-clear, and it passes both.
        body: JSON.stringify(next),
      })
      if (!r.ok) {
        toast(
          formatMessage(
            {
              id: 'settings.remaining.devHttpError',
              defaultMessage: 'Could not save (HTTP {status})',
            },
            { status: r.status },
          ),
        )
        return
      }
      void refresh()
      toast(message)
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.devNetworkError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  return (
    <Panel
      title={formatMessage({
        id: 'settings.remaining.devCodeExecution',
        defaultMessage: 'Code execution',
      })}
      sub={formatMessage({
        id: 'settings.remaining.devCodeSub',
        defaultMessage: 'Lucius can write & run short Python on this server',
      })}
    >
      <span className="rd-help" style={{ display: 'block', lineHeight: 1.55 }}>
        {formatMessage({
          id: 'settings.remaining.devCodeLegacyExplanation',
          defaultMessage:
            'When on, Lucius can write a small script during a chat and run it in an isolated subprocess to do a calculation. The sandbox scrubs secrets from the environment, enforces CPU/memory/file limits, and the script sees only the JSON data Lucius passes it — it cannot read or write your ledger or accounts, and has no network. Ad-hoc code runs only in interactive chat, never from a scheduled task or an MCP client.',
        })}
      </span>
      {row(
        formatMessage({
          id: 'settings.remaining.devCodeExecution',
          defaultMessage: 'Code execution',
        }),
        codeExec
          ? formatMessage({
              id: 'settings.remaining.devFirstPermission',
              defaultMessage:
                "You'll be asked for permission the first time Lucius runs code in each conversation.",
            })
          : formatMessage({
              id: 'settings.remaining.devCodeOff',
              defaultMessage: "Lucius's run_code is blocked. This is the safe default.",
            }),
        <Toggle
          on={codeExec}
          disabled={!data}
          onChange={(v) =>
            // The parent force-clears the child: leaving auto_run set while the feature is off
            // would silently re-arm "always allow" the moment it is switched back on.
            void patch(
              v ? { enabled: true } : { enabled: false, auto_run: false },
              v
                ? formatMessage({
                    id: 'settings.remaining.devCodeEnabled',
                    defaultMessage: 'Code execution enabled',
                  })
                : formatMessage({
                    id: 'settings.remaining.devCodeBlocked',
                    defaultMessage: 'Code execution blocked',
                  }),
            )
          }
          label={formatMessage({
            id: 'settings.remaining.devCodeExecution',
            defaultMessage: 'Code execution',
          })}
        />,
      )}
      {codeExec
        ? row(
            formatMessage({
              id: 'settings.remaining.devAlwaysAllow',
              defaultMessage: 'Always allow (skip the per-run prompt)',
            }),
            autoRun
              ? formatMessage({
                  id: 'settings.remaining.devAutoOn',
                  defaultMessage:
                    'Lucius runs code without asking, in every conversation. Turn this off to be prompted — and shown the code — each conversation.',
                })
              : formatMessage({
                  id: 'settings.remaining.devAutoOff',
                  defaultMessage:
                    "You'll be asked for permission and shown the code the first time Lucius runs it in a conversation.",
                }),
            <Toggle
              on={autoRun}
              onChange={(v) =>
                void patch(
                  { auto_run: v },
                  v
                    ? formatMessage({
                        id: 'settings.remaining.devAutoEnabled',
                        defaultMessage: 'Always allowing',
                      })
                    : formatMessage({
                        id: 'settings.remaining.devAutoDisabled',
                        defaultMessage: 'Prompting per conversation',
                      }),
                )
              }
              label={formatMessage({
                id: 'settings.remaining.devAllow',
                defaultMessage: 'Always allow',
              })}
            />,
          )
        : null}
    </Panel>
  )
}

export function Extensions({ toast }: SectionProps) {
  const { formatMessage } = useAppIntl()
  const { data, initialLoading, refresh } = useCachedFetchState<ExtensionRow[]>(
    '/api/extensions',
    () => getJson<ExtensionRow[]>('/api/extensions'),
    { staleTime: 0 },
  )
  useSectionBusy(initialLoading && !data)
  const rows = data ?? []

  async function toggle(x: ExtensionRow, enabled: boolean) {
    try {
      const r = await authFetch(
        `/api/extensions/${encodeURIComponent(x.type)}/${encodeURIComponent(x.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled }),
        },
      )
      if (!r.ok) {
        toast(
          formatMessage(
            {
              id: 'settings.remaining.devHttpError',
              defaultMessage: 'Could not save (HTTP {status})',
            },
            { status: r.status },
          ),
        )
        return
      }
      void refresh()
      toast(
        enabled
          ? formatMessage({ id: 'settings.remaining.devEnabled', defaultMessage: 'Enabled' })
          : formatMessage({
              id: 'settings.remaining.devDisabled',
              defaultMessage: 'Disabled — it is no longer consulted',
            }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.devNetworkError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function uninstall(x: ExtensionRow) {
    try {
      const r = await authFetch(
        `/api/extensions/${encodeURIComponent(x.type)}/${encodeURIComponent(x.id)}`,
        {
          method: 'DELETE',
        },
      )
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { detail?: string } | null
        toast(
          body?.detail ||
            formatMessage(
              {
                id: 'settings.remaining.devUninstallHttp',
                defaultMessage: 'Could not uninstall (HTTP {status})',
              },
              { status: r.status },
            ),
        )
        return
      }
      void refresh()
      toast(
        formatMessage({ id: 'settings.remaining.devUninstalled', defaultMessage: 'Uninstalled' }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.devNetworkError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  return (
    <Panel
      title={formatMessage({
        id: 'settings.remaining.devExtensions',
        defaultMessage: 'Extensions',
      })}
      sub={formatMessage({
        id: 'settings.remaining.devExtensionsHelp',
        defaultMessage: 'Installed instance extensions — each declares its permissions up front',
      })}
      flush
    >
      {rows.length ? (
        rows.map((x) => (
          <div className="rd-row" key={x.type + '/' + x.id}>
            <span className="rd-row-ic">
              <Zap size={13} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div className="rd-row-main">
              <div className="rd-row-title">
                {x.name}{' '}
                <span className="rd-faint" style={{ fontWeight: 500, fontSize: 11 }}>
                  v{x.version}
                </span>
              </div>
              <div className="rd-row-meta">
                <span>{x.description || x.type}</span>
                {x.source === 'shipped' ? (
                  <span>
                    {formatMessage({
                      id: 'settings.remaining.devBundled',
                      defaultMessage: 'Bundled',
                    })}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="rd-row-actions" style={{ opacity: 1, pointerEvents: 'auto' }}>
              <Toggle
                on={x.enabled}
                onChange={(v) => void toggle(x, v)}
                label={formatMessage(
                  { id: 'settings.remaining.devEnableName', defaultMessage: 'Enable {name}' },
                  { name: x.name },
                )}
              />
              {x.source === 'shipped' ? null : (
                <Btn size="xs" variant="ghost" onClick={() => void uninstall(x)}>
                  {formatMessage({
                    id: 'settings.remaining.devUninstall',
                    defaultMessage: 'Uninstall',
                  })}
                </Btn>
              )}
            </div>
          </div>
        ))
      ) : (
        <div style={{ padding: '14px 18px' }}>
          <span className="rd-help">
            {formatMessage({
              id: 'settings.remaining.devNoExtensions',
              defaultMessage:
                'Nothing installed — extension packs you install will be listed here.',
            })}
          </span>
        </div>
      )}
    </Panel>
  )
}

function ScriptSkills({ toast }: SectionProps) {
  const { formatMessage } = useAppIntl()
  const kill = useCachedFetchState<{ enabled: boolean }>(
    '/api/config/script-skills',
    () => getJson<{ enabled: boolean }>('/api/config/script-skills'),
    { staleTime: 0 },
  )
  const unattended = useCachedFetchState<{ enabled: boolean }>(
    '/api/config/script-skills-unattended',
    () => getJson<{ enabled: boolean }>('/api/config/script-skills-unattended'),
    { staleTime: 0 },
  )
  useSectionBusy(
    (kill.initialLoading && !kill.data) || (unattended.initialLoading && !unattended.data),
  )
  const scripts = kill.data?.enabled ?? false
  const unattendedOn = unattended.data?.enabled ?? false

  async function put(path: string, enabled: boolean) {
    const r = await authFetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    if (!r.ok) throw new Error(String(r.status))
  }

  return (
    <Panel
      title={formatMessage({
        id: 'settings.remaining.devScripts',
        defaultMessage: 'Bundled script skills',
      })}
      sub={formatMessage({
        id: 'settings.remaining.devScriptSwitches',
        defaultMessage: 'Two independent switches — permissions sit on the caller, not the skill',
      })}
    >
      {row(
        formatMessage({
          id: 'settings.remaining.devScripts',
          defaultMessage: 'Bundled script skills',
        }),
        formatMessage({
          id: 'settings.remaining.devScriptOldHelp',
          defaultMessage:
            'The instance kill switch. When off, no script-bearing skill can run its Python, whatever else is set. Interactive chat turns only need this switch.',
        }),
        <Toggle
          on={scripts}
          disabled={!kill.data}
          onChange={(v) => {
            void (async () => {
              try {
                await put('/api/config/script-skills', v)
                // Force-clear the child so turning the kill switch back on never silently
                // re-arms unattended runs.
                if (!v && unattendedOn) await put('/api/config/script-skills-unattended', false)
                void kill.refresh()
                void unattended.refresh()
                toast(
                  v
                    ? formatMessage({
                        id: 'settings.remaining.devScriptsEnabled',
                        defaultMessage: 'Script skills enabled',
                      })
                    : formatMessage({
                        id: 'settings.remaining.devScriptsBlocked',
                        defaultMessage: 'Script skills blocked',
                      }),
                )
              } catch {
                toast(
                  formatMessage({
                    id: 'settings.remaining.devSaveError',
                    defaultMessage: 'Could not save — try again',
                  }),
                )
              }
            })()
          }}
          label={formatMessage({
            id: 'settings.remaining.devScripts',
            defaultMessage: 'Bundled script skills',
          })}
        />,
      )}
      {row(
        formatMessage({
          id: 'settings.remaining.devUnattended',
          defaultMessage: 'Unattended script runs',
        }),
        scripts
          ? formatMessage({
              id: 'settings.remaining.devUnattendedHelp',
              defaultMessage:
                'Lets scheduled, headless runs execute script-bearing skills. Off by default — interactive chat turns are unaffected either way.',
            })
          : formatMessage({
              id: 'settings.remaining.devEnableFirst',
              defaultMessage: 'Enable the kill switch above first.',
            }),
        <Toggle
          on={unattendedOn}
          disabled={!scripts}
          onChange={(v) => {
            void (async () => {
              try {
                await put('/api/config/script-skills-unattended', v)
                void unattended.refresh()
                toast(
                  v
                    ? formatMessage({
                        id: 'settings.remaining.devUnattendedOn',
                        defaultMessage: 'Unattended runs allowed',
                      })
                    : formatMessage({
                        id: 'settings.remaining.devUnattendedOff',
                        defaultMessage: 'Unattended runs blocked',
                      }),
                )
              } catch {
                toast(
                  formatMessage({
                    id: 'settings.remaining.devSaveError',
                    defaultMessage: 'Could not save — try again',
                  }),
                )
              }
            })()
          }}
          label={formatMessage({
            id: 'settings.remaining.devUnattended',
            defaultMessage: 'Unattended script runs',
          })}
        />,
      )}
    </Panel>
  )
}

export function DeveloperSection({ toast }: SectionProps) {
  return (
    <>
      <ExperimentalPanel toast={toast} />
      <LogViewer toast={toast} />
      <CodeExecution toast={toast} />
      <SqlAccessPanel toast={toast} />
      <Extensions toast={toast} />
      <ScriptSkills toast={toast} />
    </>
  )
}
