import { formatImportCount } from './labels'
import { importWarning } from './importMessages'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useAccountTypeLabel } from '../accounts/useAccountTypeLabel'
import type { ReactNode } from 'react'
import { FormattedMessage } from './FormattedMessage'
import { useState } from 'react'
import { authFetch } from '../../../api/client'
import { fAmountNative, fDate } from '../../../utils/format'
import { Button, Checkbox, Cluster, Modal, PageTabs, Skeleton, Stack, Text } from '../../ui'
import { PMSelect } from '../accounts/ds'
import { ASK, Categories } from './YnabCategories'
import {
  messageOf,
  useRun,
  type LinkMatch,
  type Preview,
  type PreviewAccount,
  type PreviewCategory,
} from './runs'
import type { SyncDirection } from './sync'

// The review before a YNAB import, in one window: a line saying what the plan holds, what it
// changes in this book, then the plan itself in three tabs (accounts, categories, transactions)
// over a pane of fixed height, so neither switching tabs nor the read finishing resizes it. It
// shows ONE preview run at a time; the import it starts turns the sync on itself when it succeeds
// (the server does it, so closing the page mid-import loses nothing).
//
// A YNAB account can go into an account already in the book instead of a new one. Choosing one
// re-checks the preview with that link (the server reuses the plan it just read), so what each
// account would match and add is the server's answer, never a guess made here. The window keeps
// the last answer on screen until the new one arrives.
//
// A YNAB category goes with one of the book's categories (pre-selected when one reads the same),
// into one of its envelopes, or becomes a new category. The choice and the line under it (what
// the category's budget will do) are the server's answer for the choice made, so a change is
// re-checked like an account's. A category that matches several of the book's must be picked
// before the import can start.

type SyncChoice = SyncDirection | 'off'
type Pane = 'accounts' | 'categories' | 'transactions'

const SYNC_OPTIONS: { value: SyncChoice; label: string }[] = [
  { value: 'both', label: 'Keep in sync both ways' },
  { value: 'from_ynab', label: 'Sync from YNAB only' },
  { value: 'to_ynab', label: 'Sync to YNAB only' },
  { value: 'off', label: 'Don’t sync, import once' },
]

