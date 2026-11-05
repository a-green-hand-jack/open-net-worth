// budgetLens/proportional/PropHero.tsx — the 50/30/20 hero. Two states: before anything is spent it
// shows the PLAN (each group's share of your income, and what's left to save); after, the REAL
// month — a verdict over two columns: one small tile per counted group and Savings (a bar of what
// it actually took, a tick at its share, "61% / 30%") on the left, what's spending more than usual
// on the right. The groups are the
// book's Zero-Based groups (2026-09-26).
import type { CSSProperties } from 'react'
import { useAppIntl } from '../../../../../i18n/useAppIntl'
import { Button } from '../../../../ui'
import { Spark } from '../MethodCard'
import { SAVE_COLOR, fmt, precedingMonthDate } from './propMath'
import type { HeroTone, Insight, PropDerived } from './propMath'
import type { PropMonth } from './propApi'

/** The hero's status tint (plan.css) — green on track, yellow warned, red past income. */
const TONE_CLASS: Record<HeroTone, string> = {
  good: ' pt-hero--good',
  warn: ' pt-hero--warn',
  bad: ' pt-hero--bad',
}

interface Share {
  key: string
  name: string
  color: string
  /** What it took, as a percent of income (or of spending, with no income). */
  pct: number
  target: number | null
  bad: boolean
}

function shares(d: PropDerived): Share[] {
  const base = d.income > 0 ? d.income : d.outflow || 1
  // A group with no envelopes and no share says nothing a bar could show.
  const rows: Share[] = d.counted
    .filter((f) => f.rows.length || f.g.target !== null)
    .map((f) => ({
      key: f.g.id,
      name: f.g.name,
      color: f.color,
      pct: (f.spent / base) * 100,
      target: d.income > 0 ? f.share : null,
      bad: f.over,
    }))
  if (d.income > 0)
    rows.push({
      key: 'savings',
      name: 'Savings',
      color: SAVE_COLOR,
      pct: (Math.max(0, d.saved) / d.income) * 100,
      target: d.saveTarget,
      bad: d.saved < 0 || (d.saveTarget !== null && (d.saved / d.income) * 100 < d.saveTarget),
    })
  return rows
}

/** Which income the savings are measured against, so this figure is never read as the same claim as
 *  Reports' last-month rate or Cash Flow's savings rate. A running month always uses the usual
 *  monthly income from the profile (this month's pay may not have arrived); a closed one the income
 *  that did arrive. */
