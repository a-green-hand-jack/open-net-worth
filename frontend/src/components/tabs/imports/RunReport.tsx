import { importLog, importPhase, importOutcome } from './importMessages'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { ynabMessage } from '../automations/datasync/ynabMessages'
import { formatImportCount, runKind, runStatus } from './labels'
import { FormattedMessage } from './FormattedMessage'
import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Badge,
  Button,
  Cluster,
  ErrorState,
  Meter,
  Modal,
  Panel,
  Skeleton,
  Stack,
  SummaryBar,
  Text,
} from '../../ui'
import { fTime } from '../../../utils/format'
import { ProblemList, ResultsTable, VerificationBody } from './ReportTables'
import { SyncSections } from './SyncReport'
import {
  STATUS_TONE,
  formatDuration,
  formatWhen,
  setArchived,
  useRun,
  type Preview,
  type RunRecord,
} from './runs'

// One run, opened as a page. A running run polls and fills in as it goes; a failed or
// interrupted one shows everything it captured before it stopped.
/** Everything under a run's header: its facts, outcome, problems, sections and log. */
function RunReportBody({ r }: { r: RunRecord }) {
  const intl = useAppIntl()
  return (
    <>
      <SummaryBar
        cards={[
          { label: intl.formatMessage({ id: "imports.field.9bf613e7", defaultMessage: "Kind" }), value: runKind(r.kind, intl) },
          { label: intl.formatMessage({ id: "imports.field.d5d636c1", defaultMessage: "Trigger" }), value: intl.formatMessage({ id: 'imports.run.trigger', defaultMessage: '{trigger, select, scheduled {Scheduled} other {Manual}}' }, { trigger: r.trigger }) },
          { label: intl.formatMessage({ id: "imports.field.7b2baf46", defaultMessage: "Started" }), value: formatWhen(r.started_at) },
          { label: intl.formatMessage({ id: "imports.field.7f29e296", defaultMessage: "Duration" }), value: formatDuration(r, intl) },
          { label: intl.formatMessage({ id: "imports.field.7d68f443", defaultMessage: "Plan" }), value: r.plan_name || r.plan_id },
          ...(r.kind === 'sync' && r.requests_used != null
            ? [{ label: intl.formatMessage({ id: "imports.field.49e685dc", defaultMessage: "YNAB requests" }), value: String(r.requests_used) }]
            : []),
        ]}
      />
      {r.outcome && <Text size="sm">{importOutcome(intl, r.outcome_message, ynabMessage(intl, r.outcome_message, r.outcome))}</Text>}
      {r.status === 'failed' && <ErrorState title={intl.formatMessage({ id: "imports.field.5d814532", defaultMessage: "This run failed" })} message={r.error} />}
      {r.status === 'interrupted' && (
        <Text size="sm" tone="warn">
          {r.error}
        </Text>
      )}
      {r.status === 'running' && <Progress run={r} />}
      <Sections run={r} />
      <Log run={r} />
    </>
  )
}

/** One run's report, as a modal over the page it was opened from (the YNAB data sync), so
 *  closing it returns to the step the user was on. The caller keeps it in the URL. */
export function RunReportModal({ runId, onClose }: { runId: string; onClose: () => void }) {
  const intl = useAppIntl()
  const run = useRun(runId)
  const [actionError, setActionError] = useState<string | null>(null)
  const r = run.data

  async function toggleArchive(rec: RunRecord) {
    setActionError(await setArchived(rec.id, !rec.archived_at, intl))
    void run.refresh()
  }

  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={
        r ? (
          <Cluster gap="--space-3">
            {`${runKind(r.kind, intl)} · ${r.plan_name || r.plan_id}`}
            <Badge tone={STATUS_TONE[r.status]}>{runStatus(r.status, intl)}</Badge>
          </Cluster>
        ) : (
          intl.formatMessage({ id: 'imports.run.report', defaultMessage: 'Run report' })
        )
      }
      headerActions={
        r ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={r.status === 'running'}
            onClick={() => void toggleArchive(r)}
          >
            {intl.formatMessage({ id: 'imports.run.archive', defaultMessage: '{archived, select, yes {Unarchive} other {Archive}}' }, { archived: r.archived_at ? 'yes' : 'no' })}
          </Button>
        ) : undefined
      }
    >
      {run.error ? (
        <ErrorState
          message={run.error instanceof Error ? run.error.message : intl.formatMessage({ id: "imports.field.22857cd3", defaultMessage: "Could not load that run." })}
          onRetry={() => void run.refresh()}
        />
      ) : !r ? (
        <Skeleton height={160} />
      ) : (
        <Stack gap="--space-6">
          {actionError && (
            <Text size="sm" tone="bad">
              {actionError}
            </Text>
          )}
          <RunReportBody r={r} />
        </Stack>
      )}
    </Modal>
  )
}