export function YnabReview({
  runId,
  planLabel,
  onClose,
  onStarted,
}: {
  runId: string
  /** "Name (CUR)" from the picker, so the window is titled before the plan is read. */
  planLabel: string
  onClose: () => void
  onStarted: () => void
}) {
  const intl = useAppIntl()
  const [shownId, setShownId] = useState(runId)
  const [checkId, setCheckId] = useState<string | null>(null)
  const run = useRun(shownId).data
  const check = useRun(checkId ?? undefined).data
  const first = useRun(runId).data?.preview
  const p = run?.status === 'done' ? run.preview : null
  const reading = !run || run.status === 'running'
  const [pane, setPane] = useState<Pane>('accounts')
  const [sync, setSync] = useState<SyncChoice>('both')
  const [links, setLinks] = useState<Record<string, string>>({})
  const [sameAs, setSameAs] = useState<Record<string, string>>({})
  const [catLinks, setCatLinks] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (checkId && check?.status === 'done') {
    setShownId(checkId)
    setCheckId(null)
  } else if (checkId && check && check.status !== 'running') {
    setError(check.error || intl.formatMessage({ id: 'imports.review.checkFailed', defaultMessage: 'Could not check that choice.' }))
    setCheckId(null)
  }
  const checking = checkId !== null
  // What the first answer proposed for each category: the choice the person did not make.
  const proposals = Object.fromEntries(
    (first?.category_groups ?? [])
      .flatMap((g) => g.categories)
      .map((c) => [c.id, c.ask ? ASK : c.link && c.link.kind !== 'linked' ? c.link.ref : '']),
  )
  const asking = (p?.category_groups ?? []).flatMap((g) => g.categories).filter((c) => c.ask)

  async function recheck(accounts: Record<string, string>, categories: Record<string, string>) {
    if (!run) return
    setError(null)
    try {
      const r = await authFetch('/api/ynab/migration/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: run.plan_id,
          account_links: accounts,
          ...(Object.keys(categories).length > 0 && { category_links: categories }),
          recheck_of: shownId,
        }),
      })
      const body = await r.json().catch(() => null)
      if (!r.ok) {
        setError(messageOf(body, intl.formatMessage({ id: 'imports.review.checkFailed', defaultMessage: 'Could not check that choice.' })))
        return
      }
      setCheckId((body as { id: string }).id)
    } catch {
      setError(intl.formatMessage({ id: 'imports.review.serverFailed', defaultMessage: 'Could not reach the server.' }))
    }
  }

  function relink(ynabId: string, accountId: string) {
    const next = { ...links }
    if (accountId) next[ynabId] = accountId
    else delete next[ynabId]
    setLinks(next)
    void recheck(next, catLinks)
  }

  function recategorize(ynabId: string, ref: string) {
    const next = { ...catLinks }
    if (ref === proposals[ynabId]) delete next[ynabId]
    else next[ynabId] = ref
    setCatLinks(next)
    void recheck(links, next)
  }

  async function importNow() {
    if (!run || !p || p.currency_blocked || checking || asking.length > 0) return
    // Only an answer about a pair the shown preview still lists counts.
    const listed = new Set(p.accounts.flatMap((a) => a.match?.pairs ?? []).map((x) => x.ref))
    const same = Object.fromEntries(Object.entries(sameAs).filter(([ref]) => listed.has(ref)))
    setBusy(true)
    setError(null)
    try {
      const r = await authFetch('/api/ynab/migration/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The note above the tabs says the plan goes in beside the book's own accounts;
        // importing after reading it is the confirmation.
        body: JSON.stringify({
          plan_id: run.plan_id,
          confirm_nonempty: p.book_state === 'foreign',
          sync_direction: sync === 'off' ? null : sync,
          ...(Object.keys(links).length > 0 && { account_links: links }),
          ...(Object.keys(same).length > 0 && { same_as: same }),
          ...(Object.keys(catLinks).length > 0 && { category_links: catLinks }),
        }),
      })
      if (!r.ok) {
        setError(messageOf(await r.json().catch(() => null), intl.formatMessage({ id: 'imports.review.startFailed', defaultMessage: 'Could not start the import.' })))
        return
      }
      onStarted()
      onClose()
    } catch {
      setError(intl.formatMessage({ id: 'imports.review.serverFailed', defaultMessage: 'Could not reach the server.' }))
    } finally {
      setBusy(false)
    }
  }

  const failed = !reading && !p
  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={intl.formatMessage({ id: 'imports.review.title', defaultMessage: 'Import {name}' }, { name: p ? p.plan_name : planLabel })}
      subtitle={reading ? intl.formatMessage({ id: 'imports.review.reading', defaultMessage: 'Reading it from YNAB…' }) : p ? <Meta preview={p} /> : undefined}
      footer={
        <Cluster justify="between" gap="--space-3" className="ynr-footer">
          <PMSelect
            className="ynr-sync"
            ariaLabel={intl.formatMessage({ id: 'imports.review.afterImport', defaultMessage: 'After import' })}
            value={sync}
            options={SYNC_OPTIONS.map(o => ({ ...o, label: intl.formatMessage({ id: 'imports.review.syncChoice', defaultMessage: '{choice, select, both {Keep in sync both ways} from_ynab {Sync from YNAB only} to_ynab {Sync to YNAB only} other {Don’t sync, import once}}' }, { choice: o.value }) }))}
            onChange={(v) => setSync(v as SyncChoice)}
          />
          <Cluster gap="--space-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              {<FormattedMessage id="imports.static.51bac044" defaultMessage={"Cancel"} />}
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!p || p.currency_blocked || checking || asking.length > 0}
              loading={busy}
              onClick={importNow}
            >
              {<FormattedMessage id="imports.static.9ae2cb2b" defaultMessage={"Import"} />}
            </Button>
          </Cluster>
        </Cluster>
      }
    >
      <Stack gap="--space-4">
        {failed ? (
          <Text size="sm" tone="bad">
            {run?.error || intl.formatMessage({ id: 'imports.review.readFailed', defaultMessage: 'The plan could not be read.' })}
          </Text>
        ) : (
          p && <Notes preview={p} asking={asking} />
        )}
        {error && (
          <Text size="sm" tone="bad">
            {error}
          </Text>
        )}
        {!failed && (
          <div>
            <PageTabs
              ariaLabel={intl.formatMessage({ id: 'imports.review.planHolds', defaultMessage: 'What the plan holds' })}
              value={pane}
              onChange={setPane}
              tabs={[
                { key: 'accounts', label: intl.formatMessage({ id: 'imports.review.tabAccounts', defaultMessage: 'Accounts' }), badge: p?.accounts.length },
                { key: 'categories', label: intl.formatMessage({ id: 'imports.review.tabCategories', defaultMessage: 'Categories' }), badge: p?.categories },
                { key: 'transactions', label: intl.formatMessage({ id: 'imports.review.tabTransactions', defaultMessage: 'Transactions' }), badge: p?.transactions },
              ]}
            />
            <div
              className="ynr-pane"
              role="tabpanel"
              aria-labelledby={`ui-page-tab-${pane}`}
              aria-busy={reading}
            >
              {!p ? (
                <Placeholder />
              ) : pane === 'accounts' ? (
                <Accounts
                  preview={p}
                  links={links}
                  checking={checking}
                  onLink={relink}
                  sameAs={sameAs}
                  onSameAs={setSameAs}
                />
              ) : pane === 'categories' ? (
                <Categories
                  preview={p}
                  catLinks={catLinks}
                  proposals={proposals}
                  checking={checking}
                  onChoose={recategorize}
                />
              ) : (
                <Transactions preview={p} />
              )}
            </div>
          </div>
        )}
      </Stack>
    </Modal>
  )
}

