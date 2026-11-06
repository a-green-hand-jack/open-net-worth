import { useAppIntl } from '../../../i18n/useAppIntl'
import { readable } from './presentation'

/** Translate known system states while leaving unknown provider values intact. */
export function useTradingLabel() {
  const { formatMessage } = useAppIntl()
  return (value: string) => {
    switch (value) {
      case 'ready':
        return formatMessage({ id: 'trading.state.ready', defaultMessage: 'ready' })
      case 'running':
        return formatMessage({ id: 'trading.state.running', defaultMessage: 'running' })
      case 'paused':
        return formatMessage({ id: 'trading.state.paused', defaultMessage: 'paused' })
      case 'completed':
        return formatMessage({ id: 'trading.state.completed', defaultMessage: 'completed' })
      case 'stopped':
        return formatMessage({ id: 'trading.state.stopped', defaultMessage: 'stopped' })
      case 'stopping':
        return formatMessage({ id: 'trading.state.stopping', defaultMessage: 'stopping' })
      case 'failed':
        return formatMessage({ id: 'trading.state.failed', defaultMessage: 'failed' })
      case 'rejected':
        return formatMessage({ id: 'trading.state.rejected', defaultMessage: 'rejected' })
      case 'needs_reconciliation':
        return formatMessage({
          id: 'trading.state.needsReconciliation',
          defaultMessage: 'needs reconciliation',
        })
      case 'pending':
        return formatMessage({ id: 'trading.state.pending', defaultMessage: 'pending' })
      case 'open':
        return formatMessage({ id: 'trading.state.open', defaultMessage: 'open' })
      case 'partially_filled':
        return formatMessage({
          id: 'trading.state.partiallyFilled',
          defaultMessage: 'partially filled',
        })
      case 'filled':
        return formatMessage({ id: 'trading.state.filled', defaultMessage: 'filled' })
      case 'cancelled':
        return formatMessage({ id: 'trading.state.cancelled', defaultMessage: 'cancelled' })
      case 'submission_unknown':
        return formatMessage({
          id: 'trading.state.submissionUnknown',
          defaultMessage: 'Outcome unknown',
        })
      case 'cancel_pending':
        return formatMessage({
          id: 'trading.state.cancelPending',
          defaultMessage: 'Cancellation requested',
        })
      case 'unverified':
        return formatMessage({ id: 'trading.state.unverified', defaultMessage: 'unverified' })
      case 'buy':
        return formatMessage({ id: 'trading.state.buy', defaultMessage: 'buy' })
      case 'sell':
        return formatMessage({ id: 'trading.state.sell', defaultMessage: 'sell' })
      case 'backtest':
        return formatMessage({ id: 'trading.state.backtest', defaultMessage: 'backtest' })
      case 'paper':
        return formatMessage({ id: 'trading.state.paper', defaultMessage: 'paper' })
      case 'live':
        return formatMessage({ id: 'trading.state.live', defaultMessage: 'live' })
      case 'idle':
        return formatMessage({ id: 'trading.state.idle', defaultMessage: 'idle' })
      case 'not_started':
        return formatMessage({ id: 'trading.state.notStarted', defaultMessage: 'not started' })
      case 'ended':
        return formatMessage({ id: 'trading.state.ended', defaultMessage: 'ended' })
      case 'ending':
        return formatMessage({ id: 'trading.state.ending', defaultMessage: 'ending' })
      case 'working':
        return formatMessage({ id: 'trading.state.working', defaultMessage: 'working' })
      case 'external_status_unknown':
        return formatMessage({
          id: 'trading.state.externalStatusUnknown',
          defaultMessage: 'external status unknown',
        })
      case 'awaiting_executor':
        return formatMessage({
          id: 'trading.state.awaitingExecutor',
          defaultMessage: 'awaiting executor',
        })
      case 'waiting':
        return formatMessage({ id: 'trading.state.waiting', defaultMessage: 'waiting' })
      case 'blocked':
        return formatMessage({ id: 'trading.state.blocked', defaultMessage: 'blocked' })
      case 'budget_exhausted':
        return formatMessage({
          id: 'trading.state.budgetExhausted',
          defaultMessage: 'budget exhausted',
        })
      case 'usage_unknown':
        return formatMessage({ id: 'trading.state.usageUnknown', defaultMessage: 'usage unknown' })
      case 'matched':
        return formatMessage({ id: 'trading.state.matched', defaultMessage: 'matched' })
      case 'mismatch':
        return formatMessage({ id: 'trading.state.mismatch', defaultMessage: 'mismatch' })
      case 'canceled':
        return formatMessage({ id: 'trading.state.canceled', defaultMessage: 'canceled' })
      case 'expired':
        return formatMessage({ id: 'trading.state.expired', defaultMessage: 'expired' })
      case 'market':
        return formatMessage({ id: 'trading.state.market', defaultMessage: 'market' })
      case 'limit':
        return formatMessage({ id: 'trading.state.limit', defaultMessage: 'limit' })
      case 'stock':
        return formatMessage({ id: 'trading.state.stock', defaultMessage: 'stock' })
      case 'crypto':
        return formatMessage({ id: 'trading.state.crypto', defaultMessage: 'crypto' })
      case 'lucius':
        return formatMessage({ id: 'trading.state.lucius', defaultMessage: 'lucius' })
      case 'script':
        return formatMessage({ id: 'trading.state.script', defaultMessage: 'script' })
      case 'external':
        return formatMessage({ id: 'trading.state.external', defaultMessage: 'external' })
      case 'order':
        return formatMessage({ id: 'trading.state.order', defaultMessage: 'order' })
      case 'fill':
        return formatMessage({ id: 'trading.state.fill', defaultMessage: 'fill' })
      case 'event':
        return formatMessage({ id: 'trading.state.event', defaultMessage: 'event' })
      case 'agent_input':
        return formatMessage({ id: 'trading.event.agentInput', defaultMessage: 'agent input' })
      case 'agent_output':
        return formatMessage({ id: 'trading.event.agentOutput', defaultMessage: 'agent output' })
      case 'agent_analysis':
        return formatMessage({
          id: 'trading.event.agentAnalysis',
          defaultMessage: 'agent analysis',
        })
      case 'agent_reasoning':
        return formatMessage({
          id: 'trading.event.agentReasoning',
          defaultMessage: 'agent reasoning',
        })
      case 'agent_tool_call':
        return formatMessage({
          id: 'trading.event.agentToolCall',
          defaultMessage: 'agent tool call',
        })
      case 'agent_tool_result':
        return formatMessage({
          id: 'trading.event.agentToolResult',
          defaultMessage: 'agent tool result',
        })
      case 'agent_error':
        return formatMessage({ id: 'trading.event.agentError', defaultMessage: 'agent error' })
      case 'agent_wait':
        return formatMessage({ id: 'trading.event.agentWait', defaultMessage: 'agent wait' })
      case 'agent_actor':
        return formatMessage({ id: 'trading.event.agentActor', defaultMessage: 'agent actor' })
      case 'agent_native_event':
        return formatMessage({
          id: 'trading.event.agentNative',
          defaultMessage: 'agent native event',
        })
      case 'agent_decision':
        return formatMessage({
          id: 'trading.event.agentDecision',
          defaultMessage: 'agent decision',
        })
      case 'agent_summary':
        return formatMessage({ id: 'trading.event.agentSummary', defaultMessage: 'agent summary' })
      case 'agent_usage':
        return formatMessage({ id: 'trading.event.agentUsage', defaultMessage: 'agent usage' })
      case 'agent_recovery':
        return formatMessage({
          id: 'trading.event.agentRecovery',
          defaultMessage: 'agent recovery',
        })
      case 'workspace_file':
        return formatMessage({
          id: 'trading.event.workspaceFile',
          defaultMessage: 'workspace file',
        })
      case 'run_created':
        return formatMessage({ id: 'trading.event.runCreated', defaultMessage: 'run created' })
      case 'run_started':
        return formatMessage({ id: 'trading.event.runStarted', defaultMessage: 'run started' })
      case 'run_resumed':
        return formatMessage({ id: 'trading.event.runResumed', defaultMessage: 'run resumed' })
      case 'run_pause_requested':
        return formatMessage({
          id: 'trading.event.runPauseRequested',
          defaultMessage: 'run pause requested',
        })
      case 'run_stop_requested':
        return formatMessage({
          id: 'trading.event.runStopRequested',
          defaultMessage: 'run stop requested',
        })
      case 'run_state_changed':
        return formatMessage({
          id: 'trading.event.runStateChanged',
          defaultMessage: 'run state changed',
        })
      case 'order_canceled':
        return formatMessage({
          id: 'trading.event.orderCanceled',
          defaultMessage: 'order canceled',
        })
      case 'order_cancel_requested':
        return formatMessage({
          id: 'trading.event.orderCancelRequested',
          defaultMessage: 'order cancel requested',
        })
      case 'order_expired':
        return formatMessage({ id: 'trading.event.orderExpired', defaultMessage: 'order expired' })
      case 'market_data_received':
        return formatMessage({
          id: 'trading.event.marketDataReceived',
          defaultMessage: 'market data received',
        })
      case 'market_quote_authority':
        return formatMessage({
          id: 'trading.event.marketQuoteAuthority',
          defaultMessage: 'market quote authority',
        })
      case 'mandate_amended':
        return formatMessage({
          id: 'trading.event.mandateAmended',
          defaultMessage: 'mandate amended',
        })
      case 'clock_advanced':
        return formatMessage({
          id: 'trading.event.clockAdvanced',
          defaultMessage: 'clock advanced',
        })
      case 'broker_submission_started':
        return formatMessage({
          id: 'trading.event.brokerSubmissionStarted',
          defaultMessage: 'broker submission started',
        })
      case 'reconciled':
        return formatMessage({ id: 'trading.event.reconciled', defaultMessage: 'reconciled' })
      case 'outside_account_activity':
        return formatMessage({
          id: 'trading.event.outsideAccountActivity',
          defaultMessage: 'outside account activity',
        })
      case 'stop_policy_settled':
        return formatMessage({
          id: 'trading.event.stopPolicySettled',
          defaultMessage: 'stop policy settled',
        })
      case 'recovery_requires_reconciliation':
        return formatMessage({
          id: 'trading.event.recoveryRequiresReconciliation',
          defaultMessage: 'recovery requires reconciliation',
        })
      case 'environment_updates_restored':
        return formatMessage({
          id: 'trading.event.environmentUpdatesRestored',
          defaultMessage: 'environment updates restored',
        })
      case 'environment_update_failed':
        return formatMessage({
          id: 'trading.event.environmentUpdateFailed',
          defaultMessage: 'environment update failed',
        })
      case 'book_projection':
        return formatMessage({
          id: 'trading.event.bookProjection',
          defaultMessage: 'book projection',
        })
      case 'order_fill':
        return formatMessage({ id: 'trading.event.orderFill', defaultMessage: 'order fill' })
      case 'order_submitted':
        return formatMessage({
          id: 'trading.event.orderSubmitted',
          defaultMessage: 'order submitted',
        })
      case 'broker_order_updated':
        return formatMessage({
          id: 'trading.event.brokerOrderUpdated',
          defaultMessage: 'broker order updated',
        })
      case 'reconciliation_failed':
        return formatMessage({
          id: 'trading.event.reconciliationFailed',
          defaultMessage: 'reconciliation failed',
        })
      case 'market_subscription_requested':
        return formatMessage({
          id: 'trading.event.marketSubscriptionRequested',
          defaultMessage: 'market subscription requested',
        })
      default:
        return readable(value)
    }
  }
}
