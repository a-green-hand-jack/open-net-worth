import { getNumberLocale } from '../../utils/format'
// First run, restore branch — for someone who already has a book.
//
// Preview-then-commit over endpoints that already ship: `/api/data/import/validate` writes NOTHING
// and returns an ImportReport ({ok, schema_version, base_currency, files[], warnings, errors});
// `/api/data/import` with replace=true does the write, wrapped in a pre-import checkpoint returned
// as undo_checkpoint_id.
//
// Why it lives in first run at all: restore used to be reachable only from Settings › Data, so
// a returning user had to pick a data folder, connect a model, set a password and land on an
// empty dashboard before importing their data. Currency comes from the bundle; AI and
// machine security setup follow the restore.

import { useState } from 'react'
import { authFetch } from '../../api/client'
import { Button, Cluster, Stack, Text } from '../ui'
import { ReportProblemButton } from '../ReportProblemButton'
import { useAppIntl } from '../../i18n/useAppIntl'
import type { IntlShape } from 'react-intl'

interface BundleFile {
  name: string
  row_count: number
  sha_ok: boolean
}

interface ImportReport {
  ok: boolean
  schema_version: number | null
  base_currency: string
  files: BundleFile[]
  warnings: string[]
  errors: string[]
  error_messages?: (ImportMessage | null)[]
  warning_messages?: (ImportMessage | null)[]
}

interface ImportMessage {
  message_id?: unknown
  message_params?: unknown
}

