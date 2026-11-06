import { useState, type ReactNode } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { Ic, Spark, I_CHECK, I_WARN } from './importIcons'

export interface BookedResult {
  created: number
  merged?: number
  duplicates: number
  skipped: number
  accounts: number
  transfers?: number
  batchId?: string | null
  /** Linked entries that were already waiting for review — a link doesn't clear the flag. */
  linkedNeedsReview?: number
  deleted?: number
  /** Rows the user (or a default) left out in the review — the "leave out N" it showed. */
  leftOut?: number
  /** Rows the reader skipped from the file; never a decision of the user's. */
  unreadable?: number
}

export interface UndoOutcome {
  deleted: number
  unmerged: number
  /** Ledger entries the import had deleted, brought back. */
  restored?: number
}

export interface BookedScreenProps {
  result: BookedResult
  filename: string
  /** "Account · period · N rows" under the title — already joined by the caller. */
  context: string
  deleteErrors: Array<{ id: string; error: string }>
  refusedDuplicates: Array<{ date?: string | null; description?: string | null }>
  taught: boolean
  reviewMarkState: 'idle' | 'pending' | 'done'
  reviewMarkError: string
  onMarkAllReviewed?: () => void
  onViewInRegister?: () => void
  onUndo?: (batchId: string) => Promise<UndoOutcome>
  onReviewAgain: () => void
  onImportAnother: () => void
  onDone: () => void
}

type UndoState = 'idle' | 'confirm' | 'pending' | 'error'

