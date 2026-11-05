// Settings → Developer → SQL access. The owner's half of the read-only SQL capability
// (spec docs/superpowers/specs/2026-08-23-lucius-sql-access-design.md).
//
// TWO things, deliberately together: the kill switch, and the record of what Lucius has
// actually asked the database. A switch with no visibility is a switch nobody has any basis
// to flip — the log is what makes the toggle an informed decision rather than a mood.
//
// LAYOUT NOTE, learned the hard way. `.rd-panel-body > *` already gives EVERY direct child
// its own padding + bottom border (settings.css). So a child is a SECTION, and wrapping
// content in a div to "group" it produces a box inside a box. The first version of this panel
// wrapped the query list in a div AND rendered each statement in `.rd-code` — which is built
// for multi-line config snippets (`white-space: pre; overflow-x: auto`, border, 14px padding)
// — giving three nested borders and a horizontal scrollbar per row. Each query is now its own
// direct child, styled as a dense log line, and `.rd-code` is left to the MCP snippets it was
// designed for.
//
// Lives in its OWN file rather than inline in sections/DeveloperSection.tsx (where the other
// five panels live) because that file is already ~615 lines, past the ~400 guidance.
//
// The log rows carry SQL VERBATIM — see backend/db/sql_query_log_store.py for why that is the
// right call for THIS log. Two consequences here: the endpoint is auth-gated + no-store, and
// the list is data-ctx-secret so a statement embedding real amounts or account names never
// rides into the Lucius screen snapshot (same treatment as LogViewer and the MCP token).
import { useState } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { defineMessages, type IntlShape, type MessageDescriptor } from 'react-intl'
import { authFetch } from '../../../api/client'
import { useCachedFetchState } from '../../../state/queryCache'
import { fDate } from '../../../utils/format'
import { Badge, Btn, Empty, Panel, Toggle, row, useSectionBusy } from './ds'
import type { SectionProps } from './ds'

export interface SqlQueryRow {
  id: string
  ts: string
  sql: string
  ok: boolean
  error: string | null
  row_count: number
  truncated: boolean
  elapsed_ms: number
  origin: string
}

const reasonMessages = defineMessages({
  prepareFailed: {
    id: 'sqlAccess.reason.prepareFailed',
    defaultMessage: 'preparing the SQL login failed ({error}); see the app log.',
  },
  noLogin: {
    id: 'sqlAccess.reason.noLogin',
    defaultMessage: 'ONW_SQL_CONSOLE_DATABASE_URL names no database login.',
  },
  appLogin: {
    id: 'sqlAccess.reason.appLogin',
    defaultMessage:
      "ONW_SQL_CONSOLE_DATABASE_URL uses the app's own database login; Lucius needs a separate one. Remove the setting and the app will create it.",
  },
  createRole: {
    id: 'sqlAccess.reason.createRole',
    defaultMessage:
      "the app's database login ({login}) isn't allowed to create the restricted login Lucius's SQL runs as.",
  },
  createRoleOld: {
    id: 'sqlAccess.reason.createRoleOld',
    defaultMessage:
      "the app's database login ({login}) isn't allowed to create the restricted login Lucius's SQL runs as. On this Postgres version, have an admin create it instead, then set ONW_SQL_CONSOLE_DATABASE_URL to it and restart.",
  },
  signinManaged: {
    id: 'sqlAccess.reason.signinManaged',
    defaultMessage:
      'the database refused a sign-in as {role}. Check that the server accepts password sign-ins for it (pg_hba.conf), or set ONW_SQL_CONSOLE_DATABASE_URL to a login you made.',
  },
  signinExternal: {
    id: 'sqlAccess.reason.signinExternal',
    defaultMessage: 'the database refused a sign-in as {role}. Check ONW_SQL_CONSOLE_DATABASE_URL.',
  },
  loginMissing: {
    id: 'sqlAccess.reason.loginMissing',
    defaultMessage: "Lucius's SQL login could not be found in pg_roles.",
  },
  differentRole: {
    id: 'sqlAccess.reason.differentRole',
    defaultMessage:
      "Lucius's SQL login starts as a different role than it signs in as, so it could switch back to the login mid-query.",
  },
  attributes: {
    id: 'sqlAccess.reason.attributes',
    defaultMessage: "Lucius's SQL login has {attributes}, which it must not.",
  },
  otherRoles: {
    id: 'sqlAccess.reason.otherRoles',
    defaultMessage:
      "Lucius's SQL login is a member of other roles ({roles}), so it could switch to one that reads credentials.",
  },
  readable: {
    id: 'sqlAccess.reason.readable',
    defaultMessage:
      "Lucius's SQL login can still read {tables}, and the app could not remove that access.",
  },
})
const reasonParams: Record<keyof typeof reasonMessages, string | null> = {
  prepareFailed: 'error',
  noLogin: null,
  appLogin: null,
  createRole: 'login',
  createRoleOld: 'login',
  signinManaged: 'role',
  signinExternal: 'role',
  loginMissing: null,
  differentRole: null,
  attributes: 'attributes',
  otherRoles: 'roles',
  readable: 'tables',
}

