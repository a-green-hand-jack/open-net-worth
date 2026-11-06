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
  const { formatMessage: fm } = useAppIntl()
  const [undo, setUndo] = useState<UndoState>('idle')
  const [undoError, setUndoError] = useState('')
  const [undone, setUndone] = useState<UndoOutcome | null>(null)
  const r = p.result
  const linked = r.merged ?? 0
  const transfers = r.transfers ?? 0
  const batchId = r.batchId
  const linkedToReview = r.linkedNeedsReview ?? 0
  const toReview = [
    r.created > 0
      ? fm(
          {
            id: 'import.result.newRows',
            defaultMessage: '{count, plural, one {# new row} other {# new rows}}',
          },
          { count: r.created },
        )
      : '',
    linkedToReview > 0
      ? fm(
          {
            id: 'import.result.linkedEntries',
            defaultMessage: '{count, plural, one {# linked entry} other {# linked entries}}',
          },
          { count: linkedToReview },
        )
      : '',
  ].filter(Boolean)

  async function runUndo() {
    if (!batchId || !p.onUndo) return
    setUndo('pending')
    setUndoError('')
    try {
      setUndone(await p.onUndo(batchId))
    } catch (e) {
      setUndo('error')
      setUndoError(
        e instanceof Error && e.message
          ? e.message
          : fm({ id: 'import.result.undoFailed', defaultMessage: 'Could not undo — try again.' }),
      )
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
          <div className="imp3-booked-t">
            {fm(
              { id: 'import.result.imported', defaultMessage: 'Imported {filename}' },
              { filename: p.filename },
            )}
          </div>
          {p.context && <div className="imp3-booked-sub">{p.context}</div>}
        </div>
      </div>

      <div className="imp3-booked-stats">
        <Stat
          n={r.created}
          label={fm({ id: 'import.result.added', defaultMessage: 'added' })}
          sub={
            transfers > 0
              ? fm(
                  { id: 'import.result.transfers', defaultMessage: '{count} as transfers' },
                  { count: transfers },
                )
              : ''
          }
        />
        <Stat
          n={linked}
          label={fm({ id: 'import.result.linked', defaultMessage: 'linked' })}
          sub={fm({ id: 'import.result.toExisting', defaultMessage: 'to entries you had' })}
        />
        <Stat
          n={r.leftOut ?? r.skipped}
          label={fm({ id: 'import.result.leftOut', defaultMessage: 'left out' })}
          sub={fm({ id: 'import.result.byYou', defaultMessage: 'by you' })}
        />
      </div>

      <div className="imp3-booked-lines">
        {(r.unreadable ?? 0) > 0 && (
          <div className="imp3-booked-line">
            <span className="imp3-booked-bullet" aria-hidden="true" />
            <span>
              {fm(
                {
                  id: 'import.result.unreadable',
                  defaultMessage:
                    '{count, plural, one {# row in the file was} other {# rows in the file were}} skipped when it was read',
                },
                { count: r.unreadable ?? 0 },
              )}
            </span>
          </div>
        )}
        {r.duplicates > 0 && (
          <div className="imp3-booked-line">
            <span className="imp3-booked-bullet" aria-hidden="true" />
            <span>
              {fm(
                {
                  id: 'import.result.duplicates',
                  defaultMessage:
                    '{count, plural, one {# row} other {# rows}} already imported earlier — skipped',
                },
                { count: r.duplicates },
              )}
            </span>
          </div>
        )}
        {(r.deleted ?? 0) > 0 && (
          <div className="imp3-booked-line">
            <span className="imp3-booked-bullet" aria-hidden="true" />
            <span>
              {fm(
                {
                  id: 'import.result.deleted',
                  defaultMessage:
                    '{count, plural, one {# row} other {# rows}} deleted from your ledger, as you marked',
                },
                { count: r.deleted ?? 0 },
              )}
            </span>
          </div>
        )}
        {p.refusedDuplicates.length > 0 && (
          <WarnLine>
            {fm(
              {
                id: 'import.result.refused',
                defaultMessage:
                  '{count, plural, one {# row} other {# rows}} not imported — already in your ledger: ',
              },
              { count: p.refusedDuplicates.length },
            )}
            {p.refusedDuplicates
              .map(
                (d) =>
                  `${d.date ?? ''} ${d.description ?? ''}`.trim() ||
                  fm({ id: 'import.result.unnamed', defaultMessage: '(unnamed row)' }),
              )
              .join('; ')}
          </WarnLine>
        )}
        {p.deleteErrors.length > 0 && (
          <WarnLine>
            {fm(
              {
                id: 'import.result.deleteErrors',
                defaultMessage:
                  '{count, plural, one {# marked transaction} other {# marked transactions}} could not be deleted — ',
              },
              { count: p.deleteErrors.length },
            )}
            {p.deleteErrors.map((e) => e.error).join('; ')}
          </WarnLine>
        )}
        {toReview.length > 0 && batchId && p.onMarkAllReviewed && (
          <div className="imp3-booked-line review">
            {p.reviewMarkState === 'done' ? (
              <span className="imp3-booked-good">
                ✓{' '}
                {fm(
                  { id: 'import.result.markedReviewed', defaultMessage: '{rows} marked reviewed' },
                  {
                    rows: fm(
                      { id: 'import.result.join', defaultMessage: '{items}' },
                      {
                        items: toReview.join(
                          fm({ id: 'import.result.and', defaultMessage: ' and ' }),
                        ),
                      },
                    ),
                  },
                )}
              </span>
            ) : (
              <>
                <span>
                  {fm(
                    {
                      id: 'import.result.needsReview',
                      defaultMessage:
                        '{rows} {count, plural, one {needs} other {need}} review in the register',
                    },
                    {
                      rows: toReview.join(fm({ id: 'import.result.and', defaultMessage: ' and ' })),
                      count: r.created + linkedToReview,
                    },
                  )}
                </span>
                <button
                  type="button"
                  className="imp3-done-review-btn"
                  disabled={p.reviewMarkState === 'pending'}
                  onClick={p.onMarkAllReviewed}
                >
                  {p.reviewMarkState === 'pending'
                    ? fm({ id: 'import.result.marking', defaultMessage: 'Marking…' })
                    : fm({ id: 'import.result.markAll', defaultMessage: 'Mark all reviewed' })}
                </button>
              </>
            )}
          </div>
        )}
        {p.taught && (
          <div className="imp3-booked-line lucius">
            <Spark size={14} />
            <span>
              {fm({
                id: 'import.result.taught',
                defaultMessage:
                  'Lucius saved your instruction — the next import applies it automatically.',
              })}
            </span>
          </div>
        )}
        {p.reviewMarkError && <div className="imp3-done-err">{p.reviewMarkError}</div>}
      </div>

      {(undo === 'confirm' || undo === 'pending' || undo === 'error') && (
        <div
          className="imp3-undo"
          role="alertdialog"
          aria-label={fm({ id: 'import.result.undoTitle', defaultMessage: 'Undo this import?' })}
        >
          <div className="imp3-undo-t">
            {fm({ id: 'import.result.undoTitle', defaultMessage: 'Undo this import?' })}
          </div>
          <div className="imp3-undo-d">
            {fm(
              {
                id: 'import.result.undoAdded',
                defaultMessage:
                  'The {count, plural, one {# added row is} other {# added rows are}} removed',
              },
              { count: r.created },
            )}
            {linked > 0 &&
              fm(
                {
                  id: 'import.result.undoLinked',
                  defaultMessage:
                    ' and the {count, plural, one {# linked entry goes back to how it was} other {# linked entries go back to how they were}}',
                },
                { count: linked },
              )}
            {fm({
              id: 'import.result.undoReady',
              defaultMessage: '. The statement returns to Ready to review.',
            })}
            {(r.deleted ?? 0) > 0 &&
              fm(
                {
                  id: 'import.result.undoDeleted',
                  defaultMessage:
                    ' The {count, plural, one {# entry you deleted comes} other {# entries you deleted come}} back.',
                },
                { count: r.deleted ?? 0 },
              )}
          </div>
          {undo === 'error' && <div className="imp3-done-err">{undoError}</div>}
          <div className="imp3-undo-acts">
            <button
              type="button"
              className="imp3-btn2"
              disabled={undo === 'pending'}
              onClick={() => setUndo('idle')}
            >
              {fm({ id: 'import.result.keep', defaultMessage: 'Keep it' })}
            </button>
            <button
              type="button"
              className="imp3-undo-go"
              disabled={undo === 'pending'}
              onClick={runUndo}
            >
              {undo === 'pending'
                ? fm({ id: 'import.result.undoing', defaultMessage: 'Undoing…' })
                : fm({ id: 'import.result.undo', defaultMessage: 'Undo import' })}
            </button>
          </div>
        </div>
      )}

      <div className="imp3-booked-foot">
        <div className="imp3-booked-foot-l">
          {batchId && p.onUndo && undo === 'idle' && (
            <button type="button" className="imp3-undo-btn" onClick={() => setUndo('confirm')}>
              {fm({ id: 'import.result.undo', defaultMessage: 'Undo import' })}
            </button>
          )}
          <button type="button" className="imp3-done-another" onClick={p.onImportAnother}>
            {fm({ id: 'import.result.another', defaultMessage: 'Import another' })}
          </button>
        </div>
        <div className="imp3-booked-foot-r">
          {batchId && p.onViewInRegister && (
            <button type="button" className="imp3-btn2" onClick={p.onViewInRegister}>
              {fm({ id: 'import.result.register', defaultMessage: 'View in register' })}
            </button>
          )}
          <button type="button" className="imp3-lubtn" onClick={p.onDone}>
            {fm({ id: 'import.result.done', defaultMessage: 'Done' })}
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
  const { formatMessage: fm } = useAppIntl()
  const { deleted, unmerged, restored = 0 } = p.undone
  const parts = [
    fm(
      {
        id: 'import.result.removedRows',
        defaultMessage: '{count, plural, one {# row} other {# rows}} removed',
      },
      { count: deleted },
    ),
  ]
  if (unmerged > 0)
    parts.push(
      fm(
        {
          id: 'import.result.restoredEntries',
          defaultMessage: '{count, plural, one {# entry} other {# entries}} restored',
        },
        { count: unmerged },
      ),
    )
  if (restored > 0)
    parts.push(
      fm(
        {
          id: 'import.result.deletedBack',
          defaultMessage: '{count, plural, one {# deleted entry} other {# deleted entries}} back',
        },
        { count: restored },
      ),
    )
  return (
    <div className="imp3-booked">
      <div className="imp3-booked-head">
        <span className="imp3-booked-ic undone">
          <Ic d={I_CHECK} size={16} sw={2.6} />
        </span>
        <div className="imp3-booked-titles">
          <div className="imp3-booked-t">
            {fm({ id: 'import.result.undone', defaultMessage: 'Import undone' })}
          </div>
          <div className="imp3-booked-sub">
            {fm(
              {
                id: 'import.result.reviewAgainMessage',
                defaultMessage: '{parts}. {filename} is ready to review again.',
              },
              { parts: parts.join(' · '), filename: p.filename },
            )}
          </div>
        </div>
      </div>
      <div className="imp3-booked-foot">
        <div className="imp3-booked-foot-l" />
        <div className="imp3-booked-foot-r">
          <button type="button" className="imp3-btn2" onClick={p.onDone}>
            {fm({ id: 'import.result.done', defaultMessage: 'Done' })}
          </button>
          <button type="button" className="imp3-lubtn" onClick={p.onReviewAgain}>
            {fm({ id: 'import.result.reviewAgain', defaultMessage: 'Review again' })}
          </button>
        </div>
      </div>
    </div>
  )
}