export function BookedScreen(p: BookedScreenProps) {
  const { formatMessage } = useAppIntl()
  const [undo, setUndo] = useState<UndoState>('idle')
  const [undoError, setUndoError] = useState('')
  const [undone, setUndone] = useState<UndoOutcome | null>(null)
  const r = p.result
  const linked = r.merged ?? 0
  const transfers = r.transfers ?? 0
  const batchId = r.batchId
  const linkedToReview = r.linkedNeedsReview ?? 0
  const toReview = [
    r.created > 0 ? formatMessage({ id: 'accounts.booked.newRows', defaultMessage: '{count, plural, one {# new row} other {# new rows}}' }, { count: r.created }) : '',
    linkedToReview > 0 ? formatMessage({ id: 'accounts.booked.linkedEntries', defaultMessage: '{count, plural, one {# linked entry} other {# linked entries}}' }, { count: linkedToReview }) : '',
  ].filter(Boolean)

  async function runUndo() {
    if (!batchId || !p.onUndo) return
    setUndo('pending')
    setUndoError('')
    try {
      setUndone(await p.onUndo(batchId))
    } catch (e) {
      setUndo('error')
      setUndoError(e instanceof Error && e.message ? e.message : formatMessage({ id: 'accounts.booked.undoFailed', defaultMessage: 'Could not undo — try again.' }))
    }
  }

  if (undone) return <UndoneScreen {...p} undone={undone} />

  return (
    <div className="imp3-booked">
      <div className="imp3-booked-head">
        <span className="imp3-booked-ic">
          <Ic d={I_CHECK} size={16} sw={2.6} />
        </span>
        <div className="imp3-booked-titles">
          <div className="imp3-booked-t">{formatMessage({ id: 'accounts.booked.imported', defaultMessage: 'Imported {filename}' }, { filename: p.filename })}</div>
          {p.context && <div className="imp3-booked-sub">{p.context}</div>}
        </div>
      </div>

      <div className="imp3-booked-stats">
        <Stat n={r.created} label={formatMessage({ id: 'accounts.booked.added', defaultMessage: 'added' })} sub={transfers > 0 ? formatMessage({ id: 'accounts.booked.asTransfers', defaultMessage: '{count} as transfers' }, { count: transfers }) : ''} />
        <Stat n={linked} label={formatMessage({ id: 'accounts.booked.linked', defaultMessage: 'linked' })} sub={formatMessage({ id: 'accounts.booked.toExisting', defaultMessage: 'to entries you had' })} />
        <Stat n={r.leftOut ?? r.skipped} label={formatMessage({ id: 'accounts.booked.leftOut', defaultMessage: 'left out' })} sub={formatMessage({ id: 'accounts.booked.byYou', defaultMessage: 'by you' })} />
      </div>

      <div className="imp3-booked-lines">
        {(r.unreadable ?? 0) > 0 && (
          <div className="imp3-booked-line">
            <span className="imp3-booked-bullet" aria-hidden="true" />
            <span>
              {formatMessage({ id: 'accounts.booked.unreadable', defaultMessage: '{count, plural, one {# row in the file was skipped when it was read} other {# rows in the file were skipped when it was read}}' }, { count: r.unreadable ?? 0 })}
            </span>
          </div>
        )}
        {r.duplicates > 0 && (
          <div className="imp3-booked-line">
            <span className="imp3-booked-bullet" aria-hidden="true" />
            <span>{formatMessage({ id: 'accounts.booked.duplicate', defaultMessage: '{count, plural, one {# row already imported earlier — skipped} other {# rows already imported earlier — skipped}}' }, { count: r.duplicates })}</span>
          </div>
        )}
        {(r.deleted ?? 0) > 0 && (
          <div className="imp3-booked-line">
            <span className="imp3-booked-bullet" aria-hidden="true" />
            <span>{formatMessage({ id: 'accounts.booked.deleted', defaultMessage: '{count, plural, one {# row deleted from your ledger, as you marked} other {# rows deleted from your ledger, as you marked}}' }, { count: r.deleted ?? 0 })}</span>
          </div>
        )}
        {p.refusedDuplicates.length > 0 && (
          <WarnLine>
            {formatMessage({ id: 'accounts.booked.refused', defaultMessage: '{count, plural, one {# row not imported — already in your ledger:} other {# rows not imported — already in your ledger:}}' }, { count: p.refusedDuplicates.length })}{' '}
            {p.refusedDuplicates
              .map((d) => `${d.date ?? ''} ${d.description ?? ''}`.trim() || formatMessage({ id: 'accounts.booked.unnamed', defaultMessage: '(unnamed row)' }))
              .join('; ')}
          </WarnLine>
        )}
        {p.deleteErrors.length > 0 && (
          <WarnLine>
            {formatMessage({ id: 'accounts.booked.deleteErrors', defaultMessage: '{count, plural, one {# marked transaction could not be deleted —} other {# marked transactions could not be deleted —}}' }, { count: p.deleteErrors.length })}{' '}
            {p.deleteErrors.map((e) => e.error).join('; ')}
          </WarnLine>
        )}
        {toReview.length > 0 && batchId && p.onMarkAllReviewed && (
          <div className="imp3-booked-line review">
            {p.reviewMarkState === 'done' ? (
              <span className="imp3-booked-good">{formatMessage({ id: 'accounts.booked.reviewed', defaultMessage: '✓ {items} marked reviewed' }, { items: toReview.join(formatMessage({ id: 'accounts.booked.join', defaultMessage: ' and ' })) })}</span>
            ) : (
              <>
                <span>
                  {formatMessage({ id: 'accounts.booked.needsReview', defaultMessage: '{count, plural, one {{items} needs review in the register} other {{items} need review in the register}}' }, { count: r.created + linkedToReview, items: toReview.join(formatMessage({ id: 'accounts.booked.join', defaultMessage: ' and ' })) })}
                </span>
                <button
                  type="button"
                  className="imp3-done-review-btn"
                  disabled={p.reviewMarkState === 'pending'}
                  onClick={p.onMarkAllReviewed}
                >
                  {p.reviewMarkState === 'pending' ? formatMessage({ id: 'accounts.booked.marking', defaultMessage: 'Marking…' }) : formatMessage({ id: 'accounts.booked.markAll', defaultMessage: 'Mark all reviewed' })}
                </button>
              </>
            )}
          </div>
        )}
        {p.taught && (
          <div className="imp3-booked-line lucius">
            <Spark size={14} />
            <span>{formatMessage({ id: 'accounts.booked.taught', defaultMessage: 'Lucius saved your instruction — the next import applies it automatically.' })}</span>
          </div>
        )}
        {p.reviewMarkError && <div className="imp3-done-err">{p.reviewMarkError}</div>}
      </div>

      {(undo === 'confirm' || undo === 'pending' || undo === 'error') && (
        <div className="imp3-undo" role="alertdialog" aria-label={formatMessage({ id: 'accounts.booked.undoQuestion', defaultMessage: 'Undo this import?' })}>
          <div className="imp3-undo-t">{formatMessage({ id: 'accounts.booked.undoQuestion', defaultMessage: 'Undo this import?' })}</div>
          <div className="imp3-undo-d">
            {formatMessage({ id: 'accounts.booked.undoAdded', defaultMessage: 'The {count, plural, one {# added row is} other {# added rows are}} removed' }, { count: r.created })}
            {linked > 0 && formatMessage({ id: 'accounts.booked.undoLinked', defaultMessage: ' and the {count, plural, one {# linked entry goes back to how it was} other {# linked entries go back to how they were}}' }, { count: linked })}
            {formatMessage({ id: 'accounts.booked.undoStatement', defaultMessage: '. The statement returns to Ready to review.' })}
            {(r.deleted ?? 0) > 0 && formatMessage({ id: 'accounts.booked.undoDeleted', defaultMessage: ' The {count, plural, one {# entry you deleted comes} other {# entries you deleted come}} back.' }, { count: r.deleted ?? 0 })}
          </div>
          {undo === 'error' && <div className="imp3-done-err">{undoError}</div>}
          <div className="imp3-undo-acts">
            <button
              type="button"
              className="imp3-btn2"
              disabled={undo === 'pending'}
              onClick={() => setUndo('idle')}
            >
              {formatMessage({ id: 'accounts.booked.keep', defaultMessage: "Keep it" })}
            </button>
            <button
              type="button"
              className="imp3-undo-go"
              disabled={undo === 'pending'}
              onClick={runUndo}
            >
              {undo === 'pending' ? formatMessage({ id: 'accounts.booked.undoing', defaultMessage: "Undoing…" }) : formatMessage({ id: 'accounts.booked.undo', defaultMessage: "Undo import" })}
            </button>
          </div>
        </div>
      )}

      <div className="imp3-booked-foot">
        <div className="imp3-booked-foot-l">
          {batchId && p.onUndo && undo === 'idle' && (
            <button type="button" className="imp3-undo-btn" onClick={() => setUndo('confirm')}>
              {formatMessage({ id: 'accounts.booked.undo', defaultMessage: "Undo import" })}
            </button>
          )}
          <button type="button" className="imp3-done-another" onClick={p.onImportAnother}>
            {formatMessage({ id: 'accounts.booked.another', defaultMessage: "Import another" })}
          </button>
        </div>
        <div className="imp3-booked-foot-r">
          {batchId && p.onViewInRegister && (
            <button type="button" className="imp3-btn2" onClick={p.onViewInRegister}>
              {formatMessage({ id: 'accounts.booked.register', defaultMessage: "View in register" })}
            </button>
          )}
          <button type="button" className="imp3-lubtn" onClick={p.onDone}>
            {formatMessage({ id: 'accounts.booked.done', defaultMessage: "Done" })}
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ n, label, sub }: { n: number; label: string; sub: string }) {
  return (
    <div className="imp3-booked-stat">
      <div className="imp3-booked-n">{n}</div>
      <div className="imp3-booked-l">{label}</div>
      <div className="imp3-booked-s">{sub || ' '}</div>
    </div>
  )
}