function localizedReason(
  raw: string,
  message: SqlConfig['reason_message'],
  intl: IntlShape,
): string {
  if (!message || !message.id.startsWith('sqlAccess.reason.')) return raw
  const key = message.id.slice('sqlAccess.reason.'.length) as keyof typeof reasonMessages
  if (!Object.hasOwn(reasonMessages, key) || !message.params || typeof message.params !== 'object')
    return raw
  const param = reasonParams[key]
  const keys = Object.keys(message.params)
  if (
    param
      ? keys.length !== 1 || keys[0] !== param || typeof message.params[param] !== 'string'
      : keys.length !== 0
  )
    return raw
  return intl.formatMessage(reasonMessages[key]! as MessageDescriptor, message.params as Record<string, string>)
}

const LOG_PATH = '/api/sql-queries?limit=25'
const CONFIG_PATH = '/api/config/sql-query'

async function getJson<T>(path: string): Promise<T> {
  const r = await authFetch(path)
  if (!r.ok) throw new Error(String(r.status))
  return r.json() as Promise<T>
}

/** "3m ago" / "2h ago" / a date once it stops being recent. */
export function relativeTime(iso: string, now: number = Date.now(), intl?: IntlShape): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return ''
  const secs = Math.max(0, Math.round((now - then) / 1000))
  if (secs < 60)
    return (
      intl?.formatMessage({ id: 'sqlAccess.justNow', defaultMessage: 'just now' }) ?? 'just now'
    )
  if (secs < 3600)
    return (
      intl?.formatMessage(
        { id: 'sqlAccess.minutesAgo', defaultMessage: '{count}m ago' },
        { count: Math.floor(secs / 60) },
      ) ?? `${Math.floor(secs / 60)}m ago`
    )
  if (secs < 86400)
    return (
      intl?.formatMessage(
        { id: 'sqlAccess.hoursAgo', defaultMessage: '{count}h ago' },
        { count: Math.floor(secs / 3600) },
      ) ?? `${Math.floor(secs / 3600)}h ago`
    )
  return fDate(new Date(then), 'numeric')
}

/** One query, as a log line. Collapsed by default; click to read the whole statement.
 *
 * Collapsed truncates with an ellipsis rather than scrolling horizontally: a scrollbar per row
 * is noise, and a SELECT's first 80 characters already identify it. Expanded WRAPS rather than
 * scrolls, so the full statement is readable without dragging. */
// `data-ctx-secret` sits on the ROW, not on a wrapper around the list: a WHERE clause can
// embed real amounts and account names and must stay out of the Lucius screen snapshot, and a
// wrapper would stop each row being a DIRECT child of the panel body — which is exactly what
// gives it its padding and divider.
function QueryRow({ q }: { q: SqlQueryRow }) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const [open, setOpen] = useState(false)
  return (
    <button
      type="button"
      className="sqla-q"
      aria-expanded={open}
      data-ctx-secret=""
      onClick={() => setOpen((v) => !v)}
      title={
        open
          ? formatMessage({ id: 'sqlAccess.collapse', defaultMessage: 'Collapse' })
          : formatMessage({ id: 'sqlAccess.showFull', defaultMessage: 'Show the full statement' })
      }
    >
      <span className={'sqla-dot' + (q.ok ? ' ok' : ' bad')} aria-hidden="true" />
      <span className="sqla-body">
        <span className={'sqla-sql' + (open ? ' open' : '')}>{q.sql}</span>
        {!q.ok && q.error ? <span className="sqla-err">{q.error}</span> : null}
      </span>
      <span className="rd-row-meta sqla-meta">
        {q.ok ? (
          <span>
            {formatMessage(
              {
                id: 'sqlAccess.rows',
                defaultMessage: '{count, plural, one {# row} other {# rows}}',
              },
              { count: q.row_count },
            )}
            {q.truncated
              ? formatMessage({ id: 'sqlAccess.capped', defaultMessage: ' (capped)' })
              : ''}
          </span>
        ) : (
          <span>{formatMessage({ id: 'sqlAccess.refused', defaultMessage: 'refused' })}</span>
        )}
        <span>{Math.round(q.elapsed_ms)} ms</span>
        {/* Origin is shown ONLY when it is not the owner's own browser. "web" on every row is
            noise; "scheduled" or "connector:telegram" is exactly what you want to notice. */}
        {q.origin && q.origin !== 'web' ? <span>{q.origin}</span> : null}
        <span>{relativeTime(q.ts, undefined, intl)}</span>
      </span>
    </button>
  )
}

