import { getNumberLocale } from '../../../utils/format'
import { useAppIntl } from '../../../i18n/useAppIntl'
// Commitment detail screen — the full port of detail3.jsx: header (inline name/note edit,
// tags, risk chip, Mark completed / kebab menu with cancel+delete confirm strips), stat strip,
// insight ribbon (at-risk fix / loan early-payoff / autopilot / fully-funded), the payments-on-
// the-timeline strip, and the 4-tab body (Overview/Schedule/Funding/Actions & events). See
// docs/adr/2026-07-22-commitments-tab-redesign-faithful-port.md for the port strategy — every
// write is real (detailMutations.ts), every Lucius touchpoint opens the real dock
// (onAskLucius), and the funding-waterfall/loan math is pure client-side reuse of
// utils/commitments.ts over data hydrated by fundingValue.ts.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { Commitment } from '../../../types/commitments'
import {
  fBase,
  fPct,
  getBaseCurrency,
  getCurrencySymbol,
  moneyClass,
  toBase,
} from '../../../utils/format'
import {
  KIND_LABELS,
  fmtDate,
  isTracker,
  loanIntel,
  nativeTotalBase,
  nextInstallment,
  paidBase,
  paidPct,
  remainingBase,
} from '../../../utils/commitments'
import { Button, Container, Modal, Stack } from '../../ui'
import { DotsIcon, PencilIcon, Spark } from './icons'
import { useNarrow } from './useNarrow'
import { useCommitmentDetailData } from './fundingValue'
import { useDetailMutations } from './detailMutations'
import type { DetailMutations } from './detailTypes'
import { computeCoverage } from './detailFunding'
import { lateFundingHint } from './coverageEngine'
import { entityRefProps } from '../../../utils/mentionable'
import { buildCtxFields } from '../../../lucius/ctxFields'
import { filterByDescriptor } from '../../../lucius/entityRegistry'
import { TimelineStrip } from './timelineStrip'
import { OverviewTab } from './detailOverview'
import { Schedule } from './detailSchedule'
import { Funding } from './detailFunding'
import { Actions } from './detailActions'

interface CommitmentDetailProps {
  commitment: Commitment
  fx: Record<string, number>
  onBack: () => void
  onAskLucius: (text: string) => void
  onChanged: () => void
  onOpenCommitment: (id: string) => void
}

type TabKey = 'overview' | 'schedule' | 'funding' | 'actions'

