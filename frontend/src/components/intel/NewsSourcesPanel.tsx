import { useAppIntl } from '../../i18n/useAppIntl'
import { FormattedMessage } from './FormattedMessage'
import { useCallback, useEffect, useState } from 'react'
import { useDataVersion } from '../../hooks/useDataVersion'
import { authFetch } from '../../api/client'
import { Button, EmptyState, ErrorState, Loading, Text } from '../ui'
import { ConfirmDialog } from './ConfirmDialog'
import type { ConfirmSpec } from './ConfirmDialog'
import { AddNewsSourceForm } from './AddNewsSourceForm'
import { NewsSourceRow } from './NewsSourceRow'
import type { NewsSource } from './NewsSourceRow'

type LoadState = 'loading' | 'ready' | 'error'

// Exported so MonitorsWorkspace's "News sources" sub-view (the one real caller, embedded=true)
// renders the SAME subtitle text instead of a second hand-copied literal drifting from this one.
export const NEWS_SOURCES_SUBTITLE =
  'Every feed Lucius checks for headlines, filings, and breaking news — see how fast each one arrives, turn any of them off, or add your own.'

const COL_COUNT = 6

function SectionDivider({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={COL_COUNT}>
        <Text as="div" size="xs" tone="muted" weight={600}>
          {label}
        </Text>
      </td>
    </tr>
  )
}

interface Props {
  /** True when a wrapping view (MonitorsWorkspace's
   * "News sources" settings sub-view) already renders the heading/subtitle — false renders
   * this panel's own, for standalone reuse. */
  embedded?: boolean
}

