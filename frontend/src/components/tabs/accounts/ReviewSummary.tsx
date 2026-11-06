import { defineMessages } from 'react-intl'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { CalendarCheck, Receipt, StickyNote, Tags, Wallet } from '../../../ui/icons'
import { fCurrency } from '../../../utils/format'
import {
  isInflow,
  reviewAmount,
  reviewDate,
  summaryTitle,
  transactionCurrency,
  typeLabel,
  type ReviewDraft,
} from './transactionReview'
import { ReviewCategoryChoices, ReviewChipChooser } from './ReviewCategoryChoices'
import { catOptionsFor } from './categories'
import type { Account, Category, Txn } from './types'

const reviewKinds = defineMessages({
  expense: { id: 'accounts.reviewKind.expense', defaultMessage: 'Expense' },
  income: { id: 'accounts.reviewKind.income', defaultMessage: 'Income' },
  transfer: { id: 'accounts.reviewKind.transfer', defaultMessage: 'Transfer' },
  investment: { id: 'accounts.reviewKind.investment', defaultMessage: 'Investment' },
  adjustment: { id: 'accounts.reviewKind.adjustment', defaultMessage: 'Balance adjustment' },
})

/**
 * The facts of a review card: meta line, kind, payee, amount and details. The category block
 * is `ReviewChoices`, a sibling, so the card can give the two different grounds — the facts on
 * a panel tinted by kind, the decision on the plain surface below it.
 *
 * Shared by the front card and the rear preview so the card revealed by a swipe is the SAME
 * surface, not a reduced one — the rear card previously hand-rolled a shorter summary with a
 * single category pill, which read as a half-loaded card during the approve request (owner
 * report 2026-09-19).
 */
/** The draft holds the original amount as typed text; show it in the currency's own digits
 *  ("963,900 VND", not "963900 VND") unless it isn't a number yet. */
function originalAmountLabel(value: string, currency: string): string {
  const amount = Number(value)
  return Number.isFinite(amount) ? reviewAmount(amount, currency) : value
}