export function CommitmentDetail({
  commitment,
  fx,
  onBack,
  onAskLucius,
  onChanged,
  onOpenCommitment,
}: CommitmentDetailProps) {
  const { formatMessage, locale } = useAppIntl()
  const kinds: Record<string, string> = { purchase: formatMessage({ id: 'commitments.kind.purchase', defaultMessage: 'Purchase' }), loan_repayment: formatMessage({ id: 'commitments.kind.loanRepayment', defaultMessage: 'Loan repayment' }), auto_pay: formatMessage({ id: 'commitments.kind.autoPay', defaultMessage: 'Auto-pay' }), goal: formatMessage({ id: 'commitments.kind.goal', defaultMessage: 'Goal' }) }
  const statuses: Record<string, string> = { active: formatMessage({ id: 'commitments.rows.active', defaultMessage: 'Active' }), completed: formatMessage({ id: 'commitments.rows.completed', defaultMessage: 'Completed' }), cancelled: formatMessage({ id: 'commitments.rows.cancelled', defaultMessage: 'Cancelled' }) }
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [menu, setMenu] = useState(false)
  const [tab, setTab] = useState<TabKey>('overview')
  const bodyRef = useRef<HTMLDivElement>(null)
  const [bodyHeight, setBodyHeight] = useState(0)
  const [maxBodyHeight, setMaxBodyHeight] = useState(0)
  useLayoutEffect(() => {
    setMaxBodyHeight(0)
  }, [tab])
  useLayoutEffect(() => {
    const h = bodyRef.current?.offsetHeight
    if (h == null) return
    setBodyHeight(h)
    setMaxBodyHeight((m) => Math.max(m, h))
  })
  // iOS Safari can still visibly snap the scroll pane on a sub-tab tap even with the height
  // spacer above: a finger-thrown pane still has momentum decelerating when the tap lands, and
  // WebKit reconciles that inertia against the mid-flight layout change with a visible jump
  // instead of a clean clamp. Pinning scrollTop back explicitly (which also kills the leftover
  // momentum) is the only reliable fix for that case.
  const pendingScrollRef = useRef<number | null>(null)
  const pinTab = (k: TabKey) => {
    pendingScrollRef.current = document.querySelector<HTMLElement>('.app-layout')?.scrollTop ?? null
    setTab(k)
  }
  useLayoutEffect(() => {
    if (pendingScrollRef.current == null) return
    const el = document.querySelector<HTMLElement>('.app-layout')
    if (el) el.scrollTop = pendingScrollRef.current
    pendingScrollRef.current = null
  }, [tab])
  const narrow = useNarrow()

  // The list and detail screens share ONE scrolling element (.app-layout) — swapping to this
  // component doesn't reset it, so opening a commitment while the list was scrolled down lands
  // here mid-scroll instead of at the top. Reset on mount and again whenever a DIFFERENT
  // commitment opens (cross-links like a loan's "repayment plan →" swap the id without
  // unmounting this component).
  useEffect(() => {
    document.querySelector('.app-layout')?.scrollTo(0, 0)
  }, [commitment.id])

  const navigate = useNavigate()
  const { hydrated: c, positions, envelope } = useCommitmentDetailData(commitment, fx)
  const writes = useDetailMutations(commitment, onChanged)
  const m: DetailMutations = {
    ...writes,
    onAskLucius,
    onOpenCommitment,
    // Deep-links the SAME transaction drawer the register opens (mirrors the write-receipt
    // chip's /accounts?txn=<id> precedent) — a real navigation, not a chat-mediated lookup.
    onOpenTxn: (txnId) =>
      void navigate({
        to: '/accounts',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search: ((prev: any) => ({ ...prev, txn: txnId })) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
  }

  const next = nextInstallment(c)
  const tracker = isTracker(c)
  const remB = remainingBase(c, fx)
  const { gap } = computeCoverage(c, fx, envelope)
  const funded = remB - gap
  const atRisk = !!c.coverage?.at_risk && c.status === 'active'
  const base = getBaseCurrency()
  const nonBase = c.currency !== base
  const loan = loanIntel(c)

  let insight: React.ReactNode
  let insightBtnLabel = 'Lucius'
  // " with Lucius" is dropped from the button on phone (kept in the DOM via
  // .c2-ribbon-btn-rest, same idiom as the list masthead's "Fix with Lucius" → "Fix") — the
  // Spark icon beside the button and the ribbon's own Lucius-tinted border already say whose
  // suggestion this is, so spelling it out again in the button itself is the one truly
  // redundant word here. Only set for the two branches whose CORE label needs it restored on
  // desktop ("Fix", "Draft early payoff"); the bare 'Lucius' default has nothing to append.
  let insightBtnSuffix: string | null = null
  let insightHot = true
  let insightPrompt: string

  if (atRisk && c.coverage) {
    const lateDraw = (c.funding_plan || []).find(
      (f) =>
        f.available_date &&
        c.coverage?.earliest_shortfall_date &&
        f.available_date > c.coverage.earliest_shortfall_date,
    )
    const weeks =
      lateDraw && c.coverage.earliest_shortfall_date
        ? Math.round(
            (new Date(lateDraw.available_date as string).getTime() -
              new Date(c.coverage.earliest_shortfall_date).getTime()) /
              (7 * 86400000),
          )
        : null
    insight = (
      <>
        {/* .c2-ribbon-core (desktop) / .c2-ribbon-lite (phone) — same toggle the list masthead's
            ribbon already uses (global CSS, no new rule needed). On phone the mechanism-level
            elaboration ("the funding arrives ~4 weeks late, pulling it forward closes the
            gap...") was costing 2 extra lines on a screen where this ribbon is now the FIRST
            substantive content the reader hits (owner: "too much space is consumed here") — the
            headline number+date is the part worth reading at a glance; the reasoning is what
            tapping "Fix" is for. */}
        <span className="c2-ribbon-core">
          {formatMessage({ id: 'commitments.insight.shortfall', defaultMessage: 'This plan runs {amount} short of your cash floor around {date}' }, {
            amount: <b className="money">{fBase(c.coverage.shortfall_base)}</b>,
            date: <b>{c.coverage.earliest_shortfall_date ? fmtDate(c.coverage.earliest_shortfall_date) : ''}</b>,
          })}
          {lateDraw && weeks != null
            ? `. ${locale !== 'en' ? formatMessage({ id: 'commitments.insight.lateFunding', defaultMessage: 'It is funded by "{label}", which arrives on {date}, about {weeks} weeks after the payment. {action} closes the gap without new borrowing.' }, {
              label: lateDraw.label, date: fmtDate(lateDraw.available_date as string), weeks,
              action: lateDraw.type === 'asset_sale'
                ? formatMessage({ id: 'commitments.insight.sellEarlier', defaultMessage: 'Selling earlier' })
                : formatMessage({ id: 'commitments.insight.fundEarlier', defaultMessage: 'Pulling that funding forward' }),
            }) : lateFundingHint(lateDraw.label, lateDraw.available_date as string, weeks, lateDraw.type === 'asset_sale')}`
            : '.'}
        </span>
        <span className="c2-ribbon-lite">
          {formatMessage({ id: 'commitments.insight.shortfallBrief', defaultMessage: '{amount} short around {date}.' }, {
            amount: <b className="money">{fBase(c.coverage.shortfall_base)}</b>,
            date: <b>{c.coverage.earliest_shortfall_date ? fmtDate(c.coverage.earliest_shortfall_date) : ''}</b>,
          })}
        </span>
      </>
    )
    insightBtnLabel = formatMessage({ id: 'commitments.detail.fix', defaultMessage: 'Fix' })
    insightBtnSuffix = formatMessage({ id: 'commitments.detail.withLucius', defaultMessage: ' with Lucius' })
    insightPrompt = `The "${c.name}" commitment runs ${fBase(c.coverage.shortfall_base)} short of the cash floor around ${c.coverage.earliest_shortfall_date ? fmtDate(c.coverage.earliest_shortfall_date) : 'an upcoming date'}${lateDraw && weeks != null ? `. The "${lateDraw.label}" funding does not arrive until about ${weeks} weeks after the payment` : ''}. Help me close this gap.`
  } else if (loan && c.status === 'active') {
    insight = (
      <>
        <span className="c2-ribbon-core">
          {formatMessage({ id: 'commitments.insight.loan', defaultMessage: '{paid} of {term} payments made — {balance} balance at {rate}. An extra {extra} clears it {early}, saving about {saved} in interest.' }, {
            paid: loan.paidCount, term: loan.term, balance: <b className="money">{fBase(loan.balance)}</b>, rate: <b>{loan.apr}%</b>,
            extra: <b className="money">{formatMessage({ id: 'commitments.insight.perMonth', defaultMessage: '{amount}/mo' }, { amount: fBase(loan.extra) })}</b>, early: <b>{formatMessage({ id: 'commitments.insight.monthsEarly', defaultMessage: '~{months} months early' }, { months: loan.monthsSaved })}</b>, saved: <b className="money">{fBase(loan.interestSaved)}</b>,
          })}
        </span>
        <span className="c2-ribbon-lite">
          {formatMessage({ id: 'commitments.insight.loanBrief', defaultMessage: '{paid} of {term} paid — {balance} at {rate}.' }, { paid: loan.paidCount, term: loan.term, balance: <b className="money">{fBase(loan.balance)}</b>, rate: <b>{loan.apr}%</b> })}
        </span>
      </>
    )
    insightBtnLabel = formatMessage({ id: 'commitments.detail.draftEarlyPayoff', defaultMessage: 'Draft early payoff' })
    insightBtnSuffix = formatMessage({ id: 'commitments.detail.withLucius', defaultMessage: ' with Lucius' })
    insightHot = false
    insightPrompt = `Help me draft an early-payoff plan for my "${c.name}" loan — paying an extra ${fBase(loan.extra)}/mo would clear it about ${loan.monthsSaved} months early and save roughly ${fBase(loan.interestSaved)} in interest.`
  } else {
    const envSource = envelope
      ? (c.funding_plan || []).find((f) => f.type === 'income' && !f.disabled)
      : null
    insight =
      envSource && envelope ? (
        <>
          {formatMessage({ id: 'commitments.insight.autopilot', defaultMessage: 'On autopilot — {amount} flows into your {target} target; {saved} saved so far.' }, { amount: <b className="money">{formatMessage({ id: 'commitments.insight.perMonth', defaultMessage: '{amount}/mo' }, { amount: fBase(envSource.value_base ?? 0) })}</b>, target: <b>{envelope.envelope}</b>, saved: <b className="money">{fBase(envelope.accumulated)}</b> })}
        </>
      ) : (
        <>
          {tracker ? formatMessage({ id: 'commitments.insight.fundedContributions', defaultMessage: 'Fully funded — every remaining contribution is covered by earmarked cash and dated draws.' }) : formatMessage({ id: 'commitments.insight.fundedInstallments', defaultMessage: 'Fully funded — every remaining installment is covered by earmarked cash and dated draws.' })}
        </>
      )
    insightPrompt = `My "${c.name}" commitment looks fully funded. Take a look and let me know if there's anything worth tightening up.`
  }

  const unpaidN = c.installments.filter((i) => i.status !== 'paid').length
  const srcN = (c.funding_plan || []).length
  const pendingActsN = (c.actions || []).filter((a) => a.status === 'pending').length
  const actsOverdue = (c.actions || []).some(
    (a) =>
      a.status === 'pending' &&
      a.due_date &&
      new Date(a.due_date + 'T00:00:00') < new Date(new Date().toDateString()),
  )
  const fundGap = !tracker && funded < remB - 0.5

  const fxCcy = fx[c.currency]
  const fxBase = fx[base]
  const nativePerBase = fxCcy && fxBase ? fxBase / fxCcy : null

  // On phone, everything the standalone Mark completed button and the inline rename/note
  // pencils used to do folds into this ONE menu instead — desktop keeps those as separate,
  // always-visible controls (see the `!narrow` checks around this component's icon buttons
  // and the primary button below).
  const menuItems = (
    <>
      {narrow && (
        <>
          <button
            className="c3-menu-it"
            role="menuitem"
            onClick={() => {
              setMenu(false)
              setNameDraft(c.name)
            }}
          >
            {formatMessage({ id: 'commitments.detail.rename', defaultMessage: 'Rename' })}
          </button>
          <button
            className="c3-menu-it"
            role="menuitem"
            onClick={() => {
              setMenu(false)
              setNoteDraft(c.note || '')
            }}
          >
            {c.note
              ? formatMessage({ id: 'commitments.detail.editNote', defaultMessage: 'Edit note' })
              : formatMessage({ id: 'commitments.detail.addNote', defaultMessage: 'Add note' })}
          </button>
          <button
            className="c3-menu-it"
            role="menuitem"
            onClick={() => {
              setMenu(false)
              void writes.setStatus(c.status === 'active' ? 'completed' : 'active')
            }}
          >
            {c.status === 'active'
              ? formatMessage({
                  id: 'commitments.detail.markCompleted',
                  defaultMessage: 'Mark completed',
                })
              : formatMessage({
                  id: 'commitments.detail.reactivate',
                  defaultMessage: 'Reactivate',
                })}
          </button>
          <div className="c3-menu-divider" />
        </>
      )}
      {c.status === 'active' && (
        <button
          className="c3-menu-it"
          role="menuitem"
          onClick={() => {
            setMenu(false)
            setConfirmCancel(true)
            setConfirmDel(false)
          }}
        >
          {formatMessage({ id: 'commitments.detail.cancel', defaultMessage: 'Cancel commitment' })}
        </button>
      )}
      <button
        className="c3-menu-it danger"
        role="menuitem"
        onClick={() => {
          setMenu(false)
          setConfirmDel(true)
          setConfirmCancel(false)
        }}
      >
        {formatMessage({ id: 'remaining.deleteCommitment', defaultMessage: 'Delete commitment' })}
      </button>
    </>
  )

  const kebabTrigger = (
    <button
      className={'c3-kebab' + (menu ? ' open' : '')}
      aria-label={formatMessage({ id: 'commitments.detail.more', defaultMessage: 'More actions' })}
      aria-expanded={menu}
      onClick={() => setMenu(!menu)}
    >
      <DotsIcon />
    </button>
  )

  // Desktop: an anchored dropdown (position:relative wrapper + absolute popup), same as
  // before. Phone: a small floating "..." button is a poor anchor for a menu, and Modal
  // already owns the phone bottom-sheet geometry (see note editor above) — reuse it instead
  // of a bespoke dropdown, so the menu opens as a full-width sheet with normal-sized tap
  // targets rather than a cramped popup pinned to a tiny trigger.
  const kebab = narrow ? (
    <>
      {kebabTrigger}
      {menu && (
        <Modal open onClose={() => setMenu(false)} title={c.name}>
          <div className="c3-menu-sheet" role="menu">
            {menuItems}
          </div>
        </Modal>
      )}
    </>
  ) : (
    <div className="c3-menu-wrap">
      {kebabTrigger}
      {menu && (
        <>
          <div className="c3-menu-veil" onClick={() => setMenu(false)} />
          <div className="c3-menu" role="menu">
            {menuItems}
          </div>
        </>
      )}
    </div>
  )

  return (
    <Container size="wide" data-ctx-region="content" data-ctx-title={'Commitment: ' + c.name}>
      <Stack>
        {/* The open commitment is itself mentionable: data-entity-id makes it right-clickable
            ("Ask Lucius about this") and draggable into the dock, and data-ctx-* puts it in the
            screen snapshot so "this commitment" resolves while the detail is open. */}
        <section className="c2-det c3-flat" data-screen-label={'Commitment: ' + c.name}>
          <div className="c2-det-pad">
            {/* The commitment identity lives on the HEADER, not the whole section: a
                draggable ancestor made every child without its own entity — the Overview
                preview rows — drag as the commitment. */}
            <div
              className="c2-det-head"
              {...entityRefProps(
                'commitment',
                c.id,
                c.name || '(unnamed)',
                `${c.name} ${KIND_LABELS[c.kind]} ${c.note}`,
                `${KIND_LABELS[c.kind]} • ${c.status}`,
              )}
              data-ctx=""
              data-ctx-type="commitment"
              data-ctx-fields={buildCtxFields(
                filterByDescriptor('commitment', {
                  name: c.name,
                  kind: c.kind,
                  currency: c.currency,
                  status: c.status,
                  note: c.note,
                  created_at: c.created_at,
                }),
              )}
              draggable
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                {nameDraft != null ? (
                  <input
                    className="c2-input c2-det-name-input"
                    type="text"
                    value={nameDraft}
                    autoFocus
                    onChange={(e) => setNameDraft(e.target.value)}
                    onBlur={() => {
                      if (nameDraft.trim()) void writes.rename(nameDraft.trim())
                      setNameDraft(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      if (e.key === 'Escape') setNameDraft(null)
                    }}
                  />
                ) : (
                  <div className="c2-det-name">
                    {/* Truncates instead of wrapping on phone (see .c2-det-name-text), so a
                        long name never pushes the kebab onto a second line — it stays pinned
                        at the end of the SAME row as the title, not floating below it. */}
                    <span className="c2-det-name-text">{c.name}</span>
                    {!narrow && (
                      <button
                        className="c2-iconbtn on"
                        aria-label={formatMessage({
                          id: 'commitments.detail.rename',
                          defaultMessage: 'Rename',
                        })}
                        onClick={() => setNameDraft(c.name)}
                      >
                        <PencilIcon />
                      </button>
                    )}
                    {narrow && kebab}
                  </div>
                )}
                <div className="c2-det-tags">
                  <span className="c2-tag">{kinds[c.kind] ?? KIND_LABELS[c.kind]}</span>
                  <span className="c2-tag">{c.currency}</span>
                  {nonBase && nativePerBase != null && (
                    <span
                      className="c2-tag c3-fx"
                      title={formatMessage({
                        id: 'commitments.detail.rateHint',
                        defaultMessage:
                          "Base amounts use today's rate — shortfall verdicts move with FX",
                      })}
                    >
                      {getCurrencySymbol(c.currency)}
                      {nativePerBase.toLocaleString(getNumberLocale(), {
                        maximumFractionDigits: nativePerBase >= 100 ? 0 : 2,
                      })}{' '}
                      / {getCurrencySymbol(base)} • {formatMessage({ id: 'visible2.today', defaultMessage: 'today' })}
                    </span>
                  )}
                  <span className={`c2-tag status-${c.status}`}>{statuses[c.status] ?? c.status}</span>
                  {atRisk && c.coverage && (
                    <span className="c2-chip short">
                      {formatMessage({ id: 'visible2.shortBy', defaultMessage: 'Short {amount} by {date}' }, { amount: fBase(c.coverage.shortfall_base), date: c.coverage.earliest_shortfall_date ? fmtDate(c.coverage.earliest_shortfall_date) : '' })}
                    </span>
                  )}
                  {c.coverage?.assessed && !atRisk && c.status === 'active' && (
                    <span className="c2-chip ok">
                      {formatMessage({
                        id: 'commitments.detail.onTrack',
                        defaultMessage: 'On track to fund',
                      })}
                    </span>
                  )}
                </div>
                {narrow ? (
                  c.note && <div className="c2-det-note">{c.note}</div>
                ) : noteDraft != null ? (
                  <div className="c2-edit" style={{ marginTop: 8, maxWidth: 560 }}>
                    <input
                      className="c2-input grow"
                      style={{ width: '100%' }}
                      type="text"
                      value={noteDraft}
                      autoFocus
                      placeholder={formatMessage({ id: 'commitments.detail.notePlaceholder', defaultMessage: 'Add a note about this commitment' })}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void writes.updateNote(noteDraft.trim())
                          setNoteDraft(null)
                        }
                        if (e.key === 'Escape') setNoteDraft(null)
                      }}
                    />
                    <div className="c2-edit-btns">
                      <button className="c2-mini-btn" onClick={() => setNoteDraft(null)}>
                        {formatMessage({ id: 'remaining.cancel', defaultMessage: 'Cancel' })}
                      </button>
                      <button
                        className="c2-mini-btn pri"
                        onClick={() => {
                          void writes.updateNote(noteDraft.trim())
                          setNoteDraft(null)
                        }}
                      >
                        {formatMessage({ id: 'visible2.save', defaultMessage: 'Save' })}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="c2-det-note c2-note-row">
                    {c.note || (
                      <span style={{ fontStyle: 'italic' }}>
                        {formatMessage({
                          id: 'commitments.detail.noNote',
                          defaultMessage: 'No note',
                        })}
                      </span>
                    )}
                    <button
                      className="c2-iconbtn on"
                      aria-label={formatMessage({
                        id: 'commitments.detail.editNote',
                        defaultMessage: 'Edit note',
                      })}
                      onClick={() => setNoteDraft(c.note || '')}
                    >
                      <PencilIcon />
                    </button>
                  </div>
                )}
              </div>
              <div className="c2-det-acts">
                {!narrow && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      void writes.setStatus(c.status === 'active' ? 'completed' : 'active')
                    }
                  >
                    {c.status === 'active'
                      ? formatMessage({
                          id: 'commitments.detail.markCompleted',
                          defaultMessage: 'Mark completed',
                        })
                      : formatMessage({
                          id: 'commitments.detail.reactivate',
                          defaultMessage: 'Reactivate',
                        })}
                  </Button>
                )}
                {!narrow && kebab}
              </div>
            </div>

            {narrow && noteDraft != null && (
              <Modal
                open
                onClose={() => setNoteDraft(null)}
                title={formatMessage({ id: 'commitments.detail.note', defaultMessage: 'Note' })}
                footer={
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setNoteDraft(null)}>
                      {formatMessage({ id: 'remaining.cancel', defaultMessage: 'Cancel' })}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        void writes.updateNote(noteDraft.trim())
                        setNoteDraft(null)
                      }}
                    >
                      {formatMessage({ id: 'visible2.save', defaultMessage: 'Save' })}
                    </Button>
                  </>
                }
              >
                <textarea
                  className="c2-input c2-note-sheet-textarea"
                  autoFocus
                  rows={4}
                  placeholder={formatMessage({ id: 'commitments.detail.notePlaceholder', defaultMessage: 'Add a note about this commitment' })}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                />
              </Modal>
            )}

            {(confirmDel || confirmCancel) && (
              <div className="c3-confirmbar">
                {confirmDel ? (
                  <span className="c2-del-confirm">
                    {formatMessage({ id: 'visible2.deleteConfirm', defaultMessage: 'Delete "{name}"? Its synced budget targets are removed too.' }, { name: c.name })}
                    <button className="c2-mini-btn" onClick={() => setConfirmDel(false)}>
                      {formatMessage({ id: 'visible2.keep', defaultMessage: 'Keep' })}
                    </button>
                    <button
                      className="c2-mini-btn danger"
                      onClick={() => {
                        void writes.deleteCommitment().then(onBack)
                      }}
                    >
                      {formatMessage({ id: 'remaining.delete', defaultMessage: 'Delete' })}
                    </button>
                  </span>
                ) : (
                  <span className="c2-del-confirm">
                    {formatMessage({ id: 'visible2.cancelConfirm', defaultMessage: 'Cancel "{name}"? History is kept; tracking and funding stop.' }, { name: c.name })}
                    <button className="c2-mini-btn" onClick={() => setConfirmCancel(false)}>
                      {formatMessage({ id: 'visible2.keep', defaultMessage: 'Keep' })}
                    </button>
                    <button
                      className="c2-mini-btn danger"
                      onClick={() => {
                        void writes.setStatus('cancelled')
                        setConfirmCancel(false)
                      }}
                    >
                      {formatMessage({ id: 'remaining.cancelCommitment', defaultMessage: 'Cancel commitment' })}
                    </button>
                  </span>
                )}
              </div>
            )}

            <div className="c2-exp-figs">
              <div className="c2-stat">
                <span className="k">
                  {tracker
                    ? formatMessage({
                        id: 'commitments.detail.contributed',
                        defaultMessage: 'Contributed',
                      })
                    : formatMessage({ id: 'commitments.detail.paid', defaultMessage: 'Paid' })}
                </span>
                <span className={moneyClass('v')}>{fBase(paidBase(c, fx))}</span>
                <span className="u">
                  {formatMessage({ id: 'visible2.percentOf', defaultMessage: '{percent} of {amount}' }, { percent: fPct(paidPct(c)), amount: <span className="money">{fBase(nativeTotalBase(c, fx))}</span> })}
                </span>
              </div>
              <div className="c2-stat">
                <span className="k">
                  {formatMessage({
                    id: 'commitments.detail.remaining',
                    defaultMessage: 'Remaining',
                  })}
                </span>
                <span className={moneyClass('v')}>{fBase(remB)}</span>
                <span className="u">
                  {formatMessage(
                    {
                      id: 'commitments.detail.installments',
                      defaultMessage: '{count} installments left',
                    },
                    { count: c.installments.filter((i) => i.status !== 'paid').length },
                  )}
                </span>
              </div>
              <div className="c2-stat">
                <span className="k">
                  {tracker
                    ? formatMessage({
                        id: 'commitments.detail.nextContribution',
                        defaultMessage: 'Next contribution',
                      })
                    : formatMessage({
                        id: 'commitments.detail.nextPayment',
                        defaultMessage: 'Next payment',
                      })}
                </span>
                <span className={moneyClass('v')}>
                  {next ? fBase(toBase(next.amount, c.currency, fx)) : '—'}
                </span>
                <span className="u">
                  {next
                    ? fmtDate(next.due_date)
                    : formatMessage({
                        id: 'commitments.detail.complete',
                        defaultMessage: 'Complete',
                      })}
                </span>
              </div>
              {loan && (
                <div className="c2-stat">
                  <span className="k">
                    {formatMessage({
                      id: 'commitments.detail.loanBalance',
                      defaultMessage: 'Loan balance',
                    })}
                  </span>
                  <span className={moneyClass('v')}>{fBase(loan.balance)}</span>
                  <span className="u">
                    {formatMessage(
                      {
                        id: 'commitments.detail.monthsLeft',
                        defaultMessage: '{apr}% APR • {months} months left',
                      },
                      { apr: loan.apr, months: loan.monthsLeft },
                    )}
                  </span>
                </div>
              )}
              {!tracker && !loan && (
                <div className="c2-stat">
                  <span className="k">
                    {formatMessage({
                      id: 'commitments.detail.funding',
                      defaultMessage: 'Funding lined up',
                    })}
                  </span>
                  <span className={moneyClass('v', fundGap ? 'warn' : undefined)}>
                    {fBase(funded)}
                  </span>
                  <span className="u">
                    {fundGap
                      ? formatMessage(
                          {
                            id: 'commitments.detail.shortRemaining',
                            defaultMessage: '{amount} short of remaining',
                          },
                          { amount: fBase(remB - funded) },
                        )
                      : formatMessage({
                          id: 'commitments.detail.covers',
                          defaultMessage: 'covers remaining',
                        })}
                  </span>
                </div>
              )}
            </div>

            <div className="c2-ribbon c2-det-ribbon">
              <span className="c2-ribbon-spark">
                <Spark />
              </span>
              <span className="c2-ribbon-text">{insight}</span>
              <span className="c2-ribbon-acts">
                <button
                  className={'c2-ribbon-act' + (insightHot ? ' hot' : '')}
                  onClick={() => onAskLucius(insightPrompt)}
                >
                  <Spark size={13} />
                  {insightBtnLabel}
                  {insightBtnSuffix && (
                    <span className="c2-ribbon-btn-rest">{insightBtnSuffix}</span>
                  )}
                </button>
              </span>
            </div>

            {!tracker && c.status === 'active' && <TimelineStrip commitment={c} fx={fx} />}

            <div className="c2-seg c3-dettabs" role="tablist">
              <TabButton
                k="overview"
                label={formatMessage({
                  id: 'commitments.detail.overview',
                  defaultMessage: 'Overview',
                })}
                tab={tab}
                setTab={pinTab}
              />
              <TabButton
                k="schedule"
                label={
                  tracker
                    ? formatMessage({
                        id: 'commitments.detail.contributions',
                        defaultMessage: 'Contributions',
                      })
                    : formatMessage({
                        id: 'commitments.detail.schedule',
                        defaultMessage: 'Schedule',
                      })
                }
                n={unpaidN || null}
                tab={tab}
                setTab={pinTab}
              />
              <TabButton
                k="funding"
                label={formatMessage({
                  id: 'commitments.detail.fundingTab',
                  defaultMessage: 'Funding',
                })}
                n={srcN || null}
                dot={fundGap ? 'warn' : null}
                tab={tab}
                setTab={pinTab}
              />
              <TabButton
                k="actions"
                label={formatMessage({
                  id: 'commitments.detail.actions',
                  defaultMessage: 'Actions & events',
                })}
                n={pendingActsN || null}
                dot={actsOverdue ? 'bad' : null}
                tab={tab}
                setTab={pinTab}
              />
            </div>

            <div className="c3-det-body" ref={bodyRef}>
              {tab === 'overview' && (
                <OverviewTab
                  commitment={c}
                  fx={fx}
                  envelope={envelope}
                  positions={positions}
                  goTo={pinTab}
                  m={m}
                />
              )}
              {tab === 'schedule' && <Schedule commitment={c} fx={fx} envelope={envelope} m={m} />}
              {tab === 'funding' && (
                <Funding commitment={c} fx={fx} envelope={envelope} positions={positions} m={m} />
              )}
              {tab === 'actions' && <Actions commitment={c} fx={fx} m={m} />}
            </div>
            {maxBodyHeight > bodyHeight && (
              <div
                className="c2-scroll-spacer"
                style={{ height: maxBodyHeight - bodyHeight, order: 8 }}
                aria-hidden="true"
              />
            )}
          </div>
        </section>
      </Stack>
    </Container>
  )
}

function TabButton({
  k,
  label,
  n,
  dot,
  tab,
  setTab,
}: {
  k: TabKey
  label: string
  n?: number | null
  dot?: 'warn' | 'bad' | null
  tab: TabKey
  setTab: (k: TabKey) => void
}) {
  return (
    <button
      className={tab === k ? 'on' : ''}
      role="tab"
      aria-selected={tab === k}
      onClick={() => setTab(k)}
    >
      {label}
      {n != null && <span className="c3-tabn">{n}</span>}
      {dot && <span className={'c3-tabdot' + (dot === 'bad' ? ' bad' : '')} />}
    </button>
  )
}