export function NewsSourcesPanel({ embedded = false }: Props) {
  const intl = useAppIntl()
  const [sources, setSources] = useState<NewsSource[]>([])
  const [state, setState] = useState<LoadState>('loading')
  const [banner, setBanner] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)

  const load = useCallback((quiet = false) => {
    if (!quiet) setState('loading')
    authFetch('/api/intel/sources')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        setSources(Array.isArray(d?.sources) ? d.sources : [])
        setState('ready')
      })
      .catch(() => setState('error'))
  }, [])

  // add/remove/enable_news_sources from Lucius (any surface) → refetch quietly.
  const sourcesV = useDataVersion('news_sources')
  useEffect(() => {
    load(sourcesV > 0)
  }, [load, sourcesV])

  async function patchRow(
    row: NewsSource,
    changes: { enabled?: boolean; cadence?: NewsSource['cadence'] },
  ) {
    // Revert ONLY this row on failure (functional update keyed by id) — a whole-array snapshot
    // would stomp a concurrent optimistic edit on a different row still in flight (review fix).
    setSources((cur) => cur.map((s) => (s.id === row.id ? { ...s, ...changes } : s)))
    setBanner(null)
    try {
      const res = await authFetch(`/api/intel/sources/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      if (!res.ok) {
        setSources((cur) => cur.map((s) => (s.id === row.id ? row : s)))
        setBanner(intl.formatMessage({ id: 'intel.source.updateError', defaultMessage: 'Could not update — try again.' }))
        return
      }
      const updated: NewsSource = await res.json()
      setSources((cur) => cur.map((s) => (s.id === row.id ? updated : s)))
    } catch {
      setSources((cur) => cur.map((s) => (s.id === row.id ? row : s)))
      setBanner(intl.formatMessage({ id: 'intel.source.updateError', defaultMessage: 'Could not update — try again.' }))
    }
  }

  function requestDelete(row: NewsSource) {
    setConfirm({
      title: intl.formatMessage({ id: 'intel.source.deleteTitle', defaultMessage: 'Delete "{name}"?' }, { name: row.label }),
      body: intl.formatMessage({ id: 'intel.source.deleteBody', defaultMessage: "Lucius stops fetching this feed immediately. This can't be undone — you'll need to re-add the URL to bring it back." }),
      confirmLabel: intl.formatMessage({ id: 'intel.source.deleteFeed', defaultMessage: 'Delete feed' }),
      onConfirm: async () => {
        setConfirm(null)
        try {
          const res = await authFetch(`/api/intel/sources/${row.id}`, { method: 'DELETE' })
          if (!res.ok) {
            setBanner(intl.formatMessage({ id: 'intel.source.updateError', defaultMessage: 'Could not update — try again.' }))
            return
          }
          setSources((cur) => cur.filter((s) => s.id !== row.id))
        } catch {
          setBanner(intl.formatMessage({ id: 'intel.source.updateError', defaultMessage: 'Could not update — try again.' }))
        }
      },
    })
  }

  if (state === 'loading') return <Loading label={intl.formatMessage({ id: "intel.field.c7c82f50", defaultMessage: "Loading news sources…" })} />
  if (state === 'error') return <ErrorState message={intl.formatMessage({ id: 'intel.sources.loadFailed', defaultMessage: 'Could not load news sources.' })} onRetry={load} />

  if (sources.length === 0) {
    return (
      <EmptyState
        title={intl.formatMessage({ id: "intel.field.a8c10dd0", defaultMessage: "No sources found" })}
        body={intl.formatMessage({ id: 'intel.sources.missingRegistry', defaultMessage: "Lucius couldn't find its source registry — this usually means the built-in seed didn't run. Try reloading, or check the server logs." })}
        action={
          <Button variant="secondary" size="sm" onClick={() => load()}>
            {<FormattedMessage id="intel.extra.ef217ee7" defaultMessage={"Retry"} />}
          </Button>
        }
      />
    )
  }

  const builtin = sources.filter((s) => s.provenance === 'builtin')
  const user = sources.filter((s) => s.provenance === 'user')

  const body = (
    <>
      <p className="intel-mon-hint">
        {intl.formatMessage({ id: 'intel.sources.latencyHelp', defaultMessage: 'Latency is measured from when a story is published to when Lucius first sees it — median and p75 over the last 7 days. This is about how fast a source arrives, not how often Lucius checks it.' })}
      </p>
      <p className="intel-mon-hint">
        {intl.formatMessage({ id: 'intel.sources.cadenceHelp', defaultMessage: 'Cadence is the fastest Lucius will check a source: Hot ≈ 90 seconds, Fast ≈ 5 minutes, Slow ≈ 30 minutes. Changing it here only affects this one source.' })}
      </p>
      {banner && <div className="intel-wlc-add-err">{banner}</div>}
      <div className="intel-src-table-scroll">
        <table>
          <thead>
            <tr>
              <th>{<FormattedMessage id="intel.static.source_58267a45" defaultMessage={"Source"} />}</th>
              <th>{<FormattedMessage id="intel.static.kind_9bf613e7" defaultMessage={"Kind"} />}</th>
              <th>{<FormattedMessage id="intel.static.cadence_7a2cf140" defaultMessage={"Cadence"} />}</th>
              <th>{<FormattedMessage id="intel.static.health_c9762625" defaultMessage={"Health"} />}</th>
              <th>{<FormattedMessage id="intel.static.on_9c320d6a" defaultMessage={"On"} />}</th>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            <SectionDivider label={intl.formatMessage({ id: 'intel.source.builtInCount', defaultMessage: 'Built-in sources • {count}' }, { count: builtin.length })} />
            {builtin.map((s) => (
              <NewsSourceRow
                key={s.id}
                row={s}
                onToggle={(row, next) => void patchRow(row, { enabled: next })}
                onCadenceChange={(row, next) => void patchRow(row, { cadence: next })}
                onDeleteRequest={requestDelete}
              />
            ))}
            <SectionDivider label={intl.formatMessage({ id: 'intel.source.userCount', defaultMessage: 'Your feeds • {count}' }, { count: user.length })} />
            {user.length === 0 && (
              <tr>
                <td colSpan={COL_COUNT}>
                  <Text size="sm" tone="muted">
                    {<FormattedMessage id="intel.extra.a6c9d12d" defaultMessage={"You haven’t added any feeds yet."} />}
                  </Text>
                </td>
              </tr>
            )}
            {user.map((s) => (
              <NewsSourceRow
                key={s.id}
                row={s}
                onToggle={(row, next) => void patchRow(row, { enabled: next })}
                onCadenceChange={(row, next) => void patchRow(row, { cadence: next })}
                onDeleteRequest={requestDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
      <AddNewsSourceForm userCount={user.length} onAdded={load} />
      {confirm && <ConfirmDialog spec={confirm} onCancel={() => setConfirm(null)} />}
    </>
  )

  if (embedded) return body

  return (
    <div className="intel-mm-sources">
      <h3 className="intel-mm-list-title">{<FormattedMessage id="intel.static.news_sources_e8f821d0" defaultMessage={"News sources"} />}</h3>
      <p className="intel-mm-settings-sub">{NEWS_SOURCES_SUBTITLE}</p>
      {body}
    </div>
  )
}
