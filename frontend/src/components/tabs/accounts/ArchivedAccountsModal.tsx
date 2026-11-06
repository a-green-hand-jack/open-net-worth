import { useAppIntl } from '../../../i18n/useAppIntl'
import { useAccountTypeLabel } from './useAccountTypeLabel'
import { Button, ErrorState, Loading, Modal } from '../../ui'
import { Archive, ChevronLeft, RotateCcw } from '../../../ui/icons'
import { TYPE_LABELS } from './categories'
import { fCur } from './format'
import type { Account, Txn } from './types'

function transactionAmount(txn: Txn, account: Account): number | null {
  if (txn.toAccountId === account.id) return txn.toAmount
  if (txn.fromAccountId === account.id) return txn.fromAmount === null ? null : -txn.fromAmount
  return null
}

export function ArchivedAccountsModal({
  open,
  accounts,
  loading,
  error,
  selected,
  transactions,
  loadingTransactions,
  onClose,
  onSelect,
  onBack,
  onRestore,
  onDelete,
}: {
  open: boolean
  accounts: Account[]
  loading: boolean
  error: string | null
  selected: Account | null
  transactions: Txn[]
  loadingTransactions: boolean
  onClose: () => void
  onSelect: (account: Account) => void
  onBack: () => void
  onRestore: (account: Account) => void
  onDelete: (account: Account) => void
}) {
  const { formatMessage, locale } = useAppIntl()
  const typeLabel = useAccountTypeLabel()
  const detail = selected !== null
  const title = detail ? selected.name : formatMessage({ id: 'accounts.archived.title', defaultMessage: "Archived accounts" })

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg" className="acct-archived-modal">
      {detail ? (
        <div className="acct-archived-detail">
          <div className="acct-archived-detail-head">
            <Button size="sm" variant="ghost" onClick={onBack} iconLeft={<ChevronLeft size={15} />}>
              {formatMessage({ id: 'accounts.archived.title', defaultMessage: "Archived accounts" })}
            </Button>
            <span className="acct-archived-badge">
              <Archive size={14} aria-hidden="true" /> {formatMessage({ id: 'accounts.archived.archived', defaultMessage: 'Archived' })}
            </span>
          </div>
          <div className="acct-archived-summary">
            <span>{locale === 'en' ? (TYPE_LABELS[selected.type as keyof typeof TYPE_LABELS] ?? selected.type) : typeLabel(selected.type)}</span>
            <span>•</span>
            <span>{selected.currency}</span>
            <strong>{fCur(selected.balance, selected.currency)}</strong>
          </div>
          <p className="acct-archived-note">
            {formatMessage({ id: 'accounts.archived.readonly', defaultMessage: "This account is closed. Its history is read-only until you restore it." })}
          </p>
          <div className="acct-archived-actions">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onRestore(selected)}
              iconLeft={<RotateCcw size={15} />}
            >
              {formatMessage({ id: 'accounts.archived.restore', defaultMessage: "Restore account" })}
            </Button>
            <Button size="sm" variant="danger" onClick={() => onDelete(selected)}>
              {formatMessage({ id: 'accounts.archived.delete', defaultMessage: "Delete permanently" })}
            </Button>
          </div>
          <div className="acct-archived-register" aria-label={formatMessage({ id: 'accounts.archived.transactions', defaultMessage: "Archived account transactions" })}>
            {loadingTransactions ? (
              <Loading label={formatMessage({ id: 'accounts.archived.loadingTransactions', defaultMessage: "Loading transactions…" })} />
            ) : transactions.length === 0 ? (
              <p className="acct-archived-empty">{formatMessage({ id: 'accounts.archived.noneTransactions', defaultMessage: "No transactions in this account." })}</p>
            ) : (
              transactions.map((txn) => {
                const amount = transactionAmount(txn, selected)
                return (
                  <div className="acct-archived-txn" key={txn.id}>
                    <span className="acct-archived-txn-date">{txn.date}</span>
                    <span className="acct-archived-txn-description">
                      {txn.description || txn.memo || formatMessage({ id: 'accounts.archived.transaction', defaultMessage: "Transaction" })}
                    </span>
                    <strong className={amount !== null && amount < 0 ? 'neg' : 'pos'}>
                      {amount === null ? '—' : fCur(amount, selected.currency)}
                    </strong>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : loading ? (
        <Loading label={formatMessage({ id: 'accounts.archived.loading', defaultMessage: "Loading archived accounts…" })} />
      ) : error ? (
        <ErrorState title={formatMessage({ id: 'accounts.archived.error', defaultMessage: "Couldn’t load archived accounts" })} message={error} />
      ) : accounts.length === 0 ? (
        <div className="acct-archived-empty-state">{formatMessage({ id: 'accounts.archived.none', defaultMessage: "No archived accounts." })}</div>
      ) : (
        <div className="acct-archived-list">
          <p className="acct-archived-note">
            {formatMessage({ id: 'accounts.archived.explanation', defaultMessage: "Closed accounts stay out of active balances, but their history remains available here." })}
          </p>
          {accounts.map((account) => (
            <button
              className="acct-archived-row"
              key={account.id}
              onClick={() => onSelect(account)}
            >
              <span>
                <strong>{account.name}</strong>
                <small>
                  {locale === 'en' ? (TYPE_LABELS[account.type as keyof typeof TYPE_LABELS] ?? account.type) : typeLabel(account.type)} •{' '}
                  {account.currency}
                </small>
              </span>
              <strong>{fCur(account.balance, account.currency)}</strong>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