/** `available` is false only on Postgres, when the app could not prepare the separate
 * database login Lucius's SQL runs as; `fix` is set when only an operator can resolve it. */
interface SqlConfig {
  enabled: boolean
  available?: boolean
  reason?: string
  reason_message?: { id: string; params: Record<string, unknown> } | null
  fix?: string
}

export function SqlAccessPanel({ toast }: SectionProps) {
  const intl = useAppIntl()
  const { formatMessage } = intl
  const config = useCachedFetchState<SqlConfig>(
    CONFIG_PATH,
    () => getJson<SqlConfig>(CONFIG_PATH),
    {
      staleTime: 0,
    },
  )
  const log = useCachedFetchState<{ queries: SqlQueryRow[] }>(
    LOG_PATH,
    () => getJson<{ queries: SqlQueryRow[] }>(LOG_PATH),
    { staleTime: 5_000 },
  )
  useSectionBusy(config.initialLoading && !config.data)

  const enabled = config.data?.enabled ?? true
  const unavailable = config.data?.available === false
  const fix = config.data?.fix ?? ''
  const queries = log.data?.queries ?? []

  async function setEnabled(next: boolean) {
    try {
      const r = await authFetch(CONFIG_PATH, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      if (!r.ok) {
        toast(
          formatMessage(
            { id: 'sqlAccess.saveError', defaultMessage: 'Could not save (HTTP {status})' },
            { status: r.status },
          ),
        )
        return
      }
      void config.refresh()
      toast(
        next
          ? formatMessage({ id: 'sqlAccess.enabled', defaultMessage: 'SQL access enabled' })
          : formatMessage({ id: 'sqlAccess.blocked', defaultMessage: 'SQL access blocked' }),
      )
    } catch {
      toast(
        formatMessage({
          id: 'sqlAccess.serverError',
          defaultMessage: 'Could not reach the server. Try again.',
        }),
      )
    }
  }

  return (
    <Panel
      title={formatMessage({ id: 'sqlAccess.SqlAccess', defaultMessage: 'SQL access' })}
      sub={formatMessage({
        id: 'sqlAccess.LuciusCanReadThisDatabaseDirectlyReadOnlyAndNeverYourCredentials',
        defaultMessage:
          'Lucius can read this database directly — read-only, and never your credentials',
      })}
      actions={
        <Btn
          size="xs"
          variant="ghost"
          onClick={() => {
            void log.refresh()
            toast(formatMessage({ id: 'sqlAccess.Refreshed', defaultMessage: 'Refreshed' }))
          }}
        >
          {formatMessage({ id: 'sqlAccess.Refresh', defaultMessage: 'Refresh' })}
        </Btn>
      }
    >
      {/* Each child below is its own bordered section — see the layout note at the top. */}
      {row(
        formatMessage({ id: 'sqlAccess.DirectSqlReads', defaultMessage: 'Direct SQL reads' }),
        enabled
          ? formatMessage({
              id: 'sqlAccess.LuciusMayRunASingleReadOnlySelectForQuestionsTheOrdinaryToolsCannotExpressWritesAndCredentialTablesAreRefusedByTheDatabaseItself',
              defaultMessage:
                'Lucius may run a single read-only SELECT for questions the ordinary tools cannot express. Writes and credential tables are refused by the database itself.',
            })
          : formatMessage({
              id: 'sqlAccess.BlockedLuciusFallsBackToTheOrdinaryReadTools',
              defaultMessage: 'Blocked. Lucius falls back to the ordinary read tools.',
            }),
        <Toggle
          on={enabled}
          disabled={!config.data}
          onChange={(v) => void setEnabled(v)}
          label={formatMessage({
            id: 'sqlAccess.DirectSqlReads',
            defaultMessage: 'Direct SQL reads',
          })}
        />,
      )}

      {enabled && unavailable
        ? row(
            formatMessage({
              id: 'sqlAccess.NotWorkingOnThisDatabase',
              defaultMessage: 'Not working on this database',
            }),
            <>
              {formatMessage(
                {
                  id: 'sqlAccess.cannotRun',
                  defaultMessage: "Lucius can't run SQL right now: {reason}",
                },
                {
                  reason: localizedReason(
                    config.data?.reason ?? '',
                    config.data?.reason_message,
                    intl,
                  ),
                },
              )}
              {fix
                ? formatMessage({
                    id: 'sqlAccess.RunThisOnceAsADatabaseAdminItStartsWorkingWithinAMinuteNoRestartNeeded',
                    defaultMessage:
                      ' Run this once as a database admin; it starts working within a minute, no restart needed.',
                  })
                : null}
            </>,
            <Badge tone="warn">
              {formatMessage({ id: 'sqlAccess.Unavailable', defaultMessage: 'Unavailable' })}
            </Badge>,
          )
        : null}
      {enabled && unavailable && fix ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code className="rd-code" style={{ flex: 1, minWidth: 0 }}>
            {fix}
          </code>
          <Btn
            size="xs"
            onClick={() => {
              void navigator.clipboard
                .writeText(fix)
                .then(() =>
                  toast(formatMessage({ id: 'sqlAccess.Copied', defaultMessage: 'Copied' })),
                )
                .catch(() =>
                  toast(
                    formatMessage({
                      id: 'sqlAccess.CouldNotCopySelectTheCommandManually',
                      defaultMessage: 'Could not copy — select the command manually',
                    }),
                  ),
                )
            }}
          >
            {formatMessage({ id: 'sqlAccess.Copy', defaultMessage: 'Copy' })}
          </Btn>
        </div>
      ) : null}

      {log.error && !log.data ? (
        <Empty
          title={formatMessage({
            id: 'sqlAccess.CouldNotLoadTheQueryLog',
            defaultMessage: 'Could not load the query log',
          })}
          body={formatMessage({
            id: 'sqlAccess.TheServerDidNotAnswer',
            defaultMessage: 'The server did not answer.',
          })}
          action={
            <Btn size="xs" onClick={() => void log.refresh()}>
              {formatMessage({ id: 'sqlAccess.Retry', defaultMessage: 'Retry' })}
            </Btn>
          }
        />
      ) : log.initialLoading && !log.data ? (
        <span className="rd-help">
          {formatMessage({ id: 'sqlAccess.Loading', defaultMessage: 'Loading…' })}
        </span>
      ) : queries.length === 0 ? (
        <Empty
          title={formatMessage({ id: 'sqlAccess.NoQueriesYet', defaultMessage: 'No queries yet' })}
          body={
            enabled
              ? formatMessage({
                  id: 'sqlAccess.NothingHasBeenAskedOfTheDatabaseDirectlyAskLuciusSomethingTheOrdinaryToolsCanTAnswerAndItWillShowUpHere',
                  defaultMessage:
                    "Nothing has been asked of the database directly. Ask Lucius something the ordinary tools can't answer and it will show up here.",
                })
              : formatMessage({
                  id: 'sqlAccess.SqlAccessIsOffSoNothingCanRun',
                  defaultMessage: 'SQL access is off, so nothing can run.',
                })
          }
        />
      ) : (
        /* NOT wrapped in a div. `.rd-panel-body > *` gives every DIRECT child its padding
           and bottom divider, and `display: contents` on a wrapper does not help — it
           removes the wrapper's box, so the padding that rule applied is discarded and the
           children end up flush against the panel edge. An array renders its items as
           siblings, so each label/row below is a real direct child and is styled by the
           panel exactly like the toggle row above it. */
        <>
          <div className="rd-bars-lbl">
            {formatMessage({ id: 'sqlAccess.RecentQueries', defaultMessage: 'Recent queries' })}
          </div>
          {queries.map((q) => (
            <QueryRow key={q.id} q={q} />
          ))}
        </>
      )}
    </Panel>
  )
}
