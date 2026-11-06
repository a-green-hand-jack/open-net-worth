// plan/budgetTarget.tsx — TargetView (read-only) + TargetEditor (set-aside vs refill,
// cadence, ring, breakdown, snooze, per-category auto-assign) ported verbatim from
// budget.jsx, PLUS the Notes section at the foot of the modal (owner-approved + money-moves
// handoff): a "NOTES" label + "Enter a note…" textarea, shown in both view and edit states.
import { useState, useRef, useEffect } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { ReactNode } from 'react'
import * as PD from './planData'
import { fDate, getCurrencySymbol, parseDate } from '../../../utils/format'
import { X, Chevron, Arrow } from './icons'
import type { LocalCat } from './useBudgetModel'
import { Button, DateField, Meter, Switch } from '../../ui'
import { ColorIcon, useAutoAssignLabel } from './budgetParts'
import { PlanningModal } from './PlanningModal'

const fMoney = (n: number) => PD.fBaseCents(n)
const CAD_WORD: Record<string, string> = { weekly: 'week', monthly: 'month', yearly: 'year' }

// ── Target deadlines (handoff delta #13) — weekday names (Monday=0, matching the backend's
// `due_weekday`) + the ordinal-suffix helper, ported verbatim from prototype/plan/budget.jsx :383-384.
export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'],
    v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0] || 'th')
}

// Pure — the target-deadline subtitle (handoff delta #13, display-only; mirrors prototype
// budget.jsx TargetEditor's `vSub` exactly, incl. its unset-defaults): weekly → the due
// weekday name (unset → the server's own Monday default); monthly → the ordinal day, OR "last
// day" for -1/unset; yearly → the annual date, OR "end of the year" when unset; custom → its
// own repeat/by-date phrasing, unchanged. Split out so it's testable without mounting the view.
type TargetSubtitleParts =
  | { kind: 'repeat' | 'monthEnd' | 'yearEnd' }
  | { kind: 'byDate'; date: string }
  | { kind: 'weekly'; weekday: number }
  | { kind: 'monthDay'; day: number }
  | { kind: 'yearly'; date: string }
  | { kind: 'periodEnd'; period: string }

export function targetSubtitleParts(
  cat: Pick<LocalCat, 'cad' | 'rep' | 'due' | 'dueWeekday' | 'dueDay' | 'everyUnit'>,
): TargetSubtitleParts {
  if (cat.cad === 'custom')
    return cat.rep
      ? { kind: 'repeat' }
      : { kind: 'byDate', date: parseDate(cat.due || '') ? fDate(cat.due!, 'short', 'always') : '' }
  if (cat.cad === 'weekly') return { kind: 'weekly', weekday: cat.dueWeekday ?? 0 }
  if (cat.cad === 'monthly')
    return cat.dueDay != null && cat.dueDay !== -1
      ? { kind: 'monthDay', day: cat.dueDay }
      : { kind: 'monthEnd' }
  if (cat.cad === 'yearly')
    return cat.due
      ? { kind: 'yearly', date: fDate(cat.due, 'short', 'never') }
      : { kind: 'yearEnd' }
  return { kind: 'periodEnd', period: CAD_WORD[cat.cad || 'monthly'] || 'month' }
}

export function targetSubtitle(
  cat: Pick<LocalCat, 'cad' | 'rep' | 'due' | 'dueWeekday' | 'dueDay' | 'everyUnit'>,
): string {
  const parts = targetSubtitleParts(cat)
  switch (parts.kind) {
    case 'repeat':
      return 'Repeating target'
    case 'byDate':
      return 'By ' + parts.date
    case 'weekly':
      return 'Every ' + WEEKDAYS[parts.weekday]
    case 'monthDay':
      return 'By the ' + ordinal(parts.day) + ' of each month'
    case 'monthEnd':
      return 'By the last day of each month'
    case 'yearly':
      return 'By ' + parts.date + ' each year'
    case 'yearEnd':
      return 'By the end of the year'
    case 'periodEnd':
      return 'By the end of the ' + parts.period
  }
}

// ── Target-deadline "don't stamp defaults" guard (handoff regression FEB-04) — a legacy
// target saved before due-day presets existed carries NO due_weekday/due_day; the editor still
// needs SOME value to show in its Every/By select (targetSubtitle's own Monday/last-day
// default), but must not SEND that display default back to the server on a save that never
// touched the control. Pure + exported so the "only send when the loaded target had one, or
// the user actually changed the control this session" rule is testable without mounting the
// modal. ────────────────────────────────────────────────────────────────────────────────────
export function resolveDueWeekdayForSave(
  cad: string,
  dow: string,
  dowTouched: boolean,
  catDueWeekday: number | null | undefined,
): number | undefined {
  if (cad !== 'weekly') return undefined
  if (catDueWeekday == null && !dowTouched) return undefined
  return WEEKDAYS.indexOf(dow)
}
export function resolveDueDayForSave(
  cad: string,
  dom: string,
  domTouched: boolean,
  catDueDay: number | null | undefined,
): number | undefined {
  if (cad !== 'monthly') return undefined
  if (catDueDay == null && !domTouched) return undefined
  return dom === 'last' ? -1 : Number(dom)
}

// ── Read-only target view (auto-assign list + cover/fund/move callouts) ────────
// ── Side-panel cards (owner, 2026-09-25 — YNAB's inspector): each section is its own collapsible
// card — header = title + chevron, with an optional right-hand slot (the balance pill) — so the
// panel reads as distinct surfaces on a tinted tray instead of one long flat sheet.
export function TgtCard({
  title,
  icon,
  right,
  children,
}: {
  title: string
  icon?: ReactNode
  right?: ReactNode
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <section className="pl-tgt-card">
      <div className="pl-tgt-card-head">
        <button
          className="pl-tgt-card-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {icon}
          <span>{title}</span>
          <span className={'pl-tgt-card-chev' + (open ? '' : ' collapsed')}>
            <Chevron dir="down" size={14} />
          </span>
        </button>
        {right}
      </div>
      {open && <div className="pl-tgt-card-body">{children}</div>}
    </section>
  )
}

