// Settings → Data. Ported from the DataSection in
// design_handoffs/settings_handoff/prototype/redesign/settings.jsx.
//
// The prototype's backup/upload lists were fixtures; here they are the real ones. Two things
// the handoff explicitly left unwired are wired: the typed RESET confirmation actually gates
// the button, and Restore actually restores (the server writes a safety backup first).
import { useRef, useState } from 'react'
import type { IntlShape } from 'react-intl'
import { useAppIntl } from '../../../../i18n/useAppIntl'
import { authFetch } from '../../../../api/client'
import { desktopBridge } from '../../../../platform/desktop'
import { openReportProblem } from '../../../../state/reportProblem'
import { useCachedFetchState } from '../../../../state/queryCache'
import { fDate } from '../../../../utils/format'
import { Clock, FileText } from '../../../../ui/icons'
import { Badge, Btn, Field, Modal, Panel, Toggle, row, useSectionBusy } from '../ds'
import type { SectionProps } from '../ds'

interface BackupRow {
  name: string
  created_at: string
  file_count: number
  size_bytes: number
  trigger: 'auto' | 'manual'
}

interface UploadRow {
  id: string
  filename: string
  size_bytes: number
  created_at: string
}

interface BackupSettings {
  enabled: boolean
  retention_days: number
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

function fmtWhen(iso: string, intl: IntlShape): string {
  const { formatMessage } = intl
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const today = new Date()
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  if (sameDay(d, today))
    return formatMessage(
      { id: 'settings.remaining.dataToday', defaultMessage: 'Today, {time}' },
      { time },
    )
  if (sameDay(d, yesterday))
    return formatMessage(
      { id: 'settings.remaining.dataYesterday', defaultMessage: 'Yesterday, {time}' },
      { time },
    )
  return `${fDate(d)}, ${time}`
}

/** Download a blob response through a header'd fetch — a top-level navigation cannot set the
 *  CSRF header these endpoints require. */
async function downloadFrom(
  path: string,
  fallbackName: string,
  intl: IntlShape,
): Promise<string | null> {
  const { formatMessage } = intl
  let res: Response
  try {
    res = await authFetch(path, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
  } catch {
    // Every other handler here catches; without this a dropped connection was an unhandled
    // rejection AND a silent no-op — the button just did nothing.
    return formatMessage({
      id: 'settings.remaining.dataNetwork',
      defaultMessage: 'Could not reach the server. Try again.',
    })
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: string } | null
    return (
      body?.detail ||
      formatMessage(
        {
          id: 'settings.remaining.dataDownloadHttp',
          defaultMessage: 'Download failed (HTTP {status})',
        },
        { status: res.status },
      )
    )
  }
  let filename = fallbackName
  const match = (res.headers.get('Content-Disposition') || '').match(/filename="?([^"]+)"?/i)
  if (match && match[1]) filename = match[1]
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return null
}