export function ReviewSummary({
  txn,
  accounts,
  draft,
}: {
  txn: Txn
  accounts: Account[]
  draft: ReviewDraft
}) {
  const { formatMessage } = useAppIntl()
  const inflow = isInflow(draft)
  const ledgerCurrency = transactionCurrency(
    draft,
    accounts,
    txn.fromCurrency ?? txn.toCurrency ?? txn.baseCurrency,
  )
  const destination = accounts.find((item) => item.id === draft.toAccountId)
  const title =
    draft.kind === 'transfer'
      ? formatMessage(
          { id: 'accounts.reviewSummary.transferTo', defaultMessage: 'Transfer to {account}' },
          {
            account:
              destination?.name ??
              formatMessage({
                id: 'accounts.reviewSummary.anotherAccount',
                defaultMessage: 'another account',
              }),
          },
        )
      : summaryTitle(draft, accounts, txn.description)
  const memo = draft.memo.trim()
  const showDestinationLeg =
    draft.kind === 'transfer' &&
    !!destination &&
    draft.toAmount > 0 &&
    (destination.currency !== ledgerCurrency || draft.toAmount !== draft.amount)
  // A transfer moves no net worth, so its base value is noise beside the received leg —
  // "≈ S$1,876.17 in SGD" over "1,475.86 USD" received was a third number to parse.
  const showBaseValue =
    draft.kind !== 'transfer' &&
    txn.baseCurrency !== ledgerCurrency &&
    Number.isFinite(txn.baseAmount)

  return (
    <div className="acct-review-summary">
      <div className="acct-review-summary-meta">
        <span>
          <CalendarCheck size={14} aria-hidden="true" />
          {reviewDate(draft.date)}
        </span>
      </div>
      {/* The kind is an eyebrow over the payee, in the register's kind colour; the amount below
          wears the same colour, so what kind of money this is reads before a word is read. */}
      <span className={`acct-review-summary-kind acct-detail-kind ${draft.kind}`}>
        {reviewKinds[draft.kind as keyof typeof reviewKinds]
          ? formatMessage(reviewKinds[draft.kind as keyof typeof reviewKinds])
          : typeLabel(draft)}
      </span>
      <h3>
        {title || (
          <span className="acct-review-no-payee">
            {formatMessage({
              id: 'accounts.reviewSummary.noPayee',
              defaultMessage: 'No payee yet',
            })}
          </span>
        )}
      </h3>
      <div className={`acct-review-summary-amount ${draft.kind}`}>
        {/* A transfer is always drawn from its sending leg, so a sign would only ever be "−" —
            "Transfer to …" already says which way it went. */}
        {draft.kind !== 'transfer' && <span aria-hidden="true">{inflow ? '+' : '−'}</span>}
        <strong>{reviewAmount(draft.amount, ledgerCurrency)}</strong>
        <em>{ledgerCurrency}</em>
      </div>
      <div className="acct-review-summary-details">
        {draft.originalAmount && draft.originalCurrency && (
          <span>
            {formatMessage(
              {
                id: 'accounts.reviewSummary.original',
                defaultMessage: 'Originally {amount} {currency}',
              },
              {
                amount: originalAmountLabel(draft.originalAmount, draft.originalCurrency),
                currency: draft.originalCurrency,
              },
            )}
          </span>
        )}
        {showBaseValue && (
          <span
            title={formatMessage({
              id: 'accounts.reviewSummary.baseValue',
              defaultMessage: 'Value in your base currency',
            })}
          >
            {formatMessage(
              {
                id: 'accounts.reviewSummary.baseAmount',
                defaultMessage: '≈ {amount} in {currency}',
              },
              {
                amount: fCurrency(Math.abs(txn.baseAmount), txn.baseCurrency),
                currency: txn.baseCurrency,
              },
            )}
          </span>
        )}
        {/* The heading already names the destination; this line only adds what it receives. */}
        {showDestinationLeg && (
          <span>
            {reviewAmount(draft.toAmount, destination.currency)} {destination.currency}
          </span>
        )}
        {/* ONE detail line: the memo when there is one (your own words), else the bank's
            string. Two clamped blocks buried the card; the icon says which one this is. */}
        {memo ? (
          <p
            title={formatMessage({ id: 'accounts.reviewSummary.memo', defaultMessage: 'Memo' })}
            data-detail="memo"
          >
            <StickyNote
              size={14}
              aria-label={formatMessage({
                id: 'accounts.reviewSummary.memo',
                defaultMessage: 'Memo',
              })}
            />
            {memo}
          </p>
        ) : (
          txn.description &&
          txn.description !== title && (
            <p
              title={formatMessage({
                id: 'accounts.reviewSummary.bankDescription',
                defaultMessage: 'Bank description',
              })}
              data-detail="description"
            >
              <Receipt
                size={14}
                aria-label={formatMessage({
                  id: 'accounts.reviewSummary.bankDescription',
                  defaultMessage: 'Bank description',
                })}
              />
              {txn.description}
            </p>
          )
        )}
      </div>
    </div>
  )
}

/** Accounts the card can offer a transfer, likeliest first: the one it has, then the cards
 *  and loans (a bill payment is the common transfer), then the rest. The source's own
 *  currency only: a cross-currency destination needs the received amount set beside it, and
 *  that is the editor's job (the owner tried every account with a rate-derived leg and
 *  preferred this, 2026-09-20). Archived accounts and the source itself are out. */
function transferDestinations(draft: ReviewDraft, accounts: Account[]): Account[] {
  const source = accounts.find((item) => item.id === draft.accountId)
  const rank = (item: Account) =>
    item.id === draft.toAccountId ? 0 : item.type === 'credit' || item.type === 'loan' ? 1 : 2
  return accounts
    .filter(
      (item) =>
        item.id !== draft.accountId &&
        (item.id === draft.toAccountId ||
          (!item.archived && (!source || item.currency === source.currency))),
    )
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}

/**
 * The one decision a card asks for: a category — or, for a transfer, WHERE the money went.
 * Money between your own accounts has no category, but the automation guessed the far
 * account from an email, and that guess is what a review confirms. The preview passes a
 * no-op `onDraftChange`; it is aria-hidden and pointer-events:none, so its chips are neither
 * reachable nor announced.
 */