function Meta({ preview: p }: { preview: Preview }) {
  const intl = useAppIntl()
  return (
    <span className="ynr-meta">
      {[
        p.currency,
        intl.formatMessage({ id: 'imports.review.countAccounts', defaultMessage: '{count, plural, one {{display} account} other {{display} accounts}}' }, { count: p.accounts.length, display: formatImportCount(p.accounts.length) }),
        intl.formatMessage({ id: 'imports.review.countTransactions', defaultMessage: '{count, plural, one {{display} transaction} other {{display} transactions}}' }, { count: p.transactions, display: formatImportCount(p.transactions) }),
        intl.formatMessage({ id: 'imports.review.countCategories', defaultMessage: '{count, plural, one {{display} category} other {{display} categories}}' }, { count: p.categories, display: formatImportCount(p.categories) }),
        intl.formatMessage({ id: 'imports.review.countMonths', defaultMessage: '{count, plural, one {{display} budget month} other {{display} budget months}}' }, { count: p.budget_months, display: formatImportCount(p.budget_months) }),
      ].join(', ')}
    </span>
  )
}

// What the import does to this book beyond adding the plan — each one sentence, only when true.
function Notes({ preview: p, asking }: { preview: Preview; asking: PreviewCategory[] }) {
  const intl = useAppIntl()
  const lines: { text: string; bad?: boolean }[] = []
  for (const c of asking)
    lines.push({
      bad: true,
      text: intl.formatMessage({ id: 'imports.review.ambiguous', defaultMessage: 'YNAB’s {name} matches more than one of your categories. Pick one in Categories.' }, { name: c.name }),
    })
  if (p.currency_blocked)
    lines.push({
      bad: true,
      text: intl.formatMessage({ id: 'imports.review.currencyBlocked', defaultMessage: 'Can’t import: this book is in {base} and already has data, and the plan is in {currency}. Import into an empty book, or one in {currency}.' }, { base: p.base_currency, currency: p.currency }),
    })
  if (p.book_state === 'foreign' && !p.currency_blocked)
    lines.push({
      text: intl.formatMessage({ id: 'imports.review.foreign', defaultMessage: 'This book already has accounts of its own. Each YNAB account comes in as a new one unless you pick one of yours under In this book.' }),
    })
  if (p.book_state === 'rerun')
    lines.push({ text: intl.formatMessage({ id: 'imports.review.rerun', defaultMessage: 'This plan was imported before; importing again adds only what is new.' }) })
  if (p.currency_change)
    lines.push({
      text: intl.formatMessage({ id: 'imports.review.currencyChange', defaultMessage: 'The book’s base currency changes from {base} to {currency}.' }, { base: p.base_currency, currency: p.currency }),
    })
  const pruned = [...p.prune.categories, ...p.prune.groups]
  if (pruned.length > 0)
    lines.push({
      text: intl.formatMessage({ id: 'imports.review.pruned', defaultMessage: 'The starter categories the app came with that you never used are removed, since YNAB brings its own: {names}. To keep one, pick it for a YNAB category in Categories.' }, { names: pruned.join(', ') }),
    })
  for (const [index, w] of p.warnings.entries()) lines.push({ text: importWarning(intl, p.warnings_messages?.length === p.warnings.length ? p.warnings_messages[index] : null, w) })
  if (lines.length === 0) return null
  return (
    <ul className="ynr-notes">
      {lines.map((l) => (
        <li key={l.text} className={l.bad ? 'ynr-note ynr-note--bad' : 'ynr-note'}>
          {l.text}
        </li>
      ))}
    </ul>
  )
}