export function DataSection({ toast }: SectionProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const backups = useCachedFetchState<{ backups: BackupRow[]; last_backup_at: string | null }>(
    '/api/backup',
    async () => {
      const r = await authFetch('/api/backup')
      if (!r.ok) throw new Error(String(r.status))
      return r.json()
    },
    { staleTime: 0 },
  )
  const settings = useCachedFetchState<BackupSettings>(
    '/api/backup/settings',
    async () => {
      const r = await authFetch('/api/backup/settings')
      if (!r.ok) throw new Error(String(r.status))
      return r.json()
    },
    { staleTime: 0 },
  )
  const uploads = useCachedFetchState<UploadRow[]>(
    '/api/uploads',
    async () => {
      const r = await authFetch('/api/uploads')
      if (!r.ok) throw new Error(String(r.status))
      const data = (await r.json()) as { uploads?: UploadRow[] }
      return data.uploads ?? []
    },
    { staleTime: 0 },
  )
  useSectionBusy(
    (backups.initialLoading && !backups.data) ||
      (settings.initialLoading && !settings.data) ||
      (uploads.initialLoading && !uploads.data),
  )

  const [confirmReset, setConfirmReset] = useState(false)
  const [resetTyped, setResetTyped] = useState('')
  const [confirmRestore, setConfirmRestore] = useState<BackupRow | null>(null)
  const [busy, setBusy] = useState(false)
  // A toast is gone in two seconds; a failed restore or import stays up, beside a way to report it.
  const [dataFailure, setDataFailure] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const rows = backups.data?.backups ?? []
  const uploadRows = uploads.data ?? []
  const lastBackup = backups.data?.last_backup_at

  async function patchSettings(patch: Partial<BackupSettings>, message: string) {
    try {
      const r = await authFetch('/api/backup/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!r.ok) {
        toast(
          formatMessage(
            {
              id: 'settings.remaining.dataSaveHttp',
              defaultMessage: 'Could not save (HTTP {status})',
            },
            { status: r.status },
          ),
        )
        void settings.refresh()
        return
      }
      void settings.refresh()
      toast(message)
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.dataNetwork',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function exportBackup() {
    const bridge = desktopBridge()
    if (bridge) {
      try {
        const result = await bridge.saveExport()
        if (!result.cancelled)
          toast(
            formatMessage({
              id: 'settings.remaining.dataExported',
              defaultMessage: 'Backup exported',
            }),
          )
      } catch {
        toast(
          formatMessage({
            id: 'settings.remaining.dataExportFailed',
            defaultMessage: 'Could not export your book. Try again.',
          }),
        )
      }
      return
    }
    const err = await downloadFrom('/api/data/export', 'open-net-worth-export.zip', intl)
    toast(
      err ||
        formatMessage({ id: 'settings.remaining.dataExported', defaultMessage: 'Backup exported' }),
    )
  }

  async function backupNow() {
    setBusy(true)
    try {
      const r = await authFetch('/api/backup/run-now', { method: 'POST' })
      if (!r.ok) {
        toast(
          formatMessage(
            {
              id: 'settings.remaining.dataBackupHttp',
              defaultMessage: 'Backup failed (HTTP {status})',
            },
            { status: r.status },
          ),
        )
        return
      }
      const data = (await r.json()) as { size_bytes?: number }
      void backups.refresh()
      toast(
        formatMessage({
          id: 'settings.remaining.dataBackupDone',
          defaultMessage: 'Backing up… done',
        }) + (data.size_bytes ? ` • ${fmtSize(data.size_bytes)}` : ''),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.dataNetwork',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  function failed(message: string) {
    setDataFailure(message)
    toast(message)
  }

  async function restore(b: BackupRow) {
    setBusy(true)
    setDataFailure(null)
    try {
      const r = await authFetch(`/api/backup/${encodeURIComponent(b.name)}/restore`, {
        method: 'POST',
      })
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { detail?: string } | null
        failed(
          body?.detail ||
            formatMessage(
              {
                id: 'settings.remaining.dataRestoreHttp',
                defaultMessage: 'Restore failed (HTTP {status})',
              },
              { status: r.status },
            ),
        )
        return
      }
      toast(
        formatMessage({
          id: 'settings.remaining.dataRestored',
          defaultMessage: 'Restored — reloading',
        }),
      )
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      failed(
        formatMessage({
          id: 'settings.remaining.dataNetwork',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  async function importFile(file: File) {
    setBusy(true)
    setDataFailure(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('replace', 'true')
      const r = await authFetch('/api/data/import', { method: 'POST', body: fd })
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { detail?: string } | null
        failed(
          body?.detail ||
            formatMessage(
              {
                id: 'settings.remaining.dataImportHttp',
                defaultMessage: 'Import failed (HTTP {status})',
              },
              { status: r.status },
            ),
        )
        return
      }
      toast(
        formatMessage({
          id: 'settings.remaining.dataImported',
          defaultMessage: 'Imported — reloading',
        }),
      )
      setTimeout(() => window.location.reload(), 1200)
    } catch {
      failed(
        formatMessage({
          id: 'settings.remaining.dataImportFailed',
          defaultMessage: 'Import failed.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  async function deleteUpload(u: UploadRow) {
    try {
      const r = await authFetch(`/api/uploads/${encodeURIComponent(u.id)}`, { method: 'DELETE' })
      if (!r.ok) {
        toast(
          formatMessage(
            {
              id: 'settings.remaining.dataDeleteHttp',
              defaultMessage: 'Could not delete (HTTP {status})',
            },
            { status: r.status },
          ),
        )
        return
      }
      void uploads.refresh()
      toast(
        formatMessage({
          id: 'settings.remaining.dataDeleted',
          defaultMessage: 'Deleted — future chat turns can no longer read this file',
        }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.dataNetwork',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  async function resetInstance() {
    setBusy(true)
    try {
      await authFetch('/api/reset', { method: 'POST' })
      localStorage.clear()
      window.location.reload()
    } catch {
      toast(
        formatMessage({
          id: 'settings.remaining.dataResetFailed',
          defaultMessage: 'Reset failed.',
        }),
      )
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void importFile(f)
        }}
      />

      {dataFailure && (
        <Panel
          title={formatMessage({
            id: 'settings.remaining.dataFailureTitle',
            defaultMessage: 'That didn’t work',
          })}
        >
          {row(
            formatMessage({
              id: 'settings.remaining.dataNotFinished',
              defaultMessage: 'The restore or import did not finish',
            }),
            dataFailure,
            <Btn onClick={() => openReportProblem({ error: dataFailure })}>
              {formatMessage({
                id: 'settings.remaining.dataReport',
                defaultMessage: 'Report this problem',
              })}
            </Btn>,
          )}
        </Panel>
      )}

      <Panel
        title={formatMessage({
          id: 'settings.remaining.dataBackupTitle',
          defaultMessage: 'Backup & restore',
        })}
        sub={formatMessage({
          id: 'settings.remaining.dataBackupSub',
          defaultMessage:
            'Your data is yours. Export a full bundle — a single .zip of every store: accounts, transactions, holdings, history, memory, and chat sessions.',
        })}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="primary" onClick={() => void exportBackup()}>
            {formatMessage({
              id: 'settings.remaining.dataExport',
              defaultMessage: 'Export backup (.zip)',
            })}
          </Btn>
          <Btn disabled={busy} onClick={() => fileRef.current?.click()}>
            {formatMessage({
              id: 'settings.remaining.dataChoose',
              defaultMessage: 'Choose import file…',
            })}
          </Btn>
        </div>
        <span className="rd-help">
          {formatMessage(
            {
              id: 'settings.remaining.dataImportWarning',
              defaultMessage:
                'Import <b>replaces all current data</b>; a checkpoint is saved first so you can undo it. A downloaded backup carries your data, never your password, API token or connector credentials.',
            },
            { b: (chunks) => <b>{chunks}</b> },
          )}
        </span>
      </Panel>

      <Panel
        title={formatMessage({
          id: 'settings.remaining.dataAutoTitle',
          defaultMessage: 'Automatic backups',
        })}
        sub={formatMessage({
          id: 'settings.remaining.dataAutoSub',
          defaultMessage:
            "A full copy of your data is saved automatically once a day, independent of any chat session — so a mistake (yours, Lucius's, or a bug) is always recoverable to within a day, not just for the last ~50 AI turns.",
        })}
      >
        {row(
          formatMessage({ id: 'settings.remaining.dataDaily', defaultMessage: 'Back up daily' }),
          formatMessage({
            id: 'settings.remaining.dataDailyHelp',
            defaultMessage: 'Runs at 03:00 to the local backups folder.',
          }),
          <Toggle
            on={settings.data?.enabled ?? true}
            disabled={!settings.data}
            onChange={(v) =>
              void patchSettings(
                { enabled: v },
                v
                  ? formatMessage({
                      id: 'settings.remaining.dataDailyOn',
                      defaultMessage: 'Daily backups on',
                    })
                  : formatMessage({
                      id: 'settings.remaining.dataDailyOff',
                      defaultMessage: 'Daily backups off',
                    }),
              )
            }
            label={formatMessage({
              id: 'settings.remaining.dataDailyLabel',
              defaultMessage: 'Daily backup',
            })}
          />,
        )}
        <div className="rd-formgrid">
          <Field
            label={formatMessage({
              id: 'settings.remaining.dataRetention',
              defaultMessage: 'Keep for (days)',
            })}
            help={formatMessage({
              id: 'settings.remaining.dataRetentionHelp',
              defaultMessage: 'Older backups are deleted automatically.',
            })}
          >
            <input
              className="rd-input"
              type="number"
              min={1}
              max={365}
              key={settings.data?.retention_days ?? 'na'}
              defaultValue={settings.data?.retention_days ?? 30}
              onBlur={(e) => {
                const next = Number(e.target.value)
                if (!Number.isFinite(next) || next < 1 || next === settings.data?.retention_days)
                  return
                void patchSettings(
                  { retention_days: next },
                  formatMessage({
                    id: 'settings.remaining.dataRetentionUpdated',
                    defaultMessage: 'Retention updated',
                  }),
                )
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
            />
          </Field>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Btn size="xs" disabled={busy} onClick={() => void backupNow()}>
            {formatMessage({
              id: 'settings.remaining.dataBackupNow',
              defaultMessage: 'Back up now',
            })}
          </Btn>
          <span className="rd-help">
            {lastBackup
              ? formatMessage(
                  { id: 'settings.remaining.dataLast', defaultMessage: 'Last backup: {when}' },
                  { when: fmtWhen(lastBackup, intl) },
                )
              : formatMessage({
                  id: 'settings.remaining.dataNoBackup',
                  defaultMessage: 'No backup yet',
                })}{' '}
            •{' '}
            {formatMessage(
              {
                id: 'settings.remaining.dataKept',
                defaultMessage:
                  '{count, plural, one {# kept, listed below} other {# kept, listed below}}',
              },
              { count: rows.length },
            )}
          </span>
        </div>
      </Panel>

      <Panel
        title={formatMessage({
          id: 'settings.remaining.dataRestoreTitle',
          defaultMessage: 'Restore from a backup',
        })}
        sub={formatMessage({
          id: 'settings.remaining.dataRestoreSub',
          defaultMessage:
            'Restoring replaces all current data — a checkpoint is saved first, so it can be undone',
        })}
        flush
      >
        {rows.length ? (
          rows.map((b) => (
            <div className="rd-row" key={b.name}>
              <span className="rd-row-ic">
                <Clock size={13} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className="rd-row-main">
                <div className="rd-row-title">
                  {fmtWhen(b.created_at, intl)}{' '}
                  {b.trigger === 'manual' ? (
                    <Badge tone="accent">
                      {formatMessage({
                        id: 'settings.remaining.dataManual',
                        defaultMessage: 'Manual',
                      })}
                    </Badge>
                  ) : (
                    <Badge>
                      {formatMessage({
                        id: 'settings.remaining.dataAutomatic',
                        defaultMessage: 'Automatic',
                      })}
                    </Badge>
                  )}
                </div>
                <div className="rd-row-meta">
                  <span>
                    {formatMessage(
                      {
                        id: 'settings.remaining.dataFileCount',
                        defaultMessage: '{count, plural, one {# file} other {# files}}',
                      },
                      { count: b.file_count },
                    )}
                  </span>
                  <span>{fmtSize(b.size_bytes)}</span>
                </div>
              </div>
              <div className="rd-row-actions">
                <Btn
                  size="xs"
                  variant="ghost"
                  onClick={() =>
                    void downloadFrom(
                      `/api/backup/${encodeURIComponent(b.name)}/download`,
                      `open-net-worth-backup-${b.name}.zip`,
                      intl,
                    )
                      .then((err) =>
                        toast(
                          err ||
                            formatMessage(
                              {
                                id: 'settings.remaining.dataDownloading',
                                defaultMessage: 'Downloading {when}',
                              },
                              { when: fmtWhen(b.created_at, intl) },
                            ),
                        ),
                      )
                      .catch(() =>
                        toast(
                          formatMessage({
                            id: 'settings.remaining.dataNetwork',
                            defaultMessage: 'Could not reach the server. Try again.',
                          }),
                        ),
                      )
                  }
                >
                  {formatMessage({
                    id: 'settings.remaining.dataDownload',
                    defaultMessage: 'Download',
                  })}
                </Btn>
                <Btn size="xs" onClick={() => setConfirmRestore(b)}>
                  {formatMessage({
                    id: 'settings.remaining.dataRestore',
                    defaultMessage: 'Restore…',
                  })}
                </Btn>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '14px 18px' }}>
            <span className="rd-help">
              {formatMessage({
                id: 'settings.remaining.dataNoBackups',
                defaultMessage: 'No backups yet — run one above and it will show up here.',
              })}
            </span>
          </div>
        )}
        <div style={{ padding: '10px 18px' }}>
          <Btn size="xs" variant="ghost" disabled={busy} onClick={() => fileRef.current?.click()}>
            {formatMessage({
              id: 'settings.remaining.dataRestoreFile',
              defaultMessage: 'Restore from a file instead…',
            })}
          </Btn>
        </div>
      </Panel>

      <Panel
        title={formatMessage({
          id: 'settings.remaining.dataUploads',
          defaultMessage: 'Uploaded files',
        })}
        sub={formatMessage({
          id: 'settings.remaining.dataUploadsHelp',
          defaultMessage:
            'Files you attach in chat are stored here (so retries and old conversations keep working) until you delete them',
        })}
        flush
      >
        {uploadRows.length ? (
          uploadRows.map((u) => (
            <div className="rd-row" key={u.id}>
              <span className="rd-row-ic">
                <FileText size={14} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className="rd-row-main">
                <div className="rd-row-title">{u.filename}</div>
                <div className="rd-row-meta">
                  <span>{fmtSize(u.size_bytes)}</span>
                  <span>{fDate(u.created_at, 'short', 'always')}</span>
                </div>
              </div>
              <div className="rd-row-actions">
                <Btn size="xs" variant="ghost" onClick={() => void deleteUpload(u)}>
                  {formatMessage({ id: 'settings.remaining.dataDelete', defaultMessage: 'Delete' })}
                </Btn>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '14px 18px' }}>
            <span className="rd-help">
              {formatMessage({
                id: 'settings.remaining.dataNoUploads',
                defaultMessage:
                  'Nothing stored yet — attach a file in chat and it will show up here.',
              })}
            </span>
          </div>
        )}
      </Panel>

      <section className="rd-panel rd-danger-panel">
        <div className="rd-panel-head">
          <div
            className="rd-panel-title"
            style={{
              color: 'var(--bad)',
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {formatMessage({ id: 'settings.remaining.dataDanger', defaultMessage: 'Danger zone' })}
          </div>
        </div>
        <div className="rd-panel-body">
          {row(
            formatMessage({
              id: 'settings.remaining.dataResetTitle',
              defaultMessage: 'Reset instance / clear all data',
            }),
            formatMessage({
              id: 'settings.remaining.dataResetHelp',
              defaultMessage:
                'Permanently deletes all data on this instance — accounts, transactions, positions, conversations, memory, and profile. Your password and sign-in settings are kept. This cannot be undone (export a backup first).',
            }),
            <Btn
              variant="danger"
              onClick={() => {
                setResetTyped('')
                setConfirmReset(true)
              }}
            >
              {formatMessage({
                id: 'settings.remaining.dataReset',
                defaultMessage: 'Reset instance…',
              })}
            </Btn>,
          )}
        </div>
      </section>

      {confirmRestore && (
        <Modal
          title={formatMessage(
            {
              id: 'settings.remaining.dataRestoreQuestion',
              defaultMessage: 'Restore the backup from {when}?',
            },
            { when: fmtWhen(confirmRestore.created_at, intl) },
          )}
          onClose={() => setConfirmRestore(null)}
          footer={
            <>
              <Btn onClick={() => setConfirmRestore(null)}>
                {formatMessage({ id: 'settings.remaining.dataCancel', defaultMessage: 'Cancel' })}
              </Btn>
              <Btn
                variant="danger-solid"
                disabled={busy}
                onClick={() => {
                  const b = confirmRestore
                  setConfirmRestore(null)
                  void restore(b)
                }}
              >
                {formatMessage({
                  id: 'settings.remaining.dataRestoreThis',
                  defaultMessage: 'Restore this backup',
                })}
              </Btn>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            {formatMessage(
              {
                id: 'settings.remaining.dataRestoreWarning',
                defaultMessage:
                  'Everything currently on this instance is replaced by the contents of this backup — accounts, transactions, holdings, memory, and chat history. Anything added since {when} is lost.',
              },
              { when: fmtWhen(confirmRestore.created_at, intl) },
            )}
          </p>
          <span className="rd-help">
            {formatMessage({
              id: 'settings.remaining.dataRestoreSafety',
              defaultMessage:
                'A fresh backup is written first, so the restore can itself be undone. Your password and API token are left alone.',
            })}
          </span>
        </Modal>
      )}

      <p className="rd-setfoot">
        {formatMessage(
          {
            id: 'settings.remaining.dataChartAttribution',
            defaultMessage:
              'Price charts are rendered with <link>TradingView Lightweight Charts™</link>. Copyright © 2025 TradingView, Inc.',
          },
          {
            link: (chunks) => (
              <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">
                {chunks}
              </a>
            ),
          },
        )}
      </p>

      {confirmReset && (
        <Modal
          title={formatMessage({
            id: 'settings.remaining.dataResetConfirmTitle',
            defaultMessage: 'Reset this instance?',
          })}
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <Btn onClick={() => setConfirmReset(false)}>
                {formatMessage({ id: 'settings.remaining.dataCancel', defaultMessage: 'Cancel' })}
              </Btn>
              <Btn
                variant="danger-solid"
                disabled={busy || resetTyped.trim() !== 'RESET'}
                onClick={() => void resetInstance()}
              >
                {formatMessage({
                  id: 'settings.remaining.dataUnderstand',
                  defaultMessage: 'I understand — reset',
                })}
              </Btn>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            {formatMessage(
              {
                id: 'settings.remaining.dataResetWarning',
                defaultMessage:
                  'Everything is deleted: accounts, transactions, rules, tasks, skills, connector config, and app settings. Your password and sign-in settings are kept. An automatic backup is written first, but restoring it is on you. Type <b>RESET</b> to confirm.',
              },
              { b: (chunks) => <b className="rd-mono">{chunks}</b> },
            )}
          </p>
          <input
            className="rd-input"
            placeholder="RESET"
            aria-label={formatMessage({
              id: 'settings.remaining.dataResetAria',
              defaultMessage: 'Type RESET to confirm',
            })}
            value={resetTyped}
            onChange={(e) => setResetTyped(e.target.value)}
          />
        </Modal>
      )}
    </>
  )
}
