// The asset page's record: Ownership and Purchase — the money — beside Details and Notes — the
// thing itself — as flat groups in two columns that keep their own heights (one column when the
// page is narrow). A group is drawn only when it has something to show; everything still
// missing is ONE row of "+" chips after them, each opening the editor its group's Edit opens
// (owner, 2026-09-28: the four boxed cards were "ugly, including when the information is not
// there and when it's even there") — and always one for a detail of your own, which was
// otherwise hidden inside the Details editor. The Notes editor lives here; the others have their
// own files.
import { useState, type ReactNode } from 'react'
import { useCaretAtEnd } from '../../../hooks/useCaretAtEnd'
import type { AssetCategory, AssetLoan, OwnedAsset } from '../../../types/assets'
import { Cluster, Modal, Stack, TextArea } from '../../ui'
import * as api from './api'
import { canHaveLoan, showsInsured } from './assetCategoryRules'
import { catOf, equityOf, fmt, loanOf, monthYear, shareOf } from './assetsData'
import { labelList, splitFacts, type Fact } from './detailsFacts'
import { EditorFooter, SaveError, useEditorSave } from './editorKit'
import { Icons } from './icons'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { factLabel } from './factCopy'
import type { IntlShape } from 'react-intl'

export type Section = 'ownership' | 'purchase' | 'details' | 'notes'
/** What an Edit or a "+" chip opens: a group's editor, or Details with a new row of your own. */
export type EditTarget = Section | 'custom-detail'

export interface AssetSectionsProps {
  a: OwnedAsset
  cats: AssetCategory[]
  loans: AssetLoan[]
  onNav: (tab: string) => void
  onEdit: (target: EditTarget) => void
}

