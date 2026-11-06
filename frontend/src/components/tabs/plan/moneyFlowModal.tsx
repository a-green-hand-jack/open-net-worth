import { fLocalizedMonth } from '../../../utils/format'
// plan/moneyFlowModal.tsx — "Money flow": where one month's income went, as a Sankey (or a
// table). Opened from Cash Flow's hero button, an actual month's row or the current month's
// (month to date). A phone gets the
// server's compact 3-column graph in the same PlanningModal (a bottom sheet there).

import { useMemo, useState } from 'react'
import { CollapsibleSection, ErrorState, SegmentedControl, Skeleton } from '../../ui'
import { useCashFlowGraph } from '../../../hooks/serverState'
import { nextMonth, prevMonth, thisMonth } from '../../../hooks/useBudget'
import { useIsMobile } from '../../../hooks/useIsMobile'
import { useElementSize } from '../../../hooks/useElementWidth'
import type { CashFlowGraph, CashFlowNode } from '../../../types/aggregates'
import { drillGroup, flowNodeColor } from '../../shared/moneyFlowLayout'
import { PlanningModal } from './PlanningModal'
import { MoneyFlowChart } from './moneyFlowChart'
import { Chevron, X } from './icons'
import { fMonth } from '../../../utils/format'
import { fBase } from './planData'
import type { RegisterFilter } from './budget'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { formatMoneyFlowLabel } from '../../shared/moneyFlowMessages'

type View = 'flow' | 'table'

const COMPACT_BELOW_PX = 720

function Kpi({ value, label, tone }: { value: string; label: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className={'mf-kpi' + (tone ? ' ' + tone : '')}>
      <span className="k">{label}</span>
      <span className="v mask">{value}</span>
    </div>
  )
}

function Kpis({ g }: { g: CashFlowGraph }) {
  const { formatMessage } = useAppIntl()
  const rate = g.savings_rate_pct != null ? ` · ${Math.round(g.savings_rate_pct)}%` : ''
  return (
    <div className="mf-kpis">
      <Kpi
        label={formatMessage({ id: 'plan.flow.income', defaultMessage: 'Income' })}
        value={fBase(g.income_total)}
      />
      <Kpi
        label={formatMessage({ id: 'plan.flow.spending', defaultMessage: 'Spending' })}
        value={fBase(g.spend_total)}
      />
      {g.shortfall > 0 ? (
        <Kpi
          label={formatMessage({ id: 'plan.flow.fromSavings', defaultMessage: 'From savings' })}
          value={`−${fBase(g.shortfall)}`}
          tone="neg"
        />
      ) : (
        <Kpi
          label={formatMessage({ id: 'plan.flow.saved', defaultMessage: 'Saved{rate}' }, { rate })}
          value={fBase(g.saved)}
          tone="pos"
        />
      )}
    </div>
  )
}

/** Income sources, then each spending group followed by ITS categories (via the links —
 *  a column sort would list every group before any category), then Saved. */
function tableRows(g: CashFlowGraph): CashFlowNode[] {
  const byId = new Map(g.nodes.map((n) => [n.id, n]))
  const children = (id: string) =>
    g.links.filter((l) => l.source === id).map((l) => byId.get(l.target)!)
  const rows = g.nodes.filter((n) => n.column === 0)
  for (const n of g.nodes) {
    if (n.kind === 'spend_group') rows.push(n, ...children(n.id).filter((c) => c.kind === 'spend'))
    else if (n.kind === 'saved') rows.push(n)
  }
  return rows
}

