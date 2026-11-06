import { useAppIntl } from '../../../../i18n/useAppIntl'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { DesktopSettings } from '../../../../../../desktop/src/contracts'
import { ErrorState, Loading } from '../../../ui'
import { Badge, Btn, Empty, Panel, Toggle, row } from '../ds'
import {
  DESKTOP_SETTINGS_KEY as SETTINGS_KEY,
  desktopBridge,
  desktopClientBridge,
  fetchDesktopSettings as fetchSettings,
  queueWatchedImport,
} from '../../../../platform/desktop'
import { DesktopConnectionPanel } from './DesktopConnectionPanel'
import { fetchJson } from '../../../../hooks/serverState'
import { setCachedQueryData, useQueryCache } from '../../../../state/queryCache'

interface ImportJob {
  id: string
  grant_id: string
  status: string
  attachment_id: string | null
  filename: string
  error?: string | null
}

const JOBS_KEY = '/api/desktop/imports'
const fetchJobs = () => fetchJson<{ jobs: ImportJob[] }>(JOBS_KEY)

export function DesktopSection() {
  const local = desktopBridge()
  if (!local && !desktopClientBridge()) return null
  return (
    <>
      <DesktopConnectionPanel />
      {local ? <LocalDesktopSection /> : <ServerActivitySettings />}
    </>
  )
}

function ServerActivitySettings() {
  const { formatMessage } = useAppIntl()
  const openActivitySettings = desktopClientBridge()?.openActivitySettings
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!openActivitySettings) return null

  async function open() {
    setBusy(true)
    setError(null)
    try {
      await openActivitySettings!()
    } catch {
      setError(
        formatMessage({
          id: 'settings.remaining.backgroundError',
          defaultMessage: 'Could not open background and startup settings. Try again.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title={formatMessage({
        id: 'settings.remaining.backgroundTitle',
        defaultMessage: 'Background and startup',
      })}
      sub={formatMessage({
        id: 'settings.remaining.backgroundSub',
        defaultMessage:
          'Your automations and Intelligence keep updating on your server, even when this app is closed.',
      })}
    >
      {row(
        formatMessage({
          id: 'settings.remaining.keepReady',
          defaultMessage: 'Keep Open Net Worth ready',
        }),
        formatMessage({
          id: 'settings.remaining.keepReadyHelp',
          defaultMessage: 'Keep it close at hand and ready when you sign in.',
        }),
        <Btn disabled={busy} onClick={() => void open()}>
          {formatMessage({
            id: 'settings.remaining.backgroundOpen',
            defaultMessage: 'Background and startup…',
          })}
        </Btn>,
      )}
      {error && <ErrorState message={error} />}
    </Panel>
  )
}