/** A group: its small title and a quiet Edit, then what it holds. */
function Group(props: { title: string; onEdit(): void; children: ReactNode }) {
  const { formatMessage } = useAppIntl()
  return (
    <section className="as-rec-group" aria-label={props.title}>
      <div className="as-rec-head">
        <h2 className="as-rec-title">{props.title}</h2>
        <button
          type="button"
          className="as-rec-edit"
          aria-label={formatMessage(
            { id: 'assets.sections.editNamed', defaultMessage: 'Edit {name}' },
            { name: props.title.toLowerCase() },
          )}
          onClick={props.onEdit}
        >
          {formatMessage({ id: 'assets.sections.edit', defaultMessage: 'Edit' })}
        </button>
      </div>
      {props.children}
    </section>
  )
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="as-rec-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

/** The linked loan while anything is owed on it — a paid-off one secures nothing. */
function securedBy(a: OwnedAsset, loans: AssetLoan[]): AssetLoan | null {
  const loan = loanOf(a, loans)
  return loan && loan.balance > 0 ? loan : null
}

interface LoanSplitProps {
  a: OwnedAsset
  loan: AssetLoan
  cats: AssetCategory[]
  loans: AssetLoan[]
  onNav(tab: string): void
}

/** The value, split between what is yours and what is owed — and the way to the loan. */
function LoanSplit({ a, loan, cats, loans, onNav }: LoanSplitProps) {
  const { formatMessage } = useAppIntl()
  const eq = equityOf(a, loans) ?? 0
  const ofValue = (n: number) => (a.value ? (n / a.value) * 100 : 0)
  const color = catOf(cats, a.category).color
  const alsoSecures = loan.held_by && loan.held_by.id !== a.id ? loan.held_by.name : null
  const terms = [loan.rate_label, loan.term_label].filter(Boolean).join(' · ')
  return (
    <div className="as-rec-loan">
      <div className="as-split" aria-hidden="true">
        <i style={{ width: `${Math.max(0, ofValue(eq))}%`, background: color }} />
        <i
          style={{
            width: `${Math.min(100, ofValue(loan.balance))}%`,
            background: 'var(--bad)',
            opacity: 0.55,
          }}
        />
      </div>
      <dl className="as-rec-list">
        <Row
          label={
            <>
              <i className="as-rec-dot" style={{ background: color }} />
              {formatMessage({ id: 'assets.sections.equity', defaultMessage: 'Equity' })}
            </>
          }
        >
          {fmt(eq)} · {Math.round(ofValue(eq))}%
        </Row>
        <Row
          label={
            <>
              <i className="as-rec-dot as-rec-dot--owed" />
              {formatMessage({ id: 'assets.sections.owed', defaultMessage: 'Owed' })}
            </>
          }
        >
          {fmt(loan.balance)} · {Math.round(ofValue(loan.balance))}%
        </Row>
      </dl>
      {terms && <p className="as-rec-caption">{terms}</p>}
      {alsoSecures && (
        <p className="as-rec-caption">
          {formatMessage(
            { id: 'assets.sections.alsoSecures', defaultMessage: 'This loan also secures {name}.' },
            { name: alsoSecures },
          )}
        </p>
      )}
      <button type="button" className="as-rec-link" onClick={() => onNav('accounts')}>
        {formatMessage({
          id: 'assets.sections.seeLoan',
          defaultMessage: 'See this loan in Accounts',
        })}
      </button>
    </div>
  )
}

function Ownership({ a, cats, loans, onNav, onEdit }: AssetSectionsProps) {
  const { formatMessage } = useAppIntl()
  const loan = securedBy(a, loans)
  return (
    <Group
      title={formatMessage({ id: 'assets.sections.ownership', defaultMessage: 'Ownership' })}
      onEdit={() => onEdit('ownership')}
    >
      <dl className="as-rec-list">
        <Row label={formatMessage({ id: 'assets.sections.share', defaultMessage: 'Your share' })}>
          {shareOf(a)}
        </Row>
        {loan && (
          <Row
            label={formatMessage({ id: 'assets.sections.secured', defaultMessage: 'Secured by' })}
          >
            {loan.name}
          </Row>
        )}
      </dl>
      {loan && <LoanSplit a={a} loan={loan} cats={cats} loans={loans} onNav={onNav} />}
    </Group>
  )
}

function Purchase({ a, onEdit }: { a: OwnedAsset; onEdit(): void }) {
  const intl = useAppIntl()
  const copy = purchaseLabels(a.category, intl)
  return (
    <Group title={copy.cardTitle} onEdit={onEdit}>
      <dl className="as-rec-list">
        {a.cost != null && <Row label={copy.costLabel}>{fmt(a.cost)}</Row>}
        {a.cost_date && <Row label={copy.dateLabel}>{monthYear(a.cost_date)}</Row>}
      </dl>
    </Group>
  )
}

function purchaseLabels(category: string, intl: IntlShape) {
  return category === 'policy'
    ? {
        cardTitle: intl.formatMessage({
          id: 'assets.sections.premiums',
          defaultMessage: 'Premiums paid',
        }),
        costLabel: intl.formatMessage({
          id: 'assets.sections.premiumsSoFar',
          defaultMessage: 'Premiums paid so far',
        }),
        dateLabel: intl.formatMessage({
          id: 'assets.sections.policyStarted',
          defaultMessage: 'Policy started on',
        }),
        chipLabel: intl.formatMessage({
          id: 'assets.sections.paidIn',
          defaultMessage: 'What you’ve paid in',
        }),
      }
    : {
        cardTitle: intl.formatMessage({
          id: 'assets.sections.purchase',
          defaultMessage: 'Purchase',
        }),
        costLabel: intl.formatMessage({
          id: 'assets.sections.boughtFor',
          defaultMessage: 'Bought for',
        }),
        dateLabel: intl.formatMessage({
          id: 'assets.sections.boughtOn',
          defaultMessage: 'Bought on',
        }),
        chipLabel: intl.formatMessage({
          id: 'assets.sections.paid',
          defaultMessage: 'What you paid',
        }),
      }
}

/** Every detail with a value — the category's own first, in its order, then the rest. An
 *  unticked Insured is not a fact (it is also what an asset starts with), so only Yes shows. */
function detailRows(a: OwnedAsset, intl: IntlShape): Fact[] {
  const { guided, other } = splitFacts(a.category, a.facts)
  const rows = guided.filter((g) => g.value).map((g): Fact => [factLabel(intl, g.prompt), g.value])
  if (showsInsured(a.category)) {
    if (a.insured)
      rows.push([
        intl.formatMessage({ id: 'assets.details.insured', defaultMessage: 'Insured' }),
        intl.formatMessage({ id: 'assets.sections.yes', defaultMessage: 'Yes' }),
      ])
  } else if (a.maturity_date)
    rows.push([
      intl.formatMessage({ id: 'assets.details.matures', defaultMessage: 'Matures on' }),
      monthYear(a.maturity_date),
    ])
  return [...rows, ...other]
}

interface Missing {
  label: string
  aria: string
  opens: EditTarget
}

/** What the record could still hold, in the order its groups are drawn. A detail of your own
 *  is always one of them — a category's prompts are never the only things worth writing down. */
function missing(a: OwnedAsset, loans: AssetLoan[], intl: IntlShape): Missing[] {
  const out: Missing[] = []
  const add = (
    label: string,
    opens: EditTarget,
    aria = intl.formatMessage(
      { id: 'common.addNamed', defaultMessage: 'Add {name}' },
      { name: labelList([label]) },
    ),
  ) => out.push({ label, aria, opens })
  if (!securedBy(a, loans) && (canHaveLoan(a.category) || loanOf(a, loans)))
    add(
      intl.formatMessage({ id: 'assets.sections.linkLoan', defaultMessage: 'Link a loan' }),
      'ownership',
      intl.formatMessage({ id: 'assets.sections.linkLoan', defaultMessage: 'Link a loan' }),
    )
  if (a.cost == null && !a.cost_date) add(purchaseLabels(a.category, intl).chipLabel, 'purchase')
  for (const g of splitFacts(a.category, a.facts).guided)
    if (!g.value) add(factLabel(intl, g.prompt), 'details')
  if (!showsInsured(a.category) && !a.maturity_date)
    add(
      intl.formatMessage({ id: 'assets.sections.maturity', defaultMessage: 'Maturity date' }),
      'details',
    )
  add(
    intl.formatMessage({ id: 'assets.sections.custom', defaultMessage: 'Custom detail' }),
    'custom-detail',
    intl.formatMessage({ id: 'assets.sections.addCustom', defaultMessage: 'Add a custom detail' }),
  )
  if (!a.notes)
    add(intl.formatMessage({ id: 'assets.sections.note', defaultMessage: 'A note' }), 'notes')
  return out
}

/** The asset's record — where it is edited, group by group — as part of the page itself. */
export function AssetSections(props: AssetSectionsProps) {
  const intl = useAppIntl()
  const { a, onEdit } = props
  const details = detailRows(a, intl)
  const bought = a.cost != null || Boolean(a.cost_date)
  const chips = missing(a, props.loans, intl)
  return (
    <div className="as-record">
      <div className="as-rec-cols">
        <div className="as-rec-col">
          <Ownership {...props} />
          {bought && <Purchase a={a} onEdit={() => onEdit('purchase')} />}
        </div>
        {(details.length > 0 || a.notes) && (
          <div className="as-rec-col">
            {details.length > 0 && (
              <Group
                title={intl.formatMessage({
                  id: 'assets.details.title',
                  defaultMessage: 'Details',
                })}
                onEdit={() => onEdit('details')}
              >
                <dl className="as-rec-list">
                  {details.map(([k, v], i) => (
                    <Row key={i} label={k}>
                      {v}
                    </Row>
                  ))}
                </dl>
              </Group>
            )}
            {a.notes && (
              <Group
                title={intl.formatMessage({ id: 'assets.sections.notes', defaultMessage: 'Notes' })}
                onEdit={() => onEdit('notes')}
              >
                <p className="as-rec-notes">{a.notes}</p>
              </Group>
            )}
          </div>
        )}
      </div>
      <Cluster gap="--space-2" className="as-rec-add">
        {chips.map((m) => (
          <button
            key={m.label}
            type="button"
            className="as-chip as-chip--add"
            aria-label={m.aria}
            onClick={() => onEdit(m.opens)}
          >
            <span aria-hidden="true">{Icons.plus!({ width: 12, height: 12 })}</span>
            {m.label}
          </button>
        ))}
      </Cluster>
    </div>
  )
}

export interface NotesEditorProps {
  a: OwnedAsset
  onClose(): void
  onSaved(message: string): void
}

/** Notes — one text box; saves exactly `{notes}`. */
export function NotesEditor({ a, onClose, onSaved }: NotesEditorProps) {
  const { formatMessage } = useAppIntl()
  const [notes, setNotes] = useState(a.notes)
  const { saving, save, dialogError } = useEditorSave()
  const caretAtEnd = useCaretAtEnd()

  async function onSave() {
    if (await save(() => api.updateAsset(a.id, { notes: notes.trim() })))
      onSaved(formatMessage({ id: 'assets.sections.noteSaved', defaultMessage: 'Note saved.' }))
  }

  return (
    <Modal
      className="as-modal"
      open
      onClose={onClose}
      title={formatMessage({ id: 'assets.sections.notes', defaultMessage: 'Notes' })}
      subtitle={a.name}
      size="lg"
      footer={
        <EditorFooter
          saving={saving}
          label={formatMessage({ id: 'assets.docs.save', defaultMessage: 'Save' })}
          onCancel={onClose}
          onSave={onSave}
        />
      }
    >
      <Stack gap="--space-4">
        <TextArea
          aria-label={formatMessage({ id: 'assets.sections.notes', defaultMessage: 'Notes' })}
          rows={12}
          autoFocus
          onFocus={caretAtEnd}
          value={notes}
          maxLength={api.TEXT_CAPS.notes}
          placeholder={formatMessage({
            id: 'assets.sections.notePlaceholder',
            defaultMessage:
              'Anything worth remembering — where the receipt is, who to call, condition…',
          })}
          onChange={(e) => setNotes(e.target.value)}
        />
        <SaveError message={dialogError([])} />
      </Stack>
    </Modal>
  )
}
