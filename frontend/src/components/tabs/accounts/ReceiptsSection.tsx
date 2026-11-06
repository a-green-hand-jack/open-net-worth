// ReceiptsSection — the transaction detail drawer's Receipts block (attach/view/unlink).
// Self-fetching (like StatementViewer), NOT prop-threaded from AccountsTab — see the
// receipts-in-drawer UI spec. Renders inside TxnDetail.tsx's ViewBody, between the detail
// rows and Provenance.
import { Fragment, useRef, useState } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { Button } from '../../ui/Button'
import { fmtDay } from './TxnDetail'
import { ReceiptViewer } from './ReceiptViewer'
import { useTransactionReceipts, type ReceiptEntry } from '../../../hooks/useTransactionReceipts'
import { Plus } from '../../../ui/icons'

function ReceiptThumb({ receipt, onClick }: { receipt: ReceiptEntry; onClick: () => void }) {
  const [broken, setBroken] = useState(false)
  const inner =
    receipt.mediaType?.startsWith('image/') && !broken ? (
      <img
        className="acct-detail-receipt-thumbimg"
        src={`/api/receipts/${receipt.receiptId}/file`}
        alt=""
        onError={() => setBroken(true)}
      />
    ) : (
      <span className="acct-detail-receipt-glyph" aria-hidden="true">
        {receipt.mediaType === 'application/pdf' ? '📄' : '📎'}
      </span>
    )
  return (
    <button
      type="button"
      className="acct-detail-receipt-thumb"
      title={receipt.filename}
      onClick={onClick}
    >
      {inner}
    </button>
  )
}