/** Savings against the goal, including the source of the income denominator. */
function SavingsLine({ t, m }: { t: Extract<Insight, { kind: 'save' }>; m: PropMonth }) {
  const { formatMessage, locale } = useAppIntl()
  const monthDate = new Date(`${m.month}-01T00:00:00Z`)
  const month = Number.isNaN(monthDate.getTime())
    ? m.month
    : new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(monthDate)
  const amount = fmt(Math.abs(t.amount))
  const lead = t.early
    ? t.amount < 0
      ? formatMessage(
          {
            id: 'plan.propEarlySpend',
            defaultMessage:
              'If {month} goes like recent months, you’d spend {amount} more than you earn',
          },
          { month, amount },
        )
      : formatMessage(
          {
            id: 'plan.propEarlySave',
            defaultMessage: 'If {month} goes like recent months, you’d save {amount}',
          },
          { month, amount },
        )
    : t.amount < 0
      ? t.running
        ? formatMessage(
            {
              id: 'plan.propPaceSpend',
              defaultMessage: 'On pace to spend {amount} more than you earn',
            },
            { amount },
          )
        : formatMessage(
            { id: 'plan.propSpentMore', defaultMessage: 'You spent {amount} more than you earned' },
            { amount },
          )
      : t.running
        ? formatMessage(
            { id: 'plan.propPaceSave', defaultMessage: 'On pace to save {amount}' },
            { amount },
          )
        : formatMessage(
            { id: 'plan.propYouSaved', defaultMessage: 'You saved {amount}' },
            { amount },
          )
  const goal =
    t.gap === null || t.target === null
      ? ''
      : Math.abs(t.pct - t.target) <= 1
        ? formatMessage(
            { id: 'plan.propGoalExact', defaultMessage: ', right on your {target}% goal' },
            { target: t.target },
          )
        : t.gap < 0
          ? formatMessage(
              {
                id: 'plan.propGoalShort',
                defaultMessage: ', {amount} short of your {target}% goal',
              },
              { amount: fmt(Math.abs(t.gap)), target: t.target },
            )
          : formatMessage(
              { id: 'plan.propGoalPast', defaultMessage: ', {amount} past your {target}% goal' },
              { amount: fmt(Math.abs(t.gap)), target: t.target },
            )
  const basis =
    m.income.source === 'actual'
      ? formatMessage(
          { id: 'plan.propBasisActual', defaultMessage: '{month}, from the income that arrived' },
          { month },
        )
      : formatMessage(
          {
            id: 'plan.propBasisUsual',
            defaultMessage: '{month}, measured against your usual monthly income',
          },
          { month },
        )
  const title =
    m.income.source === 'actual'
      ? formatMessage({
          id: 'plan.propBasisActualHelp',
          defaultMessage: 'The income that arrived in the month, less its spending',
        })
      : m.income.actual > 0
        ? formatMessage(
            {
              id: 'plan.propBasisPartial',
              defaultMessage:
                'Uses your usual monthly income ({usual}); {arrived} has arrived so far this month.',
            },
            { usual: fmt(m.income.amount), arrived: fmt(m.income.actual) },
          )
        : formatMessage(
            {
              id: 'plan.propBasisPending',
              defaultMessage:
                'Uses your usual monthly income ({usual}); this month’s income has not arrived yet.',
            },
            { usual: fmt(m.income.amount) },
          )
  return (
    <span className="pt-ins-t" title={title}>
      <b>{lead}</b>
      {t.amount >= 0 && ` (${t.pct}%)`}
      {goal}
      <span className="pt-ins-basis">{basis}</span>
    </span>
  )
}

/** "Wants is S$2,300 above usual, led by Travel (+S$1,950)" — "was", once the month has closed;
 *  its title says what usual was. */
function InsightLine({ t, m, byDay }: { t: Insight; m: PropMonth; byDay: boolean }) {
  const { formatMessage, locale } = useAppIntl()
  const past = m.status === 'past'
  if (t.kind === 'save') return <SavingsLine t={t} m={m} />
  if (t.kind === 'caps')
    return (
      <span className="pt-ins-t">
        {past
          ? formatMessage(
              {
                id: 'plan.propInsightCapsPast',
                defaultMessage: '{name} caps added up to <b>{amount}</b> more than {target}%',
              },
              {
                name: t.name,
                amount: fmt(t.amount),
                target: t.target,
                b: (chunks) => <b>{chunks}</b>,
              },
            )
          : formatMessage(
              {
                id: 'plan.propInsightCaps',
                defaultMessage: '{name} caps add up to <b>{amount}</b> more than {target}%',
              },
              {
                name: t.name,
                amount: fmt(t.amount),
                target: t.target,
                b: (chunks) => <b>{chunks}</b>,
              },
            )}
      </span>
    )
  const prev = precedingMonthDate(m)
  const prevMonth = Number.isNaN(prev.getTime())
    ? m.month
    : new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(prev)
  const pace = byDay
    ? formatMessage(
        {
          id: 'plan.propPaceByDay',
          defaultMessage:
            '{month} by the {day, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}',
        },
        { month: prevMonth, day: m.day },
      )
    : prevMonth
  const title = byDay
    ? formatMessage(
        {
          id: 'plan.propUsualByDay',
          defaultMessage:
            'Usual: {usual}, your 3-month average by the {day, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}. {pace}: {last}.',
        },
        { usual: fmt(t.usual), day: m.day, pace, last: fmt(t.last) },
      )
    : formatMessage(
        {
          id: 'plan.propUsual',
          defaultMessage: 'Usual: {usual}, your 3-month average. {pace}: {last}.',
        },
        { usual: fmt(t.usual), pace, last: fmt(t.last) },
      )
  return (
    <span className="pt-ins-t" title={title}>
      {past
        ? formatMessage(
            {
              id: 'plan.propAboveUsualPast',
              defaultMessage: '<b>{name}</b> was <b>{amount}</b> above usual',
            },
            { name: t.name, amount: fmt(t.amount), b: (chunks) => <b>{chunks}</b> },
          )
        : formatMessage(
            {
              id: 'plan.propAboveUsual',
              defaultMessage: '<b>{name}</b> is <b>{amount}</b> above usual',
            },
            { name: t.name, amount: fmt(t.amount), b: (chunks) => <b>{chunks}</b> },
          )}
      {t.lead &&
        formatMessage(
          { id: 'plan.propLedBy', defaultMessage: ', led by {name} (+{amount})' },
          { name: t.lead.name, amount: fmt(t.lead.amount) },
        )}
    </span>
  )
}

