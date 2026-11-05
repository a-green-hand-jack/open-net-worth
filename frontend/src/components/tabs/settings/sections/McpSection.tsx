// Settings → MCP. This instance IS an MCP server: other AI apps (Claude Desktop, Cursor, VS
// Code, ChatGPT…) connect to it and use your book. The reverse — Lucius using someone else's
// server — lives in Connectors.
//
// Snippets come from mcpClients.ts (the one source), filled with this instance's real origin,
// its real API token on copy, and the launch command the server reports for this install.
import { useState } from 'react'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { authFetch } from '../../../../api/client'
import { useCachedFetchState } from '../../../../state/queryCache'
import { Btn, Panel, useSectionBusy } from '../ds'
import type { SectionProps } from '../ds'
import { FALLBACK_LAUNCH, MCP_CLIENTS, SOURCE_CWD_PLACEHOLDER } from './mcpClients'
import type { McpLaunch, StdioVariant } from './mcpClients'

/** What the rendered snippet shows in place of the real bearer. */
export const TOKEN_MASK = 'ONW_API_TOKEN_PASTED_ON_COPY'

const LOOPBACK = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/

async function getJson<T>(path: string): Promise<T> {
  const r = await authFetch(path)
  if (!r.ok) throw new Error(String(r.status))
  return r.json() as Promise<T>
}