function importMessage(
  intl: IntlShape,
  message: ImportMessage | null | undefined,
  original: string,
): string {
  if (intl.locale === 'en') return original
  if (
    !message ||
    !message.message_params ||
    typeof message.message_params !== 'object' ||
    Array.isArray(message.message_params)
  )
    return original
  const params = message.message_params as Record<string, unknown>
  const exact = (...keys: string[]) =>
    Object.keys(params).length === keys.length &&
    keys.every((key) => typeof params[key] === 'string')
  switch (message.message_id) {
    case 'restore.error.emptyUpload':
      return exact()
        ? intl.formatMessage({
            id: 'restore.error.emptyUpload',
            defaultMessage: 'The uploaded bundle is empty.',
          })
        : original
    case 'restore.error.diskSpace':
      return exact('size', 'free')
        ? intl.formatMessage(
            {
              id: 'restore.error.diskSpace',
              defaultMessage:
                'The uploaded bundle is too large for the free disk space ({size} bytes, {free} free).',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.inProgress':
      return exact()
        ? intl.formatMessage({
            id: 'restore.error.inProgress',
            defaultMessage: 'An import is already in progress.',
          })
        : original
    case 'restore.error.validationFailed':
      return exact()
        ? intl.formatMessage({
            id: 'restore.error.validationFailed',
            defaultMessage: 'The import bundle failed validation.',
          })
        : original
    case 'restore.error.expectedList':
      return exact('name')
        ? intl.formatMessage(
            {
              id: 'restore.error.expectedList',
              defaultMessage: '{name}: expected a JSON list of objects.',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.expectedObject':
      return exact('name', 'index', 'kind')
        ? intl.formatMessage(
            {
              id: 'restore.error.expectedObject',
              defaultMessage: '{name}[{index}]: expected an object, got {kind}.',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.accountType':
      return exact('name', 'index', 'id', 'kind', 'allowed')
        ? intl.formatMessage(
            {
              id: 'restore.error.accountType',
              defaultMessage:
                '{name}[{index}]: account {id} has unknown type {kind} (expected one of {allowed}). This bundle predates the seven-type account schema (2026-09-07).',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.unsafeStatementId':
      return exact('name', 'index', 'id')
        ? intl.formatMessage(
            {
              id: 'restore.error.unsafeStatementId',
              defaultMessage:
                '{name}[{index}]: unsafe statement id {id} (expected 1-64 chars of [A-Za-z0-9_.-]).',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.duplicateStatementId':
      return exact('name', 'index', 'id')
        ? intl.formatMessage(
            {
              id: 'restore.error.duplicateStatementId',
              defaultMessage: '{name}[{index}]: duplicate statement id {id}.',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.unsafeStatementPath':
      return exact('name', 'index', 'path')
        ? intl.formatMessage(
            {
              id: 'restore.error.unsafeStatementPath',
              defaultMessage:
                '{name}[{index}]: unsafe statement file_path {path} (must be a relative path that does not escape the bundle).',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.attachmentId':
      return exact('location', 'id')
        ? intl.formatMessage(
            {
              id: 'restore.error.attachmentId',
              defaultMessage: '{location}: {id} is not an attachment id.',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.notBackup':
      return exact()
        ? intl.formatMessage({
            id: 'restore.error.notBackup',
            defaultMessage:
              "This file isn't an Open Net Worth backup. Choose the .zip you exported from Settings → Data.",
          })
        : original
    case 'restore.error.bundleLarge':
      return exact('size', 'limit')
        ? intl.formatMessage(
            {
              id: 'restore.error.bundleLarge',
              defaultMessage:
                'Bundle too large: declared {size} bytes uncompressed exceeds cap {limit}.',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.entryLarge':
      return exact('name', 'limit')
        ? intl.formatMessage(
            {
              id: 'restore.error.entryLarge',
              defaultMessage: 'Entry too large: {name} exceeds per-file cap {limit} bytes.',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.manifestMissing':
      return exact()
        ? intl.formatMessage({
            id: 'restore.error.manifestMissing',
            defaultMessage: 'Missing manifest.json.',
          })
        : original
    case 'restore.error.manifestInvalid':
      return exact()
        ? intl.formatMessage({
            id: 'restore.error.manifestInvalid',
            defaultMessage: 'manifest.json is not valid JSON.',
          })
        : original
    case 'restore.error.schemaMismatch':
      return exact('actual', 'expected')
        ? intl.formatMessage(
            {
              id: 'restore.error.schemaMismatch',
              defaultMessage:
                'Schema version mismatch: bundle {actual}, expected {expected}. Cross-version upgrade is not supported.',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.schemaV1':
      return exact('actual', 'expected')
        ? intl.formatMessage(
            {
              id: 'restore.error.schemaV1',
              defaultMessage:
                'Schema version mismatch: bundle {actual}, expected {expected}. This backup predates the seven-type account schema. Restore it on a build from before 2026-09-07, let it upgrade, then export again.',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.unsafeEntry':
      return exact('name')
        ? intl.formatMessage(
            {
              id: 'restore.error.unsafeEntry',
              defaultMessage: 'Rejected unsafe or unknown entry: {name}.',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.warning.noHash':
      return exact('name')
        ? intl.formatMessage(
            { id: 'restore.warning.noHash', defaultMessage: '{name}: no sha256 in manifest.' },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.hashMismatch':
      return exact('name')
        ? intl.formatMessage(
            {
              id: 'restore.error.hashMismatch',
              defaultMessage: '{name}: sha256 mismatch (tampered or corrupt).',
            },
            params as Record<string, string>,
          )
        : original
    case 'restore.error.invalidJson':
      return exact('name')
        ? intl.formatMessage(
            { id: 'restore.error.invalidJson', defaultMessage: '{name}: not valid JSON.' },
            params as Record<string, string>,
          )
        : original
    default:
      return original
  }
}

export interface StepRestoreProps {
  /** Restore succeeded — the instance now holds the bundle's data. */
  onDone: () => void
  /** Back out to ordinary setup. */
  onBack: () => void
}

/** Strip the store suffix so a row reads "transactions", not "transactions.json". */
function label(name: string): string {
  return name.replace(/\.json$/i, '').replace(/_/g, ' ')
}

export function StepRestore({ onDone, onBack }: StepRestoreProps) {
  const intl = useAppIntl()
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function validate(picked: File) {
    setBusy(true)
    setError(null)
    setReport(null)
    try {
      const body = new FormData()
      body.append('file', picked)
      const res = await authFetch('/api/data/import/validate', { method: 'POST', body })
      if (!res.ok) {
        const detail = await res.json().catch(() => null)
        const fallback = intl.formatMessage(
          { id: 'restore.readFailed', defaultMessage: 'Could not read that file ({status}).' },
          { status: res.status },
        )
        setError(
          importMessage(
            intl,
            detail,
            typeof detail?.detail === 'string' ? detail.detail : fallback,
          ),
        )
        return
      }
      setReport(await res.json())
    } catch {
      setError(
        intl.formatMessage({
          id: 'firstPassword.unreachable',
          defaultMessage: 'Could not reach the server. Check it is running and try again.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  async function commit() {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('replace', 'true')
      const res = await authFetch('/api/data/import', { method: 'POST', body })
      if (!res.ok) {
        const detail = await res.json().catch(() => null)
        const fallback = intl.formatMessage(
          { id: 'restore.importFailed', defaultMessage: 'The import did not complete ({status}).' },
          { status: res.status },
        )
        setError(
          importMessage(
            intl,
            detail,
            typeof detail?.detail === 'string' ? detail.detail : fallback,
          ),
        )
        return
      }
      onDone()
    } catch {
      setError(
        intl.formatMessage({
          id: 'firstPassword.unreachable',
          defaultMessage: 'Could not reach the server. Check it is running and try again.',
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  const rows = (report?.files || []).filter((f) => f.row_count > 0).slice(0, 6)
  const total = (report?.files || []).reduce((n, f) => n + (f.row_count || 0), 0)

  return (
    <Stack gap="--space-6" className="firstrun-restore">
      <Text as="p" tone="muted" className="firstrun-lead">
        {intl.formatMessage({
          id: 'restore.explanation',
          defaultMessage:
            'Bring back a portable export from another machine. Nothing is written until you have seen what is inside it.',
        })}
      </Text>

      <label className="firstrun-drop">
        <input
          type="file"
          accept=".zip,application/zip"
          className="firstrun-drop__input"
          disabled={busy}
          onChange={(e) => {
            if (busy) return
            const picked = e.target.files?.[0] || null
            setFile(picked)
            setReport(null)
            setError(null)
            if (picked) void validate(picked)
          }}
        />
        <Stack gap="--space-2">
          <Text size="sm" weight={600}>
            {file
              ? file.name
              : intl.formatMessage({
                  id: 'restore.chooseFile',
                  defaultMessage: 'Choose a backup file',
                })}
          </Text>
          <Text size="xs" tone="faint">
            {intl.formatMessage({
              id: 'restore.fileHint',
              defaultMessage: 'An Open Net Worth export .zip from Settings › Data',
            })}
          </Text>
        </Stack>
      </label>

      {busy && !report && (
        <Text as="p" size="sm" tone="muted">
          {intl.formatMessage({ id: 'restore.reading', defaultMessage: 'Reading the bundle…' })}
        </Text>
      )}

      {report && !report.ok && (
        <Stack gap="--space-2">
          {(report.errors.length
            ? report.errors
            : [
                intl.formatMessage({
                  id: 'restore.invalid',
                  defaultMessage: 'This file is not a valid bundle.',
                }),
              ]
          ).map((e, index) => (
            <Text key={e} as="p" size="sm" tone="bad">
              {importMessage(intl, report.error_messages?.[index], e)}
            </Text>
          ))}
          <Cluster>
            <ReportProblemButton
              size="sm"
              error={(report.errors.length
                ? report.errors
                : [
                    intl.formatMessage({
                      id: 'restore.invalid',
                      defaultMessage: 'This file is not a valid bundle.',
                    }),
                  ]
              ).join('\n')}
            />
          </Cluster>
        </Stack>
      )}

      {report && report.ok && (
        <Stack gap="--space-4">
          <div className="firstrun-rows">
            {report.base_currency && (
              <div className="firstrun-row firstrun-row--kv">
                <span className="firstrun-row__label">
                  {intl.formatMessage({ id: 'welcome.currency', defaultMessage: 'App currency' })}
                </span>
                <span className="firstrun-row__value">{report.base_currency}</span>
              </div>
            )}
            <div className="firstrun-row firstrun-row--kv">
              <span className="firstrun-row__label">
                {intl.formatMessage({ id: 'restore.records', defaultMessage: 'Records' })}
              </span>
              <span className="firstrun-row__value">{total.toLocaleString(getNumberLocale())}</span>
            </div>
            {rows.map((f) => (
              <div key={f.name} className="firstrun-row firstrun-row--kv">
                <span
                  className="firstrun-row__label"
                  style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400 }}
                >
                  {label(f.name)}
                </span>
                <span className="firstrun-row__value" style={{ color: 'var(--faint)' }}>
                  {f.row_count.toLocaleString(getNumberLocale())}
                </span>
              </div>
            ))}
          </div>

          {report.warnings.map((w, index) => (
            <Text key={w} as="p" size="xs" tone="warn">
              {importMessage(intl, report.warning_messages?.[index], w)}
            </Text>
          ))}

          <Text as="p" size="xs" tone="faint">
            {intl.formatMessage({
              id: 'restore.warning',
              defaultMessage:
                'This replaces everything on this instance. A checkpoint is taken first, so it can be undone.',
            })}
          </Text>
        </Stack>
      )}

      {error && (
        <Stack gap="--space-3">
          <Text as="p" size="sm" tone="bad">
            {error}
          </Text>
          <Cluster>
            <ReportProblemButton size="sm" error={error} />
          </Cluster>
        </Stack>
      )}

      <Cluster justify="between">
        <Button variant="secondary" onClick={onBack} disabled={busy}>
          {intl.formatMessage({ id: 'restore.setupInstead', defaultMessage: 'Set up instead' })}
        </Button>
        {report?.ok && (
          <Button variant="primary" loading={busy} onClick={() => void commit()}>
            {intl.formatMessage({ id: 'restore.confirm', defaultMessage: 'Restore this backup' })}
          </Button>
        )}
      </Cluster>
    </Stack>
  )
}