function FlowTable({ g }: { g: CashFlowGraph }) {
  const { formatMessage } = useAppIntl()
  const rows = tableRows(g)
  return (
    <table className="mf-table">
      <thead>
        <tr>
          <th>{formatMessage({ id: 'plan.flow.category', defaultMessage: 'Category' })}</th>
          <th className="n">
            {formatMessage({ id: 'plan.flow.amount', defaultMessage: 'Amount' })}
          </th>
          <th className="n">{formatMessage({ id: 'plan.flow.share', defaultMessage: 'Share' })}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((n) => (
          <tr key={n.id} className={`mf-tr mf-tr--${n.kind}`}>
            <td>
              <i className="mf-swatch" style={{ background: flowNodeColor(n) }} />
              {n.label}
            </td>
            <td className="n mask">{fBase(n.amount)}</td>
            <td className="n">{n.pct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** The newest defined value seen — bridges the gap while a new key loads. */
function useLastDefined<T>(value: T | undefined): T | undefined {
  const [last, setLast] = useState(value)
  if (value !== undefined && value !== last) setLast(value)
  return value ?? last
}

export function MoneyFlowModal({
  initialMonth,
  onClose,
  onOpenRegister,
}: {
  initialMonth: string
  onClose: () => void
  onOpenRegister?: (filter: RegisterFilter) => void
}) {
  const intl = useAppIntl()
  const { formatMessage, locale } = intl
  const isMobile = useIsMobile()
  const [month, setMonth] = useState(initialMonth)
  const monthLabel =
    locale === 'en'
      ? fMonth(month)
      : fLocalizedMonth(month, locale)
  const [view, setView] = useState<View>('flow')
  // The table always lists every category; a phone's chart is the compact 3-column graph. On
  // desktop both are the same URL, so the cache serves them with one request.
  // Five columns need room: a phone, a tablet or a narrow window gets the 3-column graph.
  const [bodyRef, body] = useElementSize<HTMLDivElement>()
  const compact = isMobile || (body.w > 0 && body.w < COMPACT_BELOW_PX)
  const query = useCashFlowGraph(month, false)
  const chartQuery = useCashFlowGraph(month, compact)
  // Stepping months keeps the previous month on screen (dimmed) until the next arrives, so the
  // sheet never collapses to a skeleton mid-browse.
  const rawGraph = useLastDefined(query.data)
  const rawChart = useLastDefined(chartQuery.data)
  const g = useMemo(
    () =>
      rawGraph && {
        ...rawGraph,
        nodes: rawGraph.nodes.map((n) => ({
          ...n,
          label: formatMoneyFlowLabel(intl, n.label_message, n.label),
        })),
      },
    [rawGraph, intl],
  )
  const chart = useMemo(
    () =>
      rawChart && {
        ...rawChart,
        nodes: rawChart.nodes.map((n) => ({
          ...n,
          label: formatMoneyFlowLabel(intl, n.label_message, n.label),
        })),
      },
    [rawChart, intl],
  )
  const stale = !!g && g.month !== month
  const atLatest = month >= thisMonth()
  const toDate = month === thisMonth()
  // Phone drill-in: the compact chart stops at spending groups, so tapping one redraws it as
  // that group → its categories. Keyed to the month, so stepping months returns to the overview.
  const [drill, setDrill] = useState<{ month: string; id: string } | null>(null)
  const drilled = compact && g && drill?.month === month ? drillGroup(g, drill.id) : null
  const drilledGroup = drilled?.nodes[0]
  // A phone parks the table behind a toggle, so the chart can have the sheet.
  const [tableOpen, setTableOpen] = useState(false)
  // The chart takes every pixel the KPIs leave: desktop's Flow view, or a phone's with its
  // table shut.
  const fillChart = compact ? !tableOpen : view === 'flow'

  const openCategory = onOpenRegister
    ? (n: CashFlowNode) => {
        const ids = n.category_ids ?? []
        onClose()
        onOpenRegister(
          // The same filter shape Budget's Activity deep-link uses: every member category of
          // a merged envelope, or uncategorized SPENDING for Uncategorized.
          n.uncategorized
            ? { uncategorized: true, kind: 'expense', month }
            : { category: ids.length === 1 ? ids[0] : ids, month },
        )
      }
    : undefined

  return (
    <PlanningModal
      onClose={onClose}
      label={formatMessage({ id: 'plan.flow.title', defaultMessage: 'Money flow' })}
      className="mf-modal"
    >
      <div className="pl-modal-head mf-head">
        <h3>{formatMessage({ id: 'plan.flow.title', defaultMessage: 'Money flow' })}</h3>
        <div className="mf-ctrl">
          <div
            className="mf-stepper"
            role="group"
            aria-label={formatMessage({ id: 'plan.flow.month', defaultMessage: 'Month' })}
          >
            <button
              aria-label={formatMessage({
                id: 'plan.flow.previousMonth',
                defaultMessage: 'Previous month',
              })}
              onClick={() => setMonth(prevMonth(month))}
            >
              <Chevron dir="left" size={14} />
            </button>
            <span aria-live="polite">
              {toDate
                ? formatMessage(
                    { id: 'plan.flow.toDate', defaultMessage: '{month} to date' },
                    { month: monthLabel },
                  )
                : monthLabel}
            </span>
            <button
              aria-label={formatMessage({
                id: 'plan.flow.nextMonth',
                defaultMessage: 'Next month',
              })}
              disabled={atLatest}
              onClick={() => setMonth(nextMonth(month))}
            >
              <Chevron dir="right" size={14} />
            </button>
          </div>
          {!compact && (
            <SegmentedControl<View>
              ariaLabel={formatMessage({ id: 'plan.flow.view', defaultMessage: 'View' })}
              value={view}
              onChange={setView}
              options={[
                {
                  value: 'flow',
                  label: formatMessage({ id: 'plan.flow.flow', defaultMessage: 'Flow' }),
                },
                {
                  value: 'table',
                  label: formatMessage({ id: 'plan.flow.table', defaultMessage: 'Table' }),
                },
              ]}
            />
          )}
          <button
            className="pl-modal-x"
            onClick={onClose}
            aria-label={formatMessage({ id: 'plan.flow.close', defaultMessage: 'Close' })}
            data-autofocus
          >
            <X />
          </button>
        </div>
      </div>
      <div
        className={
          'pl-modal-body mf-body' +
          (fillChart ? ' mf-body--fill' : '') +
          (stale ? ' mf-body--stale' : '')
        }
        ref={bodyRef}
        aria-busy={stale || undefined}
      >
        {query.initialLoading && !g ? (
          <Skeleton height={320} />
        ) : !g ? (
          <ErrorState
            message={formatMessage({
              id: 'plan.flow.error',
              defaultMessage: "Couldn't load this month's money flow.",
            })}
            onRetry={() => void query.refresh()}
          />
        ) : g.flow_total <= 0 ? (
          <div className="mf-empty">
            {formatMessage(
              {
                id: 'plan.flow.empty',
                defaultMessage: 'No income or spending recorded in {month}.',
              },
              { month: monthLabel },
            )}
          </div>
        ) : (
          <>
            <Kpis g={g} />
            {drilled && drilledGroup ? (
              <>
                <div className="mf-drill">
                  <button type="button" className="mf-drill-back" onClick={() => setDrill(null)}>
                    <Chevron dir="left" size={12} />
                    {formatMessage({ id: 'plan.flow.allSpending', defaultMessage: 'All spending' })}
                  </button>
                  <span className="mf-drill-title">
                    {drilledGroup.label} ·{' '}
                    <span className="mask">{fBase(drilledGroup.amount)}</span>
                  </span>
                </div>
                <MoneyFlowChart
                  graph={drilled}
                  label={formatMessage(
                    {
                      id: 'plan.flow.drillLabel',
                      defaultMessage: '{group} in {month}, by category',
                    },
                    { group: drilledGroup.label, month: monthLabel },
                  )}
                  shareOf={drilledGroup.label}
                  onOpenCategory={openCategory}
                  fill={fillChart}
                />
              </>
            ) : (
              (view === 'flow' || compact) &&
              chart && (
                <MoneyFlowChart
                  graph={chart}
                  label={formatMessage(
                    {
                      id: 'plan.flow.chartLabel',
                      defaultMessage:
                        'Money flow for {month}: {income} income, {spending} spending',
                    },
                    {
                      month: monthLabel,
                      income: fBase(chart.income_total),
                      spending: fBase(chart.spend_total),
                    },
                  )}
                  shareOf={
                    chart.shortfall > 0
                      ? formatMessage({ id: 'plan.flow.spendingLower', defaultMessage: 'spending' })
                      : formatMessage({ id: 'plan.flow.incomeLower', defaultMessage: 'income' })
                  }
                  onOpenCategory={openCategory}
                  onDrill={compact ? (n) => setDrill({ month, id: n.id }) : undefined}
                  fill={fillChart}
                />
              )
            )}
            {compact ? (
              <CollapsibleSection
                title={formatMessage({ id: 'plan.flow.breakdown', defaultMessage: 'Breakdown' })}
                className="mf-breakdown"
                open={tableOpen}
                onOpenChange={setTableOpen}
              >
                <FlowTable g={g} />
              </CollapsibleSection>
            ) : (
              view === 'table' && <FlowTable g={g} />
            )}
          </>
        )}
      </div>
      <div className="mf-foot">
        {formatMessage({
          id: 'plan.flow.footnote',
          defaultMessage:
            'Small spending categories are folded into “Other”. Card payments and transfers between your own accounts are not spending.',
        })}
      </div>
    </PlanningModal>
  )
}
