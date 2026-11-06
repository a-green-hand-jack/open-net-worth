import { useState } from 'react'
import { useAppIntl } from '../../../i18n/useAppIntl'
import type { TradingOrder, TradingFill } from '../../../types/trading'
import { Panel, Button, Badge, EmptyState, Modal, Stack, Text, ConfirmDialog } from '../../ui'
import { statusTone, tradingTime, tradingMoney } from './presentation'
import { useTradingLabel } from './useTradingLabel'

const cancelable = new Set(['pending', 'open', 'partially_filled'])
export function TradingOrders({
  orders,
  fills,
  onCancel,
  busy,
  onInspect,
}: {
  orders: TradingOrder[]
  fills: TradingFill[]
  onCancel: (order: TradingOrder) => Promise<void>
  busy: boolean
  onInspect?: (order: TradingOrder) => void
}) {
  const { formatMessage } = useAppIntl()
  const label = useTradingLabel()
  const [selectedId, setSelected] = useState<string | null>(null)
  const selected = orders.find((order) => order.id === selectedId)
  const [cancel, setCancel] = useState<TradingOrder | null>(null)
  return (
    <>
      <Panel title={formatMessage({ id: 'trading.orders', defaultMessage: 'Orders' })}>
        {!orders.length ? (
          <EmptyState
            title={formatMessage({ id: 'trading.noOrders', defaultMessage: 'No orders yet' })}
            body={formatMessage({
              id: 'trading.orderAcknowledgement',
              defaultMessage:
                'An order acknowledgement and its eventual fills are shown separately.',
            })}
          />
        ) : (
          <div className="trading-table-wrap">
            <table className="trading-table">
              <thead>
                <tr>
                  <th>{formatMessage({ id: 'trading.submitted', defaultMessage: 'Submitted' })}</th>
                  <th>
                    {formatMessage({
                      id: 'trading.instrumentVenue',
                      defaultMessage: 'Instrument / venue',
                    })}
                  </th>
                  <th>{formatMessage({ id: 'trading.side', defaultMessage: 'Side' })}</th>
                  <th>{formatMessage({ id: 'trading.quantity', defaultMessage: 'Quantity' })}</th>
                  <th>{formatMessage({ id: 'trading.filled', defaultMessage: 'Filled' })}</th>
                  <th>{formatMessage({ id: 'trading.status', defaultMessage: 'Status' })}</th>
                  <th>{formatMessage({ id: 'trading.actions', defaultMessage: 'Actions' })}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{tradingTime(order.created_at)}</td>
                    <td>
                      {order.instrument.symbol}
                      <Text as="div" size="xs" tone="muted">
                        {order.instrument.venue}
                      </Text>
                    </td>
                    <td>{label(order.side)}</td>
                    <td className="trading-number">{String(order.quantity)}</td>
                    <td className="trading-number">{String(order.filled_quantity ?? 0)}</td>
                    <td>
                      <Badge tone={statusTone(order.status)}>{label(order.status)}</Badge>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => (onInspect ? onInspect(order) : setSelected(order.id))}
                        aria-label={formatMessage(
                          { id: 'trading.viewOrder', defaultMessage: 'View order {symbol}' },
                          { symbol: order.instrument.symbol },
                        )}
                      >
                        {formatMessage({ id: 'trading.details', defaultMessage: 'Details' })}
                      </Button>
                      {cancelable.has(order.status) && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => setCancel(order)}
                          aria-label={formatMessage(
                            {
                              id: 'trading.cancelOrderSymbol',
                              defaultMessage: 'Cancel order {symbol}',
                            },
                            { symbol: order.instrument.symbol },
                          )}
                        >
                          {formatMessage({ id: 'trading.cancel', defaultMessage: 'Cancel' })}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {selected && (
        <Modal
          open
          onClose={() => setSelected(null)}
          title={formatMessage(
            { id: 'trading.orderSymbol', defaultMessage: 'Order · {symbol}' },
            { symbol: selected.instrument.symbol },
          )}
          size="lg"
        >
          <Stack gap="--space-4">
            <Badge tone={statusTone(selected.status)}>{label(selected.status)}</Badge>
            <Text>
              {formatMessage(
                { id: 'trading.requestId', defaultMessage: 'Request: {id}' },
                { id: selected.request_id },
              )}
            </Text>
            <Text>
              {formatMessage(
                { id: 'trading.brokerOrder', defaultMessage: 'Broker order: {id}' },
                {
                  id:
                    selected.broker_order_id ??
                    formatMessage({ id: 'trading.notAssigned', defaultMessage: 'Not assigned' }),
                },
              )}
            </Text>
            <Text>
              {label(selected.side)} {String(selected.quantity)} · {label(selected.order_type)}
            </Text>
            {selected.status === 'submission_unknown' && (
              <Text tone="warn">
                {formatMessage({
                  id: 'trading.unknownOutcome',
                  defaultMessage:
                    'The broker outcome is unknown. Reconcile the order before submitting another order.',
                })}
              </Text>
            )}
            <Panel title={formatMessage({ id: 'trading.fills', defaultMessage: 'Fills' })}>
              {fills.filter((fill) => fill.order_id === selected.id).length ? (
                fills
                  .filter((fill) => fill.order_id === selected.id)
                  .map((fill) => (
                    <Text as="p" key={fill.id}>
                      {formatMessage(
                        {
                          id: 'trading.fillDetails',
                          defaultMessage: '{time} · {quantity} @ {price} · Fees {fees}',
                        },
                        {
                          time: tradingTime(fill.timestamp),
                          quantity: String(fill.quantity),
                          price: tradingMoney(fill.price, selected.instrument.currency),
                          fees: tradingMoney(fill.fees, selected.instrument.currency),
                        },
                      )}
                    </Text>
                  ))
              ) : (
                <EmptyState
                  title={formatMessage({
                    id: 'trading.noFills',
                    defaultMessage: 'No fills recorded',
                  })}
                />
              )}
            </Panel>
          </Stack>
        </Modal>
      )}
      <ConfirmDialog
        data={
          cancel
            ? {
                title: formatMessage({ id: 'trading.cancelOrder', defaultMessage: 'Cancel order' }),
                body: formatMessage({
                  id: 'trading.cancelOrderWarning',
                  defaultMessage:
                    'Request cancellation. An order may still fill before the broker confirms cancellation.',
                }),
                confirmLabel: formatMessage({
                  id: 'trading.requestCancellation',
                  defaultMessage: 'Request cancellation',
                }),
                confirmDisabled: busy,
              }
            : null
        }
        onCancel={() => setCancel(null)}
        onConfirm={() => {
          if (cancel) void onCancel(cancel).then(() => setCancel(null))
        }}
      />
    </>
  )
}