function BalanceCard({ cat }: { cat: LocalCat }) {
  const { formatMessage } = useAppIntl()
  const rollover = cat.available - cat.assigned - cat.activity
  const balTone = cat.available < -0.005 ? 'bad' : cat.available > 0.005 ? 'good' : 'zero'
  return (
    <TgtCard
      title={formatMessage({ id: 'plan.availableBalance', defaultMessage: 'Available balance' })}
      right={<span className={'pl-tgt-bal ' + balTone}>{fMoney(cat.available)}</span>}
    >
      <div className="pl-tgt-rows pl-tgt-bal-rows">
        <div className="pl-tgt-row">
          <span>
            {formatMessage({
              id: 'plan.leftLastMonth',
              defaultMessage: 'Left over from last month',
            })}
          </span>
          <b>{fMoney(rollover)}</b>
        </div>
        <div className="pl-tgt-row">
          <span>
            {formatMessage({ id: 'plan.assignedThisMonth', defaultMessage: 'Assigned this month' })}
          </span>
          <b className="pos">+{fMoney(cat.assigned)}</b>
        </div>
        <div className="pl-tgt-row">
          <span>
            {formatMessage({ id: 'plan.spentThisMonth', defaultMessage: 'Spent this month' })}
          </span>
          <b>{Math.abs(cat.activity) < 0.005 ? fMoney(0) : fMoney(cat.activity)}</b>
        </div>
      </div>
    </TgtCard>
  )
}

// No target yet: a question and one button, never a pre-filled draft form that reads as if a
// target were already set (owner, 2026-09-25 — the "did I really set that?" confusion).
function TargetEmpty({ label, onCreate }: { label: string; onCreate: () => void }) {
  const { formatMessage } = useAppIntl()
  return (
    <div className="pl-tgt-empty">
      <div className="pl-tgt-empty-q">
        {formatMessage(
          { id: 'plan.targetEmptyQuestion', defaultMessage: 'How much do you need for {name}?' },
          { name: label },
        )}
      </div>
      <div className="pl-tgt-empty-txt">
        {formatMessage({
          id: 'plan.targetEmptyHelp',
          defaultMessage:
            "Set a target and you'll see how much to put aside each month to stay on track.",
        })}
      </div>
      <Button variant="secondary" size="dense" onClick={onCreate}>
        {formatMessage({ id: 'plan.createTarget', defaultMessage: 'Create target' })}
      </Button>
    </div>
  )
}

const BOLT = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H13z" />
  </svg>
)

