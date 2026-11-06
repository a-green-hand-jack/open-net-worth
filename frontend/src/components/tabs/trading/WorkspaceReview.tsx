import type { DelegationReview } from '../../../types/trading'
import { Checkbox, ErrorState, Panel, Stack, Text } from '../../ui'
import { tradingMoney, tradingTime } from './presentation'
import { useAppIntl } from '../../../i18n/useAppIntl'
import { useTradingLabel } from './useTradingLabel'
import { useTradingNotices } from './useTradingNotices'

export function WorkspaceReview({
  review,
  authorized,
  busy,
  onAuthorize,
}: {
  review: DelegationReview
  authorized: boolean
  busy: boolean
  onAuthorize: (value: boolean) => Promise<void>
}) {
  const { formatMessage } = useAppIntl()
  const label = useTradingLabel()
  const notices = useTradingNotices()
  return (
    <>
      <Text tone="muted">
        {formatMessage({
          id: 'trading.unsavedReview',
          defaultMessage:
            'Unsaved draft. Review the exact delegation and authority before starting.',
        })}
      </Text>
      <Panel title={review.workspace.name}>
        <Stack gap="--space-4">
          <Text as="p" className="trading-mandate-text">
            {review.workspace.instructions}
          </Text>
          <Text>
            {formatMessage(
              { id: 'trading.executorDetails', defaultMessage: 'Executor: {label} · {kind}' },
              { label: review.workspace.agent_label, kind: label(review.workspace.agent_kind) },
            )}
          </Text>
          <Text>
            {formatMessage(
              {
                id: 'trading.environmentPeriod',
                defaultMessage: 'Environment: {mode} · {start} – {end}',
              },
              {
                mode: label(review.environment.mode),
                start: tradingTime(review.environment.start_at),
                end: review.environment.end_at
                  ? tradingTime(review.environment.end_at)
                  : formatMessage({ id: 'trading.untilStopped', defaultMessage: 'Until stopped' }),
              },
            )}
          </Text>
          {review.environment.accounts.map((account, index) => (
            <Text key={index}>
              {account.name} · {account.venue} · {tradingMoney(account.capital, account.currency)}
            </Text>
          ))}
          <Text>
            {formatMessage(
              { id: 'trading.marketsValue', defaultMessage: 'Markets: {markets}' },
              { markets: review.workspace.mandate.allowed_asset_classes.map(label).join(', ') },
            )}
          </Text>
          <Text>
            {formatMessage(
              { id: 'trading.maximumOrder', defaultMessage: 'Maximum order: {value}' },
              {
                value:
                  review.workspace.mandate.max_order_notional == null
                    ? formatMessage({
                        id: 'trading.availableAuthorizedCapital',
                        defaultMessage: 'Available authorized capital',
                      })
                    : tradingMoney(
                        review.workspace.mandate.max_order_notional,
                        review.environment.base_currency,
                      ),
              },
            )}
          </Text>
          <Text>
            {formatMessage(
              {
                id: 'trading.agentBudgetSummary',
                defaultMessage: 'Agent budget: {amount} · Separate from trading capital',
              },
              { amount: tradingMoney(review.workspace.mandate.max_model_cost_usd, 'USD') },
            )}
          </Text>
          <Text>
            {formatMessage(
              { id: 'trading.dataDetails', defaultMessage: 'Data: {source} · {version}' },
              {
                source: review.workspace.mandate.market_data_source,
                version: review.environment.data_version,
              },
            )}
          </Text>
          <Text tone="muted">
            {formatMessage({
              id: 'trading.endPolicy',
              defaultMessage:
                'End policy: stop new work, request cancellation of open orders, retain holdings. Already submitted orders may still execute.',
            })}
          </Text>
        </Stack>
      </Panel>
      {!!review.issues?.length && (
        <ErrorState message={notices(review.issue_messages, review.issues).join(' ')} />
      )}
      {review.environment.mode === 'live' && review.review_notice && (
        <Text tone="warn">
          {
            notices(review.review_notice_message ? [review.review_notice_message] : undefined, [
              review.review_notice,
            ])[0]
          }
        </Text>
      )}
      {review.environment.mode === 'live' && (
        <Checkbox
          checked={authorized}
          disabled={busy}
          onChange={(e) => void onAuthorize(e.target.checked)}
          label={formatMessage({
            id: 'trading.authorizeLive',
            defaultMessage:
              'I authorize live trading of the displayed accounts and allocation within this mandate.',
          })}
        />
      )}
    </>
  )
}
