/**
 * ReviewStrip.tsx — "N to review · Start review", the line under the balances on the Accounts
 * header and the All-accounts overview.
 */

import { ArrowLeftRight, WalletCards } from '../../../ui/icons'
import { useAppIntl } from '../../../i18n/useAppIntl'

export function ReviewStrip({
  count,
  onReview,
  onStartReview,
}: {
  count: number
  onReview: () => void
  onStartReview: () => void
}) {
  const { formatMessage: fm } = useAppIntl()
  if (count <= 0) return null
  return (
    <span className="acct-recon-review">
      <button
        type="button"
        className="acct-recon-count as-btn"
        onClick={onReview}
        title={fm({
          id: 'accounts.overview.showReview',
          defaultMessage: 'Show transactions that need review',
        })}
      >
        <span className="acct-recon-count-dot" aria-hidden="true" />
        {fm({ id: 'accounts.overview.toReview', defaultMessage: '{count} to review' }, { count })}
      </button>
      <button
        type="button"
        className="acct-recon-start as-btn"
        onClick={onStartReview}
        title={fm({
          id: 'accounts.overview.reviewHint',
          defaultMessage: 'Approve or skip each one in turn',
        })}
      >
        <WalletCards size={13} aria-hidden="true" />
        {fm({ id: 'accounts.overview.startReview', defaultMessage: 'Start review' })}
      </button>
    </span>
  )
}

/** The txn count at the end of the line. Its icon keeps it from reading as a stray number when it
 *  is alone on its row — a phone with nothing to review (owner, 2026-10-26). */
export function TxnCount({ count }: { count: number }) {
  const { formatMessage: fm } = useAppIntl()
  return (
    <span className="acct-recon-stat muted acct-recon-txns">
      <ArrowLeftRight size={13} aria-hidden="true" />
      {fm({ id: 'accounts.overview.txnCount', defaultMessage: '{count} txns' }, { count })}
    </span>
  )
}