function TargetView({
  cat,
  onEdit,
  onFund,
  onMoney,
  onSnooze,
}: {
  cat: LocalCat
  onEdit: () => void
  onFund: (msg: string) => void
  onMoney: (key: string, kind: string, amount?: number) => void
  onSnooze?: (snooze: boolean) => void
}) {
  const { formatMessage, locale } = useAppIntl()
  const autoLabel = useAutoAssignLabel()
  const [snoozed, setSnoozed] = useState(!!cat.snoozed)
  const vRefill = cat.tt === 'refill'
  const vBalance = cat.tt === 'balance'
  // Both 'refill' and 'balance' measure the Available balance (not this month's Assigned).
  const vMeasuresAvail = vRefill || vBalance
  const vAmt = cat.tamt != null ? cat.tamt : cat.target || 0
  const { monthlyTarget: vMonthlyTarget, funded: vFunded, toGo: vToGo } = PD.targetProgress(cat)
  // A savings goal ('balance') is never "over target" — reaching it early is just done.
  const vOverBy = vRefill ? Math.max(0, cat.available - vMonthlyTarget) : 0
  const vPct = vMonthlyTarget > 0 ? Math.min(100, Math.max(0, (vFunded / vMonthlyTarget) * 100)) : 0
  const vRing =
    cat.available < -0.005
      ? 'var(--bad)'
      : vToGo > 0.005
        ? 'var(--warn)'
        : vOverBy > 0.005
          ? '#5aa9f0'
          : 'var(--good)'
  const vComplete = cat.available >= -0.005 && vToGo <= 0.005 && vOverBy <= 0.005
  const period =
    cat.cad === 'weekly'
      ? formatMessage({ id: 'plan.periodWeek', defaultMessage: 'week' })
      : cat.cad === 'yearly'
        ? formatMessage({ id: 'plan.periodYear', defaultMessage: 'year' })
        : formatMessage({ id: 'plan.periodMonth', defaultMessage: 'month' })
  const count = cat.every || 1
  const frequency =
    cat.everyUnit === 'year'
      ? formatMessage(
          {
            id: 'plan.everyYears',
            defaultMessage: '{count, plural, =1 {every year} other {every # years}}',
          },
          { count },
        )
      : cat.everyUnit === 'month'
        ? formatMessage(
            {
              id: 'plan.everyMonths',
              defaultMessage: '{count, plural, =1 {every month} other {every # months}}',
            },
            { count },
          )
        : formatMessage(
            { id: 'plan.everyUnknownUnit', defaultMessage: 'every {unit}' },
            { unit: count > 1 ? `${count} ${cat.everyUnit}s` : String(cat.everyUnit) },
          )
  const vTitle = vBalance
    ? formatMessage(
        { id: 'plan.haveBalanceAmount', defaultMessage: 'Have a balance of {amount}' },
        { amount: fMoney(vAmt) },
      )
    : cat.cad === 'custom'
      ? cat.rep
        ? vRefill
          ? formatMessage(
              { id: 'plan.fillRepeating', defaultMessage: 'Fill up to {amount} {frequency}' },
              { amount: fMoney(vAmt), frequency },
            )
          : formatMessage(
              { id: 'plan.setAsideRepeating', defaultMessage: 'Set aside {amount} {frequency}' },
              { amount: fMoney(vAmt), frequency },
            )
        : vRefill
          ? formatMessage(
              { id: 'plan.fillUpAmount', defaultMessage: 'Fill up to {amount}' },
              { amount: fMoney(vAmt) },
            )
          : formatMessage(
              { id: 'plan.setAsideAmount', defaultMessage: 'Set aside {amount}' },
              { amount: fMoney(vAmt) },
            )
      : vRefill
        ? formatMessage(
            { id: 'plan.fillEachPeriod', defaultMessage: 'Fill up to {amount} each {period}' },
            { amount: fMoney(vAmt), period },
          )
        : formatMessage(
            {
              id: 'plan.setAsideEachPeriod',
              defaultMessage: 'Set aside another {amount} each {period}',
            },
            { amount: fMoney(vAmt), period },
          )
  // Target deadline subtitle (handoff delta #13) — pure helper, unit-tested standalone.
  const sub = targetSubtitleParts(cat)
  const vSub = (() => {
    switch (sub.kind) {
      case 'repeat':
        return formatMessage({ id: 'plan.targetRepeating', defaultMessage: 'Repeating target' })
      case 'byDate':
        return formatMessage(
          { id: 'plan.targetByDate', defaultMessage: 'By {date}' },
          { date: sub.date },
        )
      case 'weekly': {
        const weekday = WEEKDAYS[sub.weekday]
          ? new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
              new Date(Date.UTC(2024, 0, 1 + sub.weekday)),
            )
          : String(sub.weekday)
        return formatMessage(
          { id: 'plan.targetEveryWeekday', defaultMessage: 'Every {weekday}' },
          { weekday },
        )
      }
      case 'monthDay':
        return formatMessage(
          {
            id: 'plan.targetMonthDay',
            defaultMessage:
              'By the {day, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} of each month',
          },
          { day: sub.day },
        )
      case 'monthEnd':
        return formatMessage({
          id: 'plan.targetMonthEnd',
          defaultMessage: 'By the last day of each month',
        })
      case 'yearly':
        return formatMessage(
          { id: 'plan.targetYearDate', defaultMessage: 'By {date} each year' },
          { date: sub.date },
        )
      case 'yearEnd':
        return formatMessage({ id: 'plan.targetYearEnd', defaultMessage: 'By the end of the year' })
      case 'periodEnd':
        return formatMessage(
          { id: 'plan.targetPeriodEnd', defaultMessage: 'By the end of the {period}' },
          {
            period:
              sub.period === 'week'
                ? formatMessage({ id: 'plan.periodWeek', defaultMessage: 'week' })
                : sub.period === 'year'
                  ? formatMessage({ id: 'plan.periodYear', defaultMessage: 'year' })
                  : formatMessage({ id: 'plan.periodMonth', defaultMessage: 'month' }),
          },
        )
    }
  })()
  // Same labels, order and grouping as the month-level rail (budgetParts.buildAutoAssignItems)
  // and as real YNAB — owner ask, 2026-09-15: this per-envelope pane had drifted into its own
  // sentence-case wording for the identical set of actions. These strings are ALSO the dispatch
  // keys `useBudgetModel.moneyOp` switches on, so they are renamed in lockstep there.
  const autoRows: Array<[string] | [string, number] | [string, number, string]> = [
    ['Underfunded', PD.envelopeUnderfunded(vToGo, cat.available)],
    ['__div'],
    ['Assigned Last Month', cat.assigned],
    ['Spent Last Month', Math.abs(cat.activity)],
    ['Average Assigned', cat.assigned],
    ['Average Spent', Math.abs(cat.activity)],
    ['__div'],
    ['Reset Available Amount', 0, 'Reset ' + cat.label + ' available to ' + fMoney(0)],
    ['Reset Assigned Amount', 0, 'Reset ' + cat.label + ' assigned to ' + fMoney(0)],
  ]
  return (
    <>
      <BalanceCard cat={cat} />
      <TgtCard title={formatMessage({ id: 'plan.target', defaultMessage: 'Target' })}>
        {!cat.target ? (
          <TargetEmpty label={cat.label} onCreate={onEdit} />
        ) : (
          <div className="pl-tgt-view">
            <div className="pl-tgt-vtitle">{vTitle}</div>
            <div className="pl-tgt-vsub">{vSub}</div>
            <div className="pl-tgt-vring">
              <Meter
                variant="ring"
                size="lg"
                value={vPct}
                color={vRing}
                complete={vComplete}
                ariaLabel={
                  vComplete
                    ? formatMessage({ id: 'plan.targetMet', defaultMessage: 'Target met' })
                    : formatMessage(
                        {
                          id: 'plan.targetProgress',
                          defaultMessage: 'Target progress: {percent}%',
                        },
                        { percent: Math.round(vPct) },
                      )
                }
              />
            </div>
            {cat.available < -0.005 ? (
              <div className="pl-tgt-callout bad">
                {/* The button below fires immediately (no confirm — it is undoable), so the price
                belongs beside it: covering an overspend COSTS Ready to Assign dollar for dollar
                under the restored identity (ADR 2026-09-09), the reverse of the one-day rule
                where it was free. */}
                <div className="pl-tgt-callout-txt">
                  {formatMessage(
                    {
                      id: 'plan.targetCoverHelp',
                      defaultMessage:
                        'Cover <b>{amount}</b> to get back to green — it comes out of Ready to Assign',
                    },
                    { amount: fMoney(-cat.available), b: (chunks) => <b>{chunks}</b> },
                  )}
                </div>
                <button className="pl-tgt-assign" onClick={() => onMoney(cat.key, 'cover')}>
                  {formatMessage(
                    { id: 'plan.coverAmount', defaultMessage: 'Cover {amount}' },
                    { amount: fMoney(-cat.available) },
                  )}
                </button>
              </div>
            ) : vToGo > 0.005 ? (
              <div className="pl-tgt-callout warn">
                <div className="pl-tgt-callout-txt">
                  {formatMessage(
                    {
                      id: 'plan.targetAssignHelp',
                      defaultMessage: 'Assign <b>{amount} more</b> to meet your target',
                    },
                    { amount: fMoney(vToGo), b: (chunks) => <b>{chunks}</b> },
                  )}
                </div>
                <button className="pl-tgt-assign" onClick={() => onMoney(cat.key, 'fund')}>
                  {formatMessage(
                    { id: 'plan.autoAssignAmount', defaultMessage: 'Assign {amount}' },
                    { amount: fMoney(vToGo) },
                  )}
                </button>
              </div>
            ) : vOverBy > 0.005 ? (
              <div className="pl-tgt-callout over">
                <div className="pl-tgt-callout-txt">
                  {formatMessage(
                    {
                      id: 'plan.targetExcessHelp',
                      defaultMessage: '<b>{amount}</b> over target — free to move',
                    },
                    { amount: fMoney(vOverBy), b: (chunks) => <b>{chunks}</b> },
                  )}
                </div>
                <button className="pl-tgt-assign" onClick={() => onMoney(cat.key, 'move')}>
                  {formatMessage(
                    { id: 'plan.moveAmount', defaultMessage: 'Move {amount}' },
                    { amount: fMoney(vOverBy) },
                  )}
                </button>
              </div>
            ) : (
              <div className="pl-tgt-callout ok">
                {formatMessage({
                  id: 'plan.targetAchieved',
                  defaultMessage: "You've met your target!",
                })}
              </div>
            )}
            <div className="pl-tgt-rows pl-tgt-vrows">
              <div className="pl-tgt-row">
                <span>
                  {vMeasuresAvail
                    ? formatMessage({
                        id: 'plan.balanceTargetMonth',
                        defaultMessage: 'Balance target this month',
                      })
                    : formatMessage({
                        id: 'plan.assignTargetMonth',
                        defaultMessage: 'Amount to assign this month',
                      })}
                </span>
                <b>{fMoney(vMonthlyTarget)}</b>
              </div>
              <div className="pl-tgt-row">
                <span>
                  {vMeasuresAvail
                    ? formatMessage({
                        id: 'plan.availableSoFar',
                        defaultMessage: 'Available so far',
                      })
                    : formatMessage({
                        id: 'plan.assignedSoFar',
                        defaultMessage: 'Assigned so far',
                      })}
                </span>
                <b>{fMoney(vFunded)}</b>
              </div>
              <div className="pl-tgt-divider" />
              <div className="pl-tgt-row">
                <span>{formatMessage({ id: 'plan.targetToGo', defaultMessage: 'To go' })}</span>
                <b>{fMoney(vToGo)}</b>
              </div>
            </div>
            <Button variant="secondary" size="dense" className="pl-tgt-editbtn" onClick={onEdit}>
              {formatMessage({ id: 'plan.editTargetShort', defaultMessage: 'Edit target' })}
            </Button>
            <div className="pl-tgt-snooze">
              <Switch
                dense
                checked={snoozed}
                onChange={(e) => {
                  const next = e.target.checked
                  setSnoozed(next)
                  if (onSnooze) onSnooze(next)
                  else
                    onFund(
                      next
                        ? formatMessage(
                            {
                              id: 'plan.targetSnoozed',
                              defaultMessage: '{name} target snoozed this month',
                            },
                            { name: cat.label },
                          )
                        : formatMessage(
                            {
                              id: 'plan.targetUnsnoozed',
                              defaultMessage: '{name} target un-snoozed',
                            },
                            { name: cat.label },
                          ),
                    )
                }}
                aria-label={formatMessage({
                  id: 'plan.snoozeTarget',
                  defaultMessage: 'Snooze this target',
                })}
              />
              <span>
                {formatMessage({
                  id: 'plan.snoozeMonth',
                  defaultMessage: 'Snooze target for this month',
                })}
              </span>
            </div>
          </div>
        )}
      </TgtCard>
      <TgtCard
        title={formatMessage({ id: 'plan.autoAssign', defaultMessage: 'Auto-assign' })}
        icon={BOLT}
      >
        <div className="pl-tgt-auto-list pl-budget-rail-pills">
          {autoRows.map((r, i) =>
            r[0] === '__div' ? (
              <div key={i} className="pl-budget-rail-group-gap" />
            ) : (
              <button
                key={i}
                className={
                  'pl-menu-item pl-budget-rail-pill' + (r[0].startsWith('Reset ') ? ' danger' : '')
                }
                onClick={() => onMoney(cat.key, r[0], r[1] as number)}
              >
                <span>
                  {r[0] === 'Reset Available Amount'
                    ? formatMessage({
                        id: 'plan.resetAvailableOne',
                        defaultMessage: 'Reset Available Amount',
                      })
                    : r[0] === 'Reset Assigned Amount'
                      ? formatMessage({
                          id: 'plan.resetAssignedOne',
                          defaultMessage: 'Reset Assigned Amount',
                        })
                      : autoLabel(r[0])}
                </span>
                <span className="hint">{fMoney((r[1] as number) || 0)}</span>
              </button>
            ),
          )}
        </div>
      </TgtCard>
    </>
  )
}

