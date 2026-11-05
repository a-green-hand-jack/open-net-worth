import { useTradingErrorText } from './useTradingErrorText'
import { tradingApi, tradingRoot } from '../../../api/trading'
import { useQueryCache } from '../../../state/queryCache'
import { Button, EmptyState, ErrorState, Loading, Panel, Stack, SummaryBar, Text } from '../../ui'
import type { EvidenceSelection } from '../../../types/trading'
import { tradingMoney, tradingTime } from './presentation'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useTradingLabel } from './useTradingLabel'

export function TradingStatement({
  runId,
  onSelect,
}: {
  runId: string
  onSelect: (selection: EvidenceSelection) => void
}) {
  const { formatMessage } = useAppIntl()
  const errorText = useTradingErrorText()
  const label = useTradingLabel()
  const query = useQueryCache(`${tradingRoot}/runs/${runId}/statement`, () =>
    tradingApi.statement(runId),
  )
  const statement = query.data
  return (
    <Stack gap="--space-4">
      {query.initialLoading && (
        <Loading
          label={formatMessage({
            id: 'trading.loadingStatement',
            defaultMessage: 'Loading statement…',
          })}
        />
      )}
      {!!query.error && (
        <ErrorState message={errorText(query.error)} onRetry={() => void query.refresh()} />
      )}
      {statement && (
        <>
          <Text weight={600}>
            {formatMessage({ id: 'trading.accountStatement', defaultMessage: 'Account statement' })}
          </Text>
          <Text size="sm" tone="muted">
            {tradingTime(statement.period.start_at)} – {tradingTime(statement.period.as_of)}
          </Text>
          <SummaryBar
            cards={[
              {
                label: formatMessage({
                  id: 'trading.openingEquity',
                  defaultMessage: 'Opening equity',
                }),
                value: tradingMoney(statement.initial_equity, statement.base_currency),
              },
              {
                label: formatMessage({
                  id: 'trading.closingEquity',
                  defaultMessage: 'Closing equity',
                }),
                value: tradingMoney(statement.equity, statement.base_currency),
              },
              {
                label: formatMessage({ id: 'trading.tradingPnl', defaultMessage: 'Trading P&L' }),
                value: tradingMoney(statement.pnl, statement.base_currency),
              },
            ]}
          />
          <Text>
            {formatMessage(
              {
                id: 'trading.pnlSummary',
                defaultMessage: 'Realized {realized} · Unrealized {unrealized} · Fees {fees}',
              },
              {
                realized: tradingMoney(statement.realized_pnl, statement.base_currency),
                unrealized: tradingMoney(statement.unrealized_pnl, statement.base_currency),
                fees: tradingMoney(statement.fees, statement.base_currency),
              },
            )}
            {!statement.fees_complete
              ? formatMessage({ id: 'trading.incompleteSuffix', defaultMessage: ' (incomplete)' })
              : ''}
          </Text>
          {!statement.valuation_complete && (
            <Text tone="warn">
              {formatMessage({
                id: 'trading.statementIncompleteValuation',
                defaultMessage:
                  'Valuation is incomplete. Missing prices and FX are not treated as zero.',
              })}
            </Text>
          )}
          {statement.accounts.map((account) => (
            <Panel key={account.id} title={`${account.name} · ${account.currency}`}>
              <Stack gap="--space-4">
                <Text>
                  {formatMessage(
                    {
                      id: 'trading.cashPeriod',
                      defaultMessage: 'Opening cash {opening} · Closing cash {closing}',
                    },
                    {
                      opening: tradingMoney(account.opening_cash, account.currency),
                      closing: tradingMoney(account.closing_cash, account.currency),
                    },
                  )}
                </Text>
                <Text>
                  {formatMessage(
                    { id: 'trading.cashMovement', defaultMessage: 'Cash movement {amount}' },
                    { amount: tradingMoney(account.cash_change, account.currency) },
                  )}
                </Text>
                {account.movements.length ? (
                  <div className="trading-table-wrap">
                    <table className="trading-table">
                      <thead>
                        <tr>
                          <th>{formatMessage({ id: 'trading.time', defaultMessage: 'Time' })}</th>
                          <th>
                            {formatMessage({ id: 'trading.movement', defaultMessage: 'Movement' })}
                          </th>
                          <th>
                            {formatMessage({ id: 'trading.amount', defaultMessage: 'Amount' })}
                          </th>
                          <th>
                            {formatMessage({ id: 'trading.evidence', defaultMessage: 'Evidence' })}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {account.movements.map((movement) => (
                          <tr key={movement.id}>
                            <td>{tradingTime(movement.timestamp)}</td>
                            <td>{label(movement.kind)}</td>
                            <td className="trading-number">
                              {tradingMoney(movement.amount, account.currency)}
                            </td>
                            <td>
                              {movement.fill_id ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onSelect({ kind: 'fill', id: movement.fill_id! })}
                                >
                                  {formatMessage({
                                    id: 'trading.inspectFill',
                                    defaultMessage: 'Inspect fill',
                                  })}
                                </Button>
                              ) : movement.order_id ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    onSelect({ kind: 'order', id: movement.order_id! })
                                  }
                                >
                                  {formatMessage({
                                    id: 'trading.inspectOrder',
                                    defaultMessage: 'Inspect order',
                                  })}
                                </Button>
                              ) : (
                                formatMessage({
                                  id: 'trading.notRecorded',
                                  defaultMessage: 'Not recorded',
                                })
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title={formatMessage({
                      id: 'trading.noMovements',
                      defaultMessage: 'No account movements recorded',
                    })}
                  />
                )}
                <Text size="sm">
                  {formatMessage(
                    {
                      id: 'trading.retainedPositions',
                      defaultMessage: 'Retained positions: {positions}',
                    },
                    {
                      positions:
                        Object.values(account.positions)
                          .filter((position) => Number(position.quantity) !== 0)
                          .map((position) => `${position.quantity} ${position.instrument.symbol}`)
                          .join(' · ') ||
                        formatMessage({ id: 'trading.none', defaultMessage: 'None' }),
                    },
                  )}
                </Text>
              </Stack>
            </Panel>
          ))}
          <Text size="sm" tone="muted">
            {formatMessage(
              {
                id: 'trading.agentModelCost',
                defaultMessage:
                  'Agent/model cost {amount} · Reported separately from trading results',
              },
              { amount: tradingMoney(statement.model_cost_usd, 'USD') },
            )}
          </Text>
        </>
      )}
    </Stack>
  )
}