export function ReviewChoices({
  txn,
  accounts,
  categories,
  draft,
  onDraftChange,
  suggestedCategoryIds,
}: {
  txn: Txn
  accounts: Account[]
  categories: Category[]
  draft: ReviewDraft
  onDraftChange: (draft: ReviewDraft) => void
  suggestedCategoryIds: string[]
}) {
  const { formatMessage } = useAppIntl()
  const ledgerCurrency = transactionCurrency(
    draft,
    accounts,
    txn.fromCurrency ?? txn.toCurrency ?? txn.baseCurrency,
  )
  if (draft.kind === 'transfer') {
    const destinations = transferDestinations(draft, accounts)
    return (
      <div className="acct-review-choices">
        <ReviewChipChooser
          caption={formatMessage({
            id: 'accounts.reviewSummary.goingTo',
            defaultMessage: 'Going to',
          })}
          // Account chips have no colour of their own: they take the transfer's.
          options={destinations.map((item) => ({
            id: item.id,
            label: item.name,
            color: 'var(--overfunded)',
          }))}
          selected={draft.toAccountId || null}
          suggestedIds={destinations.map((item) => item.id)}
          onChange={(id) => {
            const to = destinations.find((item) => item.id === id)
            if (!to) return
            // Same currency, same figure — unless it is the row's own destination, which
            // keeps the leg it came with (possibly another currency, possibly an FX figure).
            const toAmount =
              to.id === txn.toAccountId && txn.toAmount != null
                ? Math.abs(txn.toAmount)
                : draft.amount
            onDraftChange({ ...draft, toAccountId: to.id, toAmount })
          }}
          icon={Wallet}
          searchLabel={formatMessage({
            id: 'accounts.reviewSummary.searchAccounts',
            defaultMessage: 'Search accounts',
          })}
          placeholder={formatMessage({
            id: 'accounts.reviewSummary.findAccount',
            defaultMessage: 'Find an account…',
          })}
          resultsTestId="review-account-results"
          limit={3}
        />
      </div>
    )
  }
  return (
    <div className="acct-review-choices">
      {txn.splits.length ? (
        // The split as it stands — each line's category and figure, read-only: a lone
        // "Split transaction" pill looked like a button with nothing to say (owner,
        // 2026-09-21). Changing the lines is the editor's job.
        <div className="acct-review-category-choices">
          <span className="acct-review-category-caption">
            {formatMessage(
              {
                id: 'accounts.reviewSummary.split',
                defaultMessage: 'Split across {count} categories',
              },
              { count: txn.splits.length },
            )}
          </span>
          <div className="acct-review-category-chips">
            {txn.splits.map((line, index) => {
              const category = categories.find((item) => item.id === line.category)
              return (
                <span
                  key={`${line.category}-${index}`}
                  className="acct-review-choice is-static"
                  style={{ '--category-color': category?.color } as React.CSSProperties}
                >
                  <Tags size={14} aria-hidden="true" />
                  {category?.label ??
                    formatMessage({
                      id: 'accounts.reviewSummary.uncategorized',
                      defaultMessage: 'Uncategorized',
                    })}
                  <em>
                    {reviewAmount(Math.abs(line.amount), ledgerCurrency)} {ledgerCurrency}
                  </em>
                </span>
              )
            })}
          </div>
        </div>
      ) : (
        <ReviewCategoryChoices
          // catOptionsFor is the tab's own rule, and for an income row it deliberately offers
          // EXPENSE categories too, grouped as "Refund to a budget envelope" — money back on
          // something you spent belongs against that spending. The card used to filter by kind
          // alone, so a refund could not be categorised here at all.
          categories={
            draft.kind === 'adjustment'
              ? categories.filter((item) => item.kind === draft.kind || item.id === draft.category)
              : catOptionsFor(draft.kind, categories, draft.category)
          }
          selected={draft.category}
          suggestedIds={suggestedCategoryIds}
          onChange={(category) => onDraftChange({ ...draft, category })}
        />
      )}
    </div>
  )
}
