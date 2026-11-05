import { useMemo } from 'react'
import type { ComponentType } from 'react'
import { fBase } from '../../../../utils/format'
import { Money } from '../../../ui'
import { WidgetShell } from '../WidgetShell'
import type { WidgetContentProps } from '../types'
import { usePlanningSummary } from '../../../../hooks/serverState'
import type { EnvelopeRow, PlanningSummary } from '../../../../types/aggregates'
import { useAppIntl } from '../../../../i18n/useAppIntl'

const TOP_SPENDERS = 3

export const SpendingPaceWidget: ComponentType<WidgetContentProps> = ({ instance, def }) => {
  const { formatMessage, locale } = useAppIntl()
  const { data: summary } = usePlanningSummary()

  // Which envelopes to show: the ones the user picked; with no pick (the default), or when
  // none of the picked names is a budgeted envelope this month, the top spenders — and in the
  // second case the widget says so rather than quietly showing something else.
  const { categories, unmatched } = useMemo(() => {
    if (!summary) return { categories: [] as EnvelopeRow[], unmatched: [] as string[] }
    const budgeted = summary.envelopes.budgeted_rows
    const picked = ((instance.config.categories as string[] | undefined) ?? []).filter(Boolean)
    const matched = picked
      .map((name) => budgeted.find((r) => r.label === name))
      .filter((r): r is EnvelopeRow => r !== undefined)
    if (matched.length > 0) return { categories: matched, unmatched: [] as string[] }
    return {
      categories: [...budgeted].sort((a, b) => b.spent - a.spent).slice(0, TOP_SPENDERS),
      unmatched: picked,
    }
  }, [summary, instance.config.categories])

  if (!summary)
    return (
      <WidgetShell title={instance.title} base={def.title}>
        <div />
      </WidgetShell>
    )

  const DAYS_IN_MONTH = summary.days_in_month
  const CURRENT_DAY = summary.day_of_month
  const PERCENT_ELAPSED = summary.pace_pct

  const monthStr = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
    .format(new Date(`${summary.month}-01T00:00:00Z`))
    .toLocaleUpperCase(locale)

  return (
    <WidgetShell
      title={instance.title}
      base={def.title}
      meta={formatMessage(
        { id: 'overview.pace.meta', defaultMessage: '{month} {day} · DAY {day}/{total}' },
        { month: monthStr, day: CURRENT_DAY, total: DAYS_IN_MONTH },
      )}
    >
      <div className="spending-pace-widget">
        <div className="time" data-od-id="time-elapsed">
          <i></i>{' '}
          {formatMessage(
            { id: 'overview.pace.elapsed', defaultMessage: '{percent}% of month elapsed' },
            { percent: Math.round(PERCENT_ELAPSED) },
          )}
        </div>

        {unmatched.length > 0 && (
          <div className="ov-t-meta" role="note">
            {formatMessage(
              {
                id: 'overview.pace.unmatched',
                defaultMessage:
                  "No budgeted envelope named {names} — showing this month's top spending instead. Pick categories in the widget settings.",
              },
              { names: unmatched.join(', ') },
            )}
          </div>
        )}
        {categories.length === 0 && (
          <div className="ov-t-meta">
            {formatMessage({
              id: 'overview.pace.empty',
              defaultMessage: 'No budgeted envelopes have spending this month.',
            })}
          </div>
        )}
        {categories.map((cat) => (
          <PaceRow key={cat.key} cat={cat} summary={summary} />
        ))}
      </div>
    </WidgetShell>
  )
}

function PaceRow({ cat, summary }: { cat: EnvelopeRow; summary: PlanningSummary }) {
  const { formatMessage } = useAppIntl()
  const PERCENT_ELAPSED = summary.pace_pct

  const spent = cat.spent
  const assigned = cat.assigned
  const spentPct = cat.fill_pct

  let state = 'var(--good)'
  if (spentPct > PERCENT_ELAPSED * 1.1) state = 'var(--warn)'
  if (cat.over) state = 'var(--bad)'

  const dotColor = cat.color || state

  return (
    <article
      className="row"
      style={
        {
          '--spent': `${Math.min(100, spentPct)}%`,
          '--health': state,
          '--category': dotColor,
        } as any
      }
    >
      <div className="top">
        <div className="category">
          <i className="dot"></i>
          {cat.label}
        </div>
        <div className="amount">
          <b>
            <Money>{fBase(spent)}</Money>
          </b>{' '}
          / <Money>{fBase(assigned)}</Money> · {Math.round(spentPct)}%
        </div>
      </div>

      <div
        className="bar"
        aria-label={formatMessage(
          {
            id: 'overview.pace.spentAria',
            defaultMessage: '{name}: {percent} percent of budget spent',
          },
          { name: cat.label, percent: Math.round(spentPct) },
        )}
      >
        <i className="fill"></i>
        <i
          className="tick"
          style={{ left: `${Math.min(100, Math.round(PERCENT_ELAPSED))}%` }}
          aria-hidden="true"
        ></i>
      </div>

      <div className="stats">
        <span>
          {formatMessage({ id: 'overview.pace.average', defaultMessage: 'Avg' })}{' '}
          <b>
            {formatMessage(
              { id: 'overview.pace.perDay', defaultMessage: '{amount}/day' },
              { amount: <Money>{fBase(cat.avg_per_day)}</Money> },
            )}
          </b>
        </span>
        <span>
          <b>
            {formatMessage(
              { id: 'overview.pace.perDay', defaultMessage: '{amount}/day' },
              { amount: <Money>{fBase(cat.left_per_day)}</Money> },
            )}
          </b>{' '}
          {formatMessage({ id: 'overview.pace.left', defaultMessage: 'left' })}
        </span>
        <span className="remaining">
          {formatMessage(
            { id: 'overview.pace.amountLeft', defaultMessage: '{amount} left' },
            { amount: <Money>{fBase(cat.remaining)}</Money> },
          )}
        </span>
      </div>
    </article>
  )
}

export const spendingPaceWidgetComponents = {
  'spending-pace': SpendingPaceWidget,
}