function Progress({ run }: { run: RunRecord }) {
  const intl = useAppIntl()
  const { done, total } = run.progress
  return (
    <Panel title={intl.formatMessage({ id: "imports.field.db779010", defaultMessage: "Progress" })}>
      <Stack gap="--space-2">
        <Text size="sm" weight={600}>
          {importPhase(intl, run.phase_message, ynabMessage(intl, run.phase_message, run.phase))}
        </Text>
        {total > 0 && (
          <Meter
            value={(done / total) * 100}
            ariaLabel={intl.formatMessage({ id: "imports.field.2e1c6702", defaultMessage: "Run progress" })}
            valueText={intl.formatMessage({ id: 'imports.run.progress', defaultMessage: '{done} of {total}' }, { done: formatImportCount(done), total: formatImportCount(total) })}
          />
        )}
      </Stack>
    </Panel>
  )
}

function Sections({ run }: { run: RunRecord }) {
  const intl = useAppIntl()
  if (run.kind === 'sync') return <SyncSections run={run} />
  const problems = [...run.problems, ...run.warnings]
  return (
    <>
      {run.kind === 'import' && <Setup run={run} />}
      {run.kind === 'preview' && run.preview && <WouldCreate preview={run.preview} />}
      {run.kind === 'import' && (
        <Panel title={intl.formatMessage({ id: "imports.field.501edd88", defaultMessage: "Results" })}>
          <ResultsTable counts={run.counts} />
        </Panel>
      )}
      {problems.length > 0 && (
        <Panel title={intl.formatMessage({ id: "imports.field.061add90", defaultMessage: "Needs attention" })} badge={problems.length}>
          <ProblemList problems={problems} />
        </Panel>
      )}
      {run.verification && (
        <Panel
          title={intl.formatMessage({ id: "imports.field.42c01ef3", defaultMessage: "Verification" })}
          subtitle={intl.formatMessage({ id: 'imports.checksSummary', defaultMessage: '{total} checks, {matching} match' }, { total: formatImportCount(run.verification.checks_total), matching: formatImportCount(run.verification.checks_matching) })}
        >
          <VerificationBody verification={run.verification} />
        </Panel>
      )}
    </>
  )
}

function Setup({ run }: { run: RunRecord }) {
  const intl = useAppIntl()
  const navigate = useNavigate()
  return (
    <Panel title={intl.formatMessage({ id: "imports.field.e4dc7934", defaultMessage: "Setup" })}>
      <Stack gap="--space-2">
        <Text size="sm">{run.book_state ? intl.formatMessage({ id: 'imports.bookState', defaultMessage: '{state, select, fresh {First import} rerun {Re-import of this plan} other {Import alongside existing accounts}}' }, { state: run.book_state }) : '—'}</Text>
        {run.backup_name && (
          <Cluster gap="--space-2">
            <Text size="sm">{intl.formatMessage({ id: 'imports.backupTaken', defaultMessage: 'Backup taken first: {name}.' }, { name: run.backup_name })}</Text>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void navigate({ to: '/settings', search: { sub: 'data' } } as never)}
            >
              {<FormattedMessage id="imports.static.5d0a812b" defaultMessage={"Settings › Data"} />}
            </Button>
          </Cluster>
        )}
      </Stack>
    </Panel>
  )
}

function WouldCreate({ preview: p }: { preview: Preview }) {
  const intl = useAppIntl()
  return (
    <Panel title={intl.formatMessage({ id: "imports.field.ff25fdfb", defaultMessage: "Would create" })} subtitle={intl.formatMessage({ id: "imports.field.60cf3e48", defaultMessage: "Nothing was written." })}>
      <SummaryBar
        cards={[
          { label: intl.formatMessage({ id: "imports.field.33befcfa", defaultMessage: "Accounts" }), value: formatImportCount(p.accounts.length) },
          { label: intl.formatMessage({ id: "imports.field.f299c1b4", defaultMessage: "Transactions" }), value: formatImportCount(p.transactions) },
          { label: intl.formatMessage({ id: "imports.field.75ae45b8", defaultMessage: "Categories" }), value: formatImportCount(p.categories), caption: intl.formatMessage({ id: 'imports.groupCount', defaultMessage: '{count} groups' }, { count: formatImportCount(p.groups) }) },
          { label: intl.formatMessage({ id: "imports.field.0f0871a5", defaultMessage: "Budget months" }), value: formatImportCount(p.budget_months) },
        ]}
      />
    </Panel>
  )
}

function Log({ run }: { run: RunRecord }) {
  const intl = useAppIntl()
  if (run.log.length === 0) return null
  const live = run.status === 'running'
  return (
    <Panel title={intl.formatMessage({ id: "imports.field.b7722e25", defaultMessage: "Log" })} collapsible defaultCollapsed={!live} key={live ? 'live' : 'done'}>
      <Stack gap="--space-1">
        {run.log.map((e, i) => (
          <Text key={i} size="xs" tone="faint">
            {fTime(new Date(e.at))} · {importLog(intl, e.line_message, e.line)}
          </Text>
        ))}
      </Stack>
    </Panel>
  )
}