// ── Notes section (owner-approved B1) — shown in both view + edit states ───────
export function NotesSection({ note, onSave }: { note: string; onSave: (t: string) => void }) {
  const { formatMessage } = useAppIntl()
  const [v, setV] = useState(note)
  useEffect(() => {
    setV(note)
  }, [note])
  return (
    <TgtCard title={formatMessage({ id: 'plan.notes', defaultMessage: 'Notes' })}>
      <div className="pl-tgt-notes">
        <textarea
          className="pl-tgt-note-input"
          placeholder={formatMessage({ id: 'plan.enterNote', defaultMessage: 'Enter a note…' })}
          rows={3}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => {
            if (v !== note) onSave(v)
          }}
        />
      </div>
    </TgtCard>
  )
}

// ── Target editor (the modal wrapping the view + the edit form) ────────────────
const FACTOR: Record<string, number> = { weekly: 52 / 12, monthly: 1, yearly: 1 / 12 }
type Cad = 'weekly' | 'monthly' | 'yearly' | 'custom'
const CADS: [Cad, string][] = [
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['yearly', 'Yearly'],
  ['custom', 'Custom'],
]

type WantFlavor = 'set_aside' | 'refill' | 'balance'
interface WantOpt {
  key: WantFlavor
  title: string
  use: string
  desc: string
}