export function PropHero({
  m,
  d,
  onLucius,
  onConfigure,
  onCapsFromAverage,
}: {
  m: PropMonth
  d: PropDerived
  onLucius: (prompt: string) => void
  /** Opens Configure — where each group's share is set. */
  onConfigure: () => void
  /** Offered while nothing has a cap yet — every envelope's 3-month average, rounded up. */
  onCapsFromAverage?: () => void
}) {
  const { formatMessage, locale } = useAppIntl()
  const { income } = d
  const v = d.verdictDetail
  const listNames = (names: string[]) =>
    new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names)
  const names = listNames(v.names)
  const verdictText = (() => {
    switch (v.kind) {
      case 'noIncome':
        return v.past
          ? formatMessage(
              { id: 'plan.propSpent', defaultMessage: '{amount} spent' },
              { amount: fmt(v.amount) },
            )
          : formatMessage(
              { id: 'plan.propSpentMonth', defaultMessage: '{amount} spent this month' },
              { amount: fmt(v.amount) },
            )
      case 'overIncome':
        return v.past
          ? formatMessage(
              {
                id: 'plan.propOverIncomePast',
                defaultMessage: 'You spent {amount} more than you earned',
              },
              { amount: fmt(v.amount) },
            )
          : formatMessage(
              { id: 'plan.propOverIncome', defaultMessage: '{amount} over your income' },
              { amount: fmt(v.amount) },
            )
      case 'overGroupsSavings':
        return v.past
          ? formatMessage(
              { id: 'plan.propGroupsAteSavings', defaultMessage: '{names} ate into your savings' },
              { names },
            )
          : formatMessage(
              {
                id: 'plan.propGroupsEatingSavings',
                defaultMessage:
                  '{names} {count, plural, one {is} other {are}} eating into your savings',
              },
              { names, count: v.names.length },
            )
      case 'shortGoal':
        return v.current
          ? formatMessage(
              {
                id: 'plan.propHeadingSavings',
                defaultMessage: 'Heading for {percent}% savings, your goal is {target}%',
              },
              { percent: v.percent, target: v.target },
            )
          : formatMessage(
              {
                id: 'plan.propSavedGoal',
                defaultMessage: 'Saved {percent}%, your goal was {target}%',
              },
              { percent: v.percent, target: v.target },
            )
      case 'overGroups':
        return v.past
          ? formatMessage(
              {
                id: 'plan.propGroupsOverPast',
                defaultMessage: '{names} went over, but you still saved {percent}%',
              },
              { names, percent: v.percent },
            )
          : v.early
            ? formatMessage(
                {
                  id: 'plan.propGroupsOverEarly',
                  defaultMessage: '{names} {count, plural, one {is} other {are}} already over',
                },
                { names, count: v.names.length },
              )
            : formatMessage(
                {
                  id: 'plan.propGroupsOver',
                  defaultMessage:
                    '{names} {count, plural, one {is} other {are}} over, but savings are on track',
                },
                { names, count: v.names.length },
              )
      case 'overCaps': {
        const shown = v.caps.slice(0, 2).map((cap) => `${cap.label} (${fmt(cap.by)})`)
        const remaining = v.caps.length - shown.length
        const who =
          remaining > 0
            ? formatMessage(
                { id: 'plan.propCapsAndMore', defaultMessage: '{names} and {count} more' },
                { names: shown.join(', '), count: remaining },
              )
            : listNames(shown)
        return v.past
          ? formatMessage(
              {
                id: 'plan.propCapsOverPast',
                defaultMessage:
                  '{names} {count, plural, one {was over its cap} other {were over their caps}}',
              },
              { names: who, count: v.caps.length },
            )
          : formatMessage(
              {
                id: 'plan.propCapsOver',
                defaultMessage:
                  '{names} {count, plural, one {is over its cap} other {are over their caps}}',
              },
              { names: who, count: v.caps.length },
            )
      }
      case 'capsOver':
        return v.past
          ? formatMessage(
              {
                id: 'plan.propCapsGroupPast',
                defaultMessage: '{name} caps added up to more than {target}%',
              },
              { name: v.names[0], target: v.target },
            )
          : formatMessage(
              {
                id: 'plan.propCapsGroup',
                defaultMessage: '{name} caps add up to more than {target}%',
              },
              { name: v.names[0], target: v.target },
            )
      case 'saved':
        return v.target === null
          ? formatMessage(
              { id: 'plan.propSaved', defaultMessage: 'Saved {percent}%' },
              { percent: v.percent },
            )
          : formatMessage(
              {
                id: 'plan.propSavedGoal',
                defaultMessage: 'Saved {percent}%, your goal was {target}%',
              },
              { percent: v.percent, target: v.target },
            )
      case 'early':
        return formatMessage(
          { id: 'plan.propTooEarly', defaultMessage: 'Too early to call — {amount} spent so far' },
          { amount: fmt(v.amount) },
        )
      case 'onTrack':
        return v.current
          ? formatMessage({ id: 'plan.onTrackMonth', defaultMessage: 'On track this month' })
          : formatMessage({ id: 'plan.onTarget', defaultMessage: 'On target' })
    }
  })()
  const monthDate = new Date(m.month + '-01T00:00:00Z')
  const monthName = Number.isNaN(monthDate.getTime())
    ? m.month
    : new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(monthDate)

  if (!d.hasSpend) {
    const planned = d.counted.filter((f) => f.g.target !== null)
    const noCaps = d.counted.every((f) => f.capSum === 0)
    // Suggesting caps is only an offer while an envelope still has none (owner, 2026-09-28).
    const uncapped = d.counted.some((f) => f.rows.some((e) => !(e.cap && e.cap > 0)))
    return (
      <div className="pt-hero pt-plan">
        <div className="pt-plan-top">
          <span className="pt-verdict">
            {d.isFuture
              ? formatMessage(
                  { id: 'plan.monthNotStarted', defaultMessage: '{month} hasn’t started' },
                  { month: monthName },
                )
              : formatMessage({ id: 'plan.nothingSpentYet', defaultMessage: 'Nothing spent yet' })}
          </span>
          {income > 0 && (
            <span className="pt-plan-inc">
              {formatMessage(
                { id: 'plan.yourMonthlyIncome', defaultMessage: 'Your {amount} monthly income' },
                { amount: fmt(income) },
              )}
            </span>
          )}
          <span className="bo-spacer" />
          {!d.hasTargets ? (
            <Button variant="secondary" size="dense" onClick={onConfigure}>
              {formatMessage({
                id: 'plan.giveGroupShare',
                defaultMessage: 'Give each group a share',
              })}
            </Button>
          ) : (
            onCapsFromAverage &&
            noCaps && (
              <Button variant="secondary" size="dense" onClick={onCapsFromAverage}>
                {formatMessage({
                  id: 'plan.capsFromAverage',
                  defaultMessage: 'Set caps from my average spending',
                })}
              </Button>
            )
          )}
          {(!d.hasTargets || uncapped) && (
            <Button
              variant="primary"
              size="dense"
              className="fi-lucius"
              iconLeft={<Spark size={15} />}
              onClick={() =>
                onLucius(
                  d.hasTargets
                    ? formatMessage({
                        id: 'plan.proportional.askCaps',
                        defaultMessage:
                          'Suggest caps for my envelopes that fit each group’s share of my income',
                      })
                    : formatMessage({
                        id: 'plan.proportional.askShares',
                        defaultMessage:
                          'Suggest a share of my income for each budget group, from my spending',
                      }),
                )
              }
            >
              {d.hasTargets
                ? formatMessage({
                    id: 'plan.luciusSuggestCaps',
                    defaultMessage: 'Let Lucius suggest caps',
                  })
                : formatMessage({
                    id: 'plan.luciusSuggestShares',
                    defaultMessage: 'Let Lucius suggest shares',
                  })}
            </Button>
          )}
        </div>
        {planned.length > 0 && income > 0 && (
          <>
            <div
              className="pt-plan-bar"
              style={
                {
                  gridTemplateColumns: [...planned.map((f) => f.g.target), d.saveTarget ?? 0]
                    .map((t) => `${t}fr`)
                    .join(' '),
                } as CSSProperties
              }
            >
              {planned.map((f) => (
                <span key={f.g.id} style={{ background: f.color }} />
              ))}
              <span style={{ background: SAVE_COLOR }} />
            </div>
            <div className="pt-plan-cols pt-plan-cols--wrap">
              {[
                ...planned.map((f) => ({ k: f.g.id, n: f.g.name, c: f.color, t: f.g.target! })),
                { k: 'savings', n: 'Savings', c: SAVE_COLOR, t: d.saveTarget ?? 0 },
              ].map((p) => (
                <div key={p.k} className="pt-plan-col">
                  <span className="k">
                    <i style={{ background: p.c }} />
                    <span>
                      {p.k === 'savings'
                        ? formatMessage({ id: 'plan.savings', defaultMessage: 'Savings' })
                        : p.n}{' '}
                      <b>{p.t}%</b>
                    </span>
                  </span>
                  <span className="v">
                    <b>{fmt(Math.round((income * p.t) / 100))}</b>{' '}
                    {p.k === 'savings'
                      ? formatMessage({ id: 'plan.toSave', defaultMessage: 'to save' })
                      : formatMessage({ id: 'plan.toSpend', defaultMessage: 'to spend' })}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  const closed = d.isPast && m.income.source === 'actual'
  // Balanced rows: five tiles beside the insights sit 3 + 2, never 4 + 1.
  const tiles = shares(d)
  const cols = Math.ceil(tiles.length / Math.ceil(tiles.length / (d.insights.length ? 3 : 5)))
  const priorDate = precedingMonthDate(m)
  const priorLong = Number.isNaN(priorDate.getTime())
    ? m.month
    : new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(priorDate)
  const priorShort = Number.isNaN(priorDate.getTime())
    ? m.month
    : new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(priorDate)
  const vs = d.pace.byDay
    ? formatMessage(
        {
          id: 'plan.propPaceByDay',
          defaultMessage:
            '{month} by the {day, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}',
        },
        { month: priorLong, day: m.day },
      )
    : priorLong
  return (
    <div className={'pt-hero pt-plan' + (d.tone ? TONE_CLASS[d.tone] : '')}>
      <div className="pt-plan-top">
        <span className={'pt-verdict' + (d.tone === 'bad' ? ' bad' : d.verdict.bad ? ' warn' : '')}>
          {verdictText}
        </span>
        <span className="bo-spacer" />
        {income > 0 && (
          <span
            className="pt-plan-inc"
            title={
              closed
                ? formatMessage({
                    id: 'plan.propActualIncomeTitle',
                    defaultMessage: 'Against the income that actually arrived',
                  })
                : formatMessage({
                    id: 'plan.propUsualIncomeTitle',
                    defaultMessage: 'Against your usual month',
                  })
            }
          >
            {formatMessage(
              { id: 'plan.propSpentOf', defaultMessage: '{spent} spent of {income}' },
              { spent: fmt(d.outflow), income: fmt(income) },
            )}
          </span>
        )}
        {d.hasCmp && Math.abs(d.paceDiff) >= 1 && (
          <span
            className={'pt-plan-pace ' + (d.paceDiff > 0 ? 'up' : 'down')}
            title={formatMessage(
              {
                id: 'plan.propPaceTitle',
                defaultMessage: 'Spending so far, compared with {period}',
              },
              { period: vs },
            )}
          >
            {d.pace.byDay
              ? formatMessage(
                  {
                    id: 'plan.propPaceChipDay',
                    defaultMessage:
                      '<b>{amount}</b> spending vs {month} by the {day, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}',
                  },
                  {
                    amount: (d.paceDiff > 0 ? '+' : '−') + fmt(Math.abs(d.paceDiff)),
                    month: priorShort,
                    day: m.day,
                    b: (chunks) => <b>{chunks}</b>,
                  },
                )
              : formatMessage(
                  {
                    id: 'plan.propPaceChip',
                    defaultMessage: '<b>{amount}</b> spending vs {month}',
                  },
                  {
                    amount: (d.paceDiff > 0 ? '+' : '−') + fmt(Math.abs(d.paceDiff)),
                    month: priorShort,
                    b: (chunks) => <b>{chunks}</b>,
                  },
                )}
          </span>
        )}
      </div>
      <div className="pt-hero-body">
        <div className="pt-shares" style={{ '--cols': cols } as CSSProperties}>
          {tiles.map((s) => {
            // A group whose refunds outran its spend took nothing: an empty bar, never a negative
            // width (the browser drops that and keeps the previous month's bar).
            const shown = Math.max(0, Math.min(100, s.pct))
            const within =
              s.target === null || s.key === 'savings' ? shown : Math.min(shown, s.target)
            return (
              <div key={s.key} className="pt-share">
                <span className="pt-share-l">
                  <i style={{ background: s.color }} />
                  <span>
                    {s.key === 'savings'
                      ? formatMessage({ id: 'plan.savings', defaultMessage: 'Savings' })
                      : s.name}
                  </span>
                </span>
                <span
                  className="pt-share-bar"
                  style={{ '--c': s.color } as CSSProperties}
                  role="img"
                  aria-label={
                    s.target !== null
                      ? formatMessage(
                          {
                            id: 'plan.propShareWithTarget',
                            defaultMessage: '{name}: {percent}% of {basis}, target {target}%',
                          },
                          {
                            name:
                              s.key === 'savings'
                                ? formatMessage({ id: 'plan.savings', defaultMessage: 'Savings' })
                                : s.name,
                            percent: Math.round(s.pct),
                            basis:
                              income > 0
                                ? formatMessage({
                                    id: 'plan.incomeLower',
                                    defaultMessage: 'income',
                                  })
                                : formatMessage({
                                    id: 'plan.spendingLower',
                                    defaultMessage: 'spending',
                                  }),
                            target: s.target,
                          },
                        )
                      : formatMessage(
                          { id: 'plan.propShare', defaultMessage: '{name}: {percent}% of {basis}' },
                          {
                            name:
                              s.key === 'savings'
                                ? formatMessage({ id: 'plan.savings', defaultMessage: 'Savings' })
                                : s.name,
                            percent: Math.round(s.pct),
                            basis:
                              income > 0
                                ? formatMessage({
                                    id: 'plan.incomeLower',
                                    defaultMessage: 'income',
                                  })
                                : formatMessage({
                                    id: 'plan.spendingLower',
                                    defaultMessage: 'spending',
                                  }),
                          },
                        )
                  }
                >
                  {shown > within && <i className="over" style={{ width: shown + '%' }} />}
                  <i
                    className={'in' + (shown > within ? ' cut' : '')}
                    style={{ width: within + '%' }}
                  />
                  {!!s.target && <b className="tick" style={{ left: s.target + '%' }} />}
                </span>
                <span className="pt-share-n">
                  <b className={s.bad ? 'bad' : ''}>{Math.round(s.pct)}%</b>
                  {s.target !== null && ` / ${s.target}%`}
                </span>
              </div>
            )
          })}
        </div>
        {d.insights.length > 0 && (
          <ul className="pt-ins">
            {d.insights.map((t) => (
              <li key={t.key}>
                <i style={{ background: t.color }} />
                <InsightLine t={t} m={m} byDay={d.pace.byDay} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