export function McpSection({ toast, openSection }: SectionProps) {
  const { formatMessage } = useAppIntl()
  const [client, setClient] = useState('claude-desktop')
  const [variant, setVariant] = useState<StdioVariant>('installed')
  const { data: tokenData, initialLoading: loadingToken } = useCachedFetchState<{ token: string }>(
    '/api/auth/api-token',
    () => getJson<{ token: string }>('/api/auth/api-token'),
    { staleTime: 0 },
  )
  const { data: launchData, initialLoading: loadingLaunch } = useCachedFetchState<McpLaunch>(
    '/api/mcp/connect-info',
    () => getJson<McpLaunch>('/api/mcp/connect-info'),
    { staleTime: 0 },
  )
  useSectionBusy((loadingToken && !tokenData) || (loadingLaunch && !launchData))
  const launch = launchData ?? FALLBACK_LAUNCH
  const origin = window.location.origin
  const token = tokenData?.token || 'YOUR_API_TOKEN'
  const g = MCP_CLIENTS.find((c) => c.id === client) || MCP_CLIENTS[0]!
  const local = g.transport === 'local'
  const showVariants = local && !launch.desktop
  const ctx = { origin, launch, variant: showVariants ? variant : ('installed' as const) }
  // The DISPLAYED snippet masks the token; only the clipboard gets the real one. Rendering
  // a full-access bearer as page text put it in reach of the Lucius screen snapshot, which
  // walks visible text and ships it to the model provider and into the saved transcript.
  const snippet = g.snippet({ ...ctx, token: TOKEN_MASK })
  const copyable = g.snippet({ ...ctx, token })

  const guide = () => {
    switch (g.id) {
      case 'claude-desktop':
        return formatMessage({
          id: 'settings.remaining.mcpGuide0',
          defaultMessage:
            'In Claude Desktop: Settings → Developer → Edit Config opens claude_desktop_config.json. Paste this in, then restart Claude Desktop. Open Net Worth must be running.',
        })
      case 'cursor':
        return formatMessage({
          id: 'settings.remaining.mcpGuide1',
          defaultMessage:
            'Add to ~/.cursor/mcp.json (global) or .cursor/mcp.json (per-project). Cursor takes a stdio command OR a remote url.',
        })
      case 'vscode':
        return formatMessage({
          id: 'settings.remaining.mcpGuide2',
          defaultMessage:
            'Add to .vscode/mcp.json (workspace) or your user mcp.json. VS Code uses "servers" — not "mcpServers" — and needs a "type" field.',
        })
      case 'chatgpt':
        return formatMessage({
          id: 'settings.remaining.mcpGuide3',
          defaultMessage:
            "ChatGPT → Settings → Connectors (Developer mode on) → Add custom connector. ChatGPT runs in OpenAI's cloud, so it needs a PUBLIC url — localhost is not reachable.",
        })
      case 'http':
        return formatMessage({
          id: 'settings.remaining.mcpGuide4',
          defaultMessage:
            'Any remote-MCP client (Perplexity, hosted agents, custom). Point it at /mcp with a Bearer token. Hosted clients need a PUBLIC url.',
        })
      case 'other':
        return formatMessage({
          id: 'settings.remaining.mcpGuide5',
          defaultMessage:
            'Most other MCP clients accept the same mcpServers (stdio) form, or a remote url + Bearer header.',
        })
      default:
        return g.where
    }
  }
  const launchDescription = () => {
    if (launch.desktop)
      return formatMessage({
        id: 'settings.remaining.mcpLaunch0',
        defaultMessage:
          'The command is the Python bundled inside this app — nothing else to install. This app picks a new address each time it starts, so the bridge finds it through ONW_ROOT (your book folder); Open Net Worth must be running. If you move the app, copy the config again.',
      })
    if (ctx.variant === 'source' && Boolean(launch.source_root))
      return formatMessage({
        id: 'settings.remaining.mcpLaunch1',
        defaultMessage:
          'For a git checkout: cwd is the checkout this instance runs from. Needs python3 on your PATH.',
      })
    if (ctx.variant === 'source')
      return formatMessage(
        {
          id: 'settings.remaining.mcpLaunch2',
          defaultMessage:
            "For a git checkout: replace {path} with your checkout's absolute path. Needs python3 on your PATH.",
        },
        { path: SOURCE_CWD_PLACEHOLDER },
      )
    if (launch.command_found)
      return formatMessage({
        id: 'settings.remaining.mcpLaunch3',
        defaultMessage:
          "The command is the full path to onw on the computer running Open Net Worth — AI apps often don't search your shell's PATH. Use this config on that same computer.",
      })
    return formatMessage({
      id: 'settings.remaining.mcpLaunch4',
      defaultMessage:
        'Needs the onw command on the computer running Open Net Worth (uv tool install open-net-worth). If your AI app reports it can\'t find "onw", replace it with the full path printed by `which onw` (Windows: `where onw`).',
    })
  }

  return (
    <Panel
      title={formatMessage({
        id: 'settings.remaining.mcpTitle',
        defaultMessage: 'Use your book from other AI apps',
      })}
      sub={formatMessage({
        id: 'settings.remaining.mcpSub',
        defaultMessage:
          'This instance is an MCP server — point Claude Desktop, Cursor, VS Code or ChatGPT at it',
      })}
    >
      <span className="rd-help" style={{ display: 'block', lineHeight: 1.55 }}>
        {formatMessage({
          id: 'settings.remaining.mcpRisk',
          defaultMessage:
            "An app holding your API token acts as you: it can read your book and make changes. Every change it makes is recorded and can be undone. This is the reverse of Connectors → MCP, where Lucius uses someone else's server.",
        })}
      </span>
      <div>
        <div className="rd-bars-lbl" style={{ marginBottom: 7 }}>
          {formatMessage({
            id: 'settings.remaining.mcpConnectFrom',
            defaultMessage: 'Connect from…',
          })}
        </div>
        <div
          className="rd-seg rd-seg--scroll"
          role="tablist"
          aria-label={formatMessage({
            id: 'settings.remaining.mcpClient',
            defaultMessage: 'MCP client',
          })}
        >
          {MCP_CLIENTS.map((c) => (
            <button
              type="button"
              key={c.id}
              role="tab"
              aria-selected={client === c.id}
              className={'rd-seg-b' + (client === c.id ? ' on' : '')}
              onClick={() => setClient(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="rd-help" style={{ display: 'block', lineHeight: 1.55 }}>
          <span className={'rd-badge ' + (local ? '' : 'warn')}>
            {local
              ? formatMessage({
                  id: 'settings.remaining.mcpLocal',
                  defaultMessage: 'Local (stdio)',
                })
              : formatMessage({
                  id: 'settings.remaining.mcpPublic',
                  defaultMessage: 'Needs a public URL',
                })}
          </span>{' '}
          {guide()}
        </span>
        {!local && LOOPBACK.test(origin) ? (
          <span className="rd-help" style={{ display: 'block', lineHeight: 1.55, marginTop: 6 }}>
            {formatMessage(
              {
                id: 'settings.remaining.mcpLoopback',
                defaultMessage:
                  "This instance is on {host}, which a hosted app can't reach — expose it through a tunnel or a public deployment first.",
              },
              { host: window.location.host },
            )}
          </span>
        ) : null}
        {showVariants ? (
          <div
            className="rd-seg"
            role="tablist"
            aria-label={formatMessage({
              id: 'settings.remaining.mcpInstallation',
              defaultMessage: 'How Open Net Worth is installed',
            })}
            style={{ marginTop: 9 }}
          >
            {(
              [
                [
                  'installed',
                  formatMessage({
                    id: 'settings.remaining.mcpInstalled',
                    defaultMessage: 'Installed (onw)',
                  }),
                ],
                [
                  'source',
                  formatMessage({
                    id: 'settings.remaining.mcpSource',
                    defaultMessage: 'Running from source',
                  }),
                ],
              ] as const
            ).map(([key, label]) => (
              <button
                type="button"
                key={key}
                role="tab"
                aria-selected={variant === key}
                className={'rd-seg-b' + (variant === key ? ' on' : '')}
                onClick={() => setVariant(key)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
        {local ? (
          <span className="rd-help" style={{ display: 'block', lineHeight: 1.55, marginTop: 9 }}>
            {launchDescription()}
          </span>
        ) : null}
        {/* data-ctx-secret keeps this region out of the screen snapshot entirely — belt as
            well as braces, since the visible text is already masked. */}
        <div className="rd-code" style={{ marginTop: 9 }} data-ctx-secret="">
          {snippet}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
          <Btn
            size="xs"
            onClick={() => {
              void navigator.clipboard
                .writeText(copyable)
                .then(() =>
                  toast(
                    formatMessage(
                      {
                        id: 'settings.remaining.mcpCopied',
                        defaultMessage: 'Copied {client} config — with your real token',
                      },
                      { client: g.label },
                    ),
                  ),
                )
                .catch(() =>
                  toast(
                    formatMessage({
                      id: 'settings.remaining.mcpCopyError',
                      defaultMessage: 'Could not copy — select the snippet manually',
                    }),
                  ),
                )
            }}
          >
            {formatMessage({ id: 'settings.remaining.mcpCopy', defaultMessage: 'Copy config' })}
          </Btn>
          <Btn size="xs" variant="ghost" onClick={() => openSection?.('security')}>
            {formatMessage({
              id: 'settings.remaining.mcpManageToken',
              defaultMessage: 'Manage API token',
            })}
          </Btn>
        </div>
        <span className="rd-help" style={{ display: 'block', lineHeight: 1.55, marginTop: 9 }}>
          {formatMessage({
            id: 'settings.remaining.mcpTokenHelp',
            defaultMessage:
              'One token for every app, kept in Security. Rotating it there disconnects every app configured with the old one.',
          })}
        </span>
      </div>
    </Panel>
  )
}