export function ReceiptsSection({ txnId }: { txnId: string }) {
  const { formatMessage } = useAppIntl()
  const { status, receipts, upload, unlink, refresh } = useTransactionReceipts(txnId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Holds whichever files still need (re)attaching — the full picked batch on first attempt,
  // narrowed down to just the failures on a retry, so retrying a 5-file batch where 1 failed
  // doesn't re-upload the 4 that already succeeded.
  const pendingFilesRef = useRef<File[]>([])
  const [attaching, setAttaching] = useState(false)
  const [failedCount, setFailedCount] = useState(0)
  const [armedId, setArmedId] = useState<string | null>(null)
  const [unlinkBusy, setUnlinkBusy] = useState(false)
  const [unlinkError, setUnlinkError] = useState(false)
  const [viewing, setViewing] = useState<ReceiptEntry | null>(null)

  const doUploadFiles = async (files: File[]) => {
    setAttaching(true)
    setFailedCount(0)
    const failed: File[] = []
    // Sequential, not parallel — keeps each attach an independent, individually-retryable
    // step rather than a burst of concurrent requests against one transaction's link table.
    for (const file of files) {
      try {
        await upload(file)
      } catch {
        failed.push(file)
      }
    }
    pendingFilesRef.current = failed
    setFailedCount(failed.length)
    setAttaching(false)
  }

  const retryAttach = () => {
    if (pendingFilesRef.current.length) void doUploadFiles(pendingFilesRef.current)
  }

  const doUnlink = async (receiptId: string) => {
    setUnlinkBusy(true)
    setUnlinkError(false)
    try {
      await unlink(receiptId)
      setArmedId(null)
    } catch {
      setUnlinkError(true)
    } finally {
      setUnlinkBusy(false)
    }
  }

  // Plain text-link, matching the drawer's own VIEW-mode convention for a lightweight inline
  // action (.acct-detail-stmt — "View the statement", the source-email Retry) — Button's
  // default `secondary` look is the app's filled/bordered <button>, a heavier control meant
  // for the Edit form's inputs, not a quiet action sitting next to plain text here.
  const attachButton = (
    <button
      type="button"
      className="acct-detail-stmt"
      disabled={attaching}
      onClick={() => fileInputRef.current?.click()}
    >
      {attaching ? (
        formatMessage({ id: 'accounts.receipt.attaching', defaultMessage: "Attaching…" })
      ) : (
        <>
          <Plus size={13} aria-hidden="true" /> {formatMessage({ id: 'accounts.receipt.attach', defaultMessage: "Attach receipt" })}
        </>
      )}
    </button>
  )

  return (
    <>
      <div className="acct-detail-sec">
        {receipts.length ? formatMessage({ id: 'accounts.receipt.count', defaultMessage: 'Receipts ({count})' }, { count: receipts.length }) : formatMessage({ id: 'accounts.receipt.receipts', defaultMessage: "Receipts" })}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="acct-detail-receipt-fileinput"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.currentTarget.value = ''
          if (files.length) void doUploadFiles(files)
        }}
      />

      {status === 'loading' && (
        <div className="acct-detail-timeline-skel">
          {[0, 1].map((i) => (
            <div key={i} className="acct-detail-skel-row">
              <span className="acct-detail-skel-dot" />
              <span className="acct-detail-skel" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="acct-detail-receipts-empty">
          <span className="acct-detail-receipt-err">{formatMessage({ id: 'accounts.receipt.loadFailed', defaultMessage: "Couldn't load receipts." })}</span>
          <Button size="sm" variant="secondary" onClick={refresh}>
            {formatMessage({ id: 'accounts.receipt.retry', defaultMessage: "Retry" })}
          </Button>
        </div>
      )}

      {status === 'ok' && receipts.length === 0 && (
        <div className="acct-detail-receipts-empty">
          <span>{formatMessage({ id: 'accounts.receipt.none', defaultMessage: "No receipts attached yet." })}</span>
          {attachButton}
          {failedCount > 0 && (
            <>
              <span className="acct-detail-receipt-err">
                {failedCount === 1
                  ? formatMessage({ id: 'accounts.receipt.attachFailedOne', defaultMessage: "Couldn't attach that file — try again." })
                  : formatMessage({ id: 'accounts.receipt.attachFailedMany', defaultMessage: "Couldn't attach {count} file(s) — try again." }, { count: failedCount })}
              </span>
              <Button size="sm" variant="secondary" onClick={retryAttach}>
                {formatMessage({ id: 'accounts.receipt.retry', defaultMessage: "Retry" })}
              </Button>
            </>
          )}
        </div>
      )}

      {status === 'ok' && receipts.length > 0 && (
        <div className="acct-detail-receipts">
          {receipts.map((r) => (
            <Fragment key={r.receiptId}>
              <div className="acct-detail-receipt-row">
                <ReceiptThumb receipt={r} onClick={() => setViewing(r)} />
                <button
                  type="button"
                  className="acct-detail-receipt-name"
                  title={r.filename}
                  onClick={() => setViewing(r)}
                >
                  {r.filename}
                </button>
                <span className="acct-detail-receipt-date">{fmtDay(r.createdAt)}</span>
                {armedId === r.receiptId ? (
                  <span className="acct-detail-receipt-armed">
                    <Button
                      size="sm"
                      variant="danger"
                      loading={unlinkBusy}
                      onClick={() => doUnlink(r.receiptId)}
                    >
                      {formatMessage({ id: 'accounts.receipt.confirm', defaultMessage: "Confirm" })}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={unlinkBusy}
                      onClick={() => {
                        setArmedId(null)
                        setUnlinkError(false)
                      }}
                    >
                      {formatMessage({ id: 'accounts.receipt.cancel', defaultMessage: "Cancel" })}
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setArmedId(r.receiptId)}>
                    {formatMessage({ id: 'accounts.receipt.remove', defaultMessage: "Remove" })}
                  </Button>
                )}
              </div>
              {armedId === r.receiptId && unlinkError && (
                <div className="acct-detail-receipt-err">
                  {formatMessage({ id: 'accounts.receipt.removeFailed', defaultMessage: "Couldn't remove that receipt — try again." })}
                </div>
              )}
            </Fragment>
          ))}
          <div className="acct-detail-receipts-foot">
            {attachButton}
            {failedCount > 0 && (
              <>
                <span className="acct-detail-receipt-err">
                  {failedCount === 1
                    ? formatMessage({ id: 'accounts.receipt.attachFailedOne', defaultMessage: "Couldn't attach that file — try again." })
                    : formatMessage({ id: 'accounts.receipt.attachFailedMany', defaultMessage: "Couldn't attach {count} file(s) — try again." }, { count: failedCount })}
                </span>
                <Button size="sm" variant="secondary" onClick={retryAttach}>
                  {formatMessage({ id: 'accounts.receipt.retry', defaultMessage: "Retry" })}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {viewing && (
        <ReceiptViewer
          receipt={{
            id: viewing.receiptId,
            filename: viewing.filename,
            mediaType: viewing.mediaType,
          }}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  )
}
