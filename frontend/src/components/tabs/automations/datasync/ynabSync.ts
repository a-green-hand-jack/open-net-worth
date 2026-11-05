import { useRuns, type RunSummary } from '../../imports/runs'
import { INTERVAL_LABELS, useSyncStatus, type SyncStatus } from '../../imports/sync'
import type { IntlShape } from 'react-intl'

// The YNAB data sync, seen as an Automation. It is a data sync (fixed rules, no AI model), so
// it has no row in the Automations table: its schedule and runs live on /api/ynab/sync and
// /api/imports/runs, and this reads them into the shape the Automations list and detail need.

export const YNAB_SYNC_KEY = 'ynab'
/** The feature flag the plan import and the sync ship behind (core/feature_flags.py). */
export const YNAB_FLAG = 'ynab_import_and_sync'
export const YNAB_SYNC_NAME = 'YNAB'
export const YNAB_SYNC_BLURB =
  'Transactions and each month’s Assigned, in step with your YNAB plan.'

/** Where setup stands: each step needs the one before it. `enable` is imported but never turned
 * on (no plan chosen yet); `off` is turned off after that, so it keeps its plan. */
export type YnabSyncStage = 'connect' | 'import' | 'enable' | 'off' | 'on'

export interface YnabSyncSummary {
  stage: YnabSyncStage
  /** Shown in the Automations list: set up at least as far as an import. */
  adopted: boolean
  status: SyncStatus | undefined
  runs: RunSummary[] | undefined
  /** The plan the sync pairs with: the one it is set to, else the last one imported. */
  planId: string | null
  planName: string | null
  lastImport: RunSummary | null
  toReview: number
  running: boolean
  loading: boolean
}

export function useYnabSync(
  includeArchived = false,
  enabled = true,
): YnabSyncSummary & {
  refresh: () => void
  error: unknown
} {
  const sync = useSyncStatus(enabled)
  const runs = useRuns('ynab', includeArchived, enabled)
  const status = sync.data
  const lastImport =
    runs.data?.find((r) => r.kind === 'import' && r.status === 'done' && !r.archived_at) ?? null
  const stage: YnabSyncStage = !status?.token_saved
    ? 'connect'
    : status.enabled
      ? 'on'
      : status.plan_id
        ? 'off'
        : lastImport
          ? 'enable'
          : 'import'
  return {
    stage,
    adopted: stage === 'on' || stage === 'off' || stage === 'enable',
    status,
    runs: runs.data,
    planId: status?.plan_id ?? lastImport?.plan_id ?? null,
    planName: status?.plan_name ?? lastImport?.plan_name ?? null,
    lastImport,
    toReview: status?.conflicts.length ?? 0,
    running: !!status?.running || !!runs.data?.some((r) => r.status === 'running'),
    loading: sync.initialLoading || runs.initialLoading,
    error: sync.error ?? runs.error,
    refresh: () => {
      void sync.refresh()
      void runs.refresh()
    },
  }
}

export function scheduleLabel(status: SyncStatus | undefined, intl?: IntlShape): string {
  if (intl && !intl.locale.startsWith('en')) {
    if (!status?.enabled)
      return intl.formatMessage({ id: 'automations.sync.off', defaultMessage: 'Off' })
    switch (status.interval) {
      case '15m':
        return intl.formatMessage({
          id: 'automations.sync.every15',
          defaultMessage: 'Every 15 minutes',
        })
      case '30m':
        return intl.formatMessage({
          id: 'automations.sync.every30',
          defaultMessage: 'Every 30 minutes',
        })
      case '1h':
        return intl.formatMessage({
          id: 'automations.sync.everyHour',
          defaultMessage: 'Every hour',
        })
      case '6h':
        return intl.formatMessage({
          id: 'automations.sync.every6',
          defaultMessage: 'Every 6 hours',
        })
      case 'daily':
        return intl.formatMessage({ id: 'automations.sync.daily', defaultMessage: 'Once a day' })
      case 'manual':
        return intl.formatMessage({ id: 'automations.sync.manual', defaultMessage: 'Manual only' })
    }
  }
  if (!status?.enabled) return 'Off'
  return INTERVAL_LABELS[status.interval] ?? status.interval
}

export function syncDirectionLabel(intl: IntlShape, direction: SyncStatus['direction']): string {
  switch (direction) {
    case 'both':
      return intl.formatMessage({ id: 'automations.sync.both', defaultMessage: 'Both ways' })
    case 'from_ynab':
      return intl.formatMessage({ id: 'automations.sync.from', defaultMessage: 'From YNAB' })
    case 'to_ynab':
      return intl.formatMessage({ id: 'automations.sync.to', defaultMessage: 'To YNAB' })
    default:
      return direction
  }
}