function LocalDesktopSection() {
  const { formatMessage } = useAppIntl()
  const bridge = desktopBridge()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const imports = useQueryCache(JOBS_KEY, fetchJobs, { enabled: !!bridge, refetchInterval: 5000 })
  const preferences = useQueryCache(SETTINGS_KEY, fetchSettings, {
    enabled: !!bridge,
    refetchInterval: bridge ? 5000 : undefined,
  })
  const settings = preferences.data

  async function load() {
    if (!bridge) return
    try {
      await preferences.refresh()
      setError(null)
    } catch {
      setError(
        formatMessage({
          id: 'settings.remaining.desktopLoadError',
          defaultMessage: 'Could not load desktop settings. Try again.',
        }),
      )
    }
  }
  async function mutate(action: () => Promise<DesktopSettings>) {
    setBusy(true)
    try {
      setCachedQueryData(SETTINGS_KEY, await action())
      setError(null)
      await imports.refresh()
    } catch {
      setError(
        formatMessage({
          id: 'settings.remaining.desktopSaveError',
          defaultMessage: 'Could not save this desktop setting. Try again.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  async function review(job: ImportJob) {
    if (!job.attachment_id) return
    setBusy(true)
    try {
      await queueWatchedImport({ ...job, attachment_id: job.attachment_id })
      await navigate({
        to: '/accounts',
        search: { account: undefined, txn: undefined, review: undefined },
      })
    } catch {
      setError(
        formatMessage({
          id: 'settings.remaining.desktopReviewError',
          defaultMessage: 'Could not open this file for review. Try again.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  async function chooseBook() {
    if (!bridge) return
    setBusy(true)
    setError(null)
    try {
      await bridge.chooseBookFolder()
    } catch {
      setError(
        formatMessage({
          id: 'settings.remaining.desktopBookError',
          defaultMessage: 'Could not open this book folder. Try again.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  async function openBrowser() {
    if (!bridge) return
    setBusy(true)
    setError(null)
    try {
      await bridge.openBrowser()
    } catch {
      setError(
        formatMessage({
          id: 'settings.remaining.browserError',
          defaultMessage: 'Could not open your browser. Try again.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  if (!bridge) return null
  if (preferences.initialLoading && !error)
    return (
      <Loading
        label={formatMessage({
          id: 'settings.remaining.desktopLoading',
          defaultMessage: 'Loading desktop settings…',
        })}
      />
    )
  const displayError =
    error ??
    (preferences.error
      ? formatMessage({
          id: 'settings.remaining.desktopLoadError',
          defaultMessage: 'Could not load desktop settings. Try again.',
        })
      : null)
  const jobs = imports.data?.jobs ?? []
  return (
    <>
      {displayError && <ErrorState message={displayError} onRetry={() => void load()} />}
      {settings && (
        <>
          <Panel
            title={formatMessage({
              id: 'settings.remaining.browserAccess',
              defaultMessage: 'Browser access',
            })}
            sub={formatMessage({
              id: 'settings.remaining.browserAccessHelp',
              defaultMessage:
                'Open the same book in your browser on this computer. Browser access follows Settings → Security.',
            })}
          >
            {row(
              <span style={{ overflowWrap: 'anywhere' }}>
                {settings.browserUrl ??
                  formatMessage({
                    id: 'settings.remaining.browserUnavailable',
                    defaultMessage: 'Browser access is unavailable while the book opens.',
                  })}
              </span>,
              formatMessage({
                id: 'settings.remaining.browserDetail',
                defaultMessage:
                  'Keep the desktop app running. Quit stops browser access. The address may change after a restart or when you open another book.',
              }),
              <Btn disabled={busy || !settings.browserUrl} onClick={() => void openBrowser()}>
                {formatMessage({
                  id: 'settings.remaining.openBrowser',
                  defaultMessage: 'Open in browser',
                })}
              </Btn>,
            )}
          </Panel>
          <Panel
            title={formatMessage({
              id: 'settings.remaining.backgroundActivity',
              defaultMessage: 'Background activity',
            })}
          >
            {row(
              formatMessage({
                id: 'settings.remaining.keepRunning',
                defaultMessage: 'Keep running when the window closes',
              }),
              formatMessage({
                id: 'settings.remaining.keepRunningHelp',
                defaultMessage:
                  'Keep your scheduled automations running and Intelligence fresh with news and alerts—even when you close the window.',
              }),
              <Toggle
                label={formatMessage({
                  id: 'settings.remaining.keepRunning',
                  defaultMessage: 'Keep running when the window closes',
                })}
                on={settings.background}
                disabled={busy}
                onChange={(on) => void mutate(() => bridge.updateSettings({ background: on }))}
              />,
            )}
            {row(
              formatMessage({
                id: 'settings.remaining.startLogin',
                defaultMessage: 'Start at login',
              }),
              formatMessage({
                id: 'settings.remaining.startLoginHelp',
                defaultMessage:
                  'Let Lucius get back to work when you sign in, without remembering to open the app.',
              }),
              <Toggle
                label={formatMessage({
                  id: 'settings.remaining.startLogin',
                  defaultMessage: 'Start at login',
                })}
                on={settings.launchAtLogin}
                disabled={busy}
                onChange={(on) => void mutate(() => bridge.updateSettings({ launchAtLogin: on }))}
              />,
            )}
            {row(
              formatMessage({
                id: 'settings.remaining.keepAwake',
                defaultMessage: 'Keep computer awake',
              }),
              formatMessage({
                id: 'settings.remaining.keepAwakeHelp',
                defaultMessage:
                  'Stop idle sleep so automations run on time. The display can still turn off.',
              }),
              <Toggle
                label={formatMessage({
                  id: 'settings.remaining.keepAwake',
                  defaultMessage: 'Keep computer awake',
                })}
                on={settings.keepAwake}
                disabled={busy}
                onChange={(on) => void mutate(() => bridge.updateSettings({ keepAwake: on }))}
              />,
            )}
          </Panel>
          <Panel
            title={formatMessage({
              id: 'settings.remaining.notifications',
              defaultMessage: 'Notifications',
            })}
          >
            {row(
              formatMessage({
                id: 'settings.remaining.showNotifications',
                defaultMessage: 'Show desktop notifications',
              }),
              formatMessage({
                id: 'settings.remaining.notificationHelp',
                defaultMessage:
                  'Notifications open the relevant review. Financial values and document contents stay out of notification previews. If alerts do not appear, allow Open Net Worth in your computer’s notification settings.',
              }),
              <Toggle
                label={formatMessage({
                  id: 'settings.remaining.showNotifications',
                  defaultMessage: 'Show desktop notifications',
                })}
                on={settings.notifications}
                disabled={busy}
                onChange={(on) => void mutate(() => bridge.updateSettings({ notifications: on }))}
              />,
            )}
          </Panel>
          <Panel
            title={formatMessage({
              id: 'settings.remaining.statementFolders',
              defaultMessage: 'Statement folders',
            })}
            sub={formatMessage({
              id: 'settings.remaining.statementHelp',
              defaultMessage: 'New files appear for review. You decide what gets booked.',
            })}
            actions={
              <Btn disabled={busy} onClick={() => void mutate(() => bridge.chooseWatchedFolder())}>
                {formatMessage({
                  id: 'settings.remaining.chooseFolder',
                  defaultMessage: 'Choose folder…',
                })}
              </Btn>
            }
          >
            {!settings.watchedFolders.length && (
              <Empty
                title={formatMessage({
                  id: 'settings.remaining.addFolder',
                  defaultMessage: 'Add a statement folder',
                })}
                body={formatMessage({
                  id: 'settings.remaining.statementHelp',
                  defaultMessage: 'New files appear for review. You decide what gets booked.',
                })}
              />
            )}
            {settings.watchedFolders.map((folder) => (
              <div key={folder.id}>
                {row(
                  <>
                    {folder.label}{' '}
                    <Badge tone={!folder.enabled ? 'bad' : folder.available ? 'good' : 'warn'}>
                      {!folder.enabled
                        ? formatMessage({
                            id: 'settings.remaining.revoked',
                            defaultMessage: 'Access revoked',
                          })
                        : folder.available
                          ? formatMessage({
                              id: 'settings.remaining.watching',
                              defaultMessage: 'Watching',
                            })
                          : formatMessage({
                              id: 'settings.remaining.unavailable',
                              defaultMessage: 'Unavailable',
                            })}
                    </Badge>
                  </>,
                  <span style={{ overflowWrap: 'anywhere' }}>{folder.location}</span>,
                  <Btn
                    disabled={busy || !folder.enabled}
                    onClick={() => void mutate(() => bridge.revokeWatchedFolder(folder.id))}
                  >
                    {formatMessage({
                      id: 'settings.remaining.removeAccess',
                      defaultMessage: 'Remove access',
                    })}
                  </Btn>,
                )}
              </div>
            ))}
            {jobs
              .filter((job) => job.status !== 'reviewed')
              .map((job) => (
                <div key={job.id}>
                  {row(
                    job.filename,
                    job.status === 'failed'
                      ? formatMessage({
                          id: 'settings.remaining.fileReadError',
                          defaultMessage: 'Could not read file',
                        })
                      : job.status === 'ready'
                        ? null
                        : formatMessage({
                            id: 'settings.remaining.reading',
                            defaultMessage: 'Reading…',
                          }),
                    job.status === 'ready' && job.attachment_id ? (
                      <Btn size="xs" disabled={busy} onClick={() => void review(job)}>
                        {formatMessage({
                          id: 'settings.remaining.review',
                          defaultMessage: 'Review',
                        })}
                      </Btn>
                    ) : null,
                  )}
                </div>
              ))}
            {Boolean(imports.error) && (
              <ErrorState
                message={formatMessage({
                  id: 'settings.remaining.folderImportError',
                  defaultMessage: 'Could not load folder imports.',
                })}
                onRetry={() => void imports.refresh()}
              />
            )}
          </Panel>
          <Panel
            title={formatMessage({
              id: 'settings.remaining.yourBook',
              defaultMessage: 'Your book',
            })}
            sub={formatMessage({
              id: 'settings.remaining.yourBookHelp',
              defaultMessage:
                'Your book stays on this computer. Export a portable backup to keep another copy.',
            })}
          >
            {row(
              formatMessage({ id: 'settings.remaining.bookFolder', defaultMessage: 'Book folder' }),
              <span style={{ overflowWrap: 'anywhere' }}>{settings.bookFolder}</span>,
              <Btn
                disabled={busy}
                onClick={() =>
                  void bridge
                    .saveExport()
                    .catch(() =>
                      setError(
                        formatMessage({
                          id: 'settings.remaining.exportError',
                          defaultMessage: 'Could not export your book. Try again.',
                        }),
                      ),
                    )
                }
              >
                {formatMessage({
                  id: 'settings.remaining.exportBackup',
                  defaultMessage: 'Export backup…',
                })}
              </Btn>,
            )}
            {row(
              formatMessage({
                id: 'settings.remaining.openAnotherBook',
                defaultMessage: 'Open another book',
              }),
              formatMessage({
                id: 'settings.remaining.openAnotherBookHelp',
                defaultMessage:
                  'Open another book folder, or choose an empty folder for a new book.',
              }),
              <Btn disabled={busy} onClick={() => void chooseBook()}>
                {formatMessage({
                  id: 'settings.remaining.openAnotherFolder',
                  defaultMessage: 'Open another folder…',
                })}
              </Btn>,
            )}
          </Panel>
        </>
      )}
    </>
  )
}
