import type { TradingAccount } from '../../../types/trading'
import { Panel, EmptyState, Badge, Stack, Text } from '../../ui'
import { tradingMoney } from './presentation'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useTradingLabel } from './useTradingLabel'

export function TradingAccounts({ accounts }: { accounts: TradingAccount[] }) {
  const { formatMessage } = useAppIntl()
  const label = useTradingLabel()
  return (
    <Panel title={formatMessage({ id: 'trading.accounts', defaultMessage: 'Accounts' })}>
      {!accounts.length ? (
        <EmptyState
          title={formatMessage({
            id: 'trading.noEligibleAccount',
            defaultMessage: 'No eligible account linked',
          })}
          body={formatMessage({
            id: 'trading.noEligibleAccountBody',
            defaultMessage:
              'Create a run with an allocation. Broker connections are configured in Connectors.',
          })}
        />
      ) : (
        <div className="trading-table-wrap">
          <table className="trading-table">
            <thead>
              <tr>
                <th>
                  {formatMessage({ id: 'trading.accountVenue', defaultMessage: 'Account / venue' })}
                </th>
                <th>{formatMessage({ id: 'trading.allocated', defaultMessage: 'Allocated' })}</th>
                <th>{formatMessage({ id: 'trading.cash', defaultMessage: 'Cash' })}</th>
                <th>{formatMessage({ id: 'trading.available', defaultMessage: 'Available' })}</th>
                <th>{formatMessage({ id: 'trading.reserved', defaultMessage: 'Reserved' })}</th>
                <th>
                  {formatMessage({
                    id: 'trading.reconciliation',
                    defaultMessage: 'Reconciliation',
                  })}
                </th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    {account.name}
                    <Text as="div" size="xs" tone="muted">
                      {account.venue} · {account.currency}
                    </Text>
                  </td>
                  <td className="trading-number">
                    {tradingMoney(account.capital, account.currency)}
                  </td>
                  <td className="trading-number">{tradingMoney(account.cash, account.currency)}</td>
                  <td className="trading-number">
                    {tradingMoney(account.available_cash, account.currency)}
                  </td>
                  <td className="trading-number">
                    {tradingMoney(account.reserved_cash, account.currency)}
                  </td>
                  <td>
                    <Badge
                      tone={account.reconciliation_status === 'unverified' ? 'warn' : 'neutral'}
                    >
                      {label(account.reconciliation_status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
export function TradingHoldings({ accounts }: { accounts: TradingAccount[] }) {
  const { formatMessage } = useAppIntl()
  const positions = accounts
    .flatMap((account) =>
      Object.entries(account.positions).map(([key, position]) => ({
        key: `${account.id}:${key}`,
        account,
        position,
      })),
    )
    .filter(({ position }) => Number(position.quantity) !== 0)
  return (
    <Stack gap="--space-6">
      <Panel title={formatMessage({ id: 'trading.holdings', defaultMessage: 'Holdings' })}>
        {!positions.length ? (
          <EmptyState
            title={formatMessage({ id: 'trading.noPositions', defaultMessage: 'No positions yet' })}
            body={formatMessage({
              id: 'trading.noPositionsBody',
              defaultMessage: 'Filled trades will appear here, separately from your personal book.',
            })}
          />
        ) : (
          <div className="trading-table-wrap">
            <table className="trading-table">
              <thead>
                <tr>
                  <th>
                    {formatMessage({
                      id: 'trading.instrumentAccount',
                      defaultMessage: 'Instrument / account',
                    })}
                  </th>
                  <th>{formatMessage({ id: 'trading.quantity', defaultMessage: 'Quantity' })}</th>
                  <th>{formatMessage({ id: 'trading.mark', defaultMessage: 'Mark' })}</th>
                  <th>{formatMessage({ id: 'trading.value', defaultMessage: 'Value' })}</th>
                  <th>
                    {formatMessage({ id: 'trading.costBasis', defaultMessage: 'Cost basis' })}
                  </th>
                  <th>
                    {formatMessage({
                      id: 'trading.unrealizedPnl',
                      defaultMessage: 'Unrealized P&L',
                    })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {positions.map(({ key, account, position }) => (
                  <tr key={key}>
                    <td>
                      {position.instrument.symbol}
                      <Text as="div" size="xs" tone="muted">
                        {position.instrument.venue} · {account.name}
                      </Text>
                    </td>
                    <td className="trading-number">{String(position.quantity)}</td>
                    <td className="trading-number">
                      {tradingMoney(position.market_price, position.instrument.currency)}
                    </td>
                    <td className="trading-number">
                      {tradingMoney(position.market_value, position.instrument.currency)}
                    </td>
                    <td className="trading-number">
                      {tradingMoney(position.cost_basis, position.instrument.currency)}
                    </td>
                    <td className="trading-number">
                      {tradingMoney(position.unrealized_pnl, position.instrument.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <TradingAccounts accounts={accounts} />
    </Stack>
  )
}
