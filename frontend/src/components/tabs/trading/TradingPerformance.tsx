import type { Performance } from '../../../types/trading'
import { Panel, EmptyState, Text, Stack } from '../../ui'
import { OvChart } from '../overview/charts'
import { cssToken } from '../../../utils/chartTheme'
import { tradingMoney, tradingTime } from './presentation'
import { useAppIntl } from '../../../i18n/useAppIntl'

export function TradingPerformance({ performance }: { performance: Performance }) {
  const { formatMessage } = useAppIntl()
  const history = performance.history ?? []
  return (
    <Panel title={formatMessage({ id: 'trading.performance', defaultMessage: 'Performance' })}>
      <Stack gap="--space-4">
        <Text tone="muted">
          {formatMessage(
            {
              id: 'trading.performanceSummary',
              defaultMessage: 'Started at {initial} · Current equity {current}',
            },
            {
              initial: tradingMoney(performance.initial_equity, performance.base_currency),
              current: tradingMoney(performance.equity, performance.base_currency),
            },
          )}
        </Text>
        {!performance.valuation_complete && (
          <Text tone="warn">
            {formatMessage({
              id: 'trading.incompleteValuation',
              defaultMessage:
                'Awaiting complete valuation. Missing or stale prices and FX are not treated as zero.',
            })}
          </Text>
        )}
        {history.length ? (
          <OvChart
            sig={JSON.stringify(history)}
            config={{
              type: 'line',
              data: {
                labels: history.map((point) => tradingTime(point.timestamp)),
                datasets: [
                  {
                    label: formatMessage(
                      { id: 'trading.equityCurrency', defaultMessage: 'Equity ({currency})' },
                      { currency: performance.base_currency },
                    ),
                    data: history.map((point) =>
                      point.equity == null ? null : Number(point.equity),
                    ),
                    borderColor: cssToken('--good'),
                    backgroundColor: cssToken('--good'),
                    pointRadius: 0,
                    spanGaps: false,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              },
            }}
          />
        ) : (
          <EmptyState
            title={formatMessage({
              id: 'trading.noPerformanceHistory',
              defaultMessage: 'No performance history yet',
            })}
            body={formatMessage({
              id: 'trading.noPerformanceHistoryBody',
              defaultMessage: 'History appears as the environment advances and records valuations.',
            })}
          />
        )}
      </Stack>
    </Panel>
  )
}