function WarnLine({ children }: { children: ReactNode }) {
  return (
    <div className="imp3-booked-line warn">
      <Ic d={I_WARN} size={14} />
      <span>{children}</span>
    </div>
  )
}

function UndoneScreen(p: BookedScreenProps & { undone: UndoOutcome }) {
  const { formatMessage } = useAppIntl()
  const { deleted, unmerged, restored = 0 } = p.undone
  const parts = [formatMessage({ id: 'accounts.booked.removedRows', defaultMessage: '{count, plural, one {# row removed} other {# rows removed}}' }, { count: deleted })]
  if (unmerged > 0) parts.push(formatMessage({ id: 'accounts.booked.restoredEntries', defaultMessage: '{count, plural, one {# entry restored} other {# entries restored}}' }, { count: unmerged }))
  if (restored > 0) parts.push(formatMessage({ id: 'accounts.booked.deletedEntriesBack', defaultMessage: '{count, plural, one {# deleted entry back} other {# deleted entries back}}' }, { count: restored }))
  return (
    <div className="imp3-booked">
      <div className="imp3-booked-head">
        <span className="imp3-booked-ic undone">
          <Ic d={I_CHECK} size={16} sw={2.6} />
        </span>
        <div className="imp3-booked-titles">
          <div className="imp3-booked-t">{formatMessage({ id: 'accounts.booked.undoneTitle', defaultMessage: "Import undone" })}</div>
          <div className="imp3-booked-sub">
            {formatMessage({ id: 'accounts.booked.undoneSummary', defaultMessage: '{parts}. {filename} is ready to review again.' }, { parts: parts.join(' · '), filename: p.filename })}
          </div>
        </div>
      </div>
      <div className="imp3-booked-foot">
        <div className="imp3-booked-foot-l" />
        <div className="imp3-booked-foot-r">
          <button type="button" className="imp3-btn2" onClick={p.onDone}>
            {formatMessage({ id: 'accounts.booked.done', defaultMessage: "Done" })}
          </button>
          <button type="button" className="imp3-lubtn" onClick={p.onReviewAgain}>
            {formatMessage({ id: 'accounts.booked.reviewAgain', defaultMessage: "Review again" })}
          </button>
        </div>
      </div>
    </div>
  )
}
