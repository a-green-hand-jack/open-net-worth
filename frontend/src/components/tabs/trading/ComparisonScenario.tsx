import type { TradingComparison } from '../../../types/trading'
import { Stack, Text } from '../../ui'
import { tradingMoney, tradingTime } from './presentation'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useTradingNotices } from './useTradingNotices'
import { useTradingLabel } from './useTradingLabel'

export function ComparisonScenario({ comparison }: { comparison: TradingComparison }) {
  const { formatMessage } = useAppIntl()
  const notices = useTradingNotices()
  const label = useTradingLabel()
  const scenario = comparison.scenario
  if (!scenario)
    return (
      <Text tone="muted">
        {formatMessage({
          id: 'trading.scenarioUnavailable',
          defaultMessage: 'Scenario details are unavailable.',
        })}
      </Text>
    )
  return (
    <Stack gap="--space-4">
      <Text>
        {formatMessage(
          { id: 'trading.periodRange', defaultMessage: 'Period: {start} – {end}' },
          {
            start: tradingTime(scenario.period.start_at),
            end: tradingTime(scenario.period.end_at),
          },
        )}
      </Text>
      <Text>
        {formatMessage(
          {
            id: 'trading.scenarioCapital',
            defaultMessage: 'Capital: {capital} · Reporting currency: {currency}',
          },
          {
            capital: Object.entries(scenario.capital_by_currency)
              .map(([currency, value]) => tradingMoney(value, currency))
              .join(' · '),
            currency: scenario.base_currency,
          },
        )}
      </Text>
      <Text>
        {formatMessage(
          { id: 'trading.dataset', defaultMessage: 'Dataset: {version}' },
          { version: scenario.data_version },
        )}
      </Text>
      <Text>
        {formatMessage(
          { id: 'trading.universe', defaultMessage: 'Universe: {instruments}' },
          {
            instruments: scenario.instruments.length
              ? scenario.instruments
                  .map(
                    (instrument) =>
                      `${instrument.symbol} (${label(instrument.asset_class)}, ${instrument.venue}, ${instrument.currency})`,
                  )
                  .join(' · ')
              : formatMessage({
                  id: 'trading.noPermittedInstruments',
                  defaultMessage: 'No permitted instruments recorded',
                }),
          },
        )}
      </Text>
      <Text>
        {formatMessage(
          {
            id: 'trading.scenarioLimits',
            defaultMessage:
              'Fee: {fee} bps · Slippage: {slippage} bps · Maximum volume participation: {participation}',
          },
          {
            fee: String(scenario.fee_bps),
            slippage: String(scenario.slippage_bps),
            participation: String(scenario.max_participation),
          },
        )}
      </Text>
      {notices(comparison.limitation_messages, comparison.limitations).map((limitation) => (
        <Text key={limitation} size="sm" tone="muted">
          {limitation}
        </Text>
      ))}
    </Stack>
  )
}