// ── "I want to" selector (YNAB-style dropdown) — the three honest funding flavors:
// Set aside (measure Assigned) / Fill up to (measure Available, refill) / Have a balance of
// (the by_date savings goal). A trigger button + a popover of option cards; the selected one
// carries a violet check. Closes on outside-click / Escape / pick.
function WantToSelect({
  value,
  opts,
  onPick,
}: {
  value: WantFlavor
  opts: WantOpt[]
  onPick: (f: WantFlavor) => void
}) {
  const { formatMessage } = useAppIntl()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey, true)
    // The popover opens downward inside the scrollable modal body — make sure all three options
    // (esp. "Have a balance of", the lowest) are in view even on a short viewport.
    popRef.current?.scrollIntoView({ block: 'nearest' })
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])
  const current = opts.find((o) => o.key === value) ?? opts[0]!
  return (
    <div className="pl-tgt-want-sel" ref={ref}>
      <button
        type="button"
        className="pl-tgt-want-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="pl-tgt-want-cur">{current.title}</span>
        <span className="pl-sel-caret">
          <Chevron dir="down" size={14} />
        </span>
      </button>
      {open && (
        <div className="pl-tgt-want-pop" role="listbox" ref={popRef}>
          {opts.map((o) => (
            <button
              key={o.key}
              type="button"
              role="option"
              aria-selected={o.key === value}
              className={'pl-tgt-opt pl-tgt-wantopt' + (o.key === value ? ' on' : '')}
              onClick={() => {
                onPick(o.key)
                setOpen(false)
              }}
            >
              <span className="pl-tgt-wantopt-check" aria-hidden="true">
                {o.key === value && (
                  <svg viewBox="0 0 20 20" width="18" height="18">
                    <circle cx="10" cy="10" r="9" fill="var(--ink)" />
                    <path
                      d="M6 10.5l2.5 2.5L14 7.5"
                      fill="none"
                      stroke="var(--bg)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="pl-tgt-opt-body">
                <span
                  className={
                    'pl-tgt-opt-title' + (o.key === value ? ' pl-tgt-wantopt-title--on' : '')
                  }
                >
                  {o.title}
                </span>
                <span className="pl-tgt-opt-desc">
                  {formatMessage(
                    { id: 'plan.targetUseFor', defaultMessage: 'Use for: {examples}' },
                    { examples: o.use },
                  )}
                </span>
                <span className="pl-tgt-opt-desc">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function TargetEditor({
  cat,
  onCancel,
  onSave,
  onRemove,
  onFund,
  onMoney,
  onSnooze,
  initialMode,
  note,
  onSaveNote,
  inline,
}: {
  cat: LocalCat
  onCancel: () => void
  onSave: (t: {
    target: number
    tamt: number
    tt: string
    cad: string
    due: string
    rep: boolean
    every: number
    everyUnit: string
    dueWeekday?: number
    dueDay?: number
    yDue?: string
  }) => void
  onRemove: () => void
  onFund: (msg: string) => void
  onMoney: (key: string, kind: string, amount?: number) => void
  onSnooze?: (snooze: boolean) => void
  initialMode?: string
  note: string
  onSaveNote: (t: string) => void
  /** Desktop rail (issue #3, feat/budget-summary-rail follow-up): render the SAME form content
   *  inside a plain `ui/Panel` in `.pl-budget-rail`, replacing Summary/Auto-assign while open,
   *  instead of the floating `PlanningModal` overlay every other caller/viewport still gets.
   *  Default (unset) is today's unchanged modal behavior. */
  inline?: boolean
}) {
  const { formatMessage, locale } = useAppIntl()
  const [tt, setTt] = useState(cat.tt || 'set_aside')
  const [cad, setCad] = useState(cat.cad || 'monthly')
  const [amount, setAmount] = useState(
    cat.tamt != null ? String(cat.tamt) : cat.target ? String(cat.target) : '',
  )
  const [due, setDue] = useState(cat.due || `${new Date().getFullYear()}-12-31`)
  const [repeat, setRepeat] = useState(!!cat.rep)
  const [every, setEvery] = useState(String(cat.every || 3))
  const [everyUnit, setEveryUnit] = useState(cat.everyUnit || 'month')
  // Target deadlines (handoff delta #13) — one state per cadence, seeded from the server echo
  // when present, else the server's OWN unset-default (Monday / last day — matches
  // targetSubtitle's view-mode default, FEB-04) so the editor never DISAGREES with the
  // read-only view for a legacy target. `dowTouched`/`domTouched` track whether the user
  // actually interacted with the control THIS session — a save must not stamp a due day the
  // user never chose (resolveDueWeekdayForSave/resolveDueDayForSave gate on it).
  const [dow, setDow] = useState(cat.dueWeekday != null ? WEEKDAYS[cat.dueWeekday]! : 'Monday')
  const [dom, setDom] = useState(
    cat.dueDay != null ? (cat.dueDay === -1 ? 'last' : String(cat.dueDay)) : 'last',
  )
  const [dowTouched, setDowTouched] = useState(false)
  const [domTouched, setDomTouched] = useState(false)
  const [yDue, setYDue] = useState(
    cat.cad === 'yearly' && cat.due ? cat.due : `${new Date().getFullYear()}-12-31`,
  )
  // View first even with no target: the Target card offers "Create target" instead of opening
  // straight into a draft form.
  const [mode, setMode] = useState(initialMode || 'view')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (mode === 'edit' && inputRef.current) inputRef.current.focus()
  }, [mode])

  const amt = parseFloat(amount) || 0
  const refill = tt === 'refill'
  const balance = tt === 'balance'
  // 'refill'/'balance' measure the Available balance; 'set_aside' measures contributions
  // (Assigned) — including a Custom "set aside by [date]" goal, which the server measures by
  // cumulative contributions (spending-immune), so the preview stays "Assigned"-framed here.
  const measuresAvail = refill || balance
  // A dated set-aside goal shows CUMULATIVE contributions ("Assigned so far"), not just this
  // month's — mirrors the server's assigned_to_date.
  const setAsideDated = tt === 'set_aside' && cad === 'custom'
  const contributed = cat.assignedToDate ?? cat.assigned
  const BASE = new Date() // live "today" — drives months-until math for by-date targets
  const dueD = new Date(due)
  const monthsUntil = Math.max(1, Math.round((dueD.getTime() - BASE.getTime()) / 2629800000))
  const everyN = Math.max(1, parseInt(every, 10) || 1)
  const periodMonths = repeat ? everyN * (everyUnit === 'year' ? 12 : 1) : monthsUntil
  const factor = cad === 'custom' ? 1 / periodMonths : (FACTOR[cad] ?? 1)
  // 'refill' tops up to the flat amount each period; 'set_aside'/'balance' spread the amount
  // across the period (factor = 1/months for a by-date goal) as the this-month contribution.
  const monthlyTarget = refill ? amt : amt * factor
  const fundedSoFar = measuresAvail
    ? cat.available - cat.activity
    : setAsideDated
      ? contributed
      : cat.assigned
  const toGo = Math.max(0, monthlyTarget - fundedSoFar)
  // 'balance' savings goal is never "over target"; only a refill cap can be exceeded.
  const overBy = refill ? Math.max(0, cat.available - amt) : 0
  const pct =
    monthlyTarget > 0 ? Math.min(100, Math.max(0, (fundedSoFar / monthlyTarget) * 100)) : 0
  const ringColor =
    cat.available < -0.005
      ? 'var(--bad)'
      : toGo > 0.005
        ? 'var(--warn)'
        : overBy > 0.005
          ? '#5aa9f0'
          : 'var(--good)'
  function resetDraft() {
    setTt(cat.tt || 'set_aside')
    setCad(cat.cad || 'monthly')
    setAmount(cat.tamt != null ? String(cat.tamt) : cat.target ? String(cat.target) : '')
    setDue(cat.due || `${new Date().getFullYear()}-12-31`)
    setRepeat(!!cat.rep)
    setEvery(String(cat.every || 3))
    setEveryUnit(cat.everyUnit || 'month')
    setDow(cat.dueWeekday != null ? WEEKDAYS[cat.dueWeekday]! : 'Monday')
    setDom(cat.dueDay != null ? (cat.dueDay === -1 ? 'last' : String(cat.dueDay)) : 'last')
    setYDue(cat.cad === 'yearly' && cat.due ? cat.due : `${new Date().getFullYear()}-12-31`)
    setDowTouched(false)
    setDomTouched(false)
  }

  // ── Cadence ↔ flavor rules (owner 2026-07-10) ─────────────────────────────
  // "Have a balance of $X by [date]" (the by_date savings goal) is inherently DATED, so it is
  // offered ONLY under the Custom cadence. Weekly/Monthly/Yearly are recurring and expose just
  // Set aside vs Fill up to. Leaving Custom for a recurring cadence therefore drops a stray
  // 'balance' flavor back to Set aside.
  function pickCadence(k: Cad) {
    setCad(k)
    if (k !== 'custom' && tt === 'balance') setTt('set_aside')
  }
  function pickFlavor(f: 'set_aside' | 'refill' | 'balance') {
    setTt(f)
  }

  const ALL_WANT_OPTS: WantOpt[] = [
    {
      key: 'set_aside',
      title: formatMessage(
        { id: 'plan.setAsideAmount', defaultMessage: 'Set aside {amount}' },
        { amount: fMoney(amt) },
      ),
      use: formatMessage({
        id: 'plan.targetUseBills',
        defaultMessage: 'bills, subscriptions, saving over time',
      }),
      desc: formatMessage(
        {
          id: 'plan.targetSetAsideHelp',
          defaultMessage: 'Add {amount} to this category, regardless of its current balance.',
        },
        { amount: fMoney(amt) },
      ),
    },
    {
      key: 'refill',
      title: formatMessage(
        { id: 'plan.fillUpAmount', defaultMessage: 'Fill up to {amount}' },
        { amount: fMoney(amt) },
      ),
      use: formatMessage({
        id: 'plan.targetUseDaily',
        defaultMessage: 'gasoline, fun money, dining out',
      }),
      desc: formatMessage(
        {
          id: 'plan.targetRefillHelp',
          defaultMessage: 'Use what is already in this category and fill it up to {amount}.',
        },
        { amount: fMoney(amt) },
      ),
    },
    {
      key: 'balance',
      title: formatMessage(
        { id: 'plan.haveBalanceAmount', defaultMessage: 'Have a balance of {amount}' },
        { amount: fMoney(amt) },
      ),
      use: formatMessage({ id: 'plan.targetUseLongTerm', defaultMessage: 'long-term savings' }),
      desc: formatMessage({
        id: 'plan.targetBalanceHelp',
        defaultMessage:
          'Reach this amount by a specific time and refrain from spending until you reach it.',
      }),
    },
  ]
  // Only the dated Custom cadence offers "Have a balance of"; recurring cadences show two.
  const WANT_OPTS =
    cad === 'custom' ? ALL_WANT_OPTS : ALL_WANT_OPTS.filter((o) => o.key !== 'balance')

  const foot = mode === 'edit' && (
    <div className="pl-modal-foot pl-tgt-foot">
      {cat.target ? (
        <Button variant="danger" size="dense" onClick={onRemove}>
          {formatMessage({ id: 'plan.deleteTarget', defaultMessage: 'Delete target' })}
        </Button>
      ) : (
        <span />
      )}
      <span className="pl-tgt-foot-r">
        <Button
          variant="secondary"
          size="dense"
          onClick={() => {
            resetDraft()
            setMode('view')
          }}
        >
          {formatMessage({ id: 'plan.cancel', defaultMessage: 'Cancel' })}
        </Button>
        <Button
          variant="primary"
          size="dense"
          disabled={amt <= 0}
          onClick={() =>
            onSave({
              target: monthlyTarget,
              tamt: amt,
              tt,
              cad,
              due,
              rep: repeat,
              every: everyN,
              everyUnit,
              dueWeekday: resolveDueWeekdayForSave(cad, dow, dowTouched, cat.dueWeekday),
              dueDay: resolveDueDayForSave(cad, dom, domTouched, cat.dueDay),
              yDue: cad === 'yearly' ? yDue : undefined,
            })
          }
        >
          {formatMessage({ id: 'plan.saveTarget', defaultMessage: 'Save target' })}
        </Button>
      </span>
    </div>
  )
  // The form itself — identical in both presentations. Only the chrome AROUND it (floating
  // `PlanningModal` vs. a plain `Panel` swapped into the rail) differs by `inline`.
  const body = (
    <div className="pl-modal-body">
      {mode === 'view' ? (
        <TargetView
          cat={cat}
          onEdit={() => setMode('edit')}
          onFund={onFund}
          onMoney={onMoney}
          onSnooze={onSnooze}
        />
      ) : (
        <>
          <BalanceCard cat={cat} />
          <TgtCard title={formatMessage({ id: 'plan.target', defaultMessage: 'Target' })}>
            <div className="pl-tgt-grid">
              <label className="pl-modal-label">
                {formatMessage({ id: 'plan.cadence', defaultMessage: 'Cadence' })}
              </label>
              <div className="pl-seg pl-tgt-cad">
                {CADS.map(([k, lbl]) => (
                  <button key={k} className={cad === k ? 'on' : ''} onClick={() => pickCadence(k)}>
                    {k === 'weekly'
                      ? formatMessage({ id: 'plan.cadWeekly', defaultMessage: 'Weekly' })
                      : k === 'monthly'
                        ? formatMessage({ id: 'plan.cadMonthly', defaultMessage: 'Monthly' })
                        : k === 'yearly'
                          ? formatMessage({ id: 'plan.cadYearly', defaultMessage: 'Yearly' })
                          : k === 'custom'
                            ? formatMessage({ id: 'plan.cadCustom', defaultMessage: 'Custom' })
                            : lbl}
                  </button>
                ))}
              </div>
              <label className="pl-modal-label">
                {formatMessage({ id: 'plan.iNeed', defaultMessage: 'I need' })}
              </label>
              <div className="pl-tgt-amt">
                <span className="pl-tgt-cur">{getCurrencySymbol()}</span>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                <span className="pl-tgt-per">
                  {cad === 'custom'
                    ? formatMessage({ id: 'plan.totalLower', defaultMessage: 'total' })
                    : formatMessage(
                        { id: 'plan.periodSuffix', defaultMessage: '/ {period}' },
                        {
                          period:
                            cad === 'weekly'
                              ? formatMessage({ id: 'plan.periodWeek', defaultMessage: 'week' })
                              : cad === 'yearly'
                                ? formatMessage({ id: 'plan.periodYear', defaultMessage: 'year' })
                                : formatMessage({
                                    id: 'plan.periodMonth',
                                    defaultMessage: 'month',
                                  }),
                        },
                      )}
                </span>
              </div>
              {cad === 'weekly' && (
                <>
                  <label className="pl-modal-label">
                    {formatMessage({ id: 'plan.every', defaultMessage: 'Every' })}
                  </label>
                  <div className="pl-selwrap pl-tgt-selwrap">
                    <select
                      className="pl-sel"
                      value={dow}
                      onChange={(e) => {
                        setDow(e.target.value)
                        setDowTouched(true)
                      }}
                    >
                      {WEEKDAYS.map((d, index) => (
                        <option key={d} value={d}>
                          {new Intl.DateTimeFormat(locale, {
                            weekday: 'long',
                            timeZone: 'UTC',
                          }).format(new Date(Date.UTC(2024, 0, 1 + index)))}
                        </option>
                      ))}
                    </select>
                    <span className="pl-sel-caret">
                      <Chevron dir="down" size={13} />
                    </span>
                  </div>
                </>
              )}
              {cad === 'monthly' && (
                <>
                  <label className="pl-modal-label">
                    {formatMessage({ id: 'plan.by', defaultMessage: 'By' })}
                  </label>
                  <div className="pl-selwrap pl-tgt-selwrap">
                    <select
                      className="pl-sel"
                      value={dom}
                      onChange={(e) => {
                        setDom(e.target.value)
                        setDomTouched(true)
                      }}
                    >
                      <option value="last">
                        {formatMessage({
                          id: 'plan.lastDayMonth',
                          defaultMessage: 'Last day of month',
                        })}
                      </option>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {formatMessage(
                            {
                              id: 'plan.dayOrdinal',
                              defaultMessage:
                                '{day, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}',
                            },
                            { day: d },
                          )}
                        </option>
                      ))}
                    </select>
                    <span className="pl-sel-caret">
                      <Chevron dir="down" size={13} />
                    </span>
                  </div>
                </>
              )}
              {cad === 'yearly' && (
                <>
                  <label className="pl-modal-label">
                    {formatMessage({ id: 'plan.by', defaultMessage: 'By' })}
                  </label>
                  <DateField
                    unstyled
                    className="pl-tgt-date"
                    value={yDue}
                    onChange={(e) => setYDue(e.target.value)}
                  />
                </>
              )}
              {cad === 'custom' && (
                <>
                  <label className="pl-modal-label">
                    {formatMessage({ id: 'plan.dueBy', defaultMessage: 'Due by' })}
                  </label>
                  <DateField
                    unstyled
                    className="pl-tgt-date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                  />
                  <label className="pl-modal-label">
                    {formatMessage({ id: 'plan.repeat', defaultMessage: 'Repeat' })}
                  </label>
                  <div className="pl-tgt-repeat">
                    <Switch
                      dense
                      checked={repeat}
                      onChange={(e) => setRepeat(e.target.checked)}
                      aria-label={formatMessage({
                        id: 'plan.repeatEvery',
                        defaultMessage: 'Repeat every period',
                      })}
                    />
                    {repeat && (
                      <span className="pl-tgt-every-wrap">
                        {formatMessage({ id: 'plan.everyLower', defaultMessage: 'every' })}
                        <input
                          type="number"
                          className="pl-tgt-every"
                          min="1"
                          step="1"
                          value={every}
                          onChange={(e) => setEvery(e.target.value)}
                        />
                        <span className="pl-tgt-unitwrap">
                          <select
                            className="pl-tgt-unit"
                            value={everyUnit}
                            onChange={(e) => setEveryUnit(e.target.value)}
                          >
                            <option value="month">
                              {formatMessage(
                                {
                                  id: 'plan.monthUnits',
                                  defaultMessage: '{count, plural, =1 {Month} other {Months}}',
                                },
                                { count: everyN },
                              )}
                            </option>
                            <option value="year">
                              {formatMessage(
                                {
                                  id: 'plan.yearUnits',
                                  defaultMessage: '{count, plural, =1 {Year} other {Years}}',
                                },
                                { count: everyN },
                              )}
                            </option>
                          </select>
                          <span className="pl-sel-caret">
                            <Chevron dir="down" size={13} />
                          </span>
                        </span>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="pl-modal-label pl-tgt-want">
              {formatMessage({ id: 'plan.iWantTo', defaultMessage: 'I want to' })}
            </div>
            <WantToSelect value={tt} opts={WANT_OPTS} onPick={pickFlavor} />
            {amt > 0 && (
              <div className="pl-tgt-progress">
                <Meter
                  variant="ring"
                  size="sm"
                  value={pct}
                  color={ringColor}
                  ariaLabel={formatMessage(
                    {
                      id: 'plan.targetProgressAria',
                      defaultMessage: 'Target progress: {percent}%',
                    },
                    { percent: Math.round(pct) },
                  )}
                />
                <div className="pl-tgt-rows">
                  <div className="pl-tgt-row">
                    <span>
                      {measuresAvail
                        ? formatMessage({
                            id: 'plan.balanceTargetMonth',
                            defaultMessage: 'Balance target this month',
                          })
                        : formatMessage({
                            id: 'plan.toAssignThisMonth',
                            defaultMessage: 'To assign this month',
                          })}
                    </span>
                    <b>{fMoney(monthlyTarget)}</b>
                  </div>
                  <div className="pl-tgt-row">
                    <span>
                      {measuresAvail
                        ? formatMessage({
                            id: 'plan.availableSoFar',
                            defaultMessage: 'Available so far',
                          })
                        : formatMessage({
                            id: 'plan.assignedSoFar',
                            defaultMessage: 'Assigned so far',
                          })}
                    </span>
                    <b>{fMoney(fundedSoFar)}</b>
                  </div>
                  <div className="pl-tgt-row">
                    <span>{formatMessage({ id: 'plan.targetToGo', defaultMessage: 'To go' })}</span>
                    <b>{fMoney(toGo)}</b>
                  </div>
                  {cat.available < -0.005 ? (
                    <div className="pl-tgt-note bad">
                      {formatMessage(
                        {
                          id: 'plan.targetOverspentEdit',
                          defaultMessage: 'Overspent by {amount} — cover it to get back to green.',
                        },
                        { amount: fMoney(-cat.available) },
                      )}
                    </div>
                  ) : toGo > 0.005 ? (
                    <div className="pl-tgt-note warn">
                      {formatMessage(
                        {
                          id: 'plan.targetNeededEdit',
                          defaultMessage: '{amount} more needed this month.',
                        },
                        { amount: fMoney(toGo) },
                      )}
                    </div>
                  ) : overBy > 0.005 ? (
                    <div className="pl-tgt-note over">
                      {formatMessage(
                        {
                          id: 'plan.targetExcessEdit',
                          defaultMessage: 'Funded — {amount} over target, free to move elsewhere.',
                        },
                        { amount: fMoney(overBy) },
                      )}
                    </div>
                  ) : (
                    <div className="pl-tgt-note ok">
                      {formatMessage({
                        id: 'plan.fullyFundedMonth',
                        defaultMessage: 'Fully funded this month. ✓',
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            {inline && foot}
          </TgtCard>
        </>
      )}
      <NotesSection note={note} onSave={onSaveNote} />
    </div>
  )

  if (inline) {
    return (
      <div className="pl-budget-rail-target">
        <div className="pl-tgt-rail-head">
          <span className="pl-tgt-rail-title">
            <ColorIcon icon="envelope" color={cat.color} />
            <span className="pl-tgt-rail-name">{cat.label}</span>
          </span>
          <Button variant="secondary" size="dense" onClick={onCancel}>
            <Arrow dir="left" size={12} /> {formatMessage({ id: 'planScan.back', defaultMessage: 'Back' })}
          </Button>
        </div>
        {body}
      </div>
    )
  }

  return (
    <PlanningModal
      onClose={onCancel}
      label={formatMessage(
        { id: 'plan.targetFor', defaultMessage: 'Target for {name}' },
        { name: cat.label },
      )}
      className="pl-tgt-modal"
    >
      <div className="pl-modal-head">
        <h3>
          <span className="pl-cdot" style={{ background: cat.color, marginRight: 8 }} />
          {formatMessage(
            { id: 'plan.namedTarget', defaultMessage: '{name} • Target' },
            { name: cat.label },
          )}
        </h3>
        <button
          className="pl-modal-x"
          onClick={onCancel}
          aria-label={formatMessage({ id: 'plan.close', defaultMessage: 'Close' })}
        >
          <X size={16} />
        </button>
      </div>
      {body}
      {foot}
    </PlanningModal>
  )
}