function Placeholder() {
  return (
    <div className="ynr-placeholder">
      <Stack gap="--space-4">
        {[92, 78, 85, 64, 88, 70].map((w) => (
          <Skeleton key={w} width={`${w}%`} height={12} />
        ))}
      </Stack>
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="ynr-empty">{children}</p>
}

interface LinkProps {
  links: Record<string, string>
  checking: boolean
  onLink: (ynabId: string, accountId: string) => void
  sameAs: Record<string, string>
  onSameAs: (next: Record<string, string>) => void
}

function Accounts({ preview: p, ...link }: { preview: Preview } & LinkProps) {
  const intl = useAppIntl()
  const accountTypeLabel = useAccountTypeLabel()
  if (p.accounts.length === 0) return <Empty>{<FormattedMessage id="imports.static.e9ab2c3c" defaultMessage={"This plan has no accounts."} />}</Empty>
  return (
    <table className="imp-table ynr-table">
      <thead>
        <tr>
          <th>{<FormattedMessage id="imports.static.b28b6f38" defaultMessage={"Account"} />}</th>
          <th>{<FormattedMessage id="imports.static.2cecf817" defaultMessage={"Type"} />}</th>
          <th>{<FormattedMessage id="imports.static.8d59f947" defaultMessage={"In this book"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.f299c1b4" defaultMessage={"Transactions"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.652b0cdc" defaultMessage={"Opening balance"} />}</th>
        </tr>
      </thead>
      {p.accounts.map((a) => (
        <tbody key={a.id ?? a.name}>
          <tr>
            <td data-label={intl.formatMessage({ id: 'imports.column.account', defaultMessage: 'Account' })}>
              {a.name}
              {a.closed && <span className="ynr-dim"> {<FormattedMessage id="imports.static.e50eef39" defaultMessage={"(closed)"} />}</span>}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.column.type', defaultMessage: 'Type' })} className="ynr-dim">
              {accountTypeLabel(a.type)}
              {a.on_budget === false ? intl.formatMessage({ id: 'imports.review.tracking', defaultMessage: ' (tracking)' }) : ''}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.column.inBook', defaultMessage: 'In this book' })}>
              <Destination account={a} {...link} />
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.column.transactions', defaultMessage: 'Transactions' })} className="imp-table__num">
              {a.transactions}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.column.opening', defaultMessage: 'Opening balance' })} className="imp-table__num">
              {a.link ? (
                <span className="ynr-dim">{<FormattedMessage id="imports.static.4bf3ba51" defaultMessage={"Its own"} />}</span>
              ) : (
                fAmountNative(a.opening_balance, p.currency)
              )}
            </td>
          </tr>
          {a.match && a.chosen && (
            <tr className="ynr-link">
              <td colSpan={5}>
                <LinkSummary account={a} match={a.match} currency={p.currency} {...link} />
              </td>
            </tr>
          )}
        </tbody>
      ))}
    </table>
  )
}

// A new account, or one already here of a type and currency the plan's account fits.
function Destination({
  account: a,
  links,
  checking,
  onLink,
}: { account: PreviewAccount } & LinkProps) {
  const intl = useAppIntl()
  if (a.link && !a.chosen) return <span className="ynr-dim">{intl.formatMessage({ id: 'imports.review.linked', defaultMessage: '{name} (linked)' }, { name: a.link.name })}</span>
  if (!a.id || !a.candidates?.length) return <span className="ynr-dim">{<FormattedMessage id="imports.static.559909a1" defaultMessage={"New account"} />}</span>
  return (
    <PMSelect
      className="ynr-dest"
      ariaLabel={intl.formatMessage({ id: 'imports.review.destination', defaultMessage: 'Where {name} goes' }, { name: a.name })}
      value={links[a.id] ?? ''}
      disabled={checking}
      options={[
        { value: '', label: intl.formatMessage({ id: 'imports.review.newAccount', defaultMessage: 'New account' }) },
        ...a.candidates.map((c) => ({ value: c.id, label: intl.formatMessage({ id: 'imports.review.useAccount', defaultMessage: 'Use {name}' }, { name: c.name }) })),
      ]}
      onChange={(v) => onLink(a.id!, v)}
    />
  )
}

function LinkSummary({
  account: a,
  match: m,
  currency,
  checking,
  sameAs,
  onSameAs,
}: { account: PreviewAccount; match: LinkMatch; currency: string } & LinkProps) {
  const intl = useAppIntl()
  if (checking)
    return <span className="ynr-dim">{<FormattedMessage id="imports.static.fcee9561" defaultMessage={"Checking which transactions are already there…"} />}</span>
  const here = a.link?.name ?? intl.formatMessage({ id: 'imports.review.theAccount', defaultMessage: 'the account' })
  const parts = [
    intl.formatMessage({ id: 'imports.review.alreadyIn', defaultMessage: '{count, plural, one {{display} transaction} other {{display} transactions}} already in {account}' }, { count: m.matched, display: formatImportCount(m.matched), account: here }),
    intl.formatMessage({ id: 'imports.review.added', defaultMessage: '{count} added' }, { count: formatImportCount(m.added) }),
  ]
  if (m.to_check > 0) parts.push(intl.formatMessage({ id: 'imports.review.toCheck', defaultMessage: '{count} to check' }, { count: formatImportCount(m.to_check) }))
  const money = (n: number) => fAmountNative(n, currency)
  return (
    <Stack gap="--space-2">
      <span>{parts.join('. ')}.</span>
      {m.own_only > 0 && (
        <span className="ynr-dim">
          {intl.formatMessage({ id: 'imports.review.ownOnly', defaultMessage: '{count, plural, one {{display} transaction} other {{display} transactions}} of {account}’s own {count, plural, one {isn’t} other {aren’t}} in YNAB; a sync to YNAB sends {count, plural, one {it} other {them}} there.' }, { count: m.own_only, display: formatImportCount(m.own_only), account: here })}
        </span>
      )}
      {m.pairs.length > 0 && (
        <>
          <span className="ynr-dim">
            {<FormattedMessage id="imports.static.171d4ead" defaultMessage={"These may be the same transaction. Each is added as a new one unless you tick it."} />}
          </span>
          <ul className="ynr-pairs">
            {m.pairs.map((x) => (
              <li key={x.ref}>
                <Checkbox
                  checked={sameAs[x.ref] === x.existing.id}
                  onChange={(e) => {
                    const next = { ...sameAs }
                    if (e.target.checked) next[x.ref] = x.existing.id
                    else delete next[x.ref]
                    onSameAs(next)
                  }}
                  label={intl.formatMessage({ id: 'imports.review.sameAs', defaultMessage: 'Same as {payee}, {date}, {amount}' }, { payee: x.existing.payee ?? intl.formatMessage({ id: 'imports.review.noPayee', defaultMessage: '(no payee)' }), date: fDate(x.existing.date), amount: money(x.existing.amount) })}
                  description={intl.formatMessage({ id: 'imports.review.ynabTransaction', defaultMessage: 'YNAB: {payee}, {date}, {amount}' }, { payee: x.payee ?? intl.formatMessage({ id: 'imports.review.noPayee', defaultMessage: '(no payee)' }), date: fDate(x.date), amount: money(x.amount) })}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </Stack>
  )
}

// A blank category on an inflow is money to assign, as in YNAB; on a spend it is uncategorized.
function Transactions({ preview: p }: { preview: Preview }) {
  const intl = useAppIntl()
  const rows = p.transaction_list
  if (!rows) return <Empty>{<FormattedMessage id="imports.static.162af938" defaultMessage={"Review again to see the transactions."} />}</Empty>
  if (rows.length === 0) return <Empty>{<FormattedMessage id="imports.static.b1ad25d8" defaultMessage={"This plan has no transactions."} />}</Empty>
  return (
    <table className="imp-table ynr-table">
      <thead>
        <tr>
          <th>{<FormattedMessage id="imports.static.0aac9844" defaultMessage={"Date"} />}</th>
          <th>{<FormattedMessage id="imports.static.b28b6f38" defaultMessage={"Account"} />}</th>
          <th>{<FormattedMessage id="imports.static.03d9f15a" defaultMessage={"Payee"} />}</th>
          <th>{<FormattedMessage id="imports.static.0b783f14" defaultMessage={"Memo"} />}</th>
          <th>{<FormattedMessage id="imports.static.ff3a7b97" defaultMessage={"Category"} />}</th>
          <th className="imp-table__num">{<FormattedMessage id="imports.static.890d7574" defaultMessage={"Amount"} />}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t, i) => (
          <tr key={i}>
            <td data-label={intl.formatMessage({ id: 'imports.column.date', defaultMessage: 'Date' })} className="ynr-dim ynr-nowrap">
              {fDate(t.date)}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.column.account', defaultMessage: 'Account' })}>
              {t.kind === 'transfer' ? `${t.account ?? '?'} → ${t.to_account ?? '?'}` : t.account}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.column.payee', defaultMessage: 'Payee' })} className="imp-table__wrap">
              {t.payee ?? ''}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.column.memo', defaultMessage: 'Memo' })} className="imp-table__wrap ynr-dim">
              {t.memo ?? ''}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.column.category', defaultMessage: 'Category' })} className="ynr-dim">
              {t.category ?? (t.kind === 'income' ? intl.formatMessage({ id: 'imports.review.ready', defaultMessage: 'Ready to Assign' }) : t.kind === 'expense' ? intl.formatMessage({ id: 'imports.review.uncategorized', defaultMessage: 'Uncategorized' }) : '')}
            </td>
            <td data-label={intl.formatMessage({ id: 'imports.column.amount', defaultMessage: 'Amount' })} className="imp-table__num ynr-nowrap">
              {fAmountNative(t.amount, p.currency)}
            </td>
          </tr>
        ))}
      </tbody>
      {rows.length < p.transactions && (
        <tfoot>
          <tr>
            <td colSpan={6} className="ynr-dim">
              {intl.formatMessage({ id: 'imports.review.newest', defaultMessage: 'The newest {shown} of {total}. The import brings them all.' }, { shown: formatImportCount(rows.length), total: formatImportCount(p.transactions) })}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  )
}
