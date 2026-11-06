import { useAppIntl } from '../../../../i18n/useAppIntl'
import { Clock3 } from 'lucide-react'
import { ErrorState, TabSkeleton } from '../../../ui'
import { KeepAwakeBanner } from '../KeepAwakeBanner'
import { DataSyncCard } from './DataSyncCard'
import { YNAB_SYNC_NAME, type YnabSyncSummary } from './ynabSync'
import { YnabMark } from './YnabMark'

// The Data sync view of Automations: syncs that keep this book and another app in step by fixed
// rules, with no AI involved. Today only the YNAB sync; the ones not set up yet are
// offered below the ones that are.
export function DataSyncView({
  sync,
  onOpen,
}: {
  sync: YnabSyncSummary & { refresh: () => void; error: unknown }
  onOpen: () => void
}) {
  const { formatMessage } = useAppIntl()
  if (sync.loading) {
    return (
      <div className="a3-wrap">
        <TabSkeleton
          variant="automations"
          label={formatMessage({
            id: 'automations.sync.loading',
            defaultMessage: 'Loading data syncs…',
          })}
          header={false}
        />
      </div>
    )
  }
  if (sync.error) {
    return (
      <div className="a3-wrap">
        <ErrorState
          title={formatMessage({
            id: 'automations.sync.loadError',
            defaultMessage: 'Data syncs couldn’t load',
          })}
          message={
            sync.error instanceof Error
              ? sync.error.message
              : formatMessage({
                  id: 'automations.sync.retry',
                  defaultMessage: 'Try again in a moment.',
                })
          }
          onRetry={sync.refresh}
        />
      </div>
    )
  }
  return (
    <div className="a3-wrap" data-od-id="data-sync-list">
      <KeepAwakeBanner />
      {sync.adopted ? (
        <div className="a3-list">
          <DataSyncCard sync={sync} onOpen={onOpen} onChanged={sync.refresh} />
        </div>
      ) : (
        <div className="a3-empty">
          {formatMessage({
            id: 'automations.sync.empty',
            defaultMessage:
              'No data syncs yet. Pick one below to bring your history in and keep it in step.',
          })}
        </div>
      )}
      {!sync.adopted && (
        <section className="a3-tpl-section" aria-labelledby="data-sync-available-heading">
          <div className="a3-sec-label" id="data-sync-available-heading">
            {formatMessage({ id: 'automations.sync.add', defaultMessage: 'Add a data sync' })}
            <span className="rule" />
          </div>
          <div className="a3-tpl-grid">
            <button
              type="button"
              className="a3-tpl"
              aria-label={formatMessage(
                { id: 'automations.sync.setup', defaultMessage: 'Set up {name}' },
                { name: YNAB_SYNC_NAME },
              )}
              onClick={onOpen}
            >
              <YnabMark />
              <span className="a3-tpl-body">
                <span className="a3-tpl-title">{YNAB_SYNC_NAME}</span>
                <span className="a3-tpl-blurb">
                  {formatMessage({
                    id: 'automations.sync.blurb',
                    defaultMessage:
                      'Transactions and each month’s Assigned, in step with your YNAB plan.',
                  })}
                </span>
                <span className="a3-tpl-when">
                  <Clock3 size={11} aria-hidden="true" />{' '}
                  {formatMessage({
                    id: 'automations.sync.everyHour',
                    defaultMessage: 'Every hour',
                  })}
                </span>
              </span>
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
